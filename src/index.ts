
import _logger from "./bunyan-logger";
import _loggerMiddleware from "./middleware/logger";
import _metricsMiddleware from "./middleware/metrics";
import _statusLogger from "./middleware/status-logger";

export const logger = _logger;
export const loggerMiddleware = _loggerMiddleware;
export const metricsMiddleware = _metricsMiddleware;
export const statusLogger = _statusLogger;

export default {
  logger,
  loggerMiddleware,
  metricsMiddleware,
  statusLogger,
};
