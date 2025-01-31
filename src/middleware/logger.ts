import _ from "lodash";
import { Logger } from "winston";
import {
  NextFunction,
  Request,
  Response,
} from "express";

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
  } catch (_error) {
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
          headers: req.headers,
          method: req.method,
          originalUrl: req.originalUrl
        },
        status: res.statusCode ? res.statusCode : 0
      });
    });
    return next();
  };
}
