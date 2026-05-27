import cors from "cors";
import express from "express";
import morgan from "morgan";
import { checkout, getOrderById, getOrders } from "@/controllers";
import { assertQueueConnection } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { internalOnly } from "@/middlewares/internalOnly";

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", async (_req, res) => {
    const checks = {
      app: "up",
      database: "up",
      rabbitmq: "up",
    };

    await prisma.$queryRaw`SELECT 1`.catch(() => {
      checks.database = "down";
    });

    await assertQueueConnection().catch(() => {
      checks.rabbitmq = "down";
    });

    const healthy = Object.values(checks).every((status) => status === "up");

    return res.status(healthy ? 200 : 503).json({
      status: healthy ? "up" : "degraded",
      service: "order",
      checks,
    });
  });

  app.use(internalOnly);

  app.post("/orders/checkout", checkout);
  app.get("/orders/:id", getOrderById);
  app.get("/orders", getOrders);

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
