import bunyan, { Stream } from "bunyan";

export default function logger(name: string, filePath: string, logToConsole: boolean, logToFile: boolean): bunyan | null {
  const loggingEnabled = logToConsole === true || logToFile === true;
  if (!loggingEnabled) {
    return null;
  }

  const streams: Stream[] = [];
  if (logToConsole) {
    const cfg: Stream = {
      level: "debug",
      stream: process.stdout,
    };
    streams.push(cfg);
  }
  if (logToFile) {
    const cfg: Stream = {
      type: "rotating-file",
      path: filePath,
      period: "1d",
      count: 52,
    };
    streams.push(cfg);
  }

  const loggerClient = bunyan.createLogger({
    name,
    streams,
  });

  // Reopen file streams on signal
  process.on("SIGUSR2", () => {
    loggerClient.reopenFileStreams();
  });

  return loggerClient;
}

export type LoggerModule = ReturnType<typeof logger>;
