import { assert } from "chai";
import { describe, it } from "node:test";
import { Writable } from "node:stream";
import logger, { isPinoPrettyAvailable } from "../pino-logger";

describe("Logger Factory", () => {
  function createCaptureStream(lines: Record<string, unknown>[]) {
    return new Writable({
      write(chunk: Buffer | string, _encoding: string, callback: (error?: Error | null) => void) {
        try {
          const str = chunk.toString();
          const parsed = JSON.parse(str) as Record<string, unknown>;
          lines.push(parsed);
        } catch {
          // ignore
        }
        callback();
      },
    });
  }

  it("creates a logger that outputs valid JSON with base service name", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      {
        name: "test-service",
        logToConsole: true,
      },
      createCaptureStream(lines)
    );

    assert.isNotNull(log);
    log?.info({ action: "login" }, "user logged in");

    assert.equal(lines.length, 1);
    const line = lines[0];
    assert.equal(line.service, "test-service");
    assert.equal(line.level, "info");
    assert.equal(line.msg, "user logged in");
    assert.equal(line.action, "login");
    assert.isString(line.time);
  });

  it("formats level as string label", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      {
        name: "test-service",
        logToConsole: true,
      },
      createCaptureStream(lines)
    );

    assert.isNotNull(log);
    log?.warn({ count: 5 }, "threshold warning");
    log?.error(new Error("disk full"), "failure");

    assert.equal(lines.length, 2);
    assert.equal(lines[0].level, "warn");
    assert.equal(lines[1].level, "error");
  });

  it("includes extraMeta in the base fields", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      {
        name: "test-service",
        logToConsole: true,
        extraMeta: {
          environment: "qa",
          cluster: "us-west-2",
        },
      },
      createCaptureStream(lines)
    );

    assert.isNotNull(log);
    log?.info("started");

    assert.equal(lines.length, 1);
    assert.equal(lines[0].environment, "qa");
    assert.equal(lines[0].cluster, "us-west-2");
    assert.equal(lines[0].service, "test-service");
  });

  it("respects custom log level override", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      {
        name: "test-service",
        logToConsole: true,
        level: "warn",
      },
      createCaptureStream(lines)
    );

    assert.isNotNull(log);
    log?.info("this should be filtered out");
    log?.warn("this should be logged");

    assert.equal(lines.length, 1);
    assert.equal(lines[0].msg, "this should be logged");
  });

  it("supports disabling pretty-printing via config.pretty: false", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      {
        name: "test-service",
        logToConsole: true,
        pretty: false,
      },
      createCaptureStream(lines)
    );

    assert.isNotNull(log);
    log?.info("ndjson output test");
    assert.equal(lines.length, 1);
    assert.equal(lines[0].msg, "ndjson output test");
  });

  it("supports disabling pretty-printing via PINO_PRETTY=false env variable", () => {
    const origEnv = process.env.PINO_PRETTY;
    process.env.PINO_PRETTY = "false";
    try {
      const lines: Record<string, unknown>[] = [];
      const log = logger(
        {
          name: "test-service",
          logToConsole: true,
        },
        createCaptureStream(lines)
      );

      assert.isNotNull(log);
      log?.info("ndjson env test");
      assert.equal(lines.length, 1);
      assert.equal(lines[0].msg, "ndjson env test");
    } finally {
      if (origEnv !== undefined) {
        process.env.PINO_PRETTY = origEnv;
      } else {
        delete process.env.PINO_PRETTY;
      }
    }
  });

  it("exports isPinoPrettyAvailable helper and reports boolean", () => {
    assert.isBoolean(isPinoPrettyAvailable());
  });

  it("handles config.pretty: true gracefully and returns a valid logger instance", () => {
    const log = logger({
      name: "pretty-test-service",
      pretty: true,
    });
    assert.isNotNull(log);
    assert.isFunction(log?.info);
  });

  it("correctly enables logger or returns null based on transport config", () => {
    // {logToConsole: true} -> logger
    assert.isNotNull(logger({
      name: "test-service",
      logToConsole: true,
    }));

    // {logToConsole: false, logToFile: true} -> logger (regression guard)
    assert.isNotNull(logger({
      name: "test-service",
      logToConsole: false,
      logToFile: true,
    }));

    // {logToConsole: false, logToDatadog: true} -> logger (regression guard)
    assert.isNotNull(logger({
      name: "test-service",
      logToConsole: false,
      logToDatadog: true,
    }));

    // {name only} -> logger
    assert.isNotNull(logger({
      name: "test-service",
    }));

    // {logToConsole: false, logToFile: false, logToDatadog: false} -> null
    assert.isNull(logger({
      name: "test-service",
      logToConsole: false,
      logToFile: false,
      logToDatadog: false,
    }));
  });

  it("child logger inherits service name and attaches child bindings", () => {
    const lines: Record<string, unknown>[] = [];
    const parent = logger(
      {
        name: "parent-service",
        logToConsole: true,
      },
      createCaptureStream(lines)
    );

    assert.isNotNull(parent);
    const child = parent?.child({ requestId: "req-123" });
    child?.info({ data: 42 }, "processing request");

    assert.equal(lines.length, 1);
    assert.equal(lines[0].service, "parent-service");
    assert.equal(lines[0].requestId, "req-123");
    assert.equal(lines[0].data, 42);
    assert.equal(lines[0].msg, "processing request");
  });
});
