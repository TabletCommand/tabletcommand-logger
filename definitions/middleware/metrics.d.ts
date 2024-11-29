import { Request, Response, NextFunction } from "express";
type FilterFunction = (parameter: string) => string;
export default function metrics(filter?: FilterFunction): {
    defaultFilter: (pathIn: string) => string;
    setStatsDKey: (req: Request, hostname: string, env: string) => void;
    statsd: () => (req: Request, res: Response, next: NextFunction) => void;
};
export declare function cleanUpParams(req: Partial<Request>): void;
export type MetricsModule = ReturnType<typeof metrics>;
export {};
//# sourceMappingURL=metrics.d.ts.map