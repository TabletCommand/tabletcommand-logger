"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactOriginalURL = void 0;
const lodash_1 = __importDefault(require("lodash"));
function redactOriginalURL(maybeURL) {
    if (!maybeURL) {
        return "";
    }
    try {
        // Attempt to keep first 7 chars of the api key
        const href = new URL(maybeURL);
        const prevApiKey = href.searchParams.get("apikey");
        if (prevApiKey && lodash_1.default.isString(prevApiKey)) {
            href.searchParams.set("apikey", prevApiKey.substring(0, 7));
            return href.toString();
        }
    }
    catch (_error) {
        //
    }
    // Fallback
    return maybeURL.replace(/apikey=.*?(&|$)/, "apikey=xxx&");
}
exports.redactOriginalURL = redactOriginalURL;
function loggerMiddleware(logger) {
    return function accessLogMiddleware(req, res, next) {
        // This doesn't fire the log immediately, but waits until the response is finished
        // This means we have a chance of logging the response code
        res.on("finish", () => {
            // Skip this if no logger is set
            if (!logger) {
                return;
            }
            logger.info({
                remoteAddress: req.ip,
                method: req.method,
                url: redactOriginalURL(req.originalUrl),
                protocol: req.protocol,
                hostname: req.hostname,
                httpVersion: `${req.httpVersionMajor}.${req.httpVersionMinor}`,
                userAgent: req.headers["user-agent"],
                // Added as compatibility
                req: {
                    body: req.body,
                    headers: req.headers,
                    method: req.method,
                    originalUrl: req.originalUrl
                },
                status: res.statusCode ? res.statusCode : 0
            });
        });
        return next();
    };
}
exports.default = loggerMiddleware;
//# sourceMappingURL=logger.js.map