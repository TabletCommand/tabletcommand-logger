"use strict";

const bunyan = require("bunyan");

function loggerFunc(name, filePath, logToConsole) {
  let streams = [];

  if (logToConsole) {
    streams.push({
      level: "debug",
      stream: process.stdout
    });
  } else {
    streams.push({
      type: "rotating-file",
      path: filePath,
      period: "1d", // daily rotation
      count: 52 // keep 3 back copies
    });
  }

  const logger = bunyan.createLogger({
    name: name,
    streams: streams
  });

  // Reopen file streams on signal
  process.on("SIGUSR2", function() {
    logger.reopenFileStreams();
  });

  return logger;
}

module.exports = {
  logger: loggerFunc
};
