import { prisma } from "@/prisma";
import { NextFunction, Request, Response } from "express";

const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    /**
     * Get user by id
     */
    const { id } = req.params;
    const filed = req.query.filed as string;
    let user: any = null;

    if (filed === "authUserId") {
      user = await prisma.user.findUnique({
        where: { authUserId: id },
      });
    } else {
      user = await prisma.user.findUnique({
        where: { id },
      });
    }

    /**
     * Return 404 if not found
     */
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    next(error);
  }
};

export default getUserById;
