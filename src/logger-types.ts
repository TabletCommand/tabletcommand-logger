export type LogArgument = string | number | boolean | bigint | symbol | null | undefined;

// The inverted Winston call `(msg, obj)` matches neither overload: the first needs an
// object first, the second only takes primitives after the message.
export interface StrictLogMethod {
  // 1. Structured object first (Pino convention)
  <T extends object>(obj: T, msg?: string, ...args: unknown[]): void;

  // 2. String message only, followed by optional primitive interpolation values
  (msg: string, ...args: LogArgument[]): void;
}

// error/warn/fatal also take a caught value, which is `unknown` under strict mode, so
// `catch (err) { logger.error(err, "msg") }` compiles without a cast. The message must
// still be a string, so the inverted `(msg, obj)` call stays a compile error.
export interface StrictErrorLogMethod extends StrictLogMethod {
  (err: unknown, msg?: string, ...args: LogArgument[]): void;
}

export interface StrictLogger {
  fatal: StrictErrorLogMethod;
  error: StrictErrorLogMethod;
  warn: StrictErrorLogMethod;
  info: StrictLogMethod;
  debug: StrictLogMethod;
  trace: StrictLogMethod;
  level: string;
  child(bindings: Record<string, unknown>): StrictLogger;
  [key: string]: unknown;
}

export type LoggerConfig = {
  name: string;
  /** @deprecated No-op in v4 — logs write to stdout */
  filename?: string;
  /** @deprecated No-op in v4 — logs write to stdout */
  dirname?: string;
  logToConsole?: boolean;
  /** @deprecated No-op in v4 — logs write to stdout */
  logToFile?: boolean;
  /** @deprecated No-op in v4 — shipping handled by k8s */
  logToDatadog?: boolean;
  /** @deprecated No-op in v4 */
  datadogApiKey?: string;
  extraMeta?: Record<string, unknown>;
  level?: string;
  pretty?: boolean;
};

export type LoggerModule = StrictLogger | null;
