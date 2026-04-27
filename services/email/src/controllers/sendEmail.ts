import { prisma } from "@/prisma";
import { NextFunction, Request, Response } from "express";
import { defaultSender, transporter } from "../config";
import { EmailCreateSchema } from "../schemas";

const sendEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    /**
     * Validate the request body
     */
    const parsedBody = EmailCreateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        error: parsedBody.error.message,
      });
    }

    /**
     * Create email options
     */
    const { sender, recipient, subject, body, source } = parsedBody.data;
    const from = sender || defaultSender;
    const emailOptions = {
      from,
      to: recipient,
      subject,
      text: body,
    };

    /**
     * Send the email
     */
    const { rejected } = await transporter.sendMail(emailOptions);

    if (rejected.length) {
      console.log("Email rejected: ", rejected);
      return res.status(500).json({
        message: "Failed to send email",
      });
    }

    await prisma.email.create({
      data: {
        sender: from,
        recipient,
        subject,
        body,
        source,
      },
    });

    return res.status(200).json({
      message: "Email sent successfully",
    });
  } catch (error) {
    next(error);
  }
};

export default sendEmail;
