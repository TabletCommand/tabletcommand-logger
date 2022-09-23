import bunyan from "bunyan";
import {
  NextFunction,
  Request,
  Response,
} from "express";

export default function loggerMiddleware(logger?: bunyan) {
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
        url: req.originalUrl,
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
      }, "access_log");
    });
    return next();
  };
}
