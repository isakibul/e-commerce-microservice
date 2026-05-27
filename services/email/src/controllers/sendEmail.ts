import { NextFunction, Request, Response } from "express";
import { EmailCreateSchema } from "@/schemas";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth";
import { sendEmailMessage } from "@/services/email.service";

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

    const user = getAuthenticatedUser(req);
    const result = await sendEmailMessage({
      ...parsedBody.data,
      senderOverrideAllowed: !user || isAdmin(user),
    });

    return res.status(200).json({
      message: "Email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    next(error);
  }
};

export default sendEmail;
