import { REDIS_HOST, REDIS_PORT } from "@/config";
import { Redis } from "ioredis";

export const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
});

export const pingRedis = async () => {
  await redis.ping();
};

export default redis;
