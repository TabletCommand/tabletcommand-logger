"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const node_test_1 = require("node:test");
const logger_1 = require("../middleware/logger");
(0, node_test_1.describe)("Logger Middleware", function () {
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