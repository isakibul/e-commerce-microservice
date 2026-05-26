import { prisma } from "@/lib/prisma";
import publishEmailEvent, { EMAIL_ROUTING_KEYS } from "@/lib/queue";
import { ResendVerificationSchema } from "@/schemas/auth.schema";
import {
  generateVerificationCode,
  hashVerificationCode,
} from "@/services/verification.service";
import { NextFunction, Request, Response } from "express";

const resendVerification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsedBody = ResendVerificationSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.message });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsedBody.data.email },
      select: {
        id: true,
        email: true,
        name: true,
        verified: true,
        status: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.verified && user.status === "ACTIVE") {
      return res.status(200).json({ message: "Email already verified" });
    }

    const code = generateVerificationCode();
    const hashedCode = await hashVerificationCode(code);

    const verificationCode = await prisma.$transaction(async (tx) => {
      await tx.verificationCode.updateMany({
        where: {
          userId: user.id,
          status: "PENDING",
          type: "ACCOUNT_VERIFICATION",
        },
        data: {
          status: "EXPIRED",
        },
      });

      return tx.verificationCode.create({
        data: {
          userId: user.id,
          code: hashedCode,
          expiresAt: new Date(Date.now() + 1000 * 60 * 15),
        },
        select: {
          id: true,
        },
      });
    });

    await publishEmailEvent(EMAIL_ROUTING_KEYS.VERIFICATION_REQUESTED, {
      eventId: `${user.id}:verification-email:${verificationCode.id}`,
      userId: user.id,
      recipient: user.email,
      subject: "Verify your email",
      body: `Your verification code is ${code}`,
      source: "resend_verification",
    });

    return res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    next(error);
  }
};

export default resendVerification;
