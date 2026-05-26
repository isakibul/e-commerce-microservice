import { prisma } from "@/lib/prisma";
import { UserLoginSchema } from "@/schemas/auth.schema";
import { createTokenPair } from "@/services/token.service";
import { LoginAttempt } from "@prisma/client";
import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";

type LoginHistory = {
  userId: string;
  userAgent: string | undefined;
  ipAddress: string | null | undefined;
  attempt: LoginAttempt;
};

const createLoginHistory = async (info: LoginHistory) => {
  await prisma.loginHistory.create({
    data: {
      userId: info.userId,
      userAgent: info.userAgent,
      ipAddress: info.ipAddress,
      attempt: info.attempt,
    },
  });
};

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string) || req.ip || "";
    const userAgent = req.headers["user-agent"] || "";

    /**
     * Validate the request body
     */
    const pareseBody = UserLoginSchema.safeParse(req.body);
    if (!pareseBody.success) {
      return res.status(400).json({
        error: pareseBody.error.message,
      });
    }

    const { email, password } = pareseBody.data as {
      email: string;
      password: string;
    };

    /**
     * Check if the user exists
     */
    const user = await prisma.user.findUnique({
      where: {
        email: pareseBody.data.email,
      },
    });
    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    /**
     * Compare password
     */
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await createLoginHistory({
        userId: user.id,
        userAgent,
        ipAddress,
        attempt: "FAILED",
      });

      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    /**
     * Check if the user is verified
     */
    if (!user.verified) {
      await createLoginHistory({
        userId: user.id,
        userAgent,
        ipAddress,
        attempt: "FAILED",
      });

      return res.status(400).json({
        message: "User is not verified",
      });
    }

    /**
     * Check if the account is active
     */
    if (user.status !== "ACTIVE") {
      await createLoginHistory({
        userId: user.id,
        userAgent,
        ipAddress,
        attempt: "FAILED",
      });

      return res.status(400).json({
        message: `Your account is ${user.status.toLowerCase()}`,
      });
    }

    const tokens = await createTokenPair(user);

    await createLoginHistory({
      userId: user.id,
      userAgent,
      ipAddress,
      attempt: "SUCCESS",
    });

    return res.status(200).json({
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
};

export default login;
