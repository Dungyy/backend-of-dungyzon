import fetchData from '../utils/fetchData.js';
import { BASE_URL } from '../global.js';
import logger from '../logger.js';

// Welcome Message
export const getWelcomeMessage = (req, res) => {
  res.send("Welcome to Dungy's Amazon Scraper API");
};

// Product Details
export const getProductDetails = async (req, res) => {
  const { productId } = req.params;
  try {
    const data = await fetchData(`${BASE_URL}&url=https://www.amazon.com/dp/${productId}`);
    res.json(data);
    // logger.debug(
    //   `getProductDetails for Product ID: ${productId}, Data: ${JSON.stringify(
    //     data
    //   )}`
    // );
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
    logger.error(`Error on /products/:productId, Product ID: ${productId}, Error: ${error}`);
  }
};

// Product Reviews
export const getProductReviews = async (req, res) => {
  const { productId } = req.params;
  try {
    const data = await fetchData(
      `${BASE_URL}&url=https://www.amazon.com/product-reviews/${productId}`
    );
    res.json(data);
    // logger.debug(`getProductReviews Data: ${JSON.stringify(data)}`);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
    logger.error(`Error on products/:productId/reviews \n Error ${error}`);
  }
};

// Product Offers
export const getProductOffers = async (req, res) => {
  const { productId } = req.params;
  try {
    const data = await fetchData(
      `${BASE_URL}&url=https://www.amazon.com/gp/offer-listing/${productId}`
    );
    res.json(data);
    // logger.debug(`getProductOffers Data: ${JSON.stringify(data)}`);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
    logger.error(`Error on products/:productId/offers \n Error ${error}`);
  }
};

// Search for products
export const getSearchResults = async (req, res) => {
  const { searchQuery } = req.params;
  try {
    const data = await fetchData(
      `${BASE_URL}&url=https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}`
    );
    // TODO
    // Some weird non-issue where sending headers twice?
    if (!res.headersSent) {
      res.json(data);
      // logger.debug(`getSearchResults Data: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
};

// const buildUrl = (API_KEY, productId, type) => {
//   switch (type) {
//     case "details":
//       return `http://api.scraperapi.com?api_key=${API_KEY}&autoparse=true&url=https://www.amazon.com/dp/${productId}`;
//     case "reviews":
//       return `http://api.scraperapi.com?api_key=${API_KEY}&autoparse=true&url=https://www.amazon.com/product-reviews/${productId}`;
//     case "offers":
//       return `http://api.scraperapi.com?api_key=${API_KEY}&autoparse=true&url=https://www.amazon.com/gp/offer-listing/${productId}`;
//     default:
//       throw new Error("Invalid type for URL building");
//   }
// };

// export const fetchAllProductData = async (req, res) => {
//   const productId = req.params.productId;

//   try {
//     const urls = ["details", "reviews", "offers"].map((type) =>
//       buildUrl(API_KEY, productId, type)
//     );
//     const results = await Promise.all(urls.map(fetchData));

//     const [details, reviews, offers] = results;
//     res.json({ details, reviews, offers });
//     logger.debug(
//       `fetchAllProductData Data: ${details} \n ${reviews} \n ${offers}`
//     );
//   } catch (error) {
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };
