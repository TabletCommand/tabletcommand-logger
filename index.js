"use strict";

var logger = require("./dist/bunyan-logger");
var loggerMiddleware = require("./dist/middleware/logger");
var metricsMiddleware = require("./dist/middleware/metrics");
var statusLoggerMiddleware = require("./dist/middleware/status-logger");
var backendLoggerMiddleware = require("./dist/middleware/backend-logger");

module.exports = {
  logger: logger,
  loggerMiddleware: loggerMiddleware,
  metricsMiddleware: metricsMiddleware,
  statusLoggerMiddleware: statusLoggerMiddleware,
  backendLoggerMiddleware: backendLoggerMiddleware
};
