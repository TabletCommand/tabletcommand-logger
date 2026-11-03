import { DestinationStream } from "pino";
import { LoggerConfig, StrictLogger, LoggerModule } from "./logger-types";
export { LoggerConfig, StrictLogger, LoggerModule };
export declare function isPinoPrettyAvailable(): boolean;
export default function logger(config: LoggerConfig, customDestination?: DestinationStream): StrictLogger | null;
//# sourceMappingURL=pino-logger.d.ts.map