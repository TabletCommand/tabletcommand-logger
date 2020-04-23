"use strict";
const _ = require("lodash");

module.exports = function statusLogger(loggerInstance) {
  function shouldIgnore(req, res) {
    if (_.isObject(res) && res.statusCode === 304) {
      return true;
    }

    const userAgent = _.get(req, "headers.user-agent");
    if (_.isString(userAgent) && userAgent.match(/Mozilla/i)) {
      return true;
    }

    return false;
  }

  return function requestLogger(req, res, next) {
    if (!_.isObject(req._startTime)) {
      req._startTime = new Date();
    }

    res.bodyCopy = null;
    res.outputCopy = null;

    // Save a copy of the response body
    const oldJSON = res.json.bind(res);

    // Used when using res.json(body);
    res.json = function newJson(body) {
      res.bodyCopy = body;
      oldJSON(body);
    };

    const oldEnd = res.end.bind(res);

    // Used when using res.end(someOutput);
    res.end = function newEnd(output) {
      res.outputCopy = output;
      oldEnd(output);
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
        "query",
        "path"
      ]);

      const cleanRes = _.pick(res, [
        "bodyCopy",
        "outputCopy",
        "statusCode"
      ]);

      if (_.isObject(req._startTime) && req._startTime instanceof Date) {
        cleanRes.responseTime = Date.now() - req._startTime;
      }

      const msg = {
        req: cleanReq,
        res: cleanRes
      };

      loggerInstance.info(msg);
    }

    res.on("finish", logRequest);
    res.on("close", logRequest);

    return next();
  };
};
