import { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

const buckets = new Map<string, { count: number; resetAt: number }>();

export const createRateLimiter = ({
  windowMs,
  max,
  keyPrefix,
}: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier =
      req.body?.email ||
      req.headers["x-forwarded-for"] ||
      req.ip ||
      "anonymous";
    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      return res.status(429).json({
        message: "Too many attempts, please try again later.",
      });
    }

    bucket.count += 1;
    next();
  };
};
