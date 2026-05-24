import { getAuthenticatedUser, isAdmin } from "@/auth";
import { prisma } from "@/prisma";
import { UserUpdateShchema } from "@/schemas";
import { NextFunction, Request, Response } from "express";

interface Params {
  id: string;
}

const updateUser = async (
  req: Request<Params>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsedBody = UserUpdateShchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ message: parsedBody.error.message });
    }

    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!isAdmin(authUser) && user.authUserId !== authUser.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: parsedBody.data,
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        return res.status(409).json({ message: "User already exists" });
      }
    }

    next(error);
  }
};

export default updateUser;
