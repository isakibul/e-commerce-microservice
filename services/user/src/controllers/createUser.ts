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
      return res.status(200).json(existingUser);
    }

    /**
     * Create a new user
     */
    let user;
    try {
      user = await prisma.user.create({
        data: parsedBody.data,
      });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error) {
        const code = (error as { code?: string }).code;
        if (code === "P2002") {
          return res.status(409).json({ message: "User already exists" });
        }
      }

      throw error;
    }

    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export default createUser;
