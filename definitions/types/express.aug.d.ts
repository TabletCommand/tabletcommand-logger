export {};
declare global {
    namespace Express {
        interface Request {
            statsdKey: string;
            _startTime?: Date;
        }
        interface Response {
            bodyCopy?: unknown;
            chunkCopy?: unknown;
            responseTime: number;
        }
    }
}
//# sourceMappingURL=express.aug.d.ts.map