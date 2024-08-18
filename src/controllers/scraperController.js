import fetchData from '../utils/fetchData.js';
import { BASE_URL, cache } from '../global.js';
import logger from '../logger.js';
import { validateProductId, validateSearchQuery } from '../utils/validateInput.js';

export const getWelcomeMessage = (req, res) => {
  res.send("Welcome to Dungy's Amazon Scraper API");
};

// Search for products
export const getSearchResults = async (req, res) => {
  const { searchQuery } = req.params;

  // Validate the search query
  const { error } = validateSearchQuery(searchQuery);
  if (error) {
    logger.error(`Invalid search query: "${searchQuery}". Error: ${error.details[0].message}`);
    return res.status(400).json({ message: error.details[0].message });
  }

  const cacheKey = `search:${searchQuery}`;
  let searchResults = cache.get(cacheKey);

  if (!searchResults) {
    try {
      logger.info(`Fetching search results for query: "${searchQuery}"`);
      searchResults = await fetchData(
        `${BASE_URL}&url=https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}`
      );

      if (searchResults && searchResults.results && searchResults.results.length > 0) {
        // Cache the entire search results
        cache.set(cacheKey, searchResults, 43200); // Cache for 12 hour

        // Cache individual product basic info
        searchResults.results.forEach(product => {
          const productCacheKey = `product:${product.asin}:basic`;
          cache.set(productCacheKey, {
            asin: product.asin,
            title: product.name, 
            price: product.price, 
            rating: product.stars, 
            thumbnail: product.image 
          }, 43200); // Cache for 12 hour
        });

        logger.info(`Search performed and cached for query: "${searchQuery}". Results: ${searchResults.results.length}`);
      } else {
        logger.info(`No products found for search query: "${searchQuery}"`);
        return res.status(404).json({ message: 'No products found' });
      }
    } catch (error) {
      logger.error(`Error on getSearchResults. Search Query: "${searchQuery}", Error: ${error.message}`);
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  } else {
    logger.info(`Search results retrieved from cache for query: "${searchQuery}"`);
  }

  res.json({
    searchQuery,
    results: searchResults.results
  });
};

export const getProductDetails = async (req, res) => {
  const { productId } = req.params;

  const { error } = validateProductId(productId);
  if (error) {
    logger.error(`Invalid product ID: "${productId}". Error: ${error.details[0].message}`);
    return res.status(400).json({ message: error.details[0].message });
  }

  const cacheKey = `product:${productId}:full`;
  let fullProductInfo = cache.get(cacheKey);

  if (!fullProductInfo) {
    try {
      logger.info(`Fetching full product info for product ID: "${productId}"`);
      const [details, reviews, offers] = await Promise.all([
        fetchData(`${BASE_URL}&url=https://www.amazon.com/dp/${productId}`),
        fetchData(`${BASE_URL}&url=https://www.amazon.com/product-reviews/${productId}`),
        fetchData(`${BASE_URL}&url=https://www.amazon.com/gp/offer-listing/${productId}`)
      ]);

      fullProductInfo = {
        details,
        reviews,
        offers
      };

      cache.set(cacheKey, fullProductInfo, 43200); // Cache for 12 hour
      logger.info(`Full product info fetched and cached for product ID: "${productId}"`);

      // Cache individual components as well
      cache.set(`product:${productId}:details`, details, 43200);
      cache.set(`product:${productId}:reviews`, reviews, 43200);
      cache.set(`product:${productId}:offers`, offers, 43200);
    } catch (error) {
      logger.error(`Error on getProductDetails. Product ID: "${productId}", Error: ${error.message}`);
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  } else {
    logger.info(`Full product info retrieved from cache for product ID: "${productId}"`);
  }

  res.json(fullProductInfo);
};

export const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  const { error } = validateProductId(productId);
  if (error) {
    logger.error(`Invalid product ID for reviews: "${productId}". Error: ${error.details[0].message}`);
    return res.status(400).json({ message: error.details[0].message });
  }

  const cacheKey = `product:${productId}:reviews`;
  let reviews = cache.get(cacheKey);

  if (!reviews) {
    logger.info(`Reviews not in cache for product ID: "${productId}". Fetching full product info.`);
    // If not in cache, fetch full product info which will cache reviews
    await getProductDetails({ params: { productId } }, { json: () => {} });
    reviews = cache.get(cacheKey);
  }

  if (!reviews) {
    logger.error(`Failed to fetch reviews for product ID: "${productId}"`);
    return res.status(500).json({ message: 'Failed to fetch reviews' });
  }

  logger.info(`Reviews retrieved for product ID: "${productId}"`);
  res.json(reviews);
};

export const getProductOffers = async (req, res) => {
  const { productId } = req.params;

  const { error } = validateProductId(productId);
  if (error) {
    logger.error(`Invalid product ID for offers: "${productId}". Error: ${error.details[0].message}`);
    return res.status(400).json({ message: error.details[0].message });
  }

  const cacheKey = `product:${productId}:offers`;
  let offers = cache.get(cacheKey);

  if (!offers) {
    logger.info(`Offers not in cache for product ID: "${productId}". Fetching full product info.`);
    // If not in cache, fetch full product info which will cache offers
    await getProductDetails({ params: { productId } }, { json: () => {} });
    offers = cache.get(cacheKey);
  }

  if (!offers) {
    logger.error(`Failed to fetch offers for product ID: "${productId}"`);
    return res.status(500).json({ message: 'Failed to fetch offers' });
  }

  logger.info(`Offers retrieved for product ID: "${productId}"`);
  res.json(offers);
};

export const getQuickProductInfo = async (req, res) => {
  const { productId } = req.params;

  const { error } = validateProductId(productId);
  if (error) {
    logger.error(`Invalid product ID for quick info: "${productId}". Error: ${error.details[0].message}`);
    return res.status(400).json({ message: error.details[0].message });
  }

  const cacheKey = `product:${productId}:quick`;
  let quickInfo = cache.get(cacheKey);

  if (!quickInfo) {
    logger.info(`Fetching quick product info for product ID: "${productId}"`);
    try {
      const [details, reviews] = await Promise.all([
        fetchData(`${BASE_URL}&url=https://www.amazon.com/dp/${productId}`),
        fetchData(`${BASE_URL}&url=https://www.amazon.com/product-reviews/${productId}`)
      ]);

      quickInfo = {
        productId,
        title: details.name,
        rating: details.rating,
        price: details.price,
        reviewsCount: reviews.reviews_count,
        topPositiveReview: reviews.top_positive_review,
        topCriticalReview: reviews.top_critical_review
      };

      cache.set(cacheKey, quickInfo, 43200); // Cache quick info for 12 hours (43200 seconds)
      logger.info(`Quick product info fetched and cached for product ID: "${productId}"`);
    } catch (error) {
      logger.error(`Error on getQuickProductInfo. Product ID: "${productId}", Error: ${error.message}`);
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  } else {
    logger.info(`Quick product info retrieved from cache for product ID: "${productId}"`);
  }

  res.json(quickInfo);
};
