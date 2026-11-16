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
    const isPinoInstance = typeof anyLog[asJson] === "function";
    if (isPinoInstance) {
        // pino-http binds `req` (and customProps) to a child logger when the request arrives,
        // before body parsers run, and calls customProps again on finish. Binding there loses
        // req.body and writes every custom field twice. Instead keep the arrival child quiet
        // (reqId only) and build the whole access line once, when the response finishes.
        const accessFields = (req, res) => {
            var _a;
            return ({
                remoteAddress: req.ip || ((_a = req.socket) === null || _a === void 0 ? void 0 : _a.remoteAddress),
                method: req.method,
                url: (0, redaction_1.redactOriginalURL)(req.originalUrl || req.url || ""),
                protocol: req.protocol,
                hostname: req.hostname,
                httpVersion: req.httpVersionMajor
                    ? `${req.httpVersionMajor}.${req.httpVersionMinor}`
                    : req.httpVersion,
                userAgent: req.headers ? req.headers["user-agent"] : undefined,
                req,
                status: res.statusCode ? res.statusCode : 0,
            });
        };
        const pHttp = (0, pino_http_1.default)({
            logger: anyLog,
            quietReqLogger: true,
            quietResLogger: true,
            customSuccessObject: (req, res, val) => ({
                ...accessFields(req, res),
                ...val,
            }),
            customErrorObject: (req, res, _err, val) => ({
                ...accessFields(req, res),
                ...val,
            }),
            serializers: {
                req: (req) => {
                    var _a, _b, _c;
                    const r = req;
                    const originalUrl = ((_a = r.raw) === null || _a === void 0 ? void 0 : _a.originalUrl) || r.originalUrl || r.url || "";
                    return {
                        body: (0, redaction_1.redactSecrets)((_c = (_b = r.raw) === null || _b === void 0 ? void 0 : _b.body) !== null && _c !== void 0 ? _c : r.body),
                        headers: (0, redaction_1.redactHeaders)(r.headers || {}),
                        method: r.method,
                        originalUrl: (0, redaction_1.redactOriginalURL)(originalUrl),
                    };
                },
                // pino-http hands this the already serialized error.
                err: (err) => (0, redaction_1.redactSecrets)(err && typeof err === "object" ? { ...err } : err),
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
            req.log = anyLog.child({});
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