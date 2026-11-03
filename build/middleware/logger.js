"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactQuery = exports.redactOriginalURL = exports.redactHeaders = void 0;
exports.default = loggerMiddleware;
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const redaction_1 = require("../redaction");
Object.defineProperty(exports, "redactHeaders", { enumerable: true, get: function () { return redaction_1.redactHeaders; } });
Object.defineProperty(exports, "redactOriginalURL", { enumerable: true, get: function () { return redaction_1.redactOriginalURL; } });
Object.defineProperty(exports, "redactQuery", { enumerable: true, get: function () { return redaction_1.redactQuery; } });
function loggerMiddleware(logger) {
    if (!logger) {
        return function noopMiddleware(_req, _res, next) {
            return next();
        };
    }
    const anyLog = logger;
    const asJson = pino_1.default.symbols.asJsonSym;
    const isPinoInstance = typeof anyLog[asJson] === "function" ||
        (typeof anyLog.child === "function" && Boolean(anyLog.levels));
    if (isPinoInstance && typeof anyLog[asJson] === "function") {
        const pHttp = (0, pino_http_1.default)({
            logger: anyLog,
            customProps: (req, res) => {
                var _a;
                const expressReq = req;
                const expressRes = res;
                const originalUrl = expressReq.originalUrl || expressReq.url || "";
                return {
                    remoteAddress: expressReq.ip || ((_a = expressReq.socket) === null || _a === void 0 ? void 0 : _a.remoteAddress),
                    method: expressReq.method,
                    url: (0, redaction_1.redactOriginalURL)(originalUrl),
                    protocol: expressReq.protocol,
                    hostname: expressReq.hostname,
                    httpVersion: expressReq.httpVersionMajor
                        ? `${expressReq.httpVersionMajor}.${expressReq.httpVersionMinor}`
                        : expressReq.httpVersion,
                    userAgent: expressReq.headers ? expressReq.headers["user-agent"] : undefined,
                    status: expressRes.statusCode ? expressRes.statusCode : 0,
                };
            },
            serializers: {
                req: (req) => {
                    var _a, _b, _c;
                    const r = req;
                    const originalUrl = ((_a = r.raw) === null || _a === void 0 ? void 0 : _a.originalUrl) || r.originalUrl || r.url || "";
                    return {
                        body: (_c = (_b = r.raw) === null || _b === void 0 ? void 0 : _b.body) !== null && _c !== void 0 ? _c : r.body,
                        headers: (0, redaction_1.redactHeaders)(r.headers || {}),
                        method: r.method,
                        originalUrl: (0, redaction_1.redactOriginalURL)(originalUrl),
                    };
                },
                res: (res) => {
                    const r = res;
                    const rawRes = r.raw || r;
                    let headers = {};
                    if (typeof rawRes.getHeaders === "function") {
                        headers = rawRes.getHeaders();
                    }
                    else if (typeof r.getHeaders === "function") {
                        headers = r.getHeaders();
                    }
                    return {
                        statusCode: r.statusCode,
                        headers: (0, redaction_1.redactHeaders)(headers),
                    };
                },
            },
        });
        return function accessLogMiddleware(req, res, next) {
            return pHttp(req, res, next);
        };
    }
    // Fallback for mocks or custom logger implementations
    return function accessLogMiddleware(req, res, next) {
        if (typeof anyLog.child === "function" && !req.log) {
            req.log = anyLog.child();
        }
        res.on("finish", () => {
            logger.info({
                remoteAddress: req.ip,
                method: req.method,
                url: (0, redaction_1.redactOriginalURL)(req.originalUrl),
                protocol: req.protocol,
                hostname: req.hostname,
                httpVersion: req.httpVersionMajor
                    ? `${req.httpVersionMajor}.${req.httpVersionMinor}`
                    : req.httpVersion,
                userAgent: req.headers ? req.headers["user-agent"] : undefined,
                req: {
                    body: req.body,
                    headers: (0, redaction_1.redactHeaders)(req.headers),
                    method: req.method,
                    originalUrl: (0, redaction_1.redactOriginalURL)(req.originalUrl),
                },
                status: res.statusCode ? res.statusCode : 0,
            });
        });
        return next();
    };
}
//# sourceMappingURL=logger.js.map