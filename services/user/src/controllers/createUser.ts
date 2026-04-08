import { prisma } from "@/prisma";
import { UserCreateShchema } from "@/schemas";
import { NextFunction, Request, Response } from "express";

const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    /**
     * Validate the request body
     */
    const parsedBody = UserCreateShchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ message: parsedBody.error.message });
    }

    /**
     * Check if the authUserId already exists
     */
    const existingUser = await prisma.user.findUnique({
      where: { authUserId: parsedBody.data.authUserId },
    });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    /**
     * Create a new user
     */
    const user = await prisma.user.create({
      data: parsedBody.data,
    });

    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export default createUser;
