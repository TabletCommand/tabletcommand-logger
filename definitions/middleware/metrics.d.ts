import { Request, Response, NextFunction } from "express";
declare type FilterFunction = (parameter: string) => string;
export default function metrics(filter?: FilterFunction): {
    defaultFilter: (pathIn: string) => string;
    statsd: () => (req: Request, res: Response, next: NextFunction) => void;
};
export declare type MetricsModule = ReturnType<typeof metrics>;
export {};
//# sourceMappingURL=metrics.d.ts.map