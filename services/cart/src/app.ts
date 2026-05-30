import amqp from "amqplib";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import {
  createErrorHandler,
  createHttpLogger,
  createLogger,
  createRequestContext,
  notFoundHandler,
} from "@ecommerce/shared";
import { QUEUE_URL, SERVICE_NAME } from "@/config";
import { addToCart, clearCart, getMyCart } from "@/controllers";
import { pingRedis } from "@/lib/redis";
import { internalOnly } from "@/middlewares/internalOnly";

export const createApp = () => {
  const app = express();
  const logger = createLogger(SERVICE_NAME);

  app.use(helmet());
  app.use(createRequestContext({ logger }));
  app.use(createHttpLogger({ logger }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 50,
      handler: (_req, res) => {
        res
          .status(429)
          .json({ message: "Too many requests, please try again later." });
      },
    }),
  );
  app.use(express.json());

  const healthHandler = async (_req: express.Request, res: express.Response) => {
    const checks = {
      app: "up",
      redis: "up",
      rabbitmq: "up",
    };

    await pingRedis().catch(() => {
      checks.redis = "down";
    });

    await amqp
      .connect(QUEUE_URL)
      .then((connection) => connection.close())
      .catch(() => {
        checks.rabbitmq = "down";
      });

    const healthy = Object.values(checks).every((status) => status === "up");

    return res.status(healthy ? 200 : 503).json({
      status: healthy ? "up" : "degraded",
      service: "cart",
      checks,
    });
  };

  app.get("/health", healthHandler);
  app.get("/cart/health", healthHandler);

  app.use(internalOnly);

  app.post("/cart/add-to-cart", addToCart);
  app.get("/cart/me", getMyCart);
  app.delete("/cart", clearCart);
  app.get("/cart/clear", clearCart);

  app.use(notFoundHandler);
  app.use(createErrorHandler({ logger }));

  return app;
};
