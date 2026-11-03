import { NextFunction, Request, Response } from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import { StrictLogger } from "../logger-types";
import {
  redactHeaders,
  redactOriginalURL,
  redactQuery,
} from "../redaction";

export { redactHeaders, redactOriginalURL, redactQuery };

export default function loggerMiddleware(logger?: StrictLogger | null) {
  if (!logger) {
    return function noopMiddleware(_req: Request, _res: Response, next: NextFunction) {
      return next();
    };
  }

  type ExtendedLogger = StrictLogger & {
    child?: (bindings?: Record<string, unknown>) => StrictLogger;
    levels?: { values: Record<string, number> };
    [key: symbol]: unknown;
  };
  const anyLog = logger as ExtendedLogger;
  const asJson = (pino.symbols as Record<string, symbol>).asJsonSym;
  const isPinoInstance =
    typeof (anyLog as Record<symbol, unknown>)[asJson] === "function" ||
    (typeof anyLog.child === "function" && Boolean(anyLog.levels));

  if (isPinoInstance && typeof (anyLog as Record<symbol, unknown>)[asJson] === "function") {
    const pHttp = pinoHttp({
      logger: anyLog as unknown as pino.Logger,
      customProps: (req: unknown, res: unknown) => {
        const expressReq = req as Request;
        const expressRes = res as Response;
        const originalUrl = expressReq.originalUrl || expressReq.url || "";
        return {
          remoteAddress: expressReq.ip || expressReq.socket?.remoteAddress,
          method: expressReq.method,
          url: redactOriginalURL(originalUrl),
          protocol: expressReq.protocol,
          hostname: expressReq.hostname,
          httpVersion: expressReq.httpVersionMajor
            ? `${expressReq.httpVersionMajor}.${expressReq.httpVersionMinor}`
            : expressReq.httpVersion,
          userAgent: expressReq.headers ? expressReq.headers["user-agent"] : undefined,
          status: expressRes.statusCode ? expressRes.statusCode : 0,
        };
      },
      serializers: {
        req: (req: unknown) => {
          const r = req as Request & { raw?: Request };
          const originalUrl = r.raw?.originalUrl || r.originalUrl || r.url || "";
          return {
            body: r.raw?.body ?? r.body,
            headers: redactHeaders(r.headers || {}),
            method: r.method,
            originalUrl: redactOriginalURL(originalUrl),
          };
        },
        res: (res: unknown) => {
          const r = res as Response & {
            getHeaders?: () => Record<string, unknown>;
            raw?: { getHeaders?: () => Record<string, unknown> };
          };
          const rawRes = r.raw || r;
          let headers: Record<string, unknown> = {};
          if (typeof rawRes.getHeaders === "function") {
            headers = rawRes.getHeaders();
          } else if (typeof r.getHeaders === "function") {
            headers = r.getHeaders();
          }
          return {
            statusCode: r.statusCode,
            headers: redactHeaders(headers as Request["headers"]),
          };
        },
      },
    });

    return function accessLogMiddleware(req: Request, res: Response, next: NextFunction) {
      return pHttp(req, res, next);
    };
  }

  // Fallback for mocks or custom logger implementations
  return function accessLogMiddleware(req: Request, res: Response, next: NextFunction) {
    if (typeof anyLog.child === "function" && !req.log) {
      req.log = anyLog.child() as unknown as pino.Logger;
    }

    res.on("finish", () => {
      logger.info({
        remoteAddress: req.ip,
        method: req.method,
        url: redactOriginalURL(req.originalUrl),
        protocol: req.protocol,
        hostname: req.hostname,
        httpVersion: req.httpVersionMajor
          ? `${req.httpVersionMajor}.${req.httpVersionMinor}`
          : req.httpVersion,
        userAgent: req.headers ? req.headers["user-agent"] : undefined,
        req: {
          body: req.body as unknown,
          headers: redactHeaders(req.headers),
          method: req.method,
          originalUrl: redactOriginalURL(req.originalUrl),
        },
        status: res.statusCode ? res.statusCode : 0,
      });
    });

    return next();
  };
}
