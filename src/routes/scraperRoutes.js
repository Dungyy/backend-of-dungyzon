// Enhanced API Routes for Dungyzon Backend
import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getWelcomeMessage,
  getSearchResults,
  getProductDetails,
  getProductReviews,
  getProductOffers,
  getQuickProductInfo,
  getCacheStats,
  getHealthCheck,
  clearCache
} from '../controllers/scraperController.js';

const router = express.Router();

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 search requests per minute
  message: {
    success: false,
    error: {
      message: 'Too many search requests, please try again later.',
      code: 'SEARCH_RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 requests per 5 minutes
  message: {
    success: false,
    error: {
      message: 'Too many requests for this endpoint, please try again later.',
      code: 'STRICT_RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware for logging requests
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};

// Apply general rate limiting and logging to all routes
router.use(generalLimiter);
router.use(requestLogger);

// =============================================================================
// PUBLIC API ROUTES
// =============================================================================

/**
 * @route   GET /
 * @desc    Welcome message and API information
 * @access  Public
 */
router.get('/', getWelcomeMessage);

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', getHealthCheck);

/**
 * @route   GET /search/:searchQuery
 * @desc    Search for products
 * @access  Public
 * @params  searchQuery - Product search term
 * @query   page - Page number (optional, default: 1)
 * @query   limit - Results per page (optional, default: 20, max: 50)
 * @example GET /search/laptop?page=1&limit=20
 */
router.get('/search/:searchQuery', searchLimiter, getSearchResults);

/**
 * @route   GET /products/:productId
 * @desc    Get detailed product information
 * @access  Public
 * @params  productId - Amazon ASIN or product ID
 * @query   reviews - Include reviews (optional, values: true/false)
 * @query   offers - Include offers (optional, values: true/false)
 * @example GET /products/B08N5WRWNW?reviews=true&offers=true
 */
router.get('/products/:productId', getProductDetails);

/**
 * @route   GET /products/:productId/reviews
 * @desc    Get product reviews
 * @access  Public
 * @params  productId - Amazon ASIN or product ID
 * @query   page - Page number (optional, default: 1)
 * @query   sortBy - Sort reviews by (optional, values: helpful, newest, oldest, rating)
 * @example GET /products/B08N5WRWNW/reviews?page=1&sortBy=helpful
 */
router.get('/products/:productId/reviews', getProductReviews);

/**
 * @route   GET /products/:productId/offers
 * @desc    Get product offers and deals
 * @access  Public
 * @params  productId - Amazon ASIN or product ID
 * @example GET /products/B08N5WRWNW/offers
 */
router.get('/products/:productId/offers', getProductOffers);

/**
 * @route   GET /products/:productId/quick
 * @desc    Get quick product information (optimized for fast response)
 * @access  Public
 * @params  productId - Amazon ASIN or product ID
 * @example GET /products/B08N5WRWNW/quick
 */
router.get('/products/:productId/quick', getQuickProductInfo);

// =============================================================================
// ADMIN/MONITORING ROUTES (Consider adding authentication in production)
// =============================================================================

/**
 * @route   GET /cache/stats
 * @desc    Get cache statistics and performance metrics
 * @access  Public (Consider restricting in production)
 * @example GET /cache/stats
 */
router.get('/cache/stats', getCacheStats);

/**
 * @route   DELETE /cache
 * @desc    Clear cache entries
 * @access  Public (Consider restricting in production)
 * @query   type - Cache type to clear (optional, values: search, product, etc.)
 * @example DELETE /cache?type=search
 */
router.delete('/cache', strictLimiter, clearCache);

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

// Handle 404 errors for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`,
      code: 'ROUTE_NOT_FOUND',
      availableRoutes: [
        'GET /',
        'GET /health',
        'GET /search/:searchQuery',
        'GET /products/:productId',
        'GET /products/:productId/reviews',
        'GET /products/:productId/offers',
        'GET /products/:productId/quick',
        'GET /cache/stats',
        'DELETE /cache'
      ],
      timestamp: new Date().toISOString()
    }
  });
});

// Global error handler
router.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    }
  });
});

export default router;
