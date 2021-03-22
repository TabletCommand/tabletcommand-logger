"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
function shouldIgnore(req, res) {
    if (lodash_1.default.isObject(res) && res.statusCode === 304) {
        return true;
    }
    const userAgent = lodash_1.default.get(req, "headers.user-agent");
    if (lodash_1.default.isString(userAgent) && /Mozilla/i.exec(userAgent)) {
        return true;
    }
    return false;
}
function statusLogger(logger) {
    return function requestLogger(req, res, next) {
        if (!lodash_1.default.isObject(req._startTime)) {
            req._startTime = new Date();
        }
        if (lodash_1.default.isObject(req._startTime) && req._startTime instanceof Date) {
            res.responseTime = new Date().valueOf() - req._startTime.valueOf();
        }
        res.bodyCopy = null;
        res.chunkCopy = null;
        // Save a copy of the response body
        const oldJSON = res.json.bind(res);
        // Used when using res.json(body);
        res.json = function newJson(body) {
            res.bodyCopy = body;
            oldJSON(body);
            return res;
        };
        const oldEnd = res.end.bind(res);
        // Used when using res.end(someOutput);
        res.end = function newEnd(chunk) {
            res.chunkCopy = chunk;
            oldEnd(chunk);
        };
        function logRequest() {
            res.removeListener("finish", logRequest);
            res.removeListener("close", logRequest);
            if (shouldIgnore(req, res)) {
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
            const cleanRes = lodash_1.default.pick(res, [
                "bodyCopy",
                "chunkCopy",
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