import { Logger } from "winston";

import {
  NextFunction,
  Request,
  Response,
} from "express";
import { Query } from "express-serve-static-core";
import _ from "lodash";

import { redactOriginalURL } from "./logger";

const allowedMethods = ["POST"];

export function shouldIgnore(req: Request, res: Response): boolean {
  if (_.isObject(res) && res.statusCode === 304) {
    return true;
  }

  // Log only if method is in the allowed array
  const m = (req?.method ?? "unknown").toUpperCase();
  const shouldLog = allowedMethods.indexOf(m) >= 0;
  if (!shouldLog) {
    return true;
  }

  const userAgent: unknown = _.get(req, "headers.user-agent");
  if (_.isString(userAgent) && /Mozilla/i.exec(userAgent)) {
    return true;
  }

  return false;
}

export function requestDuration(endTime: Date, startTime?: Date): number {
  if (!_.isObject(startTime) || !_.isDate(startTime)) {
    return 0;
  }

  return endTime.valueOf() - startTime.valueOf();
}

export function redactQuery(q: Query) {
  if (_.isString(q.apikey)) {
    q.apikey = q.apikey.substring(0, 7);
  }

  return q;
}

export default function statusLogger(logger?: Logger) {
  return function requestLogger(req: Request, res: Response, next: NextFunction) {
    if (!_.isObject(req._startTime)) {
      req._startTime = new Date();
    }

    res.bodyCopy = null;

    // Save a copy of the response body
    const oldJSON = res.json.bind(res);

    // Used when using res.json(body);
    res.json = function newJson(body: unknown): Response {
      if (_.isString(body)) {
        try {
          res.bodyCopy = JSON.parse(body);
        } catch {
          res.bodyCopy = body;
        }
      } else {
        res.bodyCopy = body;
      }
      oldJSON(body);
      res.responseTime = requestDuration(new Date(), req._startTime);
      return res;
    };

    function logRequest() {
      res.removeListener("finish", logRequest);
      res.removeListener("close", logRequest);

      if (shouldIgnore(req, res) || !logger) {
        return;
      }

      const cleanReq = _.pick(req, [
        "body",
        "departmentLog",
        "headers",
        "httpVersion",
        "method",
        "originalUrl",
        "path",
        "query",
      ]);
      cleanReq.originalUrl = redactOriginalURL(req.originalUrl);
      cleanReq.query = redactQuery(req.query);

      const cleanRes = _.pick(res, [
        "bodyCopy",
        "responseTime",
        "statusCode",
      ]);

      logger.info({
        req: cleanReq,
        res: cleanRes,
      });
    }

    res.on("finish", logRequest);
    res.on("close", logRequest);

    return next();
  };
}

export type StatusLoggerModule = ReturnType<typeof statusLogger>;
