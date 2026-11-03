import _logger, { isPinoPrettyAvailable } from "./pino-logger";
import _loggerMiddleware from "./middleware/logger";
import _metricsMiddleware, { cleanUpParams } from "./middleware/metrics";
import _statusLogger from "./middleware/status-logger";
export { LoggerConfig, StrictLogger, StrictLogMethod, LoggerModule } from "./logger-types";
export { redactHeaders, redactOriginalURL, redactQuery } from "./middleware/logger";
export { REDACT_PATHS, MAX_REDACT_DEPTH, pinoCensor, redactSetCookie } from "./redaction";
export { isPinoPrettyAvailable } from "./pino-logger";
export declare const logger: typeof _logger;
export declare const loggerMiddleware: typeof _loggerMiddleware;
export declare const metricsCleanUpParams: typeof cleanUpParams;
export declare const metricsMiddleware: typeof _metricsMiddleware;
export declare const statusLogger: typeof _statusLogger;
declare const _default: {
    isPinoPrettyAvailable: typeof isPinoPrettyAvailable;
    logger: typeof _logger;
    loggerMiddleware: typeof _loggerMiddleware;
    metricsMiddleware: typeof _metricsMiddleware;
    metricsCleanUpParams: typeof cleanUpParams;
    statusLogger: typeof _statusLogger;
};
export default _default;
//# sourceMappingURL=index.d.ts.map