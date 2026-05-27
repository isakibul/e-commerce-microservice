import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/services", () => ({
  checkoutCart: vi.fn(),
  listOrders: vi.fn(),
  getAuthorizedOrderById: vi.fn(),
}));

import checkout from "@/controllers/checkout";
import getOrderById from "@/controllers/getOrderById";
import getOrders from "@/controllers/getOrders";
import { getAuthenticatedUser } from "@/lib/auth";
import { checkoutCart, getAuthorizedOrderById, listOrders } from "@/services";

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

const user = {
  id: "user-1",
  email: "user@example.com",
  name: "Ada",
  role: "USER",
};

describe("order controllers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockReturnValue(user);
  });

  it("requires authentication for checkout", async () => {
    vi.mocked(getAuthenticatedUser).mockReturnValue(null);
    const res = createResponse();

    await checkout({ body: {} } as any, res as any, vi.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("maps checkout result states to HTTP responses", async () => {
    vi.mocked(checkoutCart).mockResolvedValueOnce({
      status: "created",
      order: { id: "order-1" } as any,
    });
    const createdRes = createResponse();

    await checkout(
      { body: { cartSessionId: "cart-1" } } as any,
      createdRes as any,
      vi.fn(),
    );

    expect(checkoutCart).toHaveBeenCalledWith("cart-1", user);
    expect(createdRes.status).toHaveBeenCalledWith(201);
    expect(createdRes.json).toHaveBeenCalledWith({ id: "order-1" });

    vi.mocked(checkoutCart).mockResolvedValueOnce({ status: "empty_cart" });
    const emptyRes = createResponse();

    await checkout(
      { body: { cartSessionId: "cart-1" } } as any,
      emptyRes as any,
      vi.fn(),
    );

    expect(emptyRes.status).toHaveBeenCalledWith(400);
    expect(emptyRes.json).toHaveBeenCalledWith({ message: "Cart is empty" });
  });

  it("lists authenticated user's orders", async () => {
    vi.mocked(listOrders).mockResolvedValue({
      orders: [{ id: "order-1" }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    } as any);
    const res = createResponse();

    await getOrders(
      { query: { page: "1", limit: "20" } } as any,
      res as any,
      vi.fn(),
    );

    expect(listOrders).toHaveBeenCalledWith({
      user,
      page: 1,
      limit: 20,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [{ id: "order-1" }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it("maps order lookup not found and forbidden states", async () => {
    vi.mocked(getAuthorizedOrderById).mockResolvedValueOnce({
      status: "not_found",
    });
    const notFoundRes = createResponse();

    await getOrderById(
      { params: { id: "order-1" } } as any,
      notFoundRes as any,
      vi.fn(),
    );

    expect(notFoundRes.status).toHaveBeenCalledWith(404);
    expect(notFoundRes.json).toHaveBeenCalledWith({
      message: "Order not found",
    });

    vi.mocked(getAuthorizedOrderById).mockResolvedValueOnce({
      status: "forbidden",
    });
    const forbiddenRes = createResponse();

    await getOrderById(
      { params: { id: "order-1" } } as any,
      forbiddenRes as any,
      vi.fn(),
    );

    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
    expect(forbiddenRes.json).toHaveBeenCalledWith({ message: "Forbidden" });
  });
});
