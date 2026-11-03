import { NextFunction, Request, Response } from "express";
import { StrictLogger } from "../logger-types";
import { redactHeaders, redactOriginalURL, redactQuery } from "../redaction";
export { redactHeaders, redactOriginalURL, redactQuery };
export default function loggerMiddleware(logger?: StrictLogger | null): (_req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=logger.d.ts.map