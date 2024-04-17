import { Logger } from "winston";
export declare type LoggerConfig = {
    name: string;
    filename: string;
    dirname: string;
    ddApiKey: string;
    logToConsole?: boolean;
    logToDatadog?: boolean;
    logToFile?: boolean;
};
export default function logger(config: LoggerConfig): Logger | null;
export declare type LoggerModule = ReturnType<typeof logger>;
//# sourceMappingURL=winston-logger.d.ts.map