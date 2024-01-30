import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes/scraperRoutes.js';
import { PORT } from './global.js';
import logger from './logger.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/', router);

app.listen(PORT, () => {
  logger.info(`Server running on port: ${PORT}`);
});
