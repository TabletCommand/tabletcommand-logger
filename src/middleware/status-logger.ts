import bunyan from "bunyan";
import { 
  NextFunction,
  Request, 
  Response, 
} from "express";
import _ from "lodash";

function shouldIgnore(req: Request, res: Response): boolean {
  if (_.isObject(res) && res.statusCode === 304) {
    return true;
  }

  const userAgent: unknown = _.get(req, "headers.user-agent");
  if (_.isString(userAgent) && /Mozilla/i.exec(userAgent)) {
    return true;
  }

  return false;
}

export default function statusLogger(logger: bunyan) {
  return function requestLogger(req: Request, res: Response, next: NextFunction) {
    if (!_.isObject(req._startTime)) {
      req._startTime = new Date();
    }

    if (_.isObject(req._startTime) && req._startTime instanceof Date) {
      res.responseTime = new Date().valueOf() - req._startTime.valueOf();
    }

    res.bodyCopy = null;

    // Save a copy of the response body
    const oldJSON = res.json.bind(res);

    // Used when using res.json(body);
    res.json = function newJson(body: unknown|string): Response {
      if (_.isString(body)) {
        try {
          res.bodyCopy = JSON.parse(body);
        } catch (e) {
          res.bodyCopy = body;
        }  
      } else {
        res.bodyCopy = body;
      }
      oldJSON(body);
      return res;
    };

    function logRequest() {
      res.removeListener("finish", logRequest);
      res.removeListener("close", logRequest);

      if (shouldIgnore(req, res)) {
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
