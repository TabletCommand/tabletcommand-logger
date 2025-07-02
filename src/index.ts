import _logger from "./winston-logger";
import _loggerMiddleware from "./middleware/logger";
import _metricsMiddleware, { cleanUpParams, } from "./middleware/metrics";
import _statusLogger from "./middleware/status-logger";

export { LoggerConfig } from "./winston-logger";

export const logger = _logger;
export const loggerMiddleware = _loggerMiddleware;
export const metricsCleanUpParams = cleanUpParams;
export const metricsMiddleware = _metricsMiddleware;
export const statusLogger = _statusLogger;

export default {
  logger,
  loggerMiddleware,
  metricsMiddleware,
  metricsCleanUpParams,
  statusLogger,
};
