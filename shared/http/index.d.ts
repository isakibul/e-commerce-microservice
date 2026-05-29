import type { ErrorRequestHandler, RequestHandler } from "express";
import type { Logger } from "../logger";

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
    log?: Logger;
  }
}

export declare const requestIdHeader = "x-request-id";

export declare const createRequestContext: (options?: {
  logger?: Logger;
}) => RequestHandler;

export declare const createHttpLogger: (options: {
  logger: Logger;
}) => RequestHandler;

export declare const notFoundHandler: RequestHandler;

export declare const createErrorHandler: (options: {
  logger: Logger;
}) => ErrorRequestHandler;
