import amqp from "amqplib";
import cors from "cors";
import express from "express";
import {
  createErrorHandler,
  createHttpLogger,
  createLogger,
  createRequestContext,
  notFoundHandler,
} from "@ecommerce/shared";
import { QUEUE_URL, SERVICE_NAME } from "@/config";
import {
  login,
  logout,
  refreshToken,
  register,
  resendVerification,
  verifyAccessToken,
  verifyEmail,
} from "@/controllers";
import { internalOnly } from "@/middlewares/internalOnly";
import { createRateLimiter } from "@/middlewares/rateLimit";
import { prisma } from "@/lib/prisma";

export const createApp = () => {
  const app = express();
  const logger = createLogger(SERVICE_NAME);

  app.use(cors());
  app.use(createRequestContext({ logger }));
  app.use(createHttpLogger({ logger }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyPrefix: "login",
  });
  const verificationLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyPrefix: "verification",
  });

  app.get("/health", async (_req, res) => {
    const checks = {
      app: "up",
      database: "up",
      rabbitmq: "up",
    };

    await prisma.$queryRaw`SELECT 1`.catch(() => {
      checks.database = "down";
    });

    await amqp
      .connect(QUEUE_URL)
      .then((connection) => connection.close())
      .catch(() => {
        checks.rabbitmq = "down";
      });

    const healthy = Object.values(checks).every((status) => status === "up");

    res.status(healthy ? 200 : 503).json({
      status: healthy ? "up" : "degraded",
      service: "auth",
      checks,
    });
  });

  app.use(internalOnly);

  app.post("/auth/register", register);
  app.post("/auth/login", loginLimiter, login);
  app.post("/auth/refresh-token", refreshToken);
  app.post("/auth/logout", logout);
  app.post("/auth/verify-token", verifyAccessToken);
  app.post("/auth/verify-email", verificationLimiter, verifyEmail);
  app.post(
    "/auth/resend-verification",
    verificationLimiter,
    resendVerification,
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler({ logger }));

  return app;
};
