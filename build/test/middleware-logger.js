"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const node_test_1 = require("node:test");
const logger_1 = require("../middleware/logger");
// cspell:ignore personnelapikey tcmobile
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
                authorization: "Bearer ",
                apikey: "abcdef1",
                personnelapikey: "abcdef1",
                "x-tc-auth-token": "abcdef1",
            });
        });
        (0, node_test_1.it)("keeps the cookie names and drops the values", function () {
            const sut = (0, logger_1.redactHeaders)({
                cookie: `seneca-login=${sample}; saml=${other}`,
            });
            chai_1.assert.deepEqual(sut, {
                cookie: "seneca-login=<redacted>; saml=<redacted>",
            });
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
            const expApiKey = "apikey=1";
            const redacted = (0, logger_1.redactOriginalURL)(url + prevApiKey);
            chai_1.assert.equal(redacted, url + expApiKey);
        });
    });
});
//# sourceMappingURL=middleware-logger.js.map