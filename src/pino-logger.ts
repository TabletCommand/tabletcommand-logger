import pino, { LoggerOptions, DestinationStream } from "pino";
import { LoggerConfig, StrictLogger, LoggerModule } from "./logger-types";
import { redactSecrets } from "./redaction";
import { getOtelTraceContext } from "./otel";

export { LoggerConfig, StrictLogger, LoggerModule };

export function isPinoPrettyAvailable(): boolean {
  try {
    require.resolve("pino-pretty");
    return true;
  } catch {
    try {
      require.resolve("pino-pretty", { paths: [process.cwd()] });
      return true;
    } catch {
      return false;
    }
  }
}

export default function logger(
  config: LoggerConfig,
  customDestination?: DestinationStream
): StrictLogger | null {
  // v4 always writes to stdout. Only return null when the caller explicitly
  // turns every sink off (back-compat with the old winston "no transports" case).
  const explicitlyAllOff =
    config.logToConsole === false &&
    config.logToFile !== true &&
    config.logToDatadog !== true;
  const loggingEnabled = !explicitlyAllOff;

  if (!loggingEnabled) {
    return null;
  }

  const envPretty =
    process.env.PINO_PRETTY !== undefined
      ? process.env.PINO_PRETTY === "true"
      : undefined;

  // Pretty output is opt-in: an unset NODE_ENV must not turn production logs into
  // colorized text that the Datadog Agent cannot parse.
  const isDev = process.env.NODE_ENV === "development" && !process.env.CI;
  const wantPretty = config.pretty ?? envPretty ?? isDev;
  const usePretty = wantPretty && isPinoPrettyAvailable();

  const base: Record<string, unknown> = {
    ...config.extraMeta,
    service: config.name,
  };

  const options: LoggerOptions = {
    level: config.level || process.env.LOG_LEVEL || "info",
    base,
    // Redaction walks each log object and each set of child bindings once, matching key
    // names without case. pino's redact paths match one exact key per path, and the
    // wildcard paths needed to reach nested bodies cost ~85µs a line.
    formatters: {
      level: (label: string) => ({ level: label }),
      log: (obj: Record<string, unknown>) => redactSecrets(obj),
      bindings: (bindings: pino.Bindings) => redactSecrets(bindings),
    },
    // formatters.log runs before serializers, so a serialized error is redacted here.
    serializers: {
      // stdSerializers.err builds on a prototype object, so copy its fields to a plain
      // object for the walk to enter.
      err: (err: Error) => redactSecrets({ ...pino.stdSerializers.err(err) }),
    },
    // Datadog reads the log date from "timestamp", not pino's default "time". Without
    // this, every line is dated when the agent ingests it.
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    mixin() {
      return getOtelTraceContext();
    },
  };

  // pino-pretty runs in a worker thread, so a failure there surfaces asynchronously and
  // cannot be caught here. isPinoPrettyAvailable() above is the guard that matters.
  if (usePretty && !customDestination) {
    return redactChildBindings(pino({
      ...options,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          timestampKey: "timestamp",
        },
      },
    }));
  }

  const pinoInstance = customDestination
    ? pino(options, customDestination)
    : pino(options, process.stdout);

  return redactChildBindings(pinoInstance);
}

// pino applies formatters.bindings to the root logger only; child() resets it. A child is
// created with Object.create(parent), so overriding child once here covers every
// descendant, including the ones pino-http creates per request.
type ChildFn = (this: pino.Logger, bindings: pino.Bindings, options?: pino.ChildLoggerOptions) => pino.Logger;

function redactChildBindings(instance: pino.Logger): StrictLogger {
  const pinoChild = instance.child as unknown as ChildFn;
  const child: ChildFn = function child(bindings, childOptions) {
    return pinoChild.call(this, redactSecrets(bindings), childOptions);
  };
  instance.child = child as unknown as pino.Logger["child"];
  return instance as unknown as StrictLogger;
}
