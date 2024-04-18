import { createLogger, format, transports, Logger } from "winston";
import * as Transport from "winston-transport";
import DailyRotateFile from "winston-daily-rotate-file";
import DataDogTransport from "datadog-winston";

export type LoggerConfig = {
  name: string, // name of the logger
  filename: string, // file where data is written (rotated)
  dirname: string, // folder where data is saved
  logToConsole: boolean,
  logToFile: boolean,

  logToDatadog: boolean,
  datadogApiKey: string,
};

export default function logger(config: LoggerConfig): Logger | null {
  const loggingEnabled = config.logToConsole === true || config.logToFile === true || config.logToDatadog === true;
  if (!loggingEnabled) {
    return null;
  }

  const trs: Transport[] = [];

  if (config.logToConsole) {
    const cfg: Transport = new transports.Console();
    trs.push(cfg);
  }

  if (config.logToFile) {
    const daily: DailyRotateFile = new DailyRotateFile({
      filename: `${config.filename}-%DATE%.json`,
      dirname: config.dirname,
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxFiles: "52d",
      utc: true,
      watchLog: true,
    });
    trs.push(daily);
  }

  if (config.logToDatadog) {
    const dd = new DataDogTransport({
      apiKey: config.datadogApiKey,
      service: config.name,
    });
    trs.push(dd);
  }

  const loggerClient = createLogger({
    level: "info",
    format: format.combine(
      // If you pass in a TimestampOptions, it will convert the date from UTC to local TZ
      format.timestamp(),
      format.errors({ stack: true }),
      format.splat(),
      format.json()
    ),
    defaultMeta: { service: config.name },
    transports: trs,
    exitOnError: false,
  });

  return loggerClient;
}

export type LoggerModule = ReturnType<typeof logger>;
