export type LogArgument = string | number | boolean | bigint | symbol | null | undefined;

export interface StrictLogMethod {
  // 1. Structured object first (Pino convention)
  <T extends object>(obj: T, msg?: string, ...args: unknown[]): void;

  // 2. Compile-time rejection of legacy inverted call (msg: string, obj: object)
  (msg: string, invalidSecondArg: never, ...args: never[]): void;

  // 3. String message only, followed by optional primitive interpolation values
  (msg: string, ...args: LogArgument[]): void;
}

export interface StrictLogger {
  fatal: StrictLogMethod;
  error: StrictLogMethod;
  warn: StrictLogMethod;
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
