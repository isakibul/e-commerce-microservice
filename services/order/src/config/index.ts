import dotenv from "dotenv";
import {
  assertProductionSecrets,
  assertRequiredEnv,
  parseInteger,
} from "@ecommerce/shared";

dotenv.config({ path: ".env" });

export const PORT = parseInteger(process.env.PORT, 4007);
export const SERVICE_NAME = process.env.SERVICE_NAME || "Order-Service";

assertRequiredEnv(SERVICE_NAME, ["DATABASE_URL"]);
assertProductionSecrets(SERVICE_NAME, ["INTERNAL_GATEWAY_SECRET"]);

export const CART_SERVICE =
  process.env.CART_SERVICE_URL || "http://localhost:4006";
export const EMAIL_SERVICE =
  process.env.EMAIL_SERVICE_URL || "http://localhost:4005";
export const PRODUCT_SERVICE =
  process.env.PRODUCT_SERVICE_URL || "http://localhost:4001";

export const QUEUE_URL = process.env.QUEUE_URL || "amqp://localhost";
export const ORDER_EXCHANGE = process.env.ORDER_EXCHANGE || "order.events";

export const INTERNAL_GATEWAY_SECRET =
  process.env.INTERNAL_GATEWAY_SECRET || "local_internal_gateway_secret";
