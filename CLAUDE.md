# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

`tabletcommand-logger` is the shared logging and metrics library for Tablet Command Node.js/TypeScript backend services. It is published to Tablet Command's private npm registry and consumed across ~17 services in `massive-tyrion`.

Version **4.0.0** is powered by **Pino**, writing structured JSON directly to `process.stdout` where Kubernetes container log collectors (Datadog Agent) tail it.

---

## Development Commands

- **Install dependencies:** `npm ci`
- **Run all checks and tests (default pipeline):** `npm test` (or `npx gulp`)
  - Runs in sequence: `type-coverage` -> `spell` -> `ts` -> `lint` -> `test`
- **Build:** `npm run build` (or `npx gulp ts`)
  - Cleans and runs `tsc -p src`. Emits JS to `build/` and `.d.ts` declaration maps to `definitions/`.
- **Lint:** `npm run lint` (or `npx gulp lint`)
  - Runs ESLint with `neostandard` and TypeScript parser over `src/`.
- **Spell check:** `npx cspell --no-progress` (dictionary in `.cspell/project-words.txt`)
- **Type coverage:** `npx type-coverage --detail` (enforces $\ge 99\%$ typed coverage)
- **Run tests:** `npx tsx --test --test-concurrency=1 --test-reporter=spec src/test/*.ts`
- **Single test file:** `npx tsx --test src/test/<filename>.ts`

---

## Architecture & Core Components

1. **Pino stdout Engine (`src/pino-logger.ts`):**
   - Fast JSON logging to `process.stdout`.
   - String log levels (`level: "info"`, `"debug"`, `"warn"`, `"error"`).
   - ISO 8601 timestamps (`timestamp: pino.stdTimeFunctions.isoTime`).
   - Base fields contain `service: config.name` and any provided `extraMeta`.
   - Pretty printing (`pino-pretty`) automatically enabled for local development when `NODE_ENV !== "production"` (bypassed in tests and CI). If `pino-pretty` is not installed, it gracefully falls back to standard NDJSON stdout without crashing.

2. **Strict TypeScript Signatures (`src/logger-types.ts`):**
   - Strict compile-time enforcement of Pino conventions via function overloads:
     - `(obj: object, msg?: string, ...args)`
     - `(msg: string, ...args: primitive[])`
   - Inverted calls `(msg: string, obj: object)` and `(msg: string, err: Error)` are explicitly rejected via a `never`-typed parameter. Any inverted call triggers an immediate TypeScript compile error.

3. **Native Redaction Engine (`src/redaction.ts`):**
   - Pino native `fast-redact` paths covering `apikey`, `token`, `password`, `secret`, `headers.authorization`, `headers.cookie`, `headers["set-cookie"]`, etc., enumerated up to `MAX_REDACT_DEPTH = 5` wildcard levels (including numeric array indices such as `req.body.items[0].apikey`).
   - Custom `pinoCensor` function applies Tablet Command's partial exposure rule:
     - API keys & tokens: truncated to first 7 characters (`value.substring(0, 7)`).
     - Authorization headers: preserves scheme (`Bearer `, `Basic `) and truncates credential to 7 characters on both request and response (`res.headers.authorization`).
     - Request Cookies (`cookie`): preserves cookie names, masks values with `<redacted>`.
     - Response Set-Cookie (`set-cookie`): redacts only the first pair's cookie value while keeping security attributes (`Path`, `Domain`, `Max-Age`, `HttpOnly`, `Secure`, `SameSite`) intact for auditing visibility.
     - Passwords & secrets: completely masked with `<redacted>`.
   - Retains and exports URL/header redaction helpers (`redactHeaders`, `redactOriginalURL`, `redactQuery`).

4. **Guarded OpenTelemetry Trace Correlation (`src/otel.ts`):**
   - Mixin inspects `@opentelemetry/api` active trace spans and injects `trace_id` and `span_id`.
   - `@opentelemetry/api` is an optional peer dependency loaded via lazy, guarded `require()` so services without OTel incur no performance penalty and require no dependency changes.

5. **HTTP Middleware (`src/middleware/`):**
   - `loggerMiddleware`: Express access logger backed by `pino-http` (with mock logger fallback for unit tests). Attaches `req.log`.
   - `statusLogger`: POST-only request logger capturing `res.json` payload, response duration, and clean headers.
   - `metricsMiddleware` / `metricsCleanUpParams`: StatsD metrics middleware (orthogonal to the logging engine).

