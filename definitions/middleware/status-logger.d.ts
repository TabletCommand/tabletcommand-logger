/// <reference types="qs" />
import { Logger } from "winston";
import { NextFunction, Request, Response } from "express";
import { Query } from "express-serve-static-core";
export declare function shouldIgnore(req: Request, res: Response): boolean;
export declare function requestDuration(endTime: Date, startTime?: Date): number;
export declare function redactQuery(q: Query): import("qs").ParsedQs;
export default function statusLogger(logger?: Logger): (req: Request, res: Response, next: NextFunction) => void;
export type StatusLoggerModule = ReturnType<typeof statusLogger>;
//# sourceMappingURL=status-logger.d.ts.map