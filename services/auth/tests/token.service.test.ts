import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    refreshToken: {
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createRefreshToken,
  createTokenPair,
  hashRefreshToken,
  revokeRefreshToken,
} from "@/services/token.service";

describe("token service", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    vi.useRealTimers();
  });

  it("hashes refresh tokens deterministically without storing raw values", () => {
    const token = "refresh-token-value";

    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    expect(hashRefreshToken(token)).not.toBe(token);
    expect(hashRefreshToken(token)).toHaveLength(64);
  });

  it("creates refresh tokens using the provided database client", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-27T00:00:00.000Z"));

    const create = vi.fn().mockResolvedValue({});
    const db = {
      refreshToken: {
        create,
      },
    };

    const refreshToken = await createRefreshToken(db as any, "user-1");

    expect(refreshToken).toHaveLength(128);
    expect(create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date("2026-06-26T00:00:00.000Z"),
      },
    });
  });

  it("creates token pairs with an access token and persisted refresh token", async () => {
    const create = vi.fn().mockResolvedValue({});
    const db = {
      refreshToken: {
        create,
      },
    };

    const tokens = await createTokenPair(db as any, {
      id: "user-1",
      email: "user@example.com",
      name: "Ada",
      role: "USER",
    });

    expect(tokens.accessToken).toBeTypeOf("string");
    expect(tokens.refreshToken).toHaveLength(128);
    expect(create).toHaveBeenCalledOnce();
  });

  it("revokes refresh tokens by hash", async () => {
    const updateMany = vi.mocked(prisma.refreshToken.updateMany);
    updateMany.mockResolvedValue({ count: 1 });

    await revokeRefreshToken("refresh-token-value");

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: hashRefreshToken("refresh-token-value"),
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });
});
