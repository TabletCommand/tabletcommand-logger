import { Logger } from "winston";
import { NextFunction, Request, Response } from "express";
export declare function redactHeaders(headers: Request["headers"]): Request["headers"];
export declare function redactOriginalURL(maybeURL?: string): string;
export default function loggerMiddleware(logger?: Logger): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=logger.d.ts.map