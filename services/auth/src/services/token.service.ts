import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { signAccessToken } from "@/lib/jwt";
import type { Prisma } from "@prisma/client";

const REFRESH_TOKEN_TTL_DAYS = 30;

type TokenUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type DbClient = Prisma.TransactionClient | typeof prisma;

export const hashRefreshToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const createRefreshToken = async (db: DbClient, userId: string) => {
  const refreshToken = crypto.randomBytes(64).toString("hex");
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await db.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return refreshToken;
};

export const createTokenPair = async (db: DbClient, user: TokenUser) => {
  const accessToken = signAccessToken(user);
  const refreshToken = await createRefreshToken(db, user.id);

  return {
    accessToken,
    refreshToken,
  };
};

export const revokeRefreshToken = async (refreshToken: string) => {
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};
