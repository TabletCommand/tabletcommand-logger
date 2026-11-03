# tabletcommand-logger

Tablet Command shared logging and metrics library for Node.js services.

Version 4.0.0 uses **Pino** for structured JSON logging to `process.stdout`.

---

## Features

- **Pino JSON stdout engine**: High-performance, low-overhead JSON logging to stdout, ready for container log collection by Datadog Agent.
- **Strict Compile-Time Signature Enforcement**: Enforces Pino conventions `(obj, msg)` or `(msg)`. Legacy Winston-style inverted calls `(msg, obj)` fail TypeScript compilation with immediate compiler feedback.
- **Native Redaction**: Automatically truncates sensitive parameters (`apikey`, `token`, `authorization`) to a 7-character prefix, and masks passwords and secrets (`<redacted>`).
- **OpenTelemetry Correlation**: Built-in mixin automatically detects active OpenTelemetry spans and injects `trace_id` and `span_id` without requiring OpenTelemetry packages as hard dependencies.
- **Local Dev Pretty Printing**: Automatically enables `pino-pretty` formatting when `NODE_ENV !== "production"` (outside tests and CI).
- **HTTP Middlewares**: Provides `loggerMiddleware` (backed by `pino-http`), `statusLogger` (POST request auditing), and `metricsMiddleware` (statsd integration).

---

## Installation

```bash
npm install tabletcommand-logger
```

To enable OpenTelemetry trace correlation, install `@opentelemetry/api` in your service:

```bash
npm install @opentelemetry/api
```

To enable pretty-printed colorized logs in local development, install `pino-pretty` as a dev dependency:

```bash
npm install -D pino-pretty
```
If omitted, `tabletcommand-logger` automatically falls back to standard NDJSON stdout without crashing.

---

## Usage

### Creating a Logger

```typescript
import logger, { LoggerConfig } from "tabletcommand-logger";

const config: LoggerConfig = {
  name: "server-location",
  logToConsole: true,
};

const log = logger(config);
```

### Logging Conventions

Pino requires structured metadata objects to be passed as the **first** argument:

```typescript
// ✅ Good: Structured object first
log.info({ userId: "123", action: "update" }, "User profile updated");

// ✅ Good: String message only
log.info("Server started on port 3000");

// ✅ Good: Error first
log.error(err, "Failed to connect to database");

// ❌ COMPILE ERROR: String first with object (legacy Winston style)
// TypeScript will reject this call with a compile error:
log.info("User profile updated", { userId: "123" });
```

### HTTP Middleware

```typescript
import express from "express";
import { logger, loggerMiddleware } from "tabletcommand-logger";

const app = express();
const appLogger = logger({ name: "my-service", logToConsole: true });

app.use(loggerMiddleware(appLogger));
```

---

## Redaction Policy

Credentials and secrets are redacted before leaving the process:
- API Keys (`apikey`, `personnelapikey`, `signupkey`, `x-tc-auth-token`): Truncated to the first 7 characters (e.g. `abcdef1...`).
- Authorization headers (`Bearer <token>`, `Basic <cred>`): Scheme is preserved and the credential behind it is truncated to 7 characters. Both request (`req.headers.authorization`) and response (`res.headers.authorization`) are redacted.
- Cookies & Set-Cookie (`cookie`, `set-cookie`): Cookie names are preserved, values are masked with `<redacted>`. Both request (`req.headers.cookie`) and response (`res.headers["set-cookie"]`) headers are redacted.
- Passwords & Secrets (`password`, `secret`, `credentials`): Completely masked with `<redacted>`.
- Depth Limit (`MAX_REDACT_DEPTH = 5`): Fast-redact enumerates wildcard paths up to 5 levels deep (including numeric array indices such as `req.body.items[0].apikey`). Callers must not nest credentials deeper than 5 levels.

---

## Changelog

### 4.0.0
- **Breaking**: Migrated from Winston to Pino for high-performance JSON logging directly to `stdout`.
- **Breaking**: Enforced strict `(obj, msg)` signature at compile time; legacy Winston inverted calls `(msg, obj)` fail TypeScript build.
- **Added**: Built-in OpenTelemetry mixin extracting `trace_id` and `span_id` when active spans exist.
- **Added**: Express HTTP middleware powered by `pino-http` with response and request header redaction (`res.headers["set-cookie"]`, `res.headers.authorization`).
- **Added**: Configurable and automatic pretty printing via `pino-pretty` in local development with fallback to NDJSON stdout.
- **Added**: Native fast redaction up to 5 wildcard levels (`MAX_REDACT_DEPTH = 5`).
