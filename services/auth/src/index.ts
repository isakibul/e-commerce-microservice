import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import amqp from "amqplib";
import { QUEUE_URL } from "./config";
import {
  logout,
  refreshToken,
  registerUser,
  resendVerification,
  userLogin,
  verifyAccessToken,
  verifyEmail,
} from "./controllers";
import { internalOnly } from "./internal";
import { prisma } from "./prisma";
import { createRateLimiter } from "./rateLimit";

dotenv.config();

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

// /**
//  * CORS middleware
//  * Only allow requests from the API Gateway
//  */
// app.use((req, res, next) => {
//   const allowedOrigins = ["http://localhost:8081", "http://127.0.0.1:8081"];
//   const origin = req.headers.origin || "";

//   if (allowedOrigins.includes(origin)) {
//     res.setHeader("Access-Control-Allow-Origin", origin);
//     next();
//   } else {
//     res.status(403).json({ error: "Forbidden" });
//   }
// });

/**
 * Routes
 */
app.post("/auth/register", registerUser);
app.post("/auth/login", loginLimiter, userLogin);
app.post("/auth/refresh-token", refreshToken);
app.post("/auth/logout", logout);
app.post("/auth/verify-token", verifyAccessToken);
app.post("/auth/verify-email", verificationLimiter, verifyEmail);
app.post(
  "/auth/resend-verification",
  verificationLimiter,
  resendVerification,
);

/**
 * 404 handler
 */
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
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
    res.status(500).json({ error: "Internal Server Error" });
  },
);

const PORT = process.env.PORT || 4003;
const serviceName = process.env.SERVICE_NAME || "Auth-Service";

app.listen(PORT, () => {
  console.log(`${serviceName} is running on port ${PORT}`);
});
