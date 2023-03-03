const express = require("express");
const request = require("request-promise");

const app = express();
const PORT = process.env.PORT || 5000;

require("dotenv").config();

const apiKey = process.env.API_KEY;

const baseURL = `http://api.scraperapi.com?api_key=${apiKey}&autoparse=true`;

require("dotenv").config();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  next();
});


app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to Dungy's Amazon Scraper API");
});

//Get Product Details
app.get("/products/:productId", async (req, res) => {
  const { productId } = req.params;
  try {
    const response = await request(
      `${baseURL}&url=https://www.amazon.com/dp/${productId}`
    );
    res.json(JSON.parse(response));
  } catch (error) {
    res.json(error);
  }
});

//Get Product Reviews
app.get("/products/:productId/reviews", async (req, res) => {
  const { productId } = req.params;
  try {
    const response = await request(
      `${baseURL}&url=https://www.amazon.com/product-reviews/${productId}`
    );
    res.json(JSON.parse(response));
  } catch (error) {
    res.json(error);
  }
});

//Get Product offers
app.get("/products/:productId/offers", async (req, res) => {
  const { productId } = req.params;
  try {
    const response = await request(
      `${baseURL}&url=https://www.amazon.com/gp/offer-listing/${productId}`
    );
    res.json(JSON.parse(response));
  } catch (error) {
    res.json(error);
  }
});

//Get Search Results
app.get("/search/:searchQuery", async (req, res) => {
  const { searchQuery } = req.params;
  try {
    const response = await request(
      `${baseURL}&url=https://www.amazon.com/s?k=${searchQuery}`
    );
    res.json(JSON.parse(response));
  } catch (error) {
    res.json(error);
  }
});

app.listen(PORT, () => console.log(`SERVER ON PORT: ${PORT}`));
