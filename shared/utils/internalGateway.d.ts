import type { NextFunction, Request, Response } from "express";

export type InternalOnlyOptions = {
  secret: string;
  allowPaths?: string[];
  fallbackSecret?: string;
};

export declare const createInternalOnlyMiddleware: (
  options: InternalOnlyOptions,
) => (req: Request, res: Response, next: NextFunction) => void;

