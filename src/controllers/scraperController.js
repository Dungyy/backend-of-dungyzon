// routes/amazon.js
import fetch from 'node-fetch';
import fetchData from '../utils/fetchData.js';
import { BASE_URL, cache } from '../global.js';
import logger from '../logger.js';
import { validateProductId, validateSearchQuery } from '../utils/validateInput.js';

/* --------------------------- shared helpers --------------------------- */

const REGIONS = ['.com', '.ca', '.co.uk'];
const TIMEOUT_MS = 20000;

const normalizeAsin = (id) => id.toUpperCase();
const isAsin = (id) => /^[A-Z0-9]{10}$/i.test(id);

const buildScrapeUrl = (tld, path) =>
  `${BASE_URL}&url=${encodeURIComponent(`https://www.amazon${tld}${path}`)}`;

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      const err = new Error(`HTTP ${resp.status} on ${url} :: ${body.slice(0, 200)}`);
      err.status = resp.status;
      throw err;
    }
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
};

const tryRegions = async (paths) => {
  let lastErr;
  for (const path of paths) {
    for (const tld of REGIONS) {
      const url = buildScrapeUrl(tld, path);
      try {
        return await fetchJson(url);
      } catch (e) {
        lastErr = e;
        if (![404, 410].includes(e.status)) throw e; // only continue on not-found
        logger.warn(`Regional miss ${e.status} for ${url}`);
      }
    }
  }
  throw lastErr;
};

const sendUpstreamError = (res, productId, error, notFoundMessage = 'Not found') => {
  if (error?.name === 'AbortError') {
    logger.error(`Timeout fetching ${productId ?? 'request'}`);
    return res.status(504).json({ message: 'Upstream timeout' });
  }
  if (error?.status === 403) {
    logger.error(`Blocked (403) ${productId ?? ''}: ${error.message}`);
    return res.status(502).json({ message: 'Upstream request blocked' });
  }
  if (error?.status === 429) {
    logger.error(`Rate limited (429) ${productId ?? ''}`);
    return res.status(429).json({ message: 'Rate limited by upstream' });
  }
  if (error?.status === 404) {
    logger.warn(`Not found (404) ${productId ?? ''}`);
    return res.status(404).json({ message: notFoundMessage });
  }
  logger.error(`Unhandled upstream error ${productId ?? ''}: ${error?.message}`);
  return res.status(500).json({ message: 'Internal Server Error', error: error?.message });
};

/* ------------------------------ routes ------------------------------- */

export const getWelcomeMessage = (_req, res) => {
  res.send("Welcome to Dungy's Amazon Scraper API");
};

