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
    // Pretty output is opt-in: an unset NODE_ENV must not turn production logs into
    // colorized text that the Datadog Agent cannot parse.
    const isDev = process.env.NODE_ENV === "development" && !process.env.CI;
    const wantPretty = (_b = (_a = config.pretty) !== null && _a !== void 0 ? _a : envPretty) !== null && _b !== void 0 ? _b : isDev;
    const usePretty = wantPretty && isPinoPrettyAvailable();
    const base = {
        ...config.extraMeta,
        service: config.name,
    };
    const options = {
        level: config.level || process.env.LOG_LEVEL || "info",
        base,
        // Redaction walks each log object and each set of child bindings once, matching key
        // names without case. pino's redact paths match one exact key per path, and the
        // wildcard paths needed to reach nested bodies cost ~85µs a line.
        formatters: {
            level: (label) => ({ level: label }),
            log: (obj) => (0, redaction_1.redactSecrets)(obj),
            bindings: (bindings) => (0, redaction_1.redactSecrets)(bindings),
        },
        // formatters.log runs before serializers, so a serialized error is redacted here.
        serializers: {
            // stdSerializers.err builds on a prototype object, so copy its fields to a plain
            // object for the walk to enter.
            err: (err) => (0, redaction_1.redactSecrets)({ ...pino_1.default.stdSerializers.err(err) }),
        },
        // Datadog reads the log date from "timestamp", not pino's default "time". Without
        // this, every line is dated when the agent ingests it.
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
        mixin() {
            return (0, otel_1.getOtelTraceContext)();
        },
    };
    // pino-pretty runs in a worker thread, so a failure there surfaces asynchronously and
    // cannot be caught here. isPinoPrettyAvailable() above is the guard that matters.
    if (usePretty && !customDestination) {
        return redactChildBindings((0, pino_1.default)({
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
        ? (0, pino_1.default)(options, customDestination)
        : (0, pino_1.default)(options, process.stdout);
    return redactChildBindings(pinoInstance);
}
function redactChildBindings(instance) {
    const pinoChild = instance.child;
    const child = function child(bindings, childOptions) {
        return pinoChild.call(this, (0, redaction_1.redactSecrets)(bindings), childOptions);
    };
    instance.child = child;
    return instance;
}
//# sourceMappingURL=pino-logger.js.map