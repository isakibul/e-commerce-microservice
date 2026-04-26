import { prisma } from "@/prisma";
import { EmailVerificationSchema } from "@/schemas";
import axios from "axios";
import { NextFunction, Request, Response } from "express";

const VERIFICATION_CODE_EXPIRATION_MINUTES = 15;

const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    /**
     * Validate the request body
     */
    const parsedBody = EmailVerificationSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.message });
    }

    /**
     * Check if the user with exmail exists
     */
    const user = await prisma.user.findUnique({
      where: {
        email: parsedBody.data.email,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    /**
     * Find the verification code for the user
     */
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: parsedBody.data.code,
      },
    });

    if (!verificationCode) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    /**
     * Check if the verification code is expired
     */
    if (
      Date.now() - verificationCode.issuedAt.getTime() >
      VERIFICATION_CODE_EXPIRATION_MINUTES * 60 * 1000
    ) {
      return res.status(400).json({ error: "Verification code expired" });
    }

    /**
     * Update user status to verified
     */
    await prisma.user.update({
      where: { id: user.id },
      data: { verified: true, status: "ACTIVE" },
    });

    /**
     * Update verification code status to used
     */
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { status: "USED", verifiedAt: new Date() },
    });

    /**
     * send success email
     */
    await axios.post(`${process.env.EMAIL_SERVICE_URL}/email/send`, {
      to: user.email,
      subject: "Email Verified Successfully",
      text: `Hello ${user.name},\n\nYour email has been successfully verified. You can now log in to your account.\n\nBest regards,\nThe Team`,
      source: "verify-email",
    });

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
};

export default verifyEmail;
