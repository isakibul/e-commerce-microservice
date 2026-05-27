import { SMTP_HOST, SMTP_PORT } from "@/config";
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
});

export const verifyMailer = async () => {
  await transporter.verify();
};
