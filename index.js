"use strict";

var metricsMiddleware = require("./dist/middleware/metrics");
var loggerMiddleware = require("./dist/middleware/logger");
var logger = require("./dist/bunyan-logger");

module.exports = {
  metricsMiddleware: metricsMiddleware,
  loggerMiddleware: loggerMiddleware,
  logger: logger
};
