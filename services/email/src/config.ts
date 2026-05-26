import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config({
  path: ".env",
});

export const REDIS_PORT = process.env.REDIS_PORT
  ? parseInt(process.env.REDIS_PORT)
  : 6379;

export const REDIS_HOST = process.env.REDIS_HOST || "localhost";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.io",
  port: parseInt(process.env.SMTP_PORT || "2525"),
});

export const defaultSender =
  process.env.DEFAULT_EMAIL_SENDER || "admin@example.com";

export const QUEUE_URL = process.env.QUEUE_URL || "amqp://localhost";
export const ORDER_EXCHANGE = process.env.ORDER_EXCHANGE || "order.events";
export const ORDER_RETRY_EXCHANGE =
  process.env.ORDER_RETRY_EXCHANGE || "order.events.retry";
export const ORDER_DLX = process.env.ORDER_DLX || "order.events.dlx";
export const QUEUE_RETRY_DELAY_MS = process.env.QUEUE_RETRY_DELAY_MS
  ? parseInt(process.env.QUEUE_RETRY_DELAY_MS)
  : 5000;
export const QUEUE_MAX_RETRIES = process.env.QUEUE_MAX_RETRIES
  ? parseInt(process.env.QUEUE_MAX_RETRIES)
  : 3;
