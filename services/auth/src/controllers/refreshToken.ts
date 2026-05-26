import { prisma } from "@/prisma";
import { RefreshTokenSchema } from "@/schemas";
import { createTokenPair, hashRefreshToken } from "@/tokens";
import { NextFunction, Request, Response } from "express";

const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedBody = RefreshTokenSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.message });
    }

    const tokenHash = hashRefreshToken(parsedBody.data.refreshToken);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            verified: true,
            status: true,
          },
        },
      },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt.getTime() < Date.now() ||
      !storedToken.user.verified ||
      storedToken.user.status !== "ACTIVE"
    ) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await createTokenPair(storedToken.user);

    return res.status(200).json(tokens);
  } catch (error) {
    next(error);
  }
};

export default refreshToken;
