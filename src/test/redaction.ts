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

  it("redacts secret at MAX_REDACT_DEPTH (5 levels deep)", () => {
    assert.equal(MAX_REDACT_DEPTH, 5);
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      { name: "test", logToConsole: true },
      createCaptureStream(lines)
    );

    // 5 levels of nesting: a -> b -> c -> d -> e -> password
    log?.info(
      {
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
      },
      "depth 5 test"
    );

    assert.equal(lines.length, 1);
    const res = lines[0] as {
      a: { b: { c: { d: { e: { password: string } } } } };
    };
    assert.equal(res.a.b.c.d.e.password, "<redacted>");
  });

  it("preserves secret beyond MAX_REDACT_DEPTH (6 levels deep) as documented ceiling", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      { name: "test", logToConsole: true },
      createCaptureStream(lines)
    );

    // 6 levels of nesting: a -> b -> c -> d -> e -> f -> password
    log?.info(
      {
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
      },
      "depth 6 test"
    );

    assert.equal(lines.length, 1);
    const res = lines[0] as {
      a: { b: { c: { d: { e: { f: { password: string } } } } } };
    };
    assert.equal(res.a.b.c.d.e.f.password, "super-secret-password-123");
  });
});
