import _ from "lodash";
import { Logger } from "winston";
import {
  NextFunction,
  Request,
  Response,
} from "express";

// cspell:ignore personnelapikey
// Each of these authenticates a request on its own, so a log line that keeps the whole
// value is a live credential. The header stays in the log, cut to the same 7-character
// prefix redactOriginalURL keeps: enough to tell two keys apart, not enough to replay one.
// Node lowercases incoming header names.
const keyHeaders = [
  "authorization",
  "apikey",
  "personnelapikey",
  "x-tc-auth-token",
];

function keepPrefix(value: string): string {
  return value.substring(0, 7);
}

// Cookie names answer "did the caller send a session at all", so they stay and the values go.
function redactCookie(value: string): string {
  return value
    .split(";")
    .map((pair) => `${pair.split("=")[0].trim()}=<redacted>`)
    .join("; ");
}

function redactHeaderValue(name: string, value: string | string[]): string | string[] {
  const redact = name === "cookie" ? redactCookie : keepPrefix;
  if (_.isArray(value)) {
    return value.map(redact);
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

export function redactOriginalURL(maybeURL?: string): string {
  if (!maybeURL) {
    return "";
  }

  try {
    // Attempt to keep first 7 chars of the api key
    const href = new URL(maybeURL);
    const prevApiKey = href.searchParams.get("apikey");
    if (prevApiKey && _.isString(prevApiKey)) {
      href.searchParams.set("apikey", prevApiKey.substring(0, 7));
      return href.toString();
    }
  } catch {
    //
  }

  // Fallback
  return maybeURL.replace(/apikey=.*?(&|$)/, "apikey=xxx&");
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
          originalUrl: req.originalUrl
        },
        status: res.statusCode ? res.statusCode : 0
      });
    });
    return next();
  };
}
