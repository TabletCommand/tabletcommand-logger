import { Logger } from "winston";
import { NextFunction, Request, Response } from "express";
import { Query } from "express-serve-static-core";
export declare function redactHeaders(headers: Request["headers"]): Request["headers"];
export declare function redactQuery(query: Query): Query;
export declare function redactOriginalURL(maybeURL?: string): string;
export default function loggerMiddleware(logger?: Logger): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=logger.d.ts.map