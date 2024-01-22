import request from 'request-promise';
import { setCache, getCache } from './cache.js';
import logger from '../logger.js';

const fetchData = async (url) => {
  try {
    const cachedData = getCache(url);
    if (cachedData) {
      logger.debug(`Cache hit for URL: ${url}`);
      logger.info(`Using Cache data`);
      return cachedData;
    }

    logger.debug(`Cache miss for URL: ${url}`);
    logger.info(`Cache miss, adding data to cache`);
    const response = await request(url);
    const data = JSON.parse(response);
    setCache(url, data);
    return data;
  } catch (error) {
    logger.error(`Error in fetchData for URL ${url}:`, error);
    throw error;
  }
};

export default fetchData;
