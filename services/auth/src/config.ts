export const USER_SERVICE =
  process.env.USER_SERVICE_URL || "http://localhost:4004";

export const EMAIL_SERVICE =
  process.env.EMAIL_SERVICE_URL || "http://localhost:4005";

export const INTERNAL_GATEWAY_SECRET =
  process.env.INTERNAL_GATEWAY_SECRET || "local_internal_gateway_secret";

export const QUEUE_URL = process.env.QUEUE_URL || "amqp://localhost";
export const EMAIL_EXCHANGE = process.env.EMAIL_EXCHANGE || "email.events";
