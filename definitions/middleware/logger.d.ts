import bunyan from "bunyan";
import { NextFunction, Request, Response } from "express";
export default function loggerMiddleware(logger?: bunyan): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=logger.d.ts.map