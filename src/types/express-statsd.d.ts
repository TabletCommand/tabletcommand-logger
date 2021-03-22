declare module "express-statsd" {
  import { 
    Request, 
    Response
  } from "express";
  
  interface ExpressStatsdOpts {
    host: string, 
    port: number,
    requestKey: string,
  }
  
  function ExpressStatsd (opts?: ExpressStatsdOpts): (req: Request, res: Response) => void;
  export = ExpressStatsd;
}
