import _logger, { isPinoPrettyAvailable } from "./pino-logger";
import _loggerMiddleware from "./middleware/logger";
import _metricsMiddleware, { cleanUpParams } from "./middleware/metrics";
import _statusLogger from "./middleware/status-logger";

export { LoggerConfig, StrictLogger, StrictLogMethod, LoggerModule } from "./logger-types";
export { redactHeaders, redactOriginalURL, redactQuery } from "./middleware/logger";
export { REDACT_PATHS, MAX_REDACT_DEPTH, pinoCensor, redactSetCookie } from "./redaction";
export { isPinoPrettyAvailable } from "./pino-logger";

export const logger = _logger;
export const loggerMiddleware = _loggerMiddleware;
export const metricsCleanUpParams = cleanUpParams;
export const metricsMiddleware = _metricsMiddleware;
export const statusLogger = _statusLogger;

export default {
  isPinoPrettyAvailable,
  logger,
  loggerMiddleware,
  metricsMiddleware,
  metricsCleanUpParams,
  statusLogger,
};
