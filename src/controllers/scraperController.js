import fetchData from "../utils/fetchData.js";
import { BASE_URL } from "../global.js";

// Welcome Message
export const getWelcomeMessage = (req, res) => {
  res.send("Welcome to Dungy's Amazon Scraper API");
};

// Product Details
export const getProductDetails = async (req, res) => {
  const { productId } = req.params;
  try {
    const data = await fetchData(
      `${BASE_URL}&url=https://www.amazon.com/dp/${productId}`
    );
    res.json(data);
    logger.debug(`getProductDetails Data: ${data}`);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
    logger.error(`Error on /products/:productId \n Error ${error}`);
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
    logger.debug(`getProductReviews Data: ${data}`);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
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
    logger.debug(`getProductOffers Data: ${data}`);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
    logger.error(`Error on products/:productId/offers \n Error ${error}`);
  }
};

// export const getSearchResults = async (req, res) => {
//   const { searchQuery } = req.params;
//   try {
//     const data = await fetchData(
//       `${BASE_URL}&url=https://www.amazon.com/s?k=${encodeURIComponent(
//         searchQuery
//       )}`
//     );
//     res.json(data);
//   } catch (error) {
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };
