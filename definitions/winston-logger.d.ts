import { Logger } from "winston";
export type LoggerConfig = {
    name: string;
    filename: string;
    dirname: string;
    logToConsole: boolean;
    logToFile: boolean;
    logToDatadog: boolean;
    datadogApiKey: string;
    extraMeta?: Record<string, unknown>;
};
export default function logger(config: LoggerConfig): Logger | null;
export type LoggerModule = ReturnType<typeof logger>;
//# sourceMappingURL=winston-logger.d.ts.map