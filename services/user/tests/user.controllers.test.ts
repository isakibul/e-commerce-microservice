import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/services", () => ({
  createUserRecord: vi.fn(),
  updateUserRecord: vi.fn(),
  getAuthorizedUser: vi.fn(),
}));

import createUser from "@/controllers/createUser";
import getUserById from "@/controllers/getUserById";
import updateUser from "@/controllers/updateUser";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  createUserRecord,
  getAuthorizedUser,
  updateUserRecord,
} from "@/services";

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

const user = {
  id: "user-1",
  authUserId: "auth-1",
  email: "user@example.com",
  name: "Ada",
};

const authUser = {
  id: "auth-1",
  email: "user@example.com",
  name: "Ada",
  role: "USER",
};

describe("user controllers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockReturnValue(authUser);
  });

  it("creates users and maps existing/conflict responses", async () => {
    vi.mocked(createUserRecord).mockResolvedValueOnce({
      status: "created",
      user,
    });
    const createdRes = createResponse();

    await createUser(
      {
        body: {
          authUserId: "auth-1",
          email: "user@example.com",
          name: "Ada",
        },
      } as any,
      createdRes as any,
      vi.fn(),
    );

    expect(createdRes.status).toHaveBeenCalledWith(201);
    expect(createdRes.json).toHaveBeenCalledWith(user);

    vi.mocked(createUserRecord).mockResolvedValueOnce({
      status: "exists",
      user,
    });
    const existsRes = createResponse();

    await createUser(
      {
        body: {
          authUserId: "auth-1",
          email: "user@example.com",
          name: "Ada",
        },
      } as any,
      existsRes as any,
      vi.fn(),
    );

    expect(existsRes.status).toHaveBeenCalledWith(200);

    vi.mocked(createUserRecord).mockResolvedValueOnce({
      status: "conflict",
      message: "User already exists",
    });
    const conflictRes = createResponse();

    await createUser(
      {
        body: {
          authUserId: "auth-1",
          email: "user@example.com",
          name: "Ada",
        },
      } as any,
      conflictRes as any,
      vi.fn(),
    );

    expect(conflictRes.status).toHaveBeenCalledWith(409);
  });

  it("requires authentication to update and get users", async () => {
    vi.mocked(getAuthenticatedUser).mockReturnValue(null);

    const updateRes = createResponse();
    await updateUser(
      { params: { id: "user-1" }, body: {} } as any,
      updateRes as any,
      vi.fn(),
    );
    expect(updateRes.status).toHaveBeenCalledWith(401);

    const getRes = createResponse();
    await getUserById(
      { params: { id: "user-1" }, query: {} } as any,
      getRes as any,
      vi.fn(),
    );
    expect(getRes.status).toHaveBeenCalledWith(401);
  });

  it("updates users and maps service states", async () => {
    vi.mocked(updateUserRecord).mockResolvedValueOnce({
      status: "updated",
      user: { ...user, name: "Grace" },
    } as any);
    const updatedRes = createResponse();

    await updateUser(
      {
        params: { id: "user-1" },
        body: { name: "Grace" },
      } as any,
      updatedRes as any,
      vi.fn(),
    );

    expect(updateUserRecord).toHaveBeenCalledWith(
      "user-1",
      { name: "Grace" },
      authUser,
    );
    expect(updatedRes.status).toHaveBeenCalledWith(200);
    expect(updatedRes.json).toHaveBeenCalledWith({ ...user, name: "Grace" });

    vi.mocked(updateUserRecord).mockResolvedValueOnce({
      status: "forbidden",
    });
    const forbiddenRes = createResponse();

    await updateUser(
      {
        params: { id: "user-1" },
        body: { name: "Grace" },
      } as any,
      forbiddenRes as any,
      vi.fn(),
    );
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
  });

  it("gets users by id or legacy authUserId query", async () => {
    vi.mocked(getAuthorizedUser).mockResolvedValue({
      status: "found",
      user,
    } as any);
    const res = createResponse();

    await getUserById(
      {
        params: { id: "auth-1" },
        query: { filed: "authUserId" },
      } as any,
      res as any,
      vi.fn(),
    );

    expect(getAuthorizedUser).toHaveBeenCalledWith({
      id: "auth-1",
      field: "authUserId",
      authUser,
    });
    expect(res.json).toHaveBeenCalledWith(user);
  });

  it("maps user lookup not found and forbidden states", async () => {
    vi.mocked(getAuthorizedUser).mockResolvedValueOnce({
      status: "not_found",
    });
    const notFoundRes = createResponse();

    await getUserById(
      { params: { id: "missing" }, query: {} } as any,
      notFoundRes as any,
      vi.fn(),
    );
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    vi.mocked(getAuthorizedUser).mockResolvedValueOnce({
      status: "forbidden",
    });
    const forbiddenRes = createResponse();

    await getUserById(
      { params: { id: "user-1" }, query: {} } as any,
      forbiddenRes as any,
      vi.fn(),
    );
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
  });
});
