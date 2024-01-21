import dotenv from "dotenv";

dotenv.config();

export const IS_PROD = !(
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
);

export const IS_DEV = process.env.NODE_ENV === "development";

export const PORT = IS_DEV ? 5000 : process.env.PORT;

export const BASE_URL = `http://api.scraperapi.com?api_key=${process.env.API_KEY}&autoparse=true`;
