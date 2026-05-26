import { INTERNAL_GATEWAY_SECRET, USER_SERVICE } from "@/config";
import { prisma } from "@/prisma";
import publishEmailEvent, { EMAIL_ROUTING_KEYS } from "@/queue";
import axios from "axios";
import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import { NextFunction, Request, Response } from "express";
import { UserCreateShchema } from "../schemas";

const generateVerificationCode = () => {
  return randomInt(100000, 1000000).toString();
};

const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    /**
     * Validate the request body
     */
    const pareseBody = UserCreateShchema.safeParse(req.body);
    if (!pareseBody.success) {
      return res.status(400).json({
        error: pareseBody.error.message,
      });
    }

    /**
     * Check if the user already exists
     */
    const existingUser = await prisma.user.findUnique({
      where: {
        email: pareseBody.data.email,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    /**
     * Hash the password
     */
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(pareseBody.data.password, salt);

    /**
     * Create the auth user
     */
    const code = generateVerificationCode();
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          ...pareseBody.data,
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

      await tx.verificationCode.create({
        data: {
          code,
          userId: createdUser.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 15),
        },
      });

      return createdUser;
    });

    /**
     * Create user profile by calling the user service
     */
    try {
      await axios.post(`${USER_SERVICE}/users`, {
        authUserId: user.id,
        name: user.name,
        email: user.email,
      }, {
        headers: {
          "x-internal-gateway-secret": INTERNAL_GATEWAY_SECRET,
        },
      });
    } catch (error) {
      await prisma.user.delete({
        where: { id: user.id },
      });

      throw error;
    }

    await publishEmailEvent(EMAIL_ROUTING_KEYS.VERIFICATION_REQUESTED, {
      eventId: `${user.id}:verification-email:${code}`,
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

export default registerUser;
