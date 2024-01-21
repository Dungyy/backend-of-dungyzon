import { createLogger, transports, format } from 'winston';
import { IS_PROD } from './global.js';

const logger = createLogger({
  level: IS_PROD ? 'info' : 'silly',
});

logger.add(
  new transports.Console({
    format: format.combine(format.colorize(), format.simple()),
  }),
);

export default logger;