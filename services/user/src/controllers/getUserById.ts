import { getAuthenticatedUser, isAdmin } from "@/auth";
import { prisma } from "@/prisma";
import { NextFunction, Request, Response } from "express";

const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    /**
     * Get user by id
     */
    const { id } = req.params;
    const field = (req.query.field || req.query.filed) as string | undefined;
    const userId = Array.isArray(id) ? id[0] : id;
    let user = null;

    if (field === "authUserId") {
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

    if (!isAdmin(authUser) && user.authUserId !== authUser.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json(user);
  } catch (error) {
    next(error);
  }
};

export default getUserById;
