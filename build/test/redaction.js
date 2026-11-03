"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const node_test_1 = require("node:test");
const node_stream_1 = require("node:stream");
const pino_logger_1 = __importDefault(require("../pino-logger"));
const redaction_1 = require("../redaction");
(0, node_test_1.describe)("Native Redaction Engine", () => {
    function createCaptureStream(lines) {
        return new node_stream_1.Writable({
            write(chunk, _encoding, callback) {
                try {
                    const str = chunk.toString();
                    lines.push(JSON.parse(str));
                }
                catch {
                    // ignore
                }
                callback();
            },
        });
    }
    (0, node_test_1.it)("redacts apikey to first 7 characters", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info({ apikey: "abcdef1234567" }, "api call");
        chai_1.assert.equal(lines.length, 1);
        chai_1.assert.equal(lines[0].apikey, "abcdef1");
    });
    (0, node_test_1.it)("redacts camelCase apiKey and personnelApiKey to first 7 characters", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info({
            apiKey: "abcdef1234567",
            personnelApiKey: "abcdef1234567",
        }, "multi keys");
        chai_1.assert.equal(lines.length, 1);
        chai_1.assert.equal(lines[0].apiKey, "abcdef1");
        chai_1.assert.equal(lines[0].personnelApiKey, "abcdef1");
    });
    (0, node_test_1.it)("completely masks password and secret fields", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info({
            password: "super-secret-password-123",
            secret: "top-secret-val",
        }, "credentials test");
        chai_1.assert.equal(lines.length, 1);
        chai_1.assert.equal(lines[0].password, "<redacted>");
        chai_1.assert.equal(lines[0].secret, "<redacted>");
    });
    (0, node_test_1.it)("redacts nested headers with authorization and cookie", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info({
            headers: {
                authorization: "Bearer abcdef1234567",
                cookie: "session=abcdef1234567; saml=xyz987654321",
            },
        }, "headers log");
        chai_1.assert.equal(lines.length, 1);
        const headers = lines[0].headers;
        chai_1.assert.equal(headers.authorization, "Bearer abcdef1");
        chai_1.assert.equal(headers.cookie, "session=<redacted>; saml=<redacted>");
    });
    (0, node_test_1.it)("redacts only the first pair value in set-cookie and preserves attributes", () => {
        const raw = "session=SECRET12345; Path=/; Domain=.tabletcommand.com; Max-Age=3600; HttpOnly; Secure; SameSite=None";
        const redactedVal = (0, redaction_1.redactSetCookie)(raw);
        chai_1.assert.equal(redactedVal, "session=<redacted>; Path=/; Domain=.tabletcommand.com; Max-Age=3600; HttpOnly; Secure; SameSite=None");
        // Also verify via pinoCensor in logger
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info({
            res: {
                headers: {
                    "set-cookie": raw,
                },
            },
        }, "res set-cookie test");
        chai_1.assert.equal(lines.length, 1);
        const res = lines[0].res;
        chai_1.assert.equal(res.headers["set-cookie"], "session=<redacted>; Path=/; Domain=.tabletcommand.com; Max-Age=3600; HttpOnly; Secure; SameSite=None");
    });
    (0, node_test_1.it)("redacts apikey within nested objects", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info({
            payload: {
                account: {
                    apikey: "abcdef1234567",
                },
            },
        }, "nested object");
        chai_1.assert.equal(lines.length, 1);
        const payload = lines[0].payload;
        chai_1.assert.equal(payload.account.apikey, "abcdef1");
    });
    (0, node_test_1.it)("redacts secret at MAX_REDACT_DEPTH (5 levels deep)", () => {
        chai_1.assert.equal(redaction_1.MAX_REDACT_DEPTH, 5);
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        // 5 levels of nesting: a -> b -> c -> d -> e -> password
        log === null || log === void 0 ? void 0 : log.info({
            a: {
                b: {
                    c: {
                        d: {
                            e: {
                                password: "super-secret-password-123",
                            },
                        },
                    },
                },
            },
        }, "depth 5 test");
        chai_1.assert.equal(lines.length, 1);
        const res = lines[0];
        chai_1.assert.equal(res.a.b.c.d.e.password, "<redacted>");
    });
    (0, node_test_1.it)("preserves secret beyond MAX_REDACT_DEPTH (6 levels deep) as documented ceiling", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        // 6 levels of nesting: a -> b -> c -> d -> e -> f -> password
        log === null || log === void 0 ? void 0 : log.info({
            a: {
                b: {
                    c: {
                        d: {
                            e: {
                                f: {
                                    password: "super-secret-password-123",
                                },
                            },
                        },
                    },
                },
            },
        }, "depth 6 test");
        chai_1.assert.equal(lines.length, 1);
        const res = lines[0];
        chai_1.assert.equal(res.a.b.c.d.e.f.password, "super-secret-password-123");
    });
});
//# sourceMappingURL=redaction.js.map