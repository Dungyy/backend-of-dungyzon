import fetchData from '../utils/fetchData.js';
import { BASE_URL, cache } from '../global.js';
import logger from '../logger.js';
import { validateProductId, validateSearchQuery } from '../utils/validateInput.js';

export const getWelcomeMessage = (req, res) => {
  res.send("Welcome to Dungy's Amazon Scraper API");
};

export const getSearchResults = async (req, res) => {
  const { searchQuery } = req.params;
  
  const { error } = validateSearchQuery(searchQuery);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const cacheKey = `search:${searchQuery}`;
  let searchResults = cache.get(cacheKey);

  if (!searchResults) {
    try {
      searchResults = await fetchData(
        `${BASE_URL}&url=https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}`
      );
      
      if (searchResults && searchResults.results && searchResults.results.length > 0) {
        // Cache the entire search results
        cache.set(cacheKey, searchResults, 3600); // Cache for 1 hour

        // Cache individual product basic info
        searchResults.results.forEach(product => {
          const productCacheKey = `product:${product.asin}:basic`;
          cache.set(productCacheKey, {
            asin: product.asin,
            title: product.title,
            price: product.price,
            rating: product.rating,
            thumbnail: product.thumbnail
          }, 3600); // Cache for 1 hour
        });

        logger.info(`Search performed and cached: ${searchQuery}, Results: ${searchResults.results.length}`);
      } else {
        return res.status(404).json({ message: 'No products found' });
      }
    } catch (error) {
      logger.error(`Error on getSearchResults, Search Query: ${searchQuery}, Error: ${error.message}`);
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  } else {
    logger.info(`Search results retrieved from cache: ${searchQuery}`);
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
    return res.status(400).json({ message: error.details[0].message });
  }

  const cacheKey = `product:${productId}:full`;
  let fullProductInfo = cache.get(cacheKey);

  if (!fullProductInfo) {
    try {
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

      cache.set(cacheKey, fullProductInfo, 3600); // Cache for 1 hour
      logger.info(`Full product info fetched and cached: ${productId}`);

      // Cache individual components as well
      cache.set(`product:${productId}:details`, details, 3600);
      cache.set(`product:${productId}:reviews`, reviews, 3600);
      cache.set(`product:${productId}:offers`, offers, 3600);
    } catch (error) {
      logger.error(`Error on getProductDetails, Product ID: ${productId}, Error: ${error.message}`);
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  } else {
    logger.info(`Full product info retrieved from cache: ${productId}`);
  }

  res.json(fullProductInfo);
};

export const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  const { error } = validateProductId(productId);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const cacheKey = `product:${productId}:reviews`;
  let reviews = cache.get(cacheKey);

  if (!reviews) {
    // If not in cache, fetch full product info which will cache reviews
    await getProductDetails({ params: { productId } }, { json: () => {} });
    reviews = cache.get(cacheKey);
  }

  if (!reviews) {
    return res.status(500).json({ message: 'Failed to fetch reviews' });
  }

  res.json(reviews);
};

export const getProductOffers = async (req, res) => {
  const { productId } = req.params;

  const { error } = validateProductId(productId);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const cacheKey = `product:${productId}:offers`;
  let offers = cache.get(cacheKey);

  if (!offers) {
    // If not in cache, fetch full product info which will cache offers
    await getProductDetails({ params: { productId } }, { json: () => {} });
    offers = cache.get(cacheKey);
  }

  if (!offers) {
    return res.status(500).json({ message: 'Failed to fetch offers' });
  }

  res.json(offers);
};

export const getQuickProductInfo = async (req, res) => {
  const { productId } = req.params;

  const { error } = validateProductId(productId);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const cacheKey = `product:${productId}:quick`;
  let quickInfo = cache.get(cacheKey);

  if (!quickInfo) {
    // Check if we have basic info cached from search results
    const basicInfoCacheKey = `product:${productId}:basic`;
    const basicInfo = cache.get(basicInfoCacheKey);

    if (basicInfo) {
      // We have basic info, just fetch reviews
      try {
        const reviews = await fetchData(`${BASE_URL}&url=https://www.amazon.com/product-reviews/${productId}`);
        
        quickInfo = {
          ...basicInfo,
          reviewsCount: reviews.reviews_count,
          topPositiveReview: reviews.top_positive_review,
          topCriticalReview: reviews.top_critical_review
        };

        cache.set(cacheKey, quickInfo, 1800); // Cache quick info for 30 minutes
        logger.info(`Quick product info assembled from basic cache and fetched reviews: ${productId}`);
      } catch (error) {
        logger.error(`Error fetching reviews for quick info, Product ID: ${productId}, Error: ${error.message}`);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
      }
    } else {
      // We don't have basic info, fetch everything
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

        cache.set(cacheKey, quickInfo, 1800); // Cache quick info for 30 minutes
        logger.info(`Quick product info fetched and cached: ${productId}`);
      } catch (error) {
        logger.error(`Error on getQuickProductInfo, Product ID: ${productId}, Error: ${error.message}`);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
      }
    }
  } else {
    logger.info(`Quick product info retrieved from cache: ${productId}`);
  }

  res.json(quickInfo);
};