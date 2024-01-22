import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cacheFilePath = path.join(__dirname, '../..', 'cache.json');

export const setCache = (key, data) => {
  try {
    let cache = {};
    if (fs.existsSync(cacheFilePath)) {
      cache = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
    }

    cache[key] = {
      data,
      expiry: Date.now() + 1000 * 60 * 2, // Cache for 5 minutes
    };

    fs.writeFileSync(cacheFilePath, JSON.stringify(cache));
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

export const getCache = (key) => {
  try {
    if (!fs.existsSync(cacheFilePath)) {
      return null;
    }

    const cache = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
    const item = cache[key];
    if (item && Date.now() < item.expiry) {
      return item.data;
    }

    // If the item is expired, return null
    return null;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

export const clearExpiredCache = () => {
  try {
    if (fs.existsSync(cacheFilePath)) {
      let cache = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
      let isCacheUpdated = false;

      Object.keys(cache).forEach((key) => {
        if (Date.now() >= cache[key].expiry) {
          delete cache[key];
          isCacheUpdated = true;
        }
      });

      if (isCacheUpdated) {
        fs.writeFileSync(cacheFilePath, JSON.stringify(cache));
      }
    }
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
};
