import { EMAIL_SERVICE } from "@/config";
import { prisma } from "@/prisma";
import { EmailVerificationSchema } from "@/schemas";
import axios from "axios";
import { NextFunction, Request, Response } from "express";

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

    if (user.verified && user.status === "ACTIVE") {
      return res.status(200).json({ message: "Email already verified" });
    }

    /**
     * Find the verification code for the user
     */
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: parsedBody.data.code,
        status: "PENDING",
        type: "ACCOUNT_VERIFICATION",
      },
      orderBy: {
        issuedAt: "desc",
      },
    });

    if (!verificationCode) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    /**
     * Check if the verification code is expired
     */
    if (verificationCode.expiresAt.getTime() < Date.now()) {
      await prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { status: "EXPIRED" },
      });

      return res.status(400).json({ error: "Verification code expired" });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { verified: true, status: "ACTIVE" },
      }),
      prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { status: "USED", verifiedAt: new Date() },
      }),
      prisma.verificationCode.updateMany({
        where: {
          userId: user.id,
          id: {
            not: verificationCode.id,
          },
          status: "PENDING",
          type: "ACCOUNT_VERIFICATION",
        },
        data: {
          status: "EXPIRED",
        },
      }),
    ]);

    void axios.post(`${EMAIL_SERVICE}/emails/send`, {
      recipient: user.email,
      subject: "Email Verified Successfully",
      body: `Hello ${user.name},\n\nYour email has been successfully verified. You can now log in to your account.\n\nBest regards,\nThe Team`,
      source: "verify-email",
    }).catch((error) => {
      console.error("Failed to send email verification success email", error);
    });

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
};

export default verifyEmail;
