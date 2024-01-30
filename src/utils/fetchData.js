import request from 'request-promise';
import logger from '../logger.js';

const fetchData = async (url) => {
  try {
    logger.debug(`Fetching data for URL: ${url}`);
    const response = await request(url);
    const data = JSON.parse(response);
    return data;
  } catch (error) {
    logger.error(`Error in fetchData for URL ${url}:`, error);
    throw error;
  }
};

export default fetchData;
