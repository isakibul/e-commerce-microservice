import amqp from "amqplib";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { QUEUE_URL } from "@/config";
import { addToCart, clearCart, getMyCart } from "@/controllers";
import { pingRedis } from "@/lib/redis";
import { internalOnly } from "@/middlewares/internalOnly";

export const createApp = () => {
  const app = express();

  app.use(helmet());
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
  app.use(morgan("dev"));
  app.use(express.json());

  app.get("/health", async (_req, res) => {
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
  });

  app.use(internalOnly);

  app.post("/cart/add-to-cart", addToCart);
  app.get("/cart/me", getMyCart);
  app.delete("/cart", clearCart);
  app.get("/cart/clear", clearCart);

  app.use((_req, res) => {
    res.status(404).json({ message: "Not Found" });
  });

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err.stack);
      res.status(500).json({ message: "Internal Server Error" });
    },
  );

  return app;
};
