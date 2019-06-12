"use strict";

module.exports = function loggerMiddleware(loggerInstance) {
  return function accessLogMiddleware(req, res, next) {
    // This doesn't fire the log immediately, but waits until the response is finished
    // This means we have a chance of logging the response code
    res.on("finish", () => {
      loggerInstance.info({
        remoteAddress: req.ip,
        method: req.method,
        url: req.originalUrl,
        protocol: req.protocol,
        body: req.body,
        hostname: req.hostname,
        httpVersion: `${req.httpVersionMajor}.${req.httpVersionMinor}`,
        userAgent: req.headers["user-agent"],
        status: res.statusCode ? res.statusCode : 0
      }, "access_log");
    });
    next();
  };
};
