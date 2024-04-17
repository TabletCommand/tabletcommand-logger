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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusLogger = exports.metricsMiddleware = exports.metricsCleanUpParams = exports.loggerMiddleware = exports.logger = void 0;
const winston_logger_1 = __importDefault(require("./winston-logger"));
const logger_1 = __importDefault(require("./middleware/logger"));
const metrics_1 = __importStar(require("./middleware/metrics"));
const status_logger_1 = __importDefault(require("./middleware/status-logger"));
exports.logger = winston_logger_1.default;
exports.loggerMiddleware = logger_1.default;
exports.metricsCleanUpParams = metrics_1.cleanUpParams;
exports.metricsMiddleware = metrics_1.default;
exports.statusLogger = status_logger_1.default;
exports.default = {
    logger: exports.logger,
    loggerMiddleware: exports.loggerMiddleware,
    metricsMiddleware: exports.metricsMiddleware,
    metricsCleanUpParams: exports.metricsCleanUpParams,
    statusLogger: exports.statusLogger,
};
//# sourceMappingURL=index.js.map