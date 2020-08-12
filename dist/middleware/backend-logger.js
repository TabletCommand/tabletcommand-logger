"use strict";

var _ = require("lodash");

module.exports = function backendLogger(loggerInstance) {
  function shouldIgnore(req, res) {
    if (_.isObject(res) && res.statusCode === 304) {
      return true;
    }

    var userAgent = _.get(req, "headers.user-agent");

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
    var oldEnd = res.end.bind(res); // Used when using res.end(someOutput);

    res.end = function newEnd(output) {
      try {
        res.bodyCopy = JSON.parse(output);
      } catch (e) {
        res.bodyCopy = output;
      }

      oldEnd(output);
    };

    function logRequest() {
      res.removeListener("finish", logRequest);
      res.removeListener("close", logRequest);

      if (shouldIgnore(req, res)) {
        return;
      }

      var cleanReq = _.pick(req, ["body", "departmentLog", "headers", "httpVersion", "method", "originalUrl", "query", "path"]);

      var cleanRes = _.pick(res, ["bodyCopy", "statusCode"]);

      if (_.isObject(req._startTime) && req._startTime instanceof Date) {
        cleanRes.responseTime = Date.now() - req._startTime;
      }

      var msg = {
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