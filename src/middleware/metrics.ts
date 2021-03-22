import os from "os";
import { URL } from "url";

import _ from "lodash";
import debug_module from "debug";
import expressStatsd from "express-statsd";
import { Request, Response, NextFunction } from "express";

type FilterFunction = (parameter: string) => string;

const monitorRequest = expressStatsd();

// Add an express-statsd key that looks like http.post.api.hello.world for a HTTP POST to /api/hello/world URL
// See https://github.com/uber/express-statsd
export default function metrics(filter?: FilterFunction) {
  const debug = debug_module("tabletcommand-logger:middleware/metrics");

  function defaultFilter(pathIn: string): string {
    const uuidRegex = /[-a-f\d]{36}/i;
    const mongoIdRegex = /[a-f\d]{24}/i;
    let path = pathIn;
    if (uuidRegex.exec(path) || mongoIdRegex.exec(path)) {
      const parts = path.split(".");
      const cleanParts = parts.filter(function(part) {
        const isUUID = uuidRegex.exec(part);
        const isMongoId = mongoIdRegex.exec(part);
        return !(isUUID || isMongoId);
      });
      path = cleanParts.join(".");
    }
    if (path !== pathIn) {
      debug(`Cleaned up path: ${path}.`);
    }
    return path;
  }

  function statsd() {
    return function statsdFunc(req: Request, res: Response, next: NextFunction) {
      const hostname = process.env.NODE_STATSD_PREFIX || os.hostname();
      const env = process.env.NODE_ENV || "production";
      let method = req.method || "unknown_method";
      method = method.toLowerCase();
      let path = (new URL(req.url)).pathname.toLowerCase();
      path = path.replace(/\//g, " ").trim().replace(/\s/g, ".");
      let filterFunc = defaultFilter;
      if (_.isFunction(filter)) {
        filterFunc = filter;
      }
      const filteredPath = filterFunc(path);
      req.statsdKey = [
        hostname, 
        env, 
        "http", 
        method, 
        filteredPath
      ].join(".");
      debug(`req.statsdKey: ${req.statsdKey}`);
      monitorRequest(req, res);
      return next();
    };
  }

  return {
    defaultFilter,
    statsd,
  };
}

export type MetricsModule = ReturnType<typeof metrics>;
