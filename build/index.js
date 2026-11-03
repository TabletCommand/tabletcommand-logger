"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusLogger = exports.metricsMiddleware = exports.metricsCleanUpParams = exports.loggerMiddleware = exports.logger = exports.isPinoPrettyAvailable = exports.pinoCensor = exports.MAX_REDACT_DEPTH = exports.REDACT_PATHS = exports.redactQuery = exports.redactOriginalURL = exports.redactHeaders = void 0;
const pino_logger_1 = __importStar(require("./pino-logger"));
const logger_1 = __importDefault(require("./middleware/logger"));
const metrics_1 = __importStar(require("./middleware/metrics"));
const status_logger_1 = __importDefault(require("./middleware/status-logger"));
var logger_2 = require("./middleware/logger");
Object.defineProperty(exports, "redactHeaders", { enumerable: true, get: function () { return logger_2.redactHeaders; } });
Object.defineProperty(exports, "redactOriginalURL", { enumerable: true, get: function () { return logger_2.redactOriginalURL; } });
Object.defineProperty(exports, "redactQuery", { enumerable: true, get: function () { return logger_2.redactQuery; } });
var redaction_1 = require("./redaction");
Object.defineProperty(exports, "REDACT_PATHS", { enumerable: true, get: function () { return redaction_1.REDACT_PATHS; } });
Object.defineProperty(exports, "MAX_REDACT_DEPTH", { enumerable: true, get: function () { return redaction_1.MAX_REDACT_DEPTH; } });
Object.defineProperty(exports, "pinoCensor", { enumerable: true, get: function () { return redaction_1.pinoCensor; } });
var pino_logger_2 = require("./pino-logger");
Object.defineProperty(exports, "isPinoPrettyAvailable", { enumerable: true, get: function () { return pino_logger_2.isPinoPrettyAvailable; } });
exports.logger = pino_logger_1.default;
exports.loggerMiddleware = logger_1.default;
exports.metricsCleanUpParams = metrics_1.cleanUpParams;
exports.metricsMiddleware = metrics_1.default;
exports.statusLogger = status_logger_1.default;
exports.default = {
    isPinoPrettyAvailable: pino_logger_1.isPinoPrettyAvailable,
    logger: exports.logger,
    loggerMiddleware: exports.loggerMiddleware,
    metricsMiddleware: exports.metricsMiddleware,
    metricsCleanUpParams: exports.metricsCleanUpParams,
    statusLogger: exports.statusLogger,
};
//# sourceMappingURL=index.js.map