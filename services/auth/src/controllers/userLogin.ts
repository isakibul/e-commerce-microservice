import { prisma } from "@/prisma";
import { UserLoginSchema } from "@/schemas";
import { LoginAttempt } from "@prisma/client";
import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type LoginHistory = {
  userId: string;
  userAgent: string | undefined;
  ipAddress: string | number;
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

const userLogin = async (req: Request, res: Response, next: NextFunction) => {
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
      await createLoginHistory({
        userId: "Guest",
        userAgent,
        ipAddress,
        attempt: "FAILED",
      });

      return res.status(404).json({
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

      return res.status(404).json({
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

    /**
     * Generate access token
     */
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET || "super_secret_key",
      {
        expiresIn: "1h",
      },
    );

    await createLoginHistory({
      userId: user.id,
      userAgent,
      ipAddress,
      attempt: "SUCCESS",
    });

    return res.status(200).json({
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export default userLogin;
