import "mocha";
import { assert } from "chai";
import { redactOriginalURL } from "../middleware/logger";

describe("Logger Middleware", function() {
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
