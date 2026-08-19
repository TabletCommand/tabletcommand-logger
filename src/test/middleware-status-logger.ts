import { assert } from "chai";
import { EventEmitter } from "node:events";
import { describe, it, describe as context } from "node:test";
import { Request, Response } from "express";
import { Logger } from "winston";
import statusLogger from "../middleware/status-logger";

describe("Status Logger Middleware", function() {
  context("Request Log", () => {
    // Sample values only. Every one is made up.
    const sample = "abcdef1234567";

    function logLine(req: Partial<Request>): Record<string, unknown> {
      let line: Record<string, unknown> = {};
      const logger = {
        info: (msg: Record<string, unknown>) => {
          line = msg;
        },
      } as unknown as Logger;
      const res = new EventEmitter() as unknown as Response;
      res.statusCode = 200;
      res.json = () => res;

      statusLogger(logger)(req as Request, res, () => undefined);
      res.emit("finish");
      return line;
    }

    // server-status authenticates POST /api/v2/personnel by a key it accepts in the query.
    it("cuts the credentials out of the url, the query, and the headers", function() {
      const line = logLine({
        method: "POST",
        originalUrl: `/api/v2/personnel?personnelApiKey=${sample}&v=4`,
        path: "/api/v2/personnel",
        query: { personnelApiKey: sample, v: "4" },
        headers: { "user-agent": "TCMobile 3.0.3 b216", personnelapikey: sample },
      });

      const req = line.req as Record<string, unknown>;
      assert.equal(req.originalUrl, "/api/v2/personnel?personnelApiKey=abcdef1&v=4");
      assert.deepEqual(req.query, { personnelApiKey: "abcdef1", v: "4" });
      assert.deepEqual(req.headers, {
        "user-agent": "TCMobile 3.0.3 b216",
        personnelapikey: "abcdef1",
      });
    });

    it("leaves the request query alone for the handlers that run after it", function() {
      const query = { personnelApiKey: sample };
      logLine({
        method: "POST",
        originalUrl: `/api/v2/personnel?personnelApiKey=${sample}`,
        path: "/api/v2/personnel",
        query,
        headers: {},
      });

      assert.deepEqual(query, { personnelApiKey: sample });
    });
  });
});
