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
  const allowedMethods = [
    "GET", "POST",
  ];

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

  function setStatsDKey(req: Request, hostname: string, env: string) {
    let method = req.method || "unknown_method";
    method = method.toLowerCase();
    const defaultBase = "http://localhost";
    const urlItem = new URL(req.url, defaultBase);
    let path = urlItem.pathname.toLowerCase();
    path = path.replace(/\//g, " ").trim().replace(/\s/g, ".");
    let filterFunc = defaultFilter;
    if (_.isFunction(filter)) {
      filterFunc = filter;
    }
    const filteredPath: string = filterFunc(path);
    req.statsdKey = [
      hostname,
      env,
      "http",
      method,
      filteredPath
    ].join(".");
    debug(`req.statsdKey: ${req.statsdKey}`);
  }

  function shouldProcessRequest(req: Request): boolean {
    const method = (req.method || "unknown_method").toUpperCase();
    return allowedMethods.indexOf(method) >= 0;
  }

  function statsd() {
    return function statsdFunc(req: Request, res: Response, next: NextFunction) {
      if (!shouldProcessRequest(req)) {
        return next();
      }
      const hostname = process.env.NODE_STATSD_PREFIX || os.hostname();
      const env = process.env.NODE_ENV || "production";
      setStatsDKey(req, hostname, env);
      monitorRequest(req, res);
      return next();
    };
  }

  return {
    defaultFilter,
    setStatsDKey,
    statsd,
  };
}

export function cleanUpParams(req: Partial<Request>) {
  if (!_.isString(req.statsdKey)) {
    return;
  }

  let path = req.statsdKey.toLowerCase();

  // Attempt to replace :params values with their keys
  if (_.isObject(req.params)) {
    _.forEach(req.params ?? {}, (value, key) => {
      if (!_.isString(value) || !_.isString(key)) {
        return;
      }
      const foundIndex = path.lastIndexOf(value.toLowerCase());
      if (foundIndex >= 0) {
        path = path.substring(0, foundIndex) + key + path.substring(foundIndex + value.toLowerCase().length);
      }
    });
  }

  path = path.replace(/\//g, " ").trim().replace(/\s/g, ".");
  req.statsdKey = path.toLowerCase();
}

export type MetricsModule = ReturnType<typeof metrics>;
