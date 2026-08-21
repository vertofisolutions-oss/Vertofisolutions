declare module "express-rate-limit" {
  import { RequestHandler } from "express";
  interface Options {
    windowMs?: number;
    limit?: number;
    standardHeaders?: boolean | "draft-6" | "draft-7";
    legacyHeaders?: boolean;
    keyGenerator?: (req: any) => string;
    [key: string]: any;
  }
  function rateLimit(options?: Options): RequestHandler;
  export default rateLimit;
}

declare module "http-proxy-middleware" {
  import { RequestHandler } from "express";
  export function createProxyMiddleware(options: any): RequestHandler;
}
