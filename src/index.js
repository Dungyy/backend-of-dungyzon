import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes/scraperRoutes.js';
import { PORT } from './global.js';
import logger from './logger.js';
import rateLimit from 'express-rate-limit';

dotenv.config();

// Apply rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 100 requests per windowMs
});

const app = express();
app.use(cors());
app.use(express.json());
app.use('/', router);
app.use(limiter);

app.listen(PORT, () => {
  logger.info(`Server running on port: ${PORT}`);
});
