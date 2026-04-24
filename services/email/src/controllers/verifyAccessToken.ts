import { prisma } from "@/prisma";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AccessTokenSchema } from "../schemas";

const verifyAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parseBody = AccessTokenSchema.safeParse(req.body);

    if (!parseBody.success) {
      return res.status(400).json({
        error: parseBody.error.message,
      });
    }

    const { accessToken } = parseBody.data;
    const decoded = jwt.verify(
      accessToken,
      process.env.JWT_SECRET_KEY as string,
    );

    const user = await prisma.user.findUnique({
      where: {
        id: (decoded as any).id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    return res.status(200).json({ message: "Authorized", user });
  } catch (error) {
    next(error);
  }
};

export default verifyAccessToken;
