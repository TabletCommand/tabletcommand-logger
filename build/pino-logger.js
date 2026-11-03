"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPinoPrettyAvailable = isPinoPrettyAvailable;
exports.default = logger;
const pino_1 = __importDefault(require("pino"));
const redaction_1 = require("./redaction");
const otel_1 = require("./otel");
function isPinoPrettyAvailable() {
    try {
        require.resolve("pino-pretty");
        return true;
    }
    catch {
        try {
            require.resolve("pino-pretty", { paths: [process.cwd()] });
            return true;
        }
        catch {
            return false;
        }
    }
}
function logger(config, customDestination) {
    var _a, _b;
    // v4 always writes to stdout. Only return null when the caller explicitly
    // turns every sink off (back-compat with the old winston "no transports" case).
    const explicitlyAllOff = config.logToConsole === false &&
        config.logToFile !== true &&
        config.logToDatadog !== true;
    const loggingEnabled = !explicitlyAllOff;
    if (!loggingEnabled) {
        return null;
    }
    const envPretty = process.env.PINO_PRETTY !== undefined
        ? process.env.PINO_PRETTY === "true"
        : undefined;
    const isDev = process.env.NODE_ENV !== "production" &&
        process.env.NODE_ENV !== "test" &&
        !process.env.CI;
    const wantPretty = (_b = (_a = config.pretty) !== null && _a !== void 0 ? _a : envPretty) !== null && _b !== void 0 ? _b : isDev;
    const usePretty = wantPretty && isPinoPrettyAvailable();
    const base = {
        ...config.extraMeta,
        service: config.name,
    };
    const options = {
        level: config.level || process.env.LOG_LEVEL || "info",
        base,
        formatters: {
            level: (label) => ({ level: label }),
        },
        timestamp: pino_1.default.stdTimeFunctions.isoTime,
        redact: {
            paths: redaction_1.REDACT_PATHS,
            censor: redaction_1.pinoCensor,
        },
        mixin() {
            return (0, otel_1.getOtelTraceContext)();
        },
    };
    if (usePretty && !customDestination) {
        try {
            const prettyOptions = {
                ...options,
                transport: {
                    target: "pino-pretty",
                    options: {
                        colorize: true,
                    },
                },
            };
            const pinoInstance = (0, pino_1.default)(prettyOptions);
            return pinoInstance;
        }
        catch {
            // Fall back cleanly to stdout NDJSON if transport creation fails
        }
    }
    const pinoInstance = customDestination
        ? (0, pino_1.default)(options, customDestination)
        : (0, pino_1.default)(options, process.stdout);
    return pinoInstance;
}
//# sourceMappingURL=pino-logger.js.map