import { Logger } from "winston";
import { NextFunction, Request, Response } from "express";
export default function statusLogger(logger?: Logger): (req: Request, res: Response, next: NextFunction) => void;
export type StatusLoggerModule = ReturnType<typeof statusLogger>;
//# sourceMappingURL=status-logger.d.ts.map