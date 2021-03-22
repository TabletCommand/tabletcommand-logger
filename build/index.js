"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bunyan_logger_1 = __importDefault(require("./bunyan-logger"));
const logger_1 = __importDefault(require("./middleware/logger"));
const metrics_1 = __importDefault(require("./middleware/metrics"));
const status_logger_1 = __importDefault(require("./middleware/status-logger"));
exports.default = {
    logger: bunyan_logger_1.default,
    loggerMiddleware: logger_1.default,
    metricsMiddleware: metrics_1.default,
    statusLogger: status_logger_1.default,
};
//# sourceMappingURL=index.js.map