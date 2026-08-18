"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactHeaders = redactHeaders;
exports.redactQuery = redactQuery;
exports.redactOriginalURL = redactOriginalURL;
exports.default = loggerMiddleware;
const lodash_1 = __importDefault(require("lodash"));
// Each of these authenticates a request on its own, so a log line that keeps the whole
// value is a live credential. The header stays, cut to a 7-character prefix: enough to
// tell two keys apart, not enough to replay one. Node lowercases incoming header names.
const keyHeaders = [
    "authorization",
    "apikey",
    "personnelapikey",
    "x-tc-auth-token",
];
// tabletcommand-session reads each of these from the query string when the header is
// absent, and accepts either spelling. signupKey only ever arrives in the query.
const keyParams = [
    "apikey",
    "personnelapikey",
    "signupkey",
];
const keyParamPattern = new RegExp(`([?&](?:${keyParams.join("|")})=)([^&]*)`, "gi");
const redacted = "<redacted>";
function keepPrefix(value) {
    return value.substring(0, 7);
}
// A scheme fills the whole prefix on its own, so keep it and take the prefix from the
// credential behind it.
function redactAuthorization(value) {
    const [scheme, ...rest] = value.split(" ");
    if (rest.length === 0) {
        return keepPrefix(value);
    }
    return `${scheme} ${keepPrefix(rest.join(" "))}`;
}
// Cookie names answer "did the caller send a session at all", so they stay and the values go.
function redactCookie(value) {
    return value
        .split(";")
        .map((pair) => pair.split("=")[0].trim())
        .filter((name) => name !== "")
        .map((name) => `${name}=${redacted}`)
        .join("; ");
}
function redactorFor(name) {
    if (name === "cookie") {
        return redactCookie;
    }
    if (name === "authorization") {
        return redactAuthorization;
    }
    return keepPrefix;
}
// Node only gives a string or an array of strings, so anything else means other
// middleware wrote to req.headers. Drop it rather than throw: this runs in a res
// "finish" listener, where an exception ends the process.
function redactHeaderValue(name, value) {
    const redact = redactorFor(name);
    if (lodash_1.default.isArray(value)) {
        return value.map((entry) => lodash_1.default.isString(entry) ? redact(entry) : redacted);
    }
    if (!lodash_1.default.isString(value)) {
        return redacted;
    }
    return redact(value);
}
function redactHeaders(headers) {
    const clean = { ...headers };
    for (const [name, value] of Object.entries(clean)) {
        const lower = name.toLowerCase();
        if (lodash_1.default.isUndefined(value) || (lower !== "cookie" && !keyHeaders.includes(lower))) {
            continue;
        }
        clean[name] = redactHeaderValue(lower, value);
    }
    return clean;
}
function redactQueryValue(value) {
    if (lodash_1.default.isString(value)) {
        return keepPrefix(value);
    }
    if (lodash_1.default.isArray(value)) {
        return value.map((entry) => lodash_1.default.isString(entry) ? keepPrefix(entry) : redacted);
    }
    return redacted;
}
function redactQuery(query) {
    const clean = { ...query };
    for (const [name, value] of Object.entries(clean)) {
        if (lodash_1.default.isUndefined(value) || !keyParams.includes(name.toLowerCase())) {
            continue;
        }
        clean[name] = redactQueryValue(value);
    }
    return clean;
}
// req.originalUrl is relative, so this works on the string rather than parsing a URL.
function redactOriginalURL(maybeURL) {
    if (!lodash_1.default.isString(maybeURL) || maybeURL === "") {
        return "";
    }
    return maybeURL.replace(keyParamPattern, (_match, name, value) => `${name}${keepPrefix(value)}`);
}
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
                    headers: redactHeaders(req.headers),
                    method: req.method,
                    originalUrl: redactOriginalURL(req.originalUrl)
                },
                status: res.statusCode ? res.statusCode : 0
            });
        });
        return next();
    };
}
//# sourceMappingURL=logger.js.map