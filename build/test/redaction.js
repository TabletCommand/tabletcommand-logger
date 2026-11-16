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
    function nest(levels, leaf) {
        let value = leaf;
        for (let i = 0; i < levels; i++) {
            value = { [`l${i}`]: value };
        }
        return value;
    }
    function leafAt(line, levels) {
        let value = line;
        for (let i = levels - 1; i >= 0; i--) {
            value = value[`l${i}`];
        }
        return value;
    }
    (0, node_test_1.it)(`redacts a secret ${redaction_1.MAX_REDACT_DEPTH} levels deep`, () => {
        chai_1.assert.equal(redaction_1.MAX_REDACT_DEPTH, 10);
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info(nest(redaction_1.MAX_REDACT_DEPTH, { password: "super-secret-password-123" }), "depth test");
        chai_1.assert.equal(leafAt(lines[0], redaction_1.MAX_REDACT_DEPTH).password, "<redacted>");
    });
    (0, node_test_1.it)("leaves a secret deeper than MAX_REDACT_DEPTH as the documented ceiling", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info(nest(redaction_1.MAX_REDACT_DEPTH + 1, { password: "super-secret-password-123" }), "depth test");
        chai_1.assert.equal(leafAt(lines[0], redaction_1.MAX_REDACT_DEPTH + 1).password, "super-secret-password-123");
    });
    (0, node_test_1.it)("matches key names without case, dashes or underscores", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info({
            Password: "hunter2hunter2",
            APIKEY: "abcdef1234567",
            "X-API-Key": "abcdef1234567",
            access_token: "abcdef1234567",
            "AUTH-TOKEN": "abcdef1234567",
        }, "case test");
        const line = lines[0];
        chai_1.assert.equal(line.Password, "<redacted>");
        chai_1.assert.equal(line.APIKEY, "abcdef1");
        chai_1.assert.equal(line["X-API-Key"], "abcdef1");
        chai_1.assert.equal(line.access_token, "abcdef1");
        chai_1.assert.equal(line["AUTH-TOKEN"], "abcdef1");
    });
    (0, node_test_1.it)("cuts the credential names found in massive-tyrion to 7 characters", () => {
        const names = [
            "authToken", "accessToken", "refreshToken", "refresh_token", "idToken", "id_token",
            "sessionToken", "superAdminSessionToken", "deviceToken", "zonehavenToken", "faToken",
            "videoGatewayToken", "x-tc-auth-token", "apiToken", "mark43ApiToken", "authTokenPlainText",
            "departmentApiKey", "agencyApiKey", "watchDutyApiKey", "arcgisApiKey", "freshdeskApiKey",
            "googleApiKey", "webApiKey", "apiKeyReadOnly", "apiKeyManagement", "personnelApiKey",
            "partnerKey", "x-partner-key", "cadKey", "vendorKey", "licenseKey", "licenseCode", "mark43Key",
            "authKey", "accessCode", "joinCode", "jwt", "authHeader", "sessionCookie", "signupKey",
        ];
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info({ body: Object.fromEntries(names.map((name) => [name, "abcdef1234567"])) }, "names");
        const body = lines[0].body;
        for (const name of names) {
            chai_1.assert.equal(body[name], "abcdef1", name);
        }
    });
    (0, node_test_1.it)("masks secret material and personal data completely", () => {
        const names = [
            "authSecret", "authSecretPlainText", "secretPlainText", "authKeySecret", "keySecret",
            "clientSecret", "client_secret", "webhookSecret", "jwtSecret", "droneVideoJwtSecret",
            "decryptedSecret", "onetimesecret", "secretAccessKey", "credential", "credentials",
            "privateKey", "sshPrivateKey", "jwtSigningKey", "mailgunSigningKey", "encryptionKey",
            "esriEncryptionKey", "esriEncryptionPassword", "initialPassword", "confirmPassword",
            "pass", "pwd", "auth_pass", "salt", "ssn", "dateOfBirth", "licenseNumber", "doorCode",
        ];
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info({ body: Object.fromEntries(names.map((name) => [name, "abcdef1234567"])) }, "names");
        const body = lines[0].body;
        for (const name of names) {
            chai_1.assert.equal(body[name], "<redacted>", name);
        }
    });
    (0, node_test_1.it)("keeps flags, settings and pagination cursors readable", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info({
            hasAuthSecret: true,
            minPasswordLength: 8,
            useSSHKey: false,
            tokenTTLSeconds: 3600,
            nextPageToken: "cursor-abcdef1234567",
            paginationToken: "cursor-abcdef1234567",
            cacheKey: "dept:1234567890",
        }, "flags");
        const line = lines[0];
        chai_1.assert.equal(line.hasAuthSecret, true);
        chai_1.assert.equal(line.minPasswordLength, 8);
        chai_1.assert.equal(line.useSSHKey, false);
        chai_1.assert.equal(line.tokenTTLSeconds, 3600);
        chai_1.assert.equal(line.nextPageToken, "cursor-abcdef1234567");
        chai_1.assert.equal(line.paginationToken, "cursor-abcdef1234567");
        chai_1.assert.equal(line.cacheKey, "dept:1234567890");
    });
    (0, node_test_1.it)("redacts secrets inside a whole auth object and in arrays", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info({
            auth: { username: "alice", password: "hunter2hunter2", sshPrivateKey: "-----BEGIN KEY-----" },
            users: [{ name: "a", authToken: "abcdef1234567" }, { name: "b", pass: "hash", salt: "salt" }],
        }, "auth");
        const auth = lines[0].auth;
        chai_1.assert.deepEqual(auth, { username: "alice", password: "<redacted>", sshPrivateKey: "<redacted>" });
        const users = lines[0].users;
        chai_1.assert.deepEqual(users, [
            { name: "a", authToken: "abcdef1" },
            { name: "b", pass: "<redacted>", salt: "<redacted>" },
        ]);
    });
    (0, node_test_1.it)("redacts what a toJSON object such as a Mongoose document writes", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        class Doc {
            toJSON() {
                return { email: "a@b.c", pass: "hash", token: "abcdef1234567" };
            }
        }
        log === null || log === void 0 ? void 0 : log.info({ user: new Doc() }, "doc");
        chai_1.assert.deepEqual(lines[0].user, { email: "a@b.c", pass: "<redacted>", token: "abcdef1" });
    });
    (0, node_test_1.it)("redacts child bindings and serialized errors", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        const err = Object.assign(new Error("request failed"), {
            config: { headers: { Authorization: "Bearer abcdef1234567", "x-api-key": "abcdef1234567" } },
        });
        log === null || log === void 0 ? void 0 : log.child({ partnerKey: "abcdef1234567" }).error(err, "failed");
        const line = lines[0];
        chai_1.assert.equal(line.partnerKey, "abcdef1");
        const config = line.err.config;
        chai_1.assert.equal(config.headers.Authorization, "Bearer abcdef1");
        chai_1.assert.equal(config.headers["x-api-key"], "abcdef1");
        chai_1.assert.equal(line.err.message, "request failed");
    });
    (0, node_test_1.it)("leaves the caller's object unchanged", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        const payload = { user: { name: "alice", password: "hunter2hunter2" } };
        log === null || log === void 0 ? void 0 : log.info(payload, "payload");
        chai_1.assert.equal(payload.user.password, "hunter2hunter2");
        chai_1.assert.equal(lines[0].user.password, "<redacted>");
    });
    (0, node_test_1.it)("redacts TitleCase Authorization, Cookie, and Set-Cookie headers", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info({
            headers: {
                Authorization: "Bearer abcdef1234567",
                Cookie: "session=abcdef1234567; saml=xyz987654321",
            },
        }, "TitleCase headers");
        log === null || log === void 0 ? void 0 : log.info({
            res: {
                headers: {
                    "Set-Cookie": "session=SECRET12345; Path=/; Domain=.tabletcommand.com; HttpOnly; Secure",
                },
            },
        }, "TitleCase Set-Cookie");
        chai_1.assert.equal(lines.length, 2);
        const headers = lines[0].headers;
        chai_1.assert.equal(headers.Authorization, "Bearer abcdef1");
        chai_1.assert.equal(headers.Cookie, "session=<redacted>; saml=<redacted>");
        const res = lines[1].res;
        chai_1.assert.equal(res.headers["Set-Cookie"], "session=<redacted>; Path=/; Domain=.tabletcommand.com; HttpOnly; Secure");
    });
    (0, node_test_1.it)("redacts nested TitleCase Authorization in outgoing HTTP/Axios config payloads", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info({
            err: {
                config: {
                    headers: {
                        Authorization: "Bearer token12345678",
                    },
                },
            },
        }, "axios error");
        log === null || log === void 0 ? void 0 : log.info({
            Authorization: "Bearer token99887766",
        }, "root Authorization");
        chai_1.assert.equal(lines.length, 2);
        const err = lines[0].err;
        chai_1.assert.equal(err.config.headers.Authorization, "Bearer token12");
        chai_1.assert.equal(lines[1].Authorization, "Bearer token99");
    });
});
//# sourceMappingURL=redaction.js.map