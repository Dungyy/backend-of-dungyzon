import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes/scraperRoutes.js';
import { PORT, LIMIT_TIMEOUT_MAX, LIMIT_MAX } from './global.js';
import logger from './logger.js';
import rateLimit from 'express-rate-limit';

dotenv.config();

const limiter = rateLimit({
  windowMs: LIMIT_TIMEOUT_MAX, // xx minutes
  max: LIMIT_MAX, // Limit each IP to xx requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const app = express();
app.use(cors());
app.use(limiter);
app.use(express.json());
app.use('/', router);

app.listen(PORT, () => {
  logger.info(`Server running on port: ${PORT}`);
});
