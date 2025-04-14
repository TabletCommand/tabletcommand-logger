// https://stackoverflow.com/questions/57132428/augmentations-for-the-global-scope-can-only-be-directly-nested-in-external-modul
export { };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      statsdKey: string;
      _startTime?: Date;
    }

    interface Response {
      bodyCopy?: unknown; // Same as express response.body
      chunkCopy?: unknown;
      responseTime: number;
    }
  }
}
