import amqp from "amqplib";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { QUEUE_URL } from "@/config";
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

  app.use(cors());
  app.use(morgan("dev"));
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

  app.use((_req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err.stack);
      res.status(500).json({ error: "Internal Server Error" });
    },
  );

  return app;
};
