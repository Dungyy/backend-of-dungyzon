import express from 'express';
import {
  getWelcomeMessage,
  getProductDetails,
  getProductOffers,
  getProductReviews,
  getSearchResults,
  // fetchAllProductData
} from '../controllers/scraperController.js';

const router = express.Router();

router.get('/', getWelcomeMessage);
router.get('/products/:productId', getProductDetails);
router.get('/products/:productId/reviews', getProductReviews);
router.get('/products/:productId/offers', getProductOffers);
router.get('/search/:searchQuery', getSearchResults);
// router.get('/product/:productId/all', fetchAllProductData);

export default router;
