import { prisma } from "@/prisma";
import { NextFunction, Request, Response } from "express";
import { defaultSender, transporter } from "../config";
import { EmailCreateSchema } from "../schemas";
import { getAuthenticatedUser, isAdmin } from "@/auth";

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
    const user = getAuthenticatedUser(req);
    const { sender, recipient, subject, body, source } = parsedBody.data;
    const from = sender && (!user || isAdmin(user)) ? sender : defaultSender;
    const emailOptions = {
      from,
      to: recipient,
      subject,
      text: body,
    };

    /**
     * Send the email
     */
    const info = await transporter.sendMail(emailOptions);

    if (info.rejected.length) {
      console.log("Email rejected: ", info.rejected);
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
        messageId: info.messageId,
        response: info.response,
        acceptedCount: info.accepted.length,
      },
    });

    return res.status(200).json({
      message: "Email sent successfully",
      messageId: info.messageId,
    });
  } catch (error) {
    next(error);
  }
};

export default sendEmail;
