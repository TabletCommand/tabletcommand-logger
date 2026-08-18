import { assert } from "chai";
import { EventEmitter } from "node:events";
import { describe, it, describe as context } from "node:test";
import { Request, Response } from "express";
import { Logger } from "winston";
import loggerMiddleware, { redactHeaders, redactOriginalURL, redactQuery } from "../middleware/logger";

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

    it("leaves a parameter that only ends in a key name", function() {
      const redacted = redactOriginalURL("/api/v1/incident?departmentApikey=abcdef1234567");
      assert.equal(redacted, "/api/v1/incident?departmentApikey=abcdef1234567");
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
      } as unknown as Logger;
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
});
