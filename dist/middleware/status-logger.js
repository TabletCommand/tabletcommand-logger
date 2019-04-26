"use strict";

var _ = require("lodash");

module.exports = function statusLogger(loggerInstance) {
  return function requestLogger(req, res, next) {
    if (!_.isObject(req._startTime)) {
      req._startTime = new Date();
    }

    res.bodyCopy = null; // Save a copy of the response body

    var oldJSON = res.json.bind(res);

    res.json = function (body) {
      res.bodyCopy = body;
      oldJSON(body);
    };

    function logRequest() {
      res.removeListener("finish", logRequest);
      res.removeListener("close", logRequest);

      if (res.statusCode === 304) {
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