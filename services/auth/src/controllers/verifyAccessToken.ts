import { prisma } from "@/prisma";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AccessTokenSchema } from "../schemas";

type JwtPayload = {
  userId: string;
  email: string;
  name: string;
  role: string;
};

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
      process.env.JWT_SECRET as string,
    ) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
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

    return res.status(200).json({
      message: "Authorized",
      user,
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        message: "Token expired",
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    next(error);
  }
};

export default verifyAccessToken;
