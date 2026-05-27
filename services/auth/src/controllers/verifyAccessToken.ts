import { prisma } from "@/lib/prisma";
import { getJwtSecret } from "@/lib/jwt";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AccessTokenSchema } from "@/schemas/auth.schema";
import { z } from "zod";

const JwtPayloadSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string().min(1),
});

const verifyAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : undefined;

    const parseBody = AccessTokenSchema.safeParse({
      accessToken: bearerToken ?? req.body?.accessToken,
    });

    if (!parseBody.success) {
      return res.status(400).json({
        error: parseBody.error.message,
      });
    }

    const { accessToken } = parseBody.data;

    const decodedUnknown = jwt.verify(accessToken, getJwtSecret(), {
      algorithms: ["HS256"],
    });

    const parsedClaims = JwtPayloadSchema.safeParse(decodedUnknown);
    if (!parsedClaims.success) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const decoded = parsedClaims.data;

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        verified: true,
      },
    });

    if (!user || !user.verified || user.status !== "ACTIVE") {
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
