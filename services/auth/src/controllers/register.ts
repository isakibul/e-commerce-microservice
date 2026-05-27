import { INTERNAL_GATEWAY_SECRET, USER_SERVICE } from "@/config";
import { prisma } from "@/lib/prisma";
import publishEmailEvent, { EMAIL_ROUTING_KEYS } from "@/lib/queue";
import {
  generateVerificationCode,
  hashVerificationCode,
} from "@/services/verification.service";
import axios from "axios";
import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import { UserCreateSchema } from "@/schemas/auth.schema";

const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    /**
     * Validate the request body
     */
    const parsedBody = UserCreateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        error: parsedBody.error.message,
      });
    }

    /**
     * Check if the user already exists
     */
    const existingUser = await prisma.user.findUnique({
      where: {
        email: parsedBody.data.email,
      },
    });

    if (existingUser) {
      // Avoid user enumeration: behave the same whether the email exists or not.
      return res.status(200).json({
        message:
          "If this email is eligible, a verification message will be sent shortly.",
      });
    }

    /**
     * Hash the password
     */
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(parsedBody.data.password, salt);

    /**
     * Create the auth user
     */
    const code = generateVerificationCode();
    const hashedCode = await hashVerificationCode(code);
    let registration;
    try {
      registration = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            ...parsedBody.data,
            password: hashedPassword,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            verified: true,
          },
        });

        const verificationCode = await tx.verificationCode.create({
          data: {
            code: hashedCode,
            userId: createdUser.id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 15),
          },
          select: {
            id: true,
          },
        });

        return {
          user: createdUser,
          verificationCodeId: verificationCode.id,
        };
      });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error) {
        const code = (error as { code?: string }).code;
        if (code === "P2002") {
          // Avoid user enumeration on unique constraint race.
          return res.status(200).json({
            message:
              "If this email is eligible, a verification message will be sent shortly.",
          });
        }
      }

      throw error;
    }

    const { user, verificationCodeId } = registration;

    /**
     * Create user profile by calling the user service
     */
    try {
      await axios.post(
        `${USER_SERVICE}/users`,
        {
          authUserId: user.id,
          name: user.name,
          email: user.email,
        },
        {
          headers: {
            "x-internal-gateway-secret": INTERNAL_GATEWAY_SECRET,
          },
        },
      );
    } catch (error) {
      await prisma.user.delete({
        where: { id: user.id },
      });

      throw error;
    }

    await publishEmailEvent(EMAIL_ROUTING_KEYS.VERIFICATION_REQUESTED, {
      eventId: `${user.id}:verification-email:${verificationCodeId}`,
      userId: user.id,
      recipient: user.email,
      subject: "Verify your email",
      body: `Your verification code is ${code}`,
      source: "user_registration",
    });

    return res.status(201).json({
      message:
        "User registered successfully. Check your email for verification code.",
      user,
    });
  } catch (error) {
    next(error);
  }
};

export default register;
