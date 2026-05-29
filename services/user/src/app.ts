import cors from "cors";
import express from "express";
import {
  createErrorHandler,
  createHttpLogger,
  createLogger,
  createRequestContext,
  notFoundHandler,
} from "@ecommerce/shared";
import { SERVICE_NAME } from "@/config";
import { createUser, getUserById, updateUser } from "@/controllers";
import { prisma } from "@/lib/prisma";
import { internalOnly } from "@/middlewares/internalOnly";

export const createApp = () => {
  const app = express();
  const logger = createLogger(SERVICE_NAME);

  app.use(cors());
  app.use(createRequestContext({ logger }));
  app.use(createHttpLogger({ logger }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", async (_req, res) => {
    const checks = {
      app: "up",
      database: "up",
    };

    await prisma.$queryRaw`SELECT 1`.catch(() => {
      checks.database = "down";
    });

    const healthy = Object.values(checks).every((status) => status === "up");

    return res.status(healthy ? 200 : 503).json({
      status: healthy ? "up" : "degraded",
      service: "user",
      checks,
    });
  });

  app.use(internalOnly);

  app.get("/users/:id", getUserById);
  app.put("/users/:id", updateUser);
  app.post("/users", createUser);

  app.use(notFoundHandler);
  app.use(createErrorHandler({ logger }));

  return app;
};
