import dotenv from "dotenv";
import {
  assertProductionSecrets,
  parseInteger,
} from "@ecommerce/shared";

dotenv.config({ path: ".env" });

export const PORT = parseInteger(process.env.PORT, 4006);
export const SERVICE_NAME = process.env.SERVICE_NAME || "Cart-Service";

assertProductionSecrets(SERVICE_NAME, ["INTERNAL_GATEWAY_SECRET"]);

export const REDIS_PORT = parseInteger(process.env.REDIS_PORT, 6379);
export const REDIS_HOST = process.env.REDIS_HOST || "localhost";
export const CART_TTL = parseInteger(process.env.CART_TTL, 900);

export const INVENTORY_SERVICE_URL =
  process.env.INVENTORY_SERVICE_URL || "http://localhost:4002";

export const INTERNAL_GATEWAY_SECRET =
  process.env.INTERNAL_GATEWAY_SECRET || "local_internal_gateway_secret";

export const QUEUE_URL = process.env.QUEUE_URL || "amqp://localhost";
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