6. **Monorepo Compatibility Shim (`src/winston-logger.ts`):**
   - Re-exports `src/pino-logger.ts` so older direct imports (`tabletcommand-logger/definitions/winston-logger`) continue compiling without breakage.

---

## Key Differences: v3.x vs. v4.0.0

| Aspect | v3.x (Winston) | v4.0.0 (Pino) |
|---|---|---|
| **Underlying Engine** | `winston`, `datadog-winston`, `winston-daily-rotate-file` | `pino`, `pino-http`, `pino-pretty` (dev) |
| **Delivery Model** | In-process file rotation + in-process Datadog HTTP transport (dead config in k8s) | `process.stdout` JSON stream collected by k8s Datadog Agent (`containerCollectAll: true`) |
| **Calling Signatures** | Accepted `(msg, meta)` or `(meta)` flexibly | Strictly requires `(obj, msg)` or `(msg)`. Legacy `(msg, obj)` **fails TypeScript compilation** |
| **Redaction** | String regex/URL parsing inside middlewares | Pino native `redact: { paths, censor }` covering root & nested JSON, plus URL helpers |
| **Log Levels** | Hardcoded to `"info"` with no config/env override | Configurable via `config.level` or `LOG_LEVEL` env var (`debug`, `trace`, `info`, `warn`, `error`) |
| **Trace Correlation** | None | Automatic `trace_id` and `span_id` injection via guarded OTel mixin |
| **Performance** | Winston format pipeline + event emitter overhead | Zero-overhead Pino serialization, asynchronous formatting, and fast suppression |

---

## Consumer Upgrade Guide (Upgrading a Service to v4)

Follow these steps when migrating a service in `massive-tyrion` (or any other repo) from `tabletcommand-logger` `~3.2.7` to `^4.0.0`:

### 1. Update `package.json`
Bump the dependency in the consuming service's `package.json`:
```json
"dependencies": {
  "tabletcommand-logger": "^4.0.0"
}
```
Run `npm install` (or `npm ci`).

### 2. Fix Inverted Logger Call Sites
In v3, Winston allowed passing a message first and metadata second:
```typescript
// ❌ FAILS COMPILATION in v4:
logger.info("user logged in", { userId: user.id });
logger.error("database query failed", err);
```

In v4, TypeScript will reject this at build time (`Argument of type '...' is not assignable to parameter of type 'never'`). Swap arguments so the object or error comes **first**:
```typescript
// ✅ Correct in v4:
logger.info({ userId: user.id }, "user logged in");
logger.error(err, "database query failed");

// ✅ Plain strings remain unchanged:
logger.info("server started on port 3000");
```

> **Note on exposure in `massive-tyrion`:** Inverted call sites are concentrated in ~6 files (~44 total occurrences):
> - `process-sms` (~3 files)
> - `process-personnel` (~2 files)
> - `server-account` (~1 file)
>
> All other services already pass objects first or log plain strings.

### 3. `LoggerConfig` Compatibility (No edits required)
In v4, `LoggerConfig` keeps all legacy fields (`filename`, `dirname`, `logToFile`, `logToDatadog`, `datadogApiKey`) marked as `@deprecated` no-ops. Services do **not** need to modify their existing `config.ts` or environment mappings during the initial upgrade. Dead configuration fields can be cleaned up opportunistically.

Optional new fields available in v4:
- `level?: string` — override log level (e.g. `"debug"`).
- `pretty?: boolean` — force enable/disable pretty printing.

### 4. Optional: Enable OpenTelemetry Trace Correlation
If the service uses OpenTelemetry for distributed tracing, install `@opentelemetry/api`:
```bash
npm install @opentelemetry/api
```
`tabletcommand-logger` will automatically detect the active span and inject `trace_id` and `span_id` into every log line without additional code.

### 5. Optional: Enable Local Pretty Printing
If developers want human-readable, colorized logs when running the service locally in Node (`NODE_ENV !== "production"`), add `pino-pretty` as a development dependency:
```bash
npm install -D pino-pretty
```
If omitted, `tabletcommand-logger` automatically falls back to raw NDJSON stdout without crashing.

### 6. Verification in Consuming Service
Run the service's build and test suite:
```bash
npm run build && npm test
```
If any legacy `logger.x(msg, obj)` call was overlooked, `tsc` will pinpoint the exact file and line number.

