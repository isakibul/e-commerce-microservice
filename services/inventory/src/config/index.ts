import dotenv from "dotenv";
import {
  assertProductionSecrets,
  assertRequiredEnv,
  parseInteger,
} from "@ecommerce/shared";

dotenv.config({ path: ".env" });

export const PORT = parseInteger(process.env.PORT, 4002);
export const SERVICE_NAME = process.env.SERVICE_NAME || "Inventory-Service";

assertRequiredEnv(SERVICE_NAME, ["DATABASE_URL"]);
assertProductionSecrets(SERVICE_NAME, ["INTERNAL_GATEWAY_SECRET"]);

export const INTERNAL_GATEWAY_SECRET =
  process.env.INTERNAL_GATEWAY_SECRET || "local_internal_gateway_secret";