/** Search */
export const getSearchResults = async (req, res) => {
  const { searchQuery } = req.params;

  const { error } = validateSearchQuery(searchQuery);
  if (error) {
    logger.error(`Invalid search query: "${searchQuery}". ${error.details[0].message}`);
    return res.status(400).json({ message: error.details[0].message });
  }

  const q = searchQuery.trim();
  const cacheKey = `search:${q}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.info(`Search results from cache: "${q}"`);
    return res.json({ searchQuery: q, results: cached.results });
  }

  try {
    logger.info(`Searching: "${q}"`);
    const results = await fetchData(
      `${BASE_URL}&url=${encodeURIComponent(`https://www.amazon.com/s?k=${q}`)}`
    );

    if (!results?.results?.length) {
      logger.info(`No products for query: "${q}"`);
      return res.status(404).json({ message: 'No products found' });
    }

    // cache entire search result
    cache.set(cacheKey, results, 60 * 60 * 12);

    // cache light cards by asin for quick UI hydration
    for (const product of results.results) {
      if (!product?.asin) continue;
      cache.set(
        `product:${product.asin}:basic`,
        {
          asin: product.asin,
          title: product.name,
          price: product.price,
          rating: product.stars,
          thumbnail: product.image,
        },
        60 * 60 * 12
      );
    }

    return res.json({ searchQuery: q, results: results.results });
  } catch (err) {
    return sendUpstreamError(res, null, err, 'Search failed');
  }
};

/** Full product details */
export const getProductDetails = async (req, res) => {
  const { productId } = req.params;

  const { error } = validateProductId(productId);
  if (error || !isAsin(productId)) {
    logger.error(`Invalid product ID: "${productId}".`);
    return res.status(400).json({ message: 'Invalid productId (must be 10 alphanumeric chars).' });
  }

  const asin = normalizeAsin(productId);
  const cacheKey = `product:${asin}:full`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.info(`Full product from cache: "${asin}"`);
    return res.json(cached);
  }

  try {
    logger.info(`Fetching full product: "${asin}"`);
    const [details, reviews, offers] = await Promise.all([
      // details must exist; fail with regional fallback 404 handling
      (async () => {
        try {
          return await tryRegions([`/dp/${asin}`]);
        } catch (e) {
          if ([404, 410].includes(e.status)) {
            return sendUpstreamError(res, asin, e, `Product not found for ASIN ${asin}`);
          }
          throw e;
        }
      })(),
      // reviews/offer-listing should degrade if 404
      (async () => {
        try {
          return await tryRegions([`/product-reviews/${asin}`]);
        } catch {
          return { reviews_count: 0 };
        }
      })(),
      (async () => {
        try {
          return await tryRegions([`/gp/offer-listing/${asin}`]);
        } catch {
          return { offers: [] };
        }
      })(),
    ]);

    // details could have sent a response already on 404; bail if so
    if (res.headersSent) return;

    const full = { details, reviews, offers };
    cache.set(cacheKey, full, 60 * 60 * 12);
    cache.set(`product:${asin}:details`, details, 60 * 60 * 12);
    cache.set(`product:${asin}:reviews`, reviews, 60 * 60 * 12);
    cache.set(`product:${asin}:offers`, offers, 60 * 60 * 12);

    return res.json(full);
  } catch (err) {
    return sendUpstreamError(res, asin, err, `Product not found for ASIN ${productId}`);
  }
};

/** Reviews only (no internal handler calls) */
export const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  if (!isAsin(productId)) {
    return res.status(400).json({ message: 'Invalid productId (must be 10 alphanumeric chars).' });
  }
  const asin = normalizeAsin(productId);

  const cacheKey = `product:${asin}:reviews`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.info(`Reviews from cache: "${asin}"`);
    return res.json(cached);
  }

  try {
    logger.info(`Fetching reviews: "${asin}"`);
    const reviews = await tryRegions([`/product-reviews/${asin}`]);
    cache.set(cacheKey, reviews, 60 * 60 * 12);
    return res.json(reviews);
  } catch (err) {
    // 404 for reviews is fine; return empty but 200 to avoid breaking UI
    if ([404, 410].includes(err.status)) {
      logger.warn(`No reviews for "${asin}"`);
      const empty = { reviews_count: 0 };
      cache.set(cacheKey, empty, 60 * 60 * 1);
      return res.json(empty);
    }
    return sendUpstreamError(res, asin, err, 'Failed to fetch reviews');
  }
};

/** Offers only */
export const getProductOffers = async (req, res) => {
  const { productId } = req.params;

  if (!isAsin(productId)) {
    return res.status(400).json({ message: 'Invalid productId (must be 10 alphanumeric chars).' });
  }
  const asin = normalizeAsin(productId);

  const cacheKey = `product:${asin}:offers`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.info(`Offers from cache: "${asin}"`);
    return res.json(cached);
  }

  try {
    logger.info(`Fetching offers: "${asin}"`);
    const offers = await tryRegions([`/gp/offer-listing/${asin}`]);
    cache.set(cacheKey, offers, 60 * 60 * 12);
    return res.json(offers);
  } catch (err) {
    if ([404, 410].includes(err.status)) {
      logger.warn(`No offers for "${asin}"`);
      const empty = { offers: [] };
      cache.set(cacheKey, empty, 60 * 30);
      return res.json(empty);
    }
    return sendUpstreamError(res, asin, err, 'Failed to fetch offers');
  }
};

/** Quick info */
export const getQuickProductInfo = async (req, res) => {
  const { productId } = req.params;

  if (!isAsin(productId)) {
    return res.status(400).json({ message: 'Invalid productId (must be 10 alphanumeric chars).' });
  }
  const asin = normalizeAsin(productId);

  const cacheKey = `product:${asin}:quick`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.info(`Quick info from cache: "${asin}"`);
    return res.json(cached);
  }

  try {
    logger.info(`Fetching quick info: "${asin}"`);
    let details;
    try {
      details = await tryRegions([`/dp/${asin}`]);
    } catch (e) {
      if ([404, 410].includes(e.status)) {
        return res.status(404).json({ message: `Product not found for ASIN ${asin}` });
      }
      throw e;
    }

    let reviews = { reviews_count: 0 };
    try {
      reviews = await tryRegions([`/product-reviews/${asin}`]);
    } catch (e) {
      logger.warn(`Quick reviews miss for "${asin}": ${e.message}`);
    }

    const quickInfo = {
      productId: asin,
      title: details && (details.name || details.title) ? (details.name ?? details.title) : null,
      rating: details && typeof details.rating !== 'undefined' ? details.rating : null,
      price: details && typeof details.price !== 'undefined' ? details.price : null,
      reviewsCount: reviews && typeof reviews.reviews_count !== 'undefined' ? reviews.reviews_count : 0,
      topPositiveReview: reviews && typeof reviews.top_positive_review !== 'undefined' ? reviews.top_positive_review : null,
      topCriticalReview: reviews && typeof reviews.top_critical_review !== 'undefined' ? reviews.top_critical_review : null,
    };

    cache.set(cacheKey, quickInfo, 60 * 60 * 12);
    return res.json(quickInfo);
  } catch (err) {
    return sendUpstreamError(res, asin, err, `Product not found for ASIN ${asin}`);
  }
};

/** Clear cache by prefix/type safely (NodeCache has no wildcard) */
export const clearCache = (req, res) => {
  const { type, asin } = req.query; // e.g., type=quick|details|reviews|offers|search|all

  const delKeys = [];
  const allKeys = cache.keys();

  const byType = (k) =>
    type === 'all' ||
    (type && k.endsWith(`:${type}`)) ||
    (type === 'search' && k.startsWith('search:'));

  for (const k of allKeys) {
    if (asin && !k.includes(`product:${normalizeAsin(asin)}`)) continue;
    if (!type || byType(k)) delKeys.push(k);
  }

  if (!delKeys.length) {
    return res.json({ message: 'No matching cache keys to clear', cleared: 0 });
  }

  const cleared = cache.del(delKeys);
  logger.info(`Cache cleared: ${cleared} keys`, { type, asin });
  res.json({ message: 'Cache cleared', cleared });
};

/** Cache stats */
export const getCacheStats = (_req, res) => {
  const stats = cache.getStats?.() ?? {};
  res.json({ message: 'Cache statistics', data: stats });
};

/** Health check */
export const getHealthCheck = (_req, res) => {
  res.json({ message: 'API is healthy' });
};

export const getHealthCheckWithDetails = (_req, res) => {
  res.json({
    message: 'API is healthy',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
  });
};


export const useProductDetails = (productId, options = {}) => {
  const { includeReviews = false, includeOffers = false, enabled = true } = options;

  const [productData, setProductData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProduct = useCallback(async () => {
    if (!productId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        ...(includeReviews && { reviews: 'true' }),
        ...(includeOffers && { offers: 'true' })
      });

      const response = await fetch(
        `${BASE_URL}/products/${productId}?${queryParams}`,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setProductData(data.data);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch product details');
      }

    } catch (err) {
      console.error('Product fetch error:', err);
      setError(err);
      setProductData(null);
    } finally {
      setIsLoading(false);
    }
  }, [productId, includeReviews, includeOffers, enabled]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return {
    productData,
    isLoading,
    error,
    refetch: fetchProduct
  };
};

// Hook for API health monitoring
export const useApiHealth = () => {
  const [isHealthy, setIsHealthy] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const isOk = response.ok;
      setIsHealthy(isOk);
      setLastCheck(new Date());

      return isOk;
    } catch (error) {
      console.warn('API health check failed:', error);
      setIsHealthy(false);
      setLastCheck(new Date());
      return false;
    }
  }, []);

  useEffect(() => {
    checkHealth();

    // Check every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    isHealthy,
    lastCheck,
    checkHealth
  };
};

export default {
  useProductDetails,
  useApiHealth
};