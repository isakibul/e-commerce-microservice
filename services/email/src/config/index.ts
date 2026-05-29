import dotenv from "dotenv";
import {
  assertProductionSecrets,
  assertRequiredEnv,
  parseInteger,
} from "@ecommerce/shared";

dotenv.config({ path: ".env" });

export const PORT = parseInteger(process.env.PORT, 4005);
export const SERVICE_NAME = process.env.SERVICE_NAME || "Email-Service";

assertRequiredEnv(SERVICE_NAME, ["DATABASE_URL"]);
assertProductionSecrets(SERVICE_NAME, ["INTERNAL_GATEWAY_SECRET"]);

export const REDIS_PORT = parseInteger(process.env.REDIS_PORT, 6379);
export const REDIS_HOST = process.env.REDIS_HOST || "localhost";

export const SMTP_HOST = process.env.SMTP_HOST || "smtp.example.io";
export const SMTP_PORT = parseInteger(process.env.SMTP_PORT, 2525);
export const DEFAULT_EMAIL_SENDER =
  process.env.DEFAULT_EMAIL_SENDER || "admin@example.com";

export const INTERNAL_GATEWAY_SECRET =
  process.env.INTERNAL_GATEWAY_SECRET || "local_internal_gateway_secret";

export const QUEUE_URL = process.env.QUEUE_URL || "amqp://localhost";
export const EMAIL_EXCHANGE = process.env.EMAIL_EXCHANGE || "email.events";
export const ORDER_EXCHANGE = process.env.ORDER_EXCHANGE || "order.events";
export const ORDER_RETRY_EXCHANGE =
  process.env.ORDER_RETRY_EXCHANGE || "order.events.retry";
export const ORDER_DLX = process.env.ORDER_DLX || "order.events.dlx";
export const QUEUE_RETRY_DELAY_MS = parseInteger(
  process.env.QUEUE_RETRY_DELAY_MS,
  5000,
);
export const QUEUE_MAX_RETRIES = parseInteger(
  process.env.QUEUE_MAX_RETRIES,
  3,
);
