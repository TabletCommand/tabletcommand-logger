"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactQuery = exports.requestDuration = exports.shouldIgnore = void 0;
const lodash_1 = __importDefault(require("lodash"));
const logger_1 = require("./logger");
const allowedMethods = ["POST"];
function shouldIgnore(req, res) {
    var _a;
    if (lodash_1.default.isObject(res) && res.statusCode === 304) {
        return true;
    }
    // Log only if method is in the allowed array
    const m = ((_a = req === null || req === void 0 ? void 0 : req.method) !== null && _a !== void 0 ? _a : "unknown").toUpperCase();
    const shouldLog = allowedMethods.indexOf(m) >= 0;
    if (!shouldLog) {
        return true;
    }
    const userAgent = lodash_1.default.get(req, "headers.user-agent");
    if (lodash_1.default.isString(userAgent) && /Mozilla/i.exec(userAgent)) {
        return true;
    }
    return false;
}
exports.shouldIgnore = shouldIgnore;
function requestDuration(endTime, startTime) {
    if (!lodash_1.default.isObject(startTime) || !lodash_1.default.isDate(startTime)) {
        return 0;
    }
    return endTime.valueOf() - startTime.valueOf();
}
exports.requestDuration = requestDuration;
function redactQuery(q) {
    if (lodash_1.default.isString(q.apikey)) {
        q.apikey = q.apikey.substring(0, 7);
    }
    return q;
}
exports.redactQuery = redactQuery;
function statusLogger(logger) {
    return function requestLogger(req, res, next) {
        if (!lodash_1.default.isObject(req._startTime)) {
            req._startTime = new Date();
        }
        res.bodyCopy = null;
        // Save a copy of the response body
        const oldJSON = res.json.bind(res);
        // Used when using res.json(body);
        res.json = function newJson(body) {
            if (lodash_1.default.isString(body)) {
                try {
                    res.bodyCopy = JSON.parse(body);
                }
                catch (_a) {
                    res.bodyCopy = body;
                }
            }
            else {
                res.bodyCopy = body;
            }
            oldJSON(body);
            res.responseTime = requestDuration(new Date(), req._startTime);
            return res;
        };
        function logRequest() {
            res.removeListener("finish", logRequest);
            res.removeListener("close", logRequest);
            if (shouldIgnore(req, res) || !logger) {
                return;
            }
            const cleanReq = lodash_1.default.pick(req, [
                "body",
                "departmentLog",
                "headers",
                "httpVersion",
                "method",
                "originalUrl",
                "path",
                "query",
            ]);
            cleanReq.originalUrl = (0, logger_1.redactOriginalURL)(req.originalUrl);
            cleanReq.query = redactQuery(req.query);
            const cleanRes = lodash_1.default.pick(res, [
                "bodyCopy",
                "responseTime",
                "statusCode",
            ]);
            logger.info({
                req: cleanReq,
                res: cleanRes,
            });
        }
        res.on("finish", logRequest);
        res.on("close", logRequest);
        return next();
    };
}
exports.default = statusLogger;
//# sourceMappingURL=status-logger.js.map