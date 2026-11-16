import { assert } from "chai";
import { describe, it } from "node:test";
import { Writable } from "node:stream";
import logger from "../pino-logger";
import { MAX_REDACT_DEPTH, redactSetCookie } from "../redaction";

describe("Native Redaction Engine", () => {
  function createCaptureStream(lines: Record<string, unknown>[]) {
    return new Writable({
      write(chunk: Buffer | string, _encoding: string, callback: (error?: Error | null) => void) {
        try {
          const str = chunk.toString();
          lines.push(JSON.parse(str) as Record<string, unknown>);
        } catch {
          // ignore
        }
        callback();
      },
    });
  }

  it("redacts apikey to first 7 characters", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      { name: "test", logToConsole: true },
      createCaptureStream(lines)
    );

    log?.info({ apikey: "abcdef1234567" }, "api call");

    assert.equal(lines.length, 1);
    assert.equal(lines[0].apikey, "abcdef1");
  });

  it("redacts camelCase apiKey and personnelApiKey to first 7 characters", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      { name: "test", logToConsole: true },
      createCaptureStream(lines)
    );

    log?.info(
      {
        apiKey: "abcdef1234567",
        personnelApiKey: "abcdef1234567",
      },
      "multi keys"
    );

    assert.equal(lines.length, 1);
    assert.equal(lines[0].apiKey, "abcdef1");
    assert.equal(lines[0].personnelApiKey, "abcdef1");
  });

  it("completely masks password and secret fields", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      { name: "test", logToConsole: true },
      createCaptureStream(lines)
    );

    log?.info(
      {
        password: "super-secret-password-123",
        secret: "top-secret-val",
      },
      "credentials test"
    );

    assert.equal(lines.length, 1);
    assert.equal(lines[0].password, "<redacted>");
    assert.equal(lines[0].secret, "<redacted>");
  });

  it("redacts nested headers with authorization and cookie", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      { name: "test", logToConsole: true },
      createCaptureStream(lines)
    );

    log?.info(
      {
        headers: {
          authorization: "Bearer abcdef1234567",
          cookie: "session=abcdef1234567; saml=xyz987654321",
        },
      },
      "headers log"
    );

    assert.equal(lines.length, 1);
    const headers = lines[0].headers as Record<string, string>;
    assert.equal(headers.authorization, "Bearer abcdef1");
    assert.equal(headers.cookie, "session=<redacted>; saml=<redacted>");
  });

  it("redacts only the first pair value in set-cookie and preserves attributes", () => {
    const raw =
      "session=SECRET12345; Path=/; Domain=.tabletcommand.com; Max-Age=3600; HttpOnly; Secure; SameSite=None";
    const redactedVal = redactSetCookie(raw);

    assert.equal(
      redactedVal,
      "session=<redacted>; Path=/; Domain=.tabletcommand.com; Max-Age=3600; HttpOnly; Secure; SameSite=None"
    );

    // Also verify via pinoCensor in logger
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      { name: "test", logToConsole: true },
      createCaptureStream(lines)
    );

    log?.info(
      {
        res: {
          headers: {
            "set-cookie": raw,
          },
        },
      },
      "res set-cookie test"
    );

    assert.equal(lines.length, 1);
    const res = lines[0].res as { headers: { "set-cookie": string } };
    assert.equal(
      res.headers["set-cookie"],
      "session=<redacted>; Path=/; Domain=.tabletcommand.com; Max-Age=3600; HttpOnly; Secure; SameSite=None"
    );
  });

  it("redacts apikey within nested objects", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      { name: "test", logToConsole: true },
      createCaptureStream(lines)
    );

    log?.info(
      {
        payload: {
          account: {
            apikey: "abcdef1234567",
          },
        },
      },
      "nested object"
    );

    assert.equal(lines.length, 1);
    const payload = lines[0].payload as { account: { apikey: string } };
    assert.equal(payload.account.apikey, "abcdef1");
  });

  function nest(levels: number, leaf: Record<string, unknown>): Record<string, unknown> {
    let value = leaf;
    for (let i = 0; i < levels; i++) {
      value = { [`l${i}`]: value };
    }
    return value;
  }

  function leafAt(line: Record<string, unknown>, levels: number): Record<string, unknown> {
    let value = line;
    for (let i = levels - 1; i >= 0; i--) {
      value = value[`l${i}`] as Record<string, unknown>;
    }
    return value;
  }

  it(`redacts a secret ${MAX_REDACT_DEPTH} levels deep`, () => {
    assert.equal(MAX_REDACT_DEPTH, 10);
    const lines: Record<string, unknown>[] = [];
    const log = logger({ name: "test", logToConsole: true }, createCaptureStream(lines));

    log?.info(nest(MAX_REDACT_DEPTH, { password: "super-secret-password-123" }), "depth test");

    assert.equal(leafAt(lines[0], MAX_REDACT_DEPTH).password, "<redacted>");
  });

  it("leaves a secret deeper than MAX_REDACT_DEPTH as the documented ceiling", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger({ name: "test", logToConsole: true }, createCaptureStream(lines));

    log?.info(nest(MAX_REDACT_DEPTH + 1, { password: "super-secret-password-123" }), "depth test");

    assert.equal(leafAt(lines[0], MAX_REDACT_DEPTH + 1).password, "super-secret-password-123");
  });

  it("matches key names without case, dashes or underscores", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger({ name: "test", logToConsole: true }, createCaptureStream(lines));

    log?.info({
      Password: "hunter2hunter2",
      APIKEY: "abcdef1234567",
      "X-API-Key": "abcdef1234567",
      access_token: "abcdef1234567",
      "AUTH-TOKEN": "abcdef1234567",
    }, "case test");

    const line = lines[0];
    assert.equal(line.Password, "<redacted>");
    assert.equal(line.APIKEY, "abcdef1");
    assert.equal(line["X-API-Key"], "abcdef1");
    assert.equal(line.access_token, "abcdef1");
    assert.equal(line["AUTH-TOKEN"], "abcdef1");
  });

  it("cuts the credential names found in massive-tyrion to 7 characters", () => {
    const names = [
      "authToken", "accessToken", "refreshToken", "refresh_token", "idToken", "id_token",
      "sessionToken", "superAdminSessionToken", "deviceToken", "zonehavenToken", "faToken",
      "videoGatewayToken", "x-tc-auth-token", "apiToken", "mark43ApiToken", "authTokenPlainText",
      "departmentApiKey", "agencyApiKey", "watchDutyApiKey", "arcgisApiKey", "freshdeskApiKey",
      "googleApiKey", "webApiKey", "apiKeyReadOnly", "apiKeyManagement", "personnelApiKey",
      "partnerKey", "x-partner-key", "cadKey", "vendorKey", "licenseKey", "licenseCode", "mark43Key",
      "authKey", "accessCode", "joinCode", "jwt", "authHeader", "sessionCookie", "signupKey",
    ];
    const lines: Record<string, unknown>[] = [];
    const log = logger({ name: "test", logToConsole: true }, createCaptureStream(lines));

    log?.info({ body: Object.fromEntries(names.map((name) => [name, "abcdef1234567"])) }, "names");

    const body = lines[0].body as Record<string, string>;
    for (const name of names) {
      assert.equal(body[name], "abcdef1", name);
    }
  });

  it("masks secret material and personal data completely", () => {
    const names = [
      "authSecret", "authSecretPlainText", "secretPlainText", "authKeySecret", "keySecret",
      "clientSecret", "client_secret", "webhookSecret", "jwtSecret", "droneVideoJwtSecret",
      "decryptedSecret", "onetimesecret", "secretAccessKey", "credential", "credentials",
      "privateKey", "sshPrivateKey", "jwtSigningKey", "mailgunSigningKey", "encryptionKey",
      "esriEncryptionKey", "esriEncryptionPassword", "initialPassword", "confirmPassword",
      "pass", "pwd", "auth_pass", "salt", "ssn", "dateOfBirth", "licenseNumber", "doorCode",
    ];
    const lines: Record<string, unknown>[] = [];
    const log = logger({ name: "test", logToConsole: true }, createCaptureStream(lines));

    log?.info({ body: Object.fromEntries(names.map((name) => [name, "abcdef1234567"])) }, "names");

    const body = lines[0].body as Record<string, string>;
    for (const name of names) {
      assert.equal(body[name], "<redacted>", name);
    }
  });

  it("keeps flags, settings and pagination cursors readable", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger({ name: "test", logToConsole: true }, createCaptureStream(lines));

    log?.info({
      hasAuthSecret: true,
      minPasswordLength: 8,
      useSSHKey: false,
      tokenTTLSeconds: 3600,
      nextPageToken: "cursor-abcdef1234567",
      paginationToken: "cursor-abcdef1234567",
      cacheKey: "dept:1234567890",
    }, "flags");

    const line = lines[0];
    assert.equal(line.hasAuthSecret, true);
    assert.equal(line.minPasswordLength, 8);
    assert.equal(line.useSSHKey, false);
    assert.equal(line.tokenTTLSeconds, 3600);
    assert.equal(line.nextPageToken, "cursor-abcdef1234567");
    assert.equal(line.paginationToken, "cursor-abcdef1234567");
    assert.equal(line.cacheKey, "dept:1234567890");
  });

  it("redacts secrets inside a whole auth object and in arrays", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger({ name: "test", logToConsole: true }, createCaptureStream(lines));

    log?.info({
      auth: { username: "alice", password: "hunter2hunter2", sshPrivateKey: "-----BEGIN KEY-----" },
      users: [{ name: "a", authToken: "abcdef1234567" }, { name: "b", pass: "hash", salt: "salt" }],
    }, "auth");

    const auth = lines[0].auth as Record<string, string>;
    assert.deepEqual(auth, { username: "alice", password: "<redacted>", sshPrivateKey: "<redacted>" });
    const users = lines[0].users as Record<string, string>[];
    assert.deepEqual(users, [
      { name: "a", authToken: "abcdef1" },
      { name: "b", pass: "<redacted>", salt: "<redacted>" },
    ]);
  });

  it("redacts what a toJSON object such as a Mongoose document writes", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger({ name: "test", logToConsole: true }, createCaptureStream(lines));
    class Doc {
      toJSON() {
        return { email: "a@b.c", pass: "hash", token: "abcdef1234567" };
      }
    }

    log?.info({ user: new Doc() }, "doc");

    assert.deepEqual(lines[0].user, { email: "a@b.c", pass: "<redacted>", token: "abcdef1" });
  });

  it("redacts child bindings and serialized errors", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger({ name: "test", logToConsole: true }, createCaptureStream(lines));
    const err = Object.assign(new Error("request failed"), {
      config: { headers: { Authorization: "Bearer abcdef1234567", "x-api-key": "abcdef1234567" } },
    });

    log?.child({ partnerKey: "abcdef1234567" }).error(err, "failed");

    const line = lines[0];
    assert.equal(line.partnerKey, "abcdef1");
    const config = (line.err as { config: { headers: Record<string, string> } }).config;
    assert.equal(config.headers.Authorization, "Bearer abcdef1");
    assert.equal(config.headers["x-api-key"], "abcdef1");
    assert.equal((line.err as { message: string }).message, "request failed");
  });

  it("leaves the caller's object unchanged", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger({ name: "test", logToConsole: true }, createCaptureStream(lines));
    const payload = { user: { name: "alice", password: "hunter2hunter2" } };

    log?.info(payload, "payload");

    assert.equal(payload.user.password, "hunter2hunter2");
    assert.equal((lines[0].user as Record<string, string>).password, "<redacted>");
  });

  it("redacts TitleCase Authorization, Cookie, and Set-Cookie headers", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      { name: "test", logToConsole: true },
      createCaptureStream(lines)
    );

    log?.info(
      {
        headers: {
          Authorization: "Bearer abcdef1234567",
          Cookie: "session=abcdef1234567; saml=xyz987654321",
        },
      },
      "TitleCase headers"
    );

    log?.info(
      {
        res: {
          headers: {
            "Set-Cookie": "session=SECRET12345; Path=/; Domain=.tabletcommand.com; HttpOnly; Secure",
          },
        },
      },
      "TitleCase Set-Cookie"
    );

    assert.equal(lines.length, 2);
    const headers = lines[0].headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer abcdef1");
    assert.equal(headers.Cookie, "session=<redacted>; saml=<redacted>");

    const res = lines[1].res as { headers: { "Set-Cookie": string } };
    assert.equal(
      res.headers["Set-Cookie"],
      "session=<redacted>; Path=/; Domain=.tabletcommand.com; HttpOnly; Secure"
    );
  });

  it("redacts nested TitleCase Authorization in outgoing HTTP/Axios config payloads", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      { name: "test", logToConsole: true },
      createCaptureStream(lines)
    );

    log?.info(
      {
        err: {
          config: {
            headers: {
              Authorization: "Bearer token12345678",
            },
          },
        },
      },
      "axios error"
    );

    log?.info(
      {
        Authorization: "Bearer token99887766",
      },
      "root Authorization"
    );

    assert.equal(lines.length, 2);
    const err = lines[0].err as { config: { headers: { Authorization: string } } };
    assert.equal(err.config.headers.Authorization, "Bearer token12");
    assert.equal(lines[1].Authorization, "Bearer token99");
  });
});
