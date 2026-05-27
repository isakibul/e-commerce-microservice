import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  order: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { getAuthorizedOrderById, listOrders } from "@/services/order.service";

const user = {
  id: "user-1",
  email: "user@example.com",
  name: "Ada",
  role: "USER",
};

const admin = {
  ...user,
  id: "admin-1",
  role: "ADMIN",
};

describe("order service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists only the current user's orders for non-admins", async () => {
    vi.mocked(prismaMock.order.findMany).mockResolvedValue([{ id: "order-1" }]);
    vi.mocked(prismaMock.order.count).mockResolvedValue(21);

    await expect(listOrders({ user, page: 2, limit: 10 })).resolves.toEqual({
      orders: [{ id: "order-1" }],
      meta: {
        page: 2,
        limit: 10,
        total: 21,
        totalPages: 3,
      },
    });

    expect(prismaMock.order.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: { orderItems: true },
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 10,
    });
  });

  it("lists all orders for admins", async () => {
    vi.mocked(prismaMock.order.findMany).mockResolvedValue([]);
    vi.mocked(prismaMock.order.count).mockResolvedValue(0);

    await listOrders({ user: admin, page: 1, limit: 20 });

    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it("authorizes order lookup by owner or admin", async () => {
    vi.mocked(prismaMock.order.findUnique).mockResolvedValue({
      id: "order-1",
      userId: "user-1",
      orderItems: [],
    });

    await expect(getAuthorizedOrderById("order-1", user)).resolves.toMatchObject({
      status: "found",
      order: { id: "order-1" },
    });

    vi.mocked(prismaMock.order.findUnique).mockResolvedValue({
      id: "order-2",
      userId: "other-user",
      orderItems: [],
    });

    await expect(getAuthorizedOrderById("order-2", user)).resolves.toEqual({
      status: "forbidden",
    });

    await expect(getAuthorizedOrderById("order-2", admin)).resolves.toMatchObject({
      status: "found",
    });
  });

  it("returns not_found for missing orders", async () => {
    vi.mocked(prismaMock.order.findUnique).mockResolvedValue(null);

    await expect(getAuthorizedOrderById("missing", user)).resolves.toEqual({
      status: "not_found",
    });
  });
});
