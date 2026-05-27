import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import verifyAccessToken from "@/controllers/verifyAccessToken";
import { prisma } from "@/lib/prisma";

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
});

describe("verifyAccessToken controller", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("accepts valid bearer tokens and returns active user claims", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "Ada",
      role: "USER",
      verified: true,
      status: "ACTIVE",
    } as any);

    const token = jwt.sign(
      {
        userId: "user-1",
        email: "user@example.com",
        name: "Ada",
        role: "USER",
      },
      "test-secret",
    );
    const res = createResponse();
    const next = vi.fn();

    await verifyAccessToken(
      {
        headers: { authorization: `Bearer ${token}` },
        body: {},
      } as any,
      res as any,
      next,
    );

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        verified: true,
        status: true,
      },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Authorized",
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Ada",
        role: "USER",
        verified: true,
        status: "ACTIVE",
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects malformed token claims", async () => {
    const token = jwt.sign(
      {
        userId: "user-1",
        email: "not-an-email",
        name: "Ada",
        role: "USER",
      },
      "test-secret",
    );
    const res = createResponse();

    await verifyAccessToken(
      {
        headers: {},
        body: { accessToken: token },
      } as any,
      res as any,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
  });

  it("rejects users that are missing, unverified, or inactive", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "Ada",
      role: "USER",
      verified: false,
      status: "ACTIVE",
    } as any);

    const token = jwt.sign(
      {
        userId: "user-1",
        email: "user@example.com",
        name: "Ada",
        role: "USER",
      },
      "test-secret",
    );
    const res = createResponse();

    await verifyAccessToken(
      {
        headers: {},
        body: { accessToken: token },
      } as any,
      res as any,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });
});
