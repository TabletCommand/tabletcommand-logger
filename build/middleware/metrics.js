"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const url_1 = require("url");
const lodash_1 = __importDefault(require("lodash"));
const debug_1 = __importDefault(require("debug"));
const express_statsd_1 = __importDefault(require("express-statsd"));
const monitorRequest = (0, express_statsd_1.default)();
// Add an express-statsd key that looks like http.post.api.hello.world for a HTTP POST to /api/hello/world URL
// See https://github.com/uber/express-statsd
function metrics(filter) {
    const debug = (0, debug_1.default)("tabletcommand-logger:middleware/metrics");
    function defaultFilter(pathIn) {
        const uuidRegex = /[-a-f\d]{36}/i;
        const mongoIdRegex = /[a-f\d]{24}/i;
        let path = pathIn;
        if (uuidRegex.exec(path) || mongoIdRegex.exec(path)) {
            const parts = path.split(".");
            const cleanParts = parts.filter(function (part) {
                const isUUID = uuidRegex.exec(part);
                const isMongoId = mongoIdRegex.exec(part);
                return !(isUUID || isMongoId);
            });
            path = cleanParts.join(".");
        }
        if (path !== pathIn) {
            debug(`Cleaned up path: ${path}.`);
        }
        return path;
    }
    function setStatsDKey(req, hostname, env) {
        let method = req.method || "unknown_method";
        method = method.toLowerCase();
        const defaultBase = "http://localhost";
        const urlItem = new url_1.URL(req.url, defaultBase);
        let path = urlItem.pathname.toLowerCase();
        path = path.replace(/\//g, " ").trim().replace(/\s/g, ".");
        let filterFunc = defaultFilter;
        if (lodash_1.default.isFunction(filter)) {
            filterFunc = filter;
        }
        const filteredPath = filterFunc(path);
        req.statsdKey = [
            hostname,
            env,
            "http",
            method,
            filteredPath
        ].join(".");
        debug(`req.statsdKey: ${req.statsdKey}`);
    }
    function statsd() {
        return function statsdFunc(req, res, next) {
            const hostname = process.env.NODE_STATSD_PREFIX || os_1.default.hostname();
            const env = process.env.NODE_ENV || "production";
            setStatsDKey(req, hostname, env);
            monitorRequest(req, res);
            return next();
        };
    }
    return {
        defaultFilter,
        setStatsDKey,
        statsd,
    };
}
exports.default = metrics;
//# sourceMappingURL=metrics.js.map