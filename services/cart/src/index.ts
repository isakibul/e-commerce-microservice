import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { addToCart, clearCart, getMyCart } from "./controllers";
import "./events/onKeyExpires";
import { internalOnly } from "./internal";

dotenv.config();

const app = express();

/**
 * Security middleware
 */
app.use(helmet());

/**
 * Rate limiting middleware
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  handler: (_req, res) => {
    res
      .status(429)
      .json({ message: "Too many requests, please try again later." });
  },
});

app.use(limiter);

app.use(morgan("dev"));

app.use(express.json());

/**
 * Health check endpoint
 */
app.get("/health", (_req, res) => {
  res.json({ message: "Cart service is running" });
});

app.use(internalOnly);

/**
 * Routes
 */
app.post("/cart/add-to-cart", addToCart);
app.get("/cart/me", getMyCart);
app.get("/cart/clear", clearCart);

/**
 * 404 handler
 */
app.use((_req, res) => {
  res.status(404).json({ message: "Not Found" });
});

/**
 * Error handler
 */
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

const PORT = process.env.PORT || 4006;
const serviceName = process.env.SERVICE_NAME || "Cart-Service";

app.listen(PORT, () => {
  console.log(`${serviceName} is running on port ${PORT}`);
});
