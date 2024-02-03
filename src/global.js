import dotenv from 'dotenv';

dotenv.config();

export const API_KEY = process.env.API_KEY;

export const IS_PROD = !(
  process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
);

export const IS_DEV = process.env.NODE_ENV === 'development';

export const PORT = IS_DEV ? 5000 : process.env.PORT;

export const BASE_URL = `http://api.scraperapi.com?api_key=${process.env.API_KEY}&autoparse=true`;

export const LIMIT_MAX = 10
export const LIMIT_TIMEOUT_MAX = parseInt(process.env.LIMIT_TIMEOUT_SET, 10);
