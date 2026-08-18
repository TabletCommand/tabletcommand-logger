"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const node_events_1 = require("node:events");
const node_test_1 = require("node:test");
const logger_1 = __importStar(require("../middleware/logger"));
// cspell:ignore tcmobile
(0, node_test_1.describe)("Logger Middleware", function () {
    (0, node_test_1.describe)("Redact Headers", () => {
        // Sample values only. Every one is made up.
        const sample = "abcdef1234567";
        const other = "1234567abcdef";
        (0, node_test_1.it)("cuts every key header to 7 characters", function () {
            const sut = (0, logger_1.redactHeaders)({
                authorization: `Bearer ${sample}`,
                apikey: sample,
                personnelapikey: sample,
                "x-tc-auth-token": sample,
            });
            chai_1.assert.deepEqual(sut, {
                authorization: "Bearer abcdef1",
                apikey: "abcdef1",
                personnelapikey: "abcdef1",
                "x-tc-auth-token": "abcdef1",
            });
        });
        (0, node_test_1.it)("keeps the authorization scheme and cuts the credential behind it", function () {
            const sut = (0, logger_1.redactHeaders)({ authorization: `Basic ${sample}` });
            chai_1.assert.deepEqual(sut, { authorization: "Basic abcdef1" });
        });
        (0, node_test_1.it)("cuts an authorization header that carries no scheme", function () {
            const sut = (0, logger_1.redactHeaders)({ authorization: sample });
            chai_1.assert.deepEqual(sut, { authorization: "abcdef1" });
        });
        (0, node_test_1.it)("keeps the cookie names and drops the values", function () {
            const sut = (0, logger_1.redactHeaders)({
                cookie: `seneca-login=${sample}; saml=${other}`,
            });
            chai_1.assert.deepEqual(sut, {
                cookie: "seneca-login=<redacted>; saml=<redacted>",
            });
        });
        (0, node_test_1.it)("skips the empty segment of a cookie that ends in a semicolon", function () {
            const sut = (0, logger_1.redactHeaders)({ cookie: "seneca-login=abc;" });
            chai_1.assert.deepEqual(sut, { cookie: "seneca-login=<redacted>" });
        });
        (0, node_test_1.it)("returns an empty cookie unchanged", function () {
            const sut = (0, logger_1.redactHeaders)({ cookie: "" });
            chai_1.assert.deepEqual(sut, { cookie: "" });
        });
        (0, node_test_1.it)("matches the header name without case", function () {
            const sut = (0, logger_1.redactHeaders)({
                Cookie: `seneca-login=${sample}`,
                ApiKey: sample,
            });
            chai_1.assert.deepEqual(sut, {
                Cookie: "seneca-login=<redacted>",
                ApiKey: "abcdef1",
            });
        });
        (0, node_test_1.it)("redacts every value of a repeated header", function () {
            const sut = (0, logger_1.redactHeaders)({ apikey: [sample, other] });
            chai_1.assert.deepEqual(sut, { apikey: ["abcdef1", "1234567"] });
        });
        (0, node_test_1.it)("leaves the headers that identify the client", function () {
            const sut = (0, logger_1.redactHeaders)({
                "user-agent": "TCMobile 3.0.3 b216",
                "x-tc-bundle-identifier": "com.tabletcommand.tcmobile",
            });
            chai_1.assert.deepEqual(sut, {
                "user-agent": "TCMobile 3.0.3 b216",
                "x-tc-bundle-identifier": "com.tabletcommand.tcmobile",
            });
        });
        // This runs in a res "finish" listener, where a throw ends the process.
        (0, node_test_1.it)("drops a value that is not a string instead of throwing", function () {
            const sut = (0, logger_1.redactHeaders)({
                apikey: 12345,
                cookie: { name: "seneca-login" },
                authorization: null,
                personnelapikey: [sample, 12345],
            });
            chai_1.assert.deepEqual(sut, {
                apikey: "<redacted>",
                cookie: "<redacted>",
                authorization: "<redacted>",
                personnelapikey: ["abcdef1", "<redacted>"],
            });
        });
        (0, node_test_1.it)("leaves the request headers alone", function () {
            const headers = { apikey: sample, cookie: `seneca-login=${sample}` };
            (0, logger_1.redactHeaders)(headers);
            chai_1.assert.deepEqual(headers, { apikey: sample, cookie: `seneca-login=${sample}` });
        });
    });
    (0, node_test_1.describe)("Redact Query", () => {
        const sample = "abcdef1234567";
        (0, node_test_1.it)("cuts every key parameter to 7 characters", function () {
            const sut = (0, logger_1.redactQuery)({
                apikey: sample,
                personnelApiKey: sample,
                signupKey: sample,
            });
            chai_1.assert.deepEqual(sut, {
                apikey: "abcdef1",
                personnelApiKey: "abcdef1",
                signupKey: "abcdef1",
            });
        });
        (0, node_test_1.it)("leaves the parameters that are not credentials", function () {
            const sut = (0, logger_1.redactQuery)({ v: "4", shared: "1" });
            chai_1.assert.deepEqual(sut, { v: "4", shared: "1" });
        });
        (0, node_test_1.it)("cuts every value of a repeated parameter", function () {
            const sut = (0, logger_1.redactQuery)({ apikey: [sample, "7654321fedcba"] });
            chai_1.assert.deepEqual(sut, { apikey: ["abcdef1", "7654321"] });
        });
        (0, node_test_1.it)("drops a value that is not a string", function () {
            const sut = (0, logger_1.redactQuery)({ apikey: { nested: sample } });
            chai_1.assert.deepEqual(sut, { apikey: "<redacted>" });
        });
        // redactQuery used to write the short key back onto req.query, which every handler
        // after the logger reads.
        (0, node_test_1.it)("leaves the request query alone", function () {
            const query = { apikey: sample };
            (0, logger_1.redactQuery)(query);
            chai_1.assert.deepEqual(query, { apikey: sample });
        });
    });
    (0, node_test_1.describe)("Redact Original URL", () => {
        const url = "http://local:3442/incident?";
        (0, node_test_1.it)("apikey is last", function () {
            const prevApiKey = "apikey=abcdef1234567";
            const expApiKey = "apikey=abcdef1";
            const redacted = (0, logger_1.redactOriginalURL)(url + prevApiKey);
            chai_1.assert.equal(redacted, url + expApiKey);
        });
        (0, node_test_1.it)("apikey is middle of url", function () {
            const prevApiKey = "apikey=abcdef1234567&k=1";
            const expApiKey = "apikey=abcdef1&k=1";
            const redacted = (0, logger_1.redactOriginalURL)(url + prevApiKey);
            chai_1.assert.equal(redacted, url + expApiKey);
        });
        (0, node_test_1.it)("apikey is short", function () {
            const prevApiKey = "apikey=1&";
            const expApiKey = "apikey=1&";
            const redacted = (0, logger_1.redactOriginalURL)(url + prevApiKey);
            chai_1.assert.equal(redacted, url + expApiKey);
        });
        // req.originalUrl is what both loggers pass in, and it is always relative.
        (0, node_test_1.it)("cuts the apikey of a relative url", function () {
            const redacted = (0, logger_1.redactOriginalURL)("/api/v1/incident?apikey=abcdef1234567");
            chai_1.assert.equal(redacted, "/api/v1/incident?apikey=abcdef1");
        });
        (0, node_test_1.it)("cuts every key parameter, in either spelling", function () {
            const redacted = (0, logger_1.redactOriginalURL)("/api/v2/personnel?personnelApiKey=abcdef1234567&signupkey=1234567abcdef&v=4");
            chai_1.assert.equal(redacted, "/api/v2/personnel?personnelApiKey=abcdef1&signupkey=1234567&v=4");
        });
        (0, node_test_1.it)("cuts more than one key in the same url", function () {
            const redacted = (0, logger_1.redactOriginalURL)("/api/v2/personnel?apikey=abcdef1234567&personnelApiKey=1234567abcdef");
            chai_1.assert.equal(redacted, "/api/v2/personnel?apikey=abcdef1&personnelApiKey=1234567");
        });
        (0, node_test_1.it)("leaves a parameter that only ends in a key name", function () {
            const redacted = (0, logger_1.redactOriginalURL)("/api/v1/incident?departmentApikey=abcdef1234567");
            chai_1.assert.equal(redacted, "/api/v1/incident?departmentApikey=abcdef1234567");
        });
        (0, node_test_1.it)("returns an empty string for a missing url", function () {
            chai_1.assert.equal((0, logger_1.redactOriginalURL)(), "");
            chai_1.assert.equal((0, logger_1.redactOriginalURL)(""), "");
        });
    });
    (0, node_test_1.describe)("Access Log", () => {
        function logLine(req) {
            let line = {};
            const logger = {
                info: (msg) => {
                    line = msg;
                },
            };
            const res = new node_events_1.EventEmitter();
            res.statusCode = 200;
            (0, logger_1.default)(logger)(req, res, () => undefined);
            res.emit("finish");
            return line;
        }
        (0, node_test_1.it)("redacts both copies of the url", function () {
            const line = logLine({
                method: "GET",
                originalUrl: "/api/v1/incident?apikey=abcdef1234567",
                headers: { apikey: "abcdef1234567" },
            });
            chai_1.assert.equal(line.url, "/api/v1/incident?apikey=abcdef1");
            chai_1.assert.deepEqual(line.req, {
                body: undefined,
                headers: { apikey: "abcdef1" },
                method: "GET",
                originalUrl: "/api/v1/incident?apikey=abcdef1",
            });
        });
    });
});
//# sourceMappingURL=middleware-logger.js.map