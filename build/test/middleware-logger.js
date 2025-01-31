"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
const chai_1 = require("chai");
const logger_1 = require("../middleware/logger");
describe("Logger Middleware", function () {
    context("Redact Original URL", () => {
        const url = "http://local:3442/incident?";
        it("apikey is last", function () {
            const prevApiKey = "apikey=abcdef1234567";
            const expApiKey = "apikey=abcdef1";
            const redacted = (0, logger_1.redactOriginalURL)(url + prevApiKey);
            chai_1.assert.equal(redacted, url + expApiKey);
        });
        it("apikey is middle of url", function () {
            const prevApiKey = "apikey=abcdef1234567&k=1";
            const expApiKey = "apikey=abcdef1&k=1";
            const redacted = (0, logger_1.redactOriginalURL)(url + prevApiKey);
            chai_1.assert.equal(redacted, url + expApiKey);
        });
        it("apikey is short", function () {
            const prevApiKey = "apikey=1&";
            const expApiKey = "apikey=1";
            const redacted = (0, logger_1.redactOriginalURL)(url + prevApiKey);
            chai_1.assert.equal(redacted, url + expApiKey);
        });
    });
});
//# sourceMappingURL=middleware-logger.js.map