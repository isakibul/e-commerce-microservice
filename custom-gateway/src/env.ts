const getEnvUrl = (name: string) => {
  const key = `${name.toUpperCase()}_SERVICE_URL`;
  return process.env[key];
};

export const resolveServiceUrl = (name: string, fallback: string) => {
  return getEnvUrl(name) || fallback;
};

export const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:4003";

export const REQUEST_TIMEOUT_MS = process.env.REQUEST_TIMEOUT_MS
  ? Number(process.env.REQUEST_TIMEOUT_MS)
  : 5000;

export const INTERNAL_GATEWAY_SECRET =
  process.env.INTERNAL_GATEWAY_SECRET || "local_internal_gateway_secret";
