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
import {
  createInventory,
  getInventoryById,
  getInventoryDetails,
  updateInventory,
} from "@/controllers";
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
      service: "inventory",
      checks,
    });
  });

  app.use(internalOnly);

  app.put("/inventories/:id", updateInventory);
  app.get("/inventories/:id", getInventoryById);
  app.get("/inventories/:id/details", getInventoryDetails);
  app.post("/inventories", createInventory);

  app.use(notFoundHandler);
  app.use(createErrorHandler({ logger }));

  return app;
};
