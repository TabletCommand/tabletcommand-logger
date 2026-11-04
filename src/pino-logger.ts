import pino, { LoggerOptions, DestinationStream } from "pino";
import { LoggerConfig, StrictLogger, LoggerModule } from "./logger-types";
import { REDACT_PATHS, pinoCensor } from "./redaction";
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

  const isDev =
    process.env.NODE_ENV !== "production" &&
    process.env.NODE_ENV !== "test" &&
    !process.env.CI;
  const wantPretty = config.pretty ?? envPretty ?? isDev;
  const usePretty = wantPretty && isPinoPrettyAvailable();

  const base: Record<string, unknown> = {
    ...config.extraMeta,
    service: config.name,
  };

  const options: LoggerOptions = {
    level: config.level || process.env.LOG_LEVEL || "info",
    base,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: REDACT_PATHS,
      censor: pinoCensor,
    },
    mixin() {
      return getOtelTraceContext();
    },
  };

  if (usePretty && !customDestination) {
    try {
      const prettyOptions: LoggerOptions = {
        ...options,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        },
      };
      const pinoInstance = pino(prettyOptions);
      return pinoInstance as unknown as StrictLogger;
    } catch {
      // Fall back cleanly to stdout NDJSON if transport creation fails
    }
  }

  const pinoInstance = customDestination
    ? pino(options, customDestination)
    : pino(options, process.stdout);

  return pinoInstance as unknown as StrictLogger;
}
