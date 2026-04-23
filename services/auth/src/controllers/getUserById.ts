import { prisma } from "@/prisma";
import { NextFunction, Request, Response } from "express";

const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    /**
     * Get user by id
     */
    const { id } = req.params;
    const filed = req.query.filed as string;
    const userId = Array.isArray(id) ? id[0] : id;
    let user: any = null;

    if (filed === "authUserId") {
      user = await prisma.user.findUnique({
        where: { authUserId: userId },
      });
    } else {
      user = await prisma.user.findUnique({
        where: { id: userId },
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
