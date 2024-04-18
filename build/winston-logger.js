"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const datadog_winston_1 = __importDefault(require("datadog-winston"));
function logger(config) {
    const loggingEnabled = config.logToConsole === true || config.logToFile === true || config.logToDatadog === true;
    if (!loggingEnabled) {
        return null;
    }
    const trs = [];
    if (config.logToConsole) {
        const cfg = new winston_1.transports.Console();
        trs.push(cfg);
    }
    if (config.logToFile) {
        const daily = new winston_daily_rotate_file_1.default({
            filename: `${config.filename}-%DATE%.json`,
            dirname: config.dirname,
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxFiles: "52d",
            utc: true,
            watchLog: true,
        });
        trs.push(daily);
    }
    if (config.logToDatadog) {
        const dd = new datadog_winston_1.default({
            apiKey: config.datadogApiKey,
            service: config.name,
        });
        trs.push(dd);
    }
    const loggerClient = (0, winston_1.createLogger)({
        level: "info",
        format: winston_1.format.combine(
        // If you pass in a TimestampOptions, it will convert the date from UTC to local TZ
        winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.splat(), winston_1.format.json()),
        defaultMeta: { service: config.name },
        transports: trs,
        exitOnError: false,
    });
    return loggerClient;
}
exports.default = logger;
//# sourceMappingURL=winston-logger.js.map