import fetch from 'node-fetch';
import logger from '../logger.js';
import { cache } from '../global.js';

const fetchData = async (url) => {
  const cacheKey = `fetch:${url}`;
  let data = cache.get(cacheKey);

  if (!data) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      data = await response.json();
      cache.set(cacheKey, data, 3600); // Cache for 1 hour
      logger.info(`Data fetched and cached: ${url}`);
    } catch (error) {
      logger.error(`Error fetching data: ${error.message}`);
      throw error;
    }
  } else {
    logger.info(`Data retrieved from cache: ${url}`);
  }

  return data;
};

export default fetchData;