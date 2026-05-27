import { NextFunction, Request, Response } from "express";
import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { redis, ensureRedisConnected } from "@/lib/redis";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

export const createRateLimiter = ({
  windowMs,
  max,
  keyPrefix,
}: RateLimitOptions) => {
  const points = max;
  const durationSeconds = Math.max(1, Math.floor(windowMs / 1000));

  const memoryLimiter = new RateLimiterMemory({
    points,
    duration: durationSeconds,
    keyPrefix,
  });

  const redisLimiter =
    redis &&
    new RateLimiterRedis({
      storeClient: redis,
      points,
      duration: durationSeconds,
      keyPrefix,
      insuranceLimiter: memoryLimiter,
    });

  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier =
      req.body?.email ||
      req.headers["x-forwarded-for"] ||
      req.ip ||
      "anonymous";
    const key = `${keyPrefix}:${identifier}`;

    try {
      if (redisLimiter) {
        await ensureRedisConnected();
        await redisLimiter.consume(key, 1);
      } else {
        await memoryLimiter.consume(key, 1);
      }

      return next();
    } catch {
      return res.status(429).json({
        message: "Too many attempts, please try again later.",
      });
    }
  };
};
