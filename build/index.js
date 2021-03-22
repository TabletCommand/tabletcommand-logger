"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusLogger = exports.metricsMiddleware = exports.loggerMiddleware = exports.logger = void 0;
const bunyan_logger_1 = __importDefault(require("./bunyan-logger"));
const logger_1 = __importDefault(require("./middleware/logger"));
const metrics_1 = __importDefault(require("./middleware/metrics"));
const status_logger_1 = __importDefault(require("./middleware/status-logger"));
exports.logger = bunyan_logger_1.default;
exports.loggerMiddleware = logger_1.default;
exports.metricsMiddleware = metrics_1.default;
exports.statusLogger = status_logger_1.default;
exports.default = {
    logger: exports.logger,
    loggerMiddleware: exports.loggerMiddleware,
    metricsMiddleware: exports.metricsMiddleware,
    statusLogger: exports.statusLogger,
};
//# sourceMappingURL=index.js.map