import { prisma } from "@/lib/prisma";
import { RefreshTokenSchema } from "@/schemas/auth.schema";
import { createTokenPair, hashRefreshToken } from "@/services/token.service";
import { NextFunction, Request, Response } from "express";

const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedBody = RefreshTokenSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.message });
    }

    const tokenHash = hashRefreshToken(parsedBody.data.refreshToken);
    const now = new Date();

    const tokens = await prisma.$transaction(async (tx) => {
      const storedToken = await tx.refreshToken.findUnique({
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
        storedToken.expiresAt.getTime() < now.getTime() ||
        !storedToken.user.verified ||
        storedToken.user.status !== "ACTIVE"
      ) {
        return null;
      }

      // Conditional revoke: prevents refresh-token reuse races.
      const revoke = await tx.refreshToken.updateMany({
        where: {
          id: storedToken.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });

      if (revoke.count !== 1) {
        return null;
      }

      return createTokenPair(tx, storedToken.user);
    });

    if (!tokens) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    return res.status(200).json(tokens);
  } catch (error) {
    next(error);
  }
};

export default refreshToken;
