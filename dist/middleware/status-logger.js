"use strict";

module.exports = function statusLogger(dependencies) {
  var name = dependencies.name;
  var pathToFile = dependencies.pathToFile;
  var logToConsole = dependencies.logToConsole;

  var _ = require("lodash");

  var bunyan = require("bunyan");

  function loggerFromFile(name, pathToFile) {
    var streams = [];

    if (logToConsole) {
      streams.push({
        level: "debug",
        stream: process.stdout
      });
    } else {
      streams.push({
        type: "rotating-file",
        path: pathToFile,
        period: "1d",
        count: 52
      });
    }

    var logger = bunyan.createLogger({
      name: name,
      streams: streams
    }); // Reopen file streams on signal

    process.on("SIGUSR2", function () {
      logger.reopenFileStreams();
    });
    return logger;
  }

  var currentLogger = loggerFromFile(name, pathToFile);

  function requestLogger(req, res, next) {
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
      currentLogger.info(msg);
    }

    res.on("finish", logRequest);
    res.on("close", logRequest);
    return next();
  }

  return {
    requestLogger: requestLogger
  };
};