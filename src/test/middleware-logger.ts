import { assert } from "chai";
import { EventEmitter } from "node:events";
import http from "node:http";
import { describe, it, describe as context } from "node:test";
import { Writable } from "node:stream";
import { Request, Response } from "express";
import { StrictLogger } from "../logger-types";
import loggerMiddleware, { redactHeaders, redactOriginalURL, redactQuery } from "../middleware/logger";
import logger from "../pino-logger";

// cspell:ignore tcmobile

describe("Logger Middleware", function() {
  context("Redact Headers", () => {
    // Sample values only. Every one is made up.
    const sample = "abcdef1234567";
    const other = "1234567abcdef";

    it("cuts every key header to 7 characters", function() {
      const sut = redactHeaders({
        authorization: `Bearer ${sample}`,
        apikey: sample,
        personnelapikey: sample,
        "x-tc-auth-token": sample,
      });
      assert.deepEqual(sut, {
        authorization: "Bearer abcdef1",
        apikey: "abcdef1",
        personnelapikey: "abcdef1",
        "x-tc-auth-token": "abcdef1",
      });
    });

    it("keeps the authorization scheme and cuts the credential behind it", function() {
      const sut = redactHeaders({ authorization: `Basic ${sample}` });
      assert.deepEqual(sut, { authorization: "Basic abcdef1" });
    });

    it("cuts an authorization header that carries no scheme", function() {
      const sut = redactHeaders({ authorization: sample });
      assert.deepEqual(sut, { authorization: "abcdef1" });
    });

    // The first word was kept whole as a scheme, which logged a credential that holds a
    // space.
    it("cuts an authorization credential that holds a space", function() {
      const sut = redactHeaders({ authorization: "abcdef1234567 7654321fedcba" });
      assert.deepEqual(sut, { authorization: "abcdef1" });
    });

    it("keeps the cookie names and drops the values", function() {
      const sut = redactHeaders({
        cookie: `seneca-login=${sample}; saml=${other}`,
      });
      assert.deepEqual(sut, {
        cookie: "seneca-login=<redacted>; saml=<redacted>",
      });
    });

    it("skips the empty segment of a cookie that ends in a semicolon", function() {
      const sut = redactHeaders({ cookie: "seneca-login=abc;" });
      assert.deepEqual(sut, { cookie: "seneca-login=<redacted>" });
    });

    it("returns an empty cookie unchanged", function() {
      const sut = redactHeaders({ cookie: "" });
      assert.deepEqual(sut, { cookie: "" });
    });

    it("redacts set-cookie header leaving attributes intact", function() {
      const sutString = redactHeaders({
        "set-cookie": "session=SECRET_TOKEN; Path=/; Domain=.tabletcommand.com; Max-Age=3600; HttpOnly; Secure; SameSite=None",
      } as unknown as Request["headers"]);
      assert.deepEqual(sutString, {
        "set-cookie": "session=<redacted>; Path=/; Domain=.tabletcommand.com; Max-Age=3600; HttpOnly; Secure; SameSite=None",
      } as unknown as Request["headers"]);

      const sutArray = redactHeaders({
        "set-cookie": [
          "session=SECRET123; Path=/; HttpOnly; Secure; SameSite=None",
          "remember=VAL456; Path=/; HttpOnly",
        ],
      });
      assert.deepEqual(sutArray, {
        "set-cookie": [
          "session=<redacted>; Path=/; HttpOnly; Secure; SameSite=None",
          "remember=<redacted>; Path=/; HttpOnly",
        ],
      });
    });

    it("matches the header name without case", function() {
      const sut = redactHeaders({
        Cookie: `seneca-login=${sample}`,
        ApiKey: sample,
      } as unknown as Record<string, string>);
      assert.deepEqual(sut, {
        Cookie: "seneca-login=<redacted>",
        ApiKey: "abcdef1",
      });
    });

    it("redacts every value of a repeated header", function() {
      const sut = redactHeaders({ apikey: [sample, other] });
      assert.deepEqual(sut, { apikey: ["abcdef1", "1234567"] });
    });

    it("leaves the headers that identify the client", function() {
      const sut = redactHeaders({
        "user-agent": "TCMobile 3.0.3 b216",
        "x-tc-bundle-identifier": "com.tabletcommand.tcmobile",
      });
      assert.deepEqual(sut, {
        "user-agent": "TCMobile 3.0.3 b216",
        "x-tc-bundle-identifier": "com.tabletcommand.tcmobile",
      });
    });

    // This runs in a res "finish" listener, where a throw ends the process.
    it("drops a value that is not a string instead of throwing", function() {
      const sut = redactHeaders({
        apikey: 12345,
        cookie: { name: "seneca-login" },
        authorization: null,
        personnelapikey: [sample, 12345],
      } as unknown as Record<string, string>);
      assert.deepEqual(sut, {
        apikey: "<redacted>",
        cookie: "<redacted>",
        authorization: "<redacted>",
        personnelapikey: ["abcdef1", "<redacted>"],
      });
    });

    it("leaves the request headers alone", function() {
      const headers = { apikey: sample, cookie: `seneca-login=${sample}` };
      redactHeaders(headers);
      assert.deepEqual(headers, { apikey: sample, cookie: `seneca-login=${sample}` });
    });
  });

  context("Redact Query", () => {
    const sample = "abcdef1234567";

    it("cuts every key parameter to 7 characters", function() {
      const sut = redactQuery({
        apikey: sample,
        personnelApiKey: sample,
        signupKey: sample,
      });
      assert.deepEqual(sut, {
        apikey: "abcdef1",
        personnelApiKey: "abcdef1",
        signupKey: "abcdef1",
      });
    });

    it("leaves the parameters that are not credentials", function() {
      const sut = redactQuery({ v: "4", shared: "1" });
      assert.deepEqual(sut, { v: "4", shared: "1" });
    });

    it("cuts a parameter that wraps a key name", function() {
      const sut = redactQuery({ deviceApiKey: sample, apikeyHash: sample });
      assert.deepEqual(sut, { deviceApiKey: "abcdef1", apikeyHash: "abcdef1" });
    });

    it("does not throw on a malformed escape in a parameter name", function() {
      const sut = redactQuery({ "%ZZ": "4" });
      assert.deepEqual(sut, { "%ZZ": "4" });
    });

    it("cuts every value of a repeated parameter", function() {
      const sut = redactQuery({ apikey: [sample, "7654321fedcba"] });
      assert.deepEqual(sut, { apikey: ["abcdef1", "7654321"] });
    });

    it("drops a value that is not a string", function() {
      const sut = redactQuery({ apikey: { nested: sample } });
      assert.deepEqual(sut, { apikey: "<redacted>" });
    });

    // redactQuery used to write the short key back onto req.query, which every handler
    // after the logger reads.
    it("leaves the request query alone", function() {
      const query = { apikey: sample };
      redactQuery(query);
      assert.deepEqual(query, { apikey: sample });
    });
  });

  context("Redact Original URL", () => {
    const url = "http://local:3442/incident?";
    it("apikey is last", function() {
      const prevApiKey = "apikey=abcdef1234567";
      const expApiKey = "apikey=abcdef1";
      const redacted = redactOriginalURL(url + prevApiKey);
      assert.equal(redacted, url + expApiKey);
    });

    it("apikey is middle of url", function() {
      const prevApiKey = "apikey=abcdef1234567&k=1";
      const expApiKey = "apikey=abcdef1&k=1";
      const redacted = redactOriginalURL(url + prevApiKey);
      assert.equal(redacted, url + expApiKey);
    });

    it("apikey is short", function() {
      const prevApiKey = "apikey=1&";
      const expApiKey = "apikey=1&";
      const redacted = redactOriginalURL(url + prevApiKey);
      assert.equal(redacted, url + expApiKey);
    });

    // req.originalUrl is what both loggers pass in, and it is always relative.
    it("cuts the apikey of a relative url", function() {
      const redacted = redactOriginalURL("/api/v1/incident?apikey=abcdef1234567");
      assert.equal(redacted, "/api/v1/incident?apikey=abcdef1");
    });

    it("cuts every key parameter, in either spelling", function() {
      const redacted = redactOriginalURL(
        "/api/v2/personnel?personnelApiKey=abcdef1234567&signupkey=1234567abcdef&v=4"
      );
      assert.equal(redacted, "/api/v2/personnel?personnelApiKey=abcdef1&signupkey=1234567&v=4");
    });

    it("cuts more than one key in the same url", function() {
      const redacted = redactOriginalURL("/api/v2/personnel?apikey=abcdef1234567&personnelApiKey=1234567abcdef");
      assert.equal(redacted, "/api/v2/personnel?apikey=abcdef1&personnelApiKey=1234567");
    });

    it("cuts a parameter that wraps a key name", function() {
      const redacted = redactOriginalURL("/api/v1/incident?departmentApikey=abcdef1234567&apikeyHash=abcdef1234567");
      assert.equal(redacted, "/api/v1/incident?departmentApikey=abcdef1&apikeyHash=abcdef1");
    });

    it("leaves a parameter whose value holds a key name", function() {
      const redacted = redactOriginalURL("/api/v1/incident?sort=apikey&v=4");
      assert.equal(redacted, "/api/v1/incident?sort=apikey&v=4");
    });

    // Express decodes the name, so api%6Bey reaches tabletcommand-session as apikey.
    it("cuts a key parameter whose name is encoded", function() {
      const redacted = redactOriginalURL("/api/v1/incident?api%6Bey=abcdef1234567");
      assert.equal(redacted, "/api/v1/incident?api%6Bey=abcdef1");
    });

    it("cuts the key of a url nested in a parameter value", function() {
      const redacted = redactOriginalURL("/login?next=/api/v1/incident?apikey=abcdef1234567");
      assert.equal(redacted, "/login?next=/api/v1/incident?apikey=abcdef1");
    });

    it("leaves a url that carries no query", function() {
      assert.equal(redactOriginalURL("/api/v1/incident"), "/api/v1/incident");
    });

    it("leaves a parameter that carries no value", function() {
      assert.equal(redactOriginalURL("/api/v1/incident?apikey&v=4"), "/api/v1/incident?apikey&v=4");
    });

    // decodeURIComponent throws on a malformed escape, and this runs where a throw ends
    // the process.
    it("does not throw on a malformed escape in a parameter name", function() {
      assert.equal(redactOriginalURL("/api/v1/incident?%ZZ=1&apikey=abcdef1234567"),
        "/api/v1/incident?%ZZ=1&apikey=abcdef1");
    });

    // A regex over the whole url backtracked for as long as the url.
    it("redacts a long url without backtracking", function() {
      const start = process.hrtime.bigint();
      redactOriginalURL("/x?" + "apikey".repeat(20000));
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
      assert.isBelow(elapsedMs, 100);
    });

    it("returns an empty string for a missing url", function() {
      assert.equal(redactOriginalURL(), "");
      assert.equal(redactOriginalURL(""), "");
    });
  });

  context("Access Log", () => {
    function logLine(req: Partial<Request>): Record<string, unknown> {
      let line: Record<string, unknown> = {};
      const logger = {
        info: (msg: Record<string, unknown>) => {
          line = msg;
        },
      } as unknown as StrictLogger;
      const res = new EventEmitter() as unknown as Response;
      res.statusCode = 200;

      loggerMiddleware(logger)(req as Request, res, () => undefined);
      res.emit("finish");
      return line;
    }

    it("redacts both copies of the url", function() {
      const line = logLine({
        method: "GET",
        originalUrl: "/api/v1/incident?apikey=abcdef1234567",
        headers: { apikey: "abcdef1234567" },
      });

      assert.equal(line.url, "/api/v1/incident?apikey=abcdef1");
      assert.deepEqual(line.req, {
        body: undefined,
        headers: { apikey: "abcdef1" },
        method: "GET",
        originalUrl: "/api/v1/incident?apikey=abcdef1",
      });
    });
  });

  context("pino-http integration with real logger", () => {
    it("redacts response set-cookie and authorization headers (H1)", async () => {
      const lines: Record<string, unknown>[] = [];
      const capture = new Writable({
        write(chunk: Buffer | string, _encoding: string, callback: (error?: Error | null) => void) {
          try {
            lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
          } catch {
            // ignore
          }
          callback();
        },
      });

      const log = logger({ name: "test-response-redaction" }, capture);
      const middleware = loggerMiddleware(log as StrictLogger);

      const server = http.createServer((req, res) => {
        middleware(req as unknown as Request, res as unknown as Response, () => {
          res.setHeader(
            "set-cookie",
            "session=SECRET; Path=/; Domain=.tabletcommand.com; Max-Age=3600; HttpOnly; Secure; SameSite=None"
          );
          res.setHeader("authorization", "Bearer SECRET12345");
          res.statusCode = 200;
          res.end("ok");
        });
      });

      await new Promise<void>((resolve, reject) => {
        server.listen(0, () => {
          const address = server.address();
          if (!address || typeof address === "string") {
            server.close();
            return reject(new Error("Unable to bind test server"));
          }
          const port = address.port;
          http.get(`http://127.0.0.1:${port}/test`, (res) => {
            res.resume();
            res.on("end", () => {
              server.close(() => resolve());
            });
          }).on("error", (err) => {
            server.close(() => reject(err));
          });
        });
      });

      assert.equal(lines.length, 1);
      const line = lines[0];
      const resObj = line.res as { statusCode: number; headers: Record<string, unknown> };
      assert.isDefined(resObj);
      assert.equal(resObj.statusCode, 200);
      const setCookie = String(resObj.headers["set-cookie"]);
      assert.include(setCookie, "session=<redacted>");
      assert.notInclude(setCookie, "SECRET");
      assert.include(setCookie, "SameSite=None");
      assert.include(setCookie, "HttpOnly");
      assert.include(setCookie, "Secure");
      assert.include(setCookie, "Path=/");
      assert.include(setCookie, "Domain=.tabletcommand.com");
      assert.include(setCookie, "Max-Age=3600");
      assert.equal(resObj.headers.authorization, "Bearer SECRET1");
    });

    it("redacts credentials in request login body (M2)", async () => {
      const lines: Record<string, unknown>[] = [];
      const capture = new Writable({
        write(chunk: Buffer | string, _encoding: string, callback: (error?: Error | null) => void) {
          try {
            lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
          } catch {
            // ignore
          }
          callback();
        },
      });

      const log = logger({ name: "test-login-body" }, capture);
      const middleware = loggerMiddleware(log as StrictLogger);

      const server = http.createServer((req, res) => {
        (req as Request).body = {
          username: "alice",
          password: "mySecretPassword123",
        };
        middleware(req as unknown as Request, res as unknown as Response, () => {
          res.statusCode = 200;
          res.end("ok");
        });
      });

      await new Promise<void>((resolve, reject) => {
        server.listen(0, () => {
          const address = server.address();
          if (!address || typeof address === "string") {
            server.close();
            return reject(new Error("Unable to bind test server"));
          }
          const port = address.port;
          const postReq = http.request(
            `http://127.0.0.1:${port}/login`,
            { method: "POST" },
            (res) => {
              res.resume();
              res.on("end", () => {
                server.close(() => resolve());
              });
            }
          );
          postReq.on("error", (err) => {
            server.close(() => reject(err));
          });
          postReq.end();
        });
      });

      assert.equal(lines.length, 1);
      const line = lines[0];
      const reqObj = line.req as { body: { username: string; password: string } };
      assert.isDefined(reqObj);
      assert.equal(reqObj.body.username, "alice");
      assert.equal(reqObj.body.password, "<redacted>");
    });

    it("redacts secrets inside array of objects in request body (M2)", async () => {
      const lines: Record<string, unknown>[] = [];
      const capture = new Writable({
        write(chunk: Buffer | string, _encoding: string, callback: (error?: Error | null) => void) {
          try {
            lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
          } catch {
            // ignore
          }
          callback();
        },
      });

      const log = logger({ name: "test-array-body" }, capture);
      const middleware = loggerMiddleware(log as StrictLogger);

      const server = http.createServer((req, res) => {
        (req as Request).body = {
          items: [
            { apikey: "abcdef1234567" },
          ],
        };
        middleware(req as unknown as Request, res as unknown as Response, () => {
          res.statusCode = 200;
          res.end("ok");
        });
      });

      await new Promise<void>((resolve, reject) => {
        server.listen(0, () => {
          const address = server.address();
          if (!address || typeof address === "string") {
            server.close();
            return reject(new Error("Unable to bind test server"));
          }
          const port = address.port;
          const postReq = http.request(
            `http://127.0.0.1:${port}/items`,
            { method: "POST" },
            (res) => {
              res.resume();
              res.on("end", () => {
                server.close(() => resolve());
              });
            }
          );
          postReq.on("error", (err) => {
            server.close(() => reject(err));
          });
          postReq.end();
        });
      });

      assert.equal(lines.length, 1);
      const line = lines[0];
      const reqObj = line.req as { body: { items: { apikey: string }[] } };
      assert.isDefined(reqObj);
      assert.equal(reqObj.body.items[0].apikey, "abcdef1");
    });
  });
});
