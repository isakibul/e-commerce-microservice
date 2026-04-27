import { EMAIL_SERVICE } from "@/config";
import { prisma } from "@/prisma";
import axios from "axios";
import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import { UserCreateShchema } from "../schemas";

const generateVerificationCode = () => {
  const timestamp = new Date().getTime().toString();
  const randomNum = Math.floor(10 + Math.random() * 90);

  let code = (timestamp + randomNum).slice(-5);
  return code;
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
    const user = await prisma.user.create({
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

    console.log("User created successfully:", user);

    /**
     * Create user profile by calling the user service
     */
    await axios.post(`${process.env.USER_SERVICE_URL}/users`, {
      authUserId: user.id,
      name: user.name,
      email: user.email,
    });

    /**
     * Generate verification code
     */
    const code = generateVerificationCode();
    await prisma.verificationCode.create({
      data: {
        code,
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    /**
     * Send verification email
     */
    await axios.post(`${EMAIL_SERVICE}/emails/send`, {
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
