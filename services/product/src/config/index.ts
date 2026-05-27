import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const parseInteger = (value: string | undefined, fallback: number) => {
  const parsed = value ? Number.parseInt(value, 10) : fallback;
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const PORT = parseInteger(process.env.PORT, 4001);
export const SERVICE_NAME = process.env.SERVICE_NAME || "Product-Service";

export const INVENTORY_URL =
  process.env.INVENTORY_SERVICE_URL || "http://localhost:4002";

export const INTERNAL_GATEWAY_SECRET =
  process.env.INTERNAL_GATEWAY_SECRET || "local_internal_gateway_secret";
