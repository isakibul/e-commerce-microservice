import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { prisma } from "@/lib/prisma";
import {
  createUserProfileForAuthenticatedUser,
  createUserRecord,
  getAuthorizedUser,
  updateUserRecord,
} from "@/services/user.service";

const user = {
  id: "user-1",
  authUserId: "auth-1",
  email: "user@example.com",
  name: "Ada",
  address: null,
  phone: null,
};

const authUser = {
  id: "auth-1",
  email: "user@example.com",
  name: "Ada",
  role: "USER",
};

const adminUser = {
  ...authUser,
  id: "admin-auth",
  role: "ADMIN",
};

describe("user service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(user as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...user,
      name: "Grace",
    } as any);
  });

  it("creates new users", async () => {
    await expect(
      createUserRecord({
        authUserId: "auth-1",
        email: "user@example.com",
        name: "Ada",
      }),
    ).resolves.toEqual({
      status: "created",
      user,
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { authUserId: "auth-1" },
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        authUserId: "auth-1",
        email: "user@example.com",
        name: "Ada",
      },
    });
  });

  it("creates app profiles from authenticated Keycloak identity", async () => {
    await expect(
      createUserProfileForAuthenticatedUser({ address: "Dhaka" }, authUser),
    ).resolves.toEqual({
      status: "created",
      user,
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        authUserId: "auth-1",
        email: "user@example.com",
        name: "Ada",
        address: "Dhaka",
        phone: undefined,
      },
    });
  });

  it("returns existing users idempotently and maps unique races to conflicts", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as any);

    await expect(
      createUserRecord({
        authUserId: "auth-1",
        email: "user@example.com",
        name: "Ada",
      }),
    ).resolves.toEqual({
      status: "exists",
      user,
    });
    expect(prisma.user.create).not.toHaveBeenCalled();

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.user.create).mockRejectedValueOnce({ code: "P2002" });

    await expect(
      createUserRecord({
        authUserId: "auth-1",
        email: "user@example.com",
        name: "Ada",
      }),
    ).resolves.toEqual({
      status: "conflict",
      message: "User already exists",
    });
  });

  it("updates users when requested by owner", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);

    await expect(
      updateUserRecord("user-1", { name: "Grace" }, authUser),
    ).resolves.toMatchObject({
      status: "updated",
      user: {
        name: "Grace",
      },
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "Grace" },
    });
  });

  it("maps update not_found, forbidden, and conflict states", async () => {
    await expect(
      updateUserRecord("missing", { name: "Grace" }, authUser),
    ).resolves.toEqual({ status: "not_found" });

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      ...user,
      authUserId: "other-auth",
    } as any);

    await expect(
      updateUserRecord("user-1", { name: "Grace" }, authUser),
    ).resolves.toEqual({ status: "forbidden" });

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as any);
    vi.mocked(prisma.user.update).mockRejectedValueOnce({ code: "P2002" });

    await expect(
      updateUserRecord("user-1", { email: "taken@example.com" }, authUser),
    ).resolves.toEqual({
      status: "conflict",
      message: "User already exists",
    });
  });

  it("allows admins to update and view any user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...user,
      authUserId: "other-auth",
    } as any);

    await expect(
      updateUserRecord("user-1", { name: "Grace" }, adminUser),
    ).resolves.toMatchObject({ status: "updated" });

    await expect(
      getAuthorizedUser({
        id: "user-1",
        field: "id",
        authUser: adminUser,
      }),
    ).resolves.toMatchObject({ status: "found" });
  });

  it("gets authorized users by id or authUserId", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);

    await expect(
      getAuthorizedUser({
        id: "user-1",
        field: "id",
        authUser,
      }),
    ).resolves.toEqual({
      status: "found",
      user,
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });

    await getAuthorizedUser({
      id: "auth-1",
      field: "authUserId",
      authUser,
    });
    expect(prisma.user.findUnique).toHaveBeenLastCalledWith({
      where: { authUserId: "auth-1" },
    });
  });

  it("maps lookup not_found and forbidden states", async () => {
    await expect(
      getAuthorizedUser({
        id: "missing",
        field: "id",
        authUser,
      }),
    ).resolves.toEqual({ status: "not_found" });

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      ...user,
      authUserId: "other-auth",
    } as any);

    await expect(
      getAuthorizedUser({
        id: "user-1",
        field: "id",
        authUser,
      }),
    ).resolves.toEqual({ status: "forbidden" });
  });
});
