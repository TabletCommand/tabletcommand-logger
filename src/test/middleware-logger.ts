import { assert } from "chai";
import { describe, it, describe as context } from "node:test";
import { redactHeaders, redactOriginalURL } from "../middleware/logger";

// cspell:ignore personnelapikey tcmobile

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
        authorization: "Bearer ",
        apikey: "abcdef1",
        personnelapikey: "abcdef1",
        "x-tc-auth-token": "abcdef1",
      });
    });

    it("keeps the cookie names and drops the values", function() {
      const sut = redactHeaders({
        cookie: `seneca-login=${sample}; saml=${other}`,
      });
      assert.deepEqual(sut, {
        cookie: "seneca-login=<redacted>; saml=<redacted>",
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
      const expApiKey = "apikey=1";
      const redacted = redactOriginalURL(url + prevApiKey);
      assert.equal(redacted, url + expApiKey);
    });
  });
});
