import _ from "lodash";
import { Logger } from "winston";
import {
  NextFunction,
  Request,
  Response,
} from "express";
import { Query } from "express-serve-static-core";

// Each of these authenticates a request on its own, so a log line that keeps the whole
// value is a live credential. The header stays, cut to a 7-character prefix: enough to
// tell two keys apart, not enough to replay one. Node lowercases incoming header names.
const keyHeaders = [
  "authorization",
  "apikey",
  "personnelapikey",
  "x-tc-auth-token",
];

// tabletcommand-session reads each of these from the query string when the header is
// absent, and accepts either spelling. signupKey only ever arrives in the query.
const keyParams = [
  "apikey",
  "personnelapikey",
  "signupkey",
];

const keyParamPattern = new RegExp(`([?&](?:${keyParams.join("|")})=)([^&]*)`, "gi");

const redacted = "<redacted>";

function keepPrefix(value: string): string {
  return value.substring(0, 7);
}

// A scheme fills the whole prefix on its own, so keep it and take the prefix from the
// credential behind it.
function redactAuthorization(value: string): string {
  const [scheme, ...rest] = value.split(" ");
  if (rest.length === 0) {
    return keepPrefix(value);
  }
  return `${scheme} ${keepPrefix(rest.join(" "))}`;
}

// Cookie names answer "did the caller send a session at all", so they stay and the values go.
function redactCookie(value: string): string {
  return value
    .split(";")
    .map((pair) => pair.split("=")[0].trim())
    .filter((name) => name !== "")
    .map((name) => `${name}=${redacted}`)
    .join("; ");
}

function redactorFor(name: string): (value: string) => string {
  if (name === "cookie") {
    return redactCookie;
  }
  if (name === "authorization") {
    return redactAuthorization;
  }
  return keepPrefix;
}

// Node only gives a string or an array of strings, so anything else means other
// middleware wrote to req.headers. Drop it rather than throw: this runs in a res
// "finish" listener, where an exception ends the process.
function redactHeaderValue(name: string, value: unknown): string | string[] {
  const redact = redactorFor(name);
  if (_.isArray(value)) {
    return value.map((entry: unknown) => _.isString(entry) ? redact(entry) : redacted);
  }
  if (!_.isString(value)) {
    return redacted;
  }
  return redact(value);
}

export function redactHeaders(headers: Request["headers"]): Request["headers"] {
  const clean = { ...headers };
  for (const [name, value] of Object.entries(clean)) {
    const lower = name.toLowerCase();
    if (_.isUndefined(value) || (lower !== "cookie" && !keyHeaders.includes(lower))) {
      continue;
    }
    clean[name] = redactHeaderValue(lower, value);
  }
  return clean;
}

function redactQueryValue(value: Query[string]): Query[string] {
  if (_.isString(value)) {
    return keepPrefix(value);
  }
  if (_.isArray(value)) {
    return value.map((entry: unknown) => _.isString(entry) ? keepPrefix(entry) : redacted);
  }
  return redacted;
}

export function redactQuery(query: Query): Query {
  const clean: Query = { ...query };
  for (const [name, value] of Object.entries(clean)) {
    if (_.isUndefined(value) || !keyParams.includes(name.toLowerCase())) {
      continue;
    }
    clean[name] = redactQueryValue(value);
  }
  return clean;
}

// req.originalUrl is relative, so this works on the string rather than parsing a URL.
export function redactOriginalURL(maybeURL?: string): string {
  if (!_.isString(maybeURL) || maybeURL === "") {
    return "";
  }

  return maybeURL.replace(keyParamPattern, (_match, name: string, value: string) => `${name}${keepPrefix(value)}`);
}

export default function loggerMiddleware(logger?: Logger) {
  return function accessLogMiddleware(req: Request, res: Response, next: NextFunction) {
    // This doesn't fire the log immediately, but waits until the response is finished
    // This means we have a chance of logging the response code
    res.on("finish", () => {
      // Skip this if no logger is set
      if (!logger) {
        return;
      }
      logger.info({
        remoteAddress: req.ip,
        method: req.method,
        url: redactOriginalURL(req.originalUrl),
        protocol: req.protocol,
        hostname: req.hostname,
        httpVersion: `${req.httpVersionMajor}.${req.httpVersionMinor}`,
        userAgent: req.headers["user-agent"],
        // Added as compatibility
        req: {
          body: req.body as unknown,
          headers: redactHeaders(req.headers),
          method: req.method,
          originalUrl: redactOriginalURL(req.originalUrl)
        },
        status: res.statusCode ? res.statusCode : 0
      });
    });
    return next();
  };
}
