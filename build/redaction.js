"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDACT_PATHS = exports.MAX_REDACT_DEPTH = exports.redacted = exports.keyParams = exports.keyHeaders = void 0;
exports.isKeyParam = isKeyParam;
exports.decodeName = decodeName;
exports.keepPrefix = keepPrefix;
exports.redactAuthorization = redactAuthorization;
exports.redactCookie = redactCookie;
exports.redactSetCookie = redactSetCookie;
exports.redactorFor = redactorFor;
exports.redactHeaderValue = redactHeaderValue;
exports.redactHeaders = redactHeaders;
exports.redactQueryValue = redactQueryValue;
exports.redactQuery = redactQuery;
exports.redactParamPair = redactParamPair;
exports.redactOriginalURL = redactOriginalURL;
exports.pinoCensor = pinoCensor;
const lodash_1 = __importDefault(require("lodash"));
// Each of these authenticates a request on its own, so a log line that keeps the whole
// value is a live credential. The header stays, cut to a 7-character prefix: enough to
// tell two keys apart, not enough to replay one. Node lowercases incoming header names.
exports.keyHeaders = [
    "authorization",
    "apikey",
    "personnelapikey",
    "x-tc-auth-token",
];
// tabletcommand-session reads each of these from the query string when the header is
// absent, and accepts either spelling. signupKey only ever arrives in the query.
exports.keyParams = [
    "apikey",
    "personnelapikey",
    "signupkey",
];
// A route can wrap a key name in a longer parameter name, such as deviceApiKey, so match
// the name loosely. Cutting a parameter that holds no credential costs nothing.
function isKeyParam(name) {
    const lower = decodeName(name).toLowerCase();
    return exports.keyParams.some((keyParam) => lower.includes(keyParam));
}
// Express decodes the name before tabletcommand-session reads it, so api%6Bey
// authenticates as apikey and has to be matched the same way. decodeURIComponent throws
// on a malformed escape, and this runs in a res "finish" listener where a throw ends the
// process.
function decodeName(name) {
    try {
        return decodeURIComponent(name.replace(/\+/g, " "));
    }
    catch {
        return name;
    }
}
exports.redacted = "<redacted>";
function keepPrefix(value) {
    return value.substring(0, 7);
}
// Every scheme this service accepts is a short word, such as Bearer or Basic.
const schemePattern = /^[A-Za-z]{1,20}$/;
// A scheme fills the whole prefix on its own, so keep it and take the prefix from the
// credential behind it. A first word that is not a scheme is part of the credential, so
// cut the value whole rather than keep that word.
function redactAuthorization(value) {
    const [scheme, ...rest] = value.split(" ");
    if (rest.length === 0 || !schemePattern.test(scheme)) {
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
        .map((name) => `${name}=${exports.redacted}`)
        .join("; ");
}
// Set-Cookie header contains the cookie pair first, followed by optional attributes
// (e.g. "session=SECRET; Path=/; Domain=.tabletcommand.com; Max-Age=3600; HttpOnly; Secure; SameSite=None").
// Redact only the first pair's value while keeping attributes intact for security auditing.
function redactSetCookie(value) {
    if (!value || value.trim() === "") {
        return "";
    }
    const parts = value.split(";");
    const first = parts[0].trim();
    if (first === "") {
        return "";
    }
    const equalsIndex = first.indexOf("=");
    const firstRedacted = equalsIndex < 0
        ? `${first}=${exports.redacted}`
        : `${first.substring(0, equalsIndex).trim()}=${exports.redacted}`;
    const attributes = parts
        .slice(1)
        .map((attr) => attr.trim())
        .filter((attr) => attr !== "");
    if (attributes.length === 0) {
        return firstRedacted;
    }
    return [firstRedacted, ...attributes].join("; ");
}
function redactorFor(name) {
    if (name === "cookie") {
        return redactCookie;
    }
    if (name === "set-cookie") {
        return redactSetCookie;
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
        return value.map((entry) => (lodash_1.default.isString(entry) ? redact(entry) : exports.redacted));
    }
    if (!lodash_1.default.isString(value)) {
        return exports.redacted;
    }
    return redact(value);
}
function redactHeaders(headers) {
    const clean = { ...headers };
    for (const [name, value] of Object.entries(clean)) {
        const lower = name.toLowerCase();
        const isCookie = lower === "cookie" || lower === "set-cookie";
        if (lodash_1.default.isUndefined(value) || (!isCookie && !exports.keyHeaders.includes(lower))) {
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
        return value.map((entry) => (lodash_1.default.isString(entry) ? keepPrefix(entry) : exports.redacted));
    }
    return exports.redacted;
}
function redactQuery(query) {
    const clean = { ...query };
    for (const [name, value] of Object.entries(clean)) {
        if (lodash_1.default.isUndefined(value) || !isKeyParam(name)) {
            continue;
        }
        clean[name] = redactQueryValue(value);
    }
    return clean;
}
function redactParamPair(pair) {
    const split = pair.indexOf("=");
    if (split < 0 || !isKeyParam(pair.substring(0, split))) {
        return pair;
    }
    return pair.substring(0, split + 1) + keepPrefix(pair.substring(split + 1));
}
// req.originalUrl is relative, so this splits the string rather than parsing a URL. A
// regex over the whole string backtracks for as long as the url, and the url comes from
// the caller. Splitting on "?" as well as "&" reaches a nested url in a parameter value.
function redactOriginalURL(maybeURL) {
    if (!lodash_1.default.isString(maybeURL) || maybeURL === "") {
        return "";
    }
    const queryStart = maybeURL.indexOf("?");
    if (queryStart < 0) {
        return maybeURL;
    }
    const path = maybeURL.substring(0, queryStart + 1);
    const parts = maybeURL.substring(queryStart + 1).split(/([?&])/);
    return path + parts.map((part, index) => (index % 2 === 0 ? redactParamPair(part) : part)).join("");
}
const secretKeys = [
    "apikey",
    "apiKey",
    "personnelapikey",
    "personnelApiKey",
    "signupkey",
    "signupKey",
    "password",
    "token",
    "secret",
    "credentials",
];
// fast-redact does not support recursive wildcards (**), so we enumerate paths up to MAX_REDACT_DEPTH.
exports.MAX_REDACT_DEPTH = 5;
const secretPaths = [];
for (const key of secretKeys) {
    let prefix = "";
    for (let depth = 0; depth <= exports.MAX_REDACT_DEPTH; depth++) {
        secretPaths.push(prefix ? `${prefix}.${key}` : key);
        prefix = prefix ? `${prefix}.*` : "*";
    }
}
exports.REDACT_PATHS = [
    "req.headers.authorization",
    "req.headers.cookie",
    "req.headers.apikey",
    "req.headers.personnelapikey",
    "req.headers[\"x-tc-auth-token\"]",
    "res.headers.authorization",
    "res.headers[\"set-cookie\"]",
    "headers.authorization",
    "headers.cookie",
    "headers[\"set-cookie\"]",
    "headers.apikey",
    "headers.personnelapikey",
    "headers[\"x-tc-auth-token\"]",
    ...secretPaths,
];
function pinoCensor(value, path) {
    const key = (path && path.length > 0 ? path[path.length - 1] : "").toLowerCase();
    if (key === "cookie" || (path && path.includes("cookie"))) {
        if (typeof value === "string") {
            return redactCookie(value);
        }
        return exports.redacted;
    }
    if (key === "set-cookie" || (path && path.includes("set-cookie"))) {
        if (typeof value === "string") {
            return redactSetCookie(value);
        }
        if (Array.isArray(value)) {
            return value.map((entry) => (typeof entry === "string" ? redactSetCookie(entry) : exports.redacted));
        }
        return exports.redacted;
    }
    if (key === "authorization" || (path && path.includes("authorization"))) {
        if (typeof value === "string") {
            return redactAuthorization(value);
        }
        return exports.redacted;
    }
    if (key.includes("password") || key.includes("secret") || key.includes("credentials")) {
        return exports.redacted;
    }
    if (typeof value === "string") {
        return keepPrefix(value);
    }
    if (Array.isArray(value)) {
        return value.map((entry) => (typeof entry === "string" ? keepPrefix(entry) : exports.redacted));
    }
    return exports.redacted;
}
//# sourceMappingURL=redaction.js.map