import { cache } from '../global.js';

export const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      return res.json(cachedResponse);
    } else {
      res.originalJson = res.json;
      res.json = (body) => {
        cache.set(key, body, duration);
        res.originalJson(body);
      };
      next();
    }
  };
};