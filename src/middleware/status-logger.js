"use strict";

module.exports = function statusLogger(dependencies) {
  const name = dependencies.name;
  const pathToFile = dependencies.pathToFile;
  const logToConsole = dependencies.logToConsole;

  const _ = require("lodash");
  const bunyan = require("bunyan");

  function loggerFromFile(name, pathToFile) {
    let streams = [];
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

    let logger = bunyan.createLogger({
      name: name,
      streams: streams
    });

    // Reopen file streams on signal
    process.on("SIGUSR2", function() {
      logger.reopenFileStreams();
    });

    return logger;
  }

  const currentLogger = loggerFromFile(name, pathToFile);

  function requestLogger(req, res, next) {
    if (!_.isObject(req._startTime)) {
      req._startTime = new Date();
    }

    res.bodyCopy = null;

    // Save a copy of the response body
    var oldJSON = res.json.bind(res);
    res.json = (body) => {
      res.bodyCopy = body;
      oldJSON(body);
    };

    function logRequest() {
      res.removeListener("finish", logRequest);
      res.removeListener("close", logRequest);

      if (res.statusCode === 304) {
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
        "statusCode"
      ]);

      if (_.isObject(req._startTime) && req._startTime instanceof Date) {
        cleanRes.responseTime = Date.now() - req._startTime;
      }

      const msg = {
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
    requestLogger
  };
};
