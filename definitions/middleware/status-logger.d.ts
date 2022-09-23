import bunyan from "bunyan";
import { NextFunction, Request, Response } from "express";
export default function statusLogger(logger?: bunyan): (req: Request, res: Response, next: NextFunction) => void;
export declare type StatusLoggerModule = ReturnType<typeof statusLogger>;
//# sourceMappingURL=status-logger.d.ts.map