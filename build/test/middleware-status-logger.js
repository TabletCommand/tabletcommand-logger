"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const node_events_1 = require("node:events");
const node_test_1 = require("node:test");
const status_logger_1 = __importDefault(require("../middleware/status-logger"));
(0, node_test_1.describe)("Status Logger Middleware", function () {
    (0, node_test_1.describe)("Request Log", () => {
        // Sample values only. Every one is made up.
        const sample = "abcdef1234567";
        function logLine(req) {
            let line = {};
            const logger = {
                info: (msg) => {
                    line = msg;
                },
            };
            const res = new node_events_1.EventEmitter();
            res.statusCode = 200;
            res.json = () => res;
            (0, status_logger_1.default)(logger)(req, res, () => undefined);
            res.emit("finish");
            return line;
        }
        // server-status authenticates POST /api/v2/personnel by a key it accepts in the query.
        (0, node_test_1.it)("cuts the credentials out of the url, the query, and the headers", function () {
            const line = logLine({
                method: "POST",
                originalUrl: `/api/v2/personnel?personnelApiKey=${sample}&v=4`,
                path: "/api/v2/personnel",
                query: { personnelApiKey: sample, v: "4" },
                headers: { "user-agent": "TCMobile 3.0.3 b216", personnelapikey: sample },
            });
            const req = line.req;
            chai_1.assert.equal(req.originalUrl, "/api/v2/personnel?personnelApiKey=abcdef1&v=4");
            chai_1.assert.deepEqual(req.query, { personnelApiKey: "abcdef1", v: "4" });
            chai_1.assert.deepEqual(req.headers, {
                "user-agent": "TCMobile 3.0.3 b216",
                personnelapikey: "abcdef1",
            });
        });
        (0, node_test_1.it)("leaves the request query alone for the handlers that run after it", function () {
            const query = { personnelApiKey: sample };
            logLine({
                method: "POST",
                originalUrl: `/api/v2/personnel?personnelApiKey=${sample}`,
                path: "/api/v2/personnel",
                query,
                headers: {},
            });
            chai_1.assert.deepEqual(query, { personnelApiKey: sample });
        });
    });
});
//# sourceMappingURL=middleware-status-logger.js.map