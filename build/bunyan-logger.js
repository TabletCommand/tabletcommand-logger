"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bunyan_1 = __importDefault(require("bunyan"));
function logger(name, filePath, logToConsole) {
    const streams = [];
    if (logToConsole) {
        const cfg = {
            level: "debug",
            stream: process.stdout,
        };
        streams.push(cfg);
    }
    else {
        const cfg = {
            type: "rotating-file",
            path: filePath,
            period: "1d",
            count: 52,
        };
        streams.push(cfg);
    }
    const loggerClient = bunyan_1.default.createLogger({
        name,
        streams,
    });
    // Reopen file streams on signal
    process.on("SIGUSR2", () => {
        loggerClient.reopenFileStreams();
    });
    return loggerClient;
}
exports.default = logger;
//# sourceMappingURL=bunyan-logger.js.map