import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services", () => ({
  ensureCartSession: vi.fn(),
  addCartItem: vi.fn(),
  clearCart: vi.fn(),
  getCartItems: vi.fn(),
}));

vi.mock("@/clients/inventory.client", () => ({
  isInventoryClientError: vi.fn(),
}));

import { isInventoryClientError } from "@/clients/inventory.client";
import addToCart from "@/controllers/addToCart";
import clearCartController from "@/controllers/clearCart";
import getMyCart from "@/controllers/getMyCart";
import {
  addCartItem,
  clearCart,
  ensureCartSession,
  getCartItems,
} from "@/services";

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  setHeader: vi.fn(),
  clearCookie: vi.fn(),
});

describe("cart controllers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isInventoryClientError).mockReturnValue(false);
  });

  it("adds an item and returns the cart session id", async () => {
    vi.mocked(ensureCartSession).mockResolvedValue({
      cartSessionId: "session-1",
      created: true,
    });
    vi.mocked(addCartItem).mockResolvedValue({
      status: "updated",
      message: "Item added to cart",
    });
    const res = createResponse();

    await addToCart(
      {
        headers: {},
        body: {
          productId: "product-1",
          inventoryId: "inventory-1",
          quantity: 2,
        },
      } as any,
      res as any,
      vi.fn(),
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      "x-cart-session-id",
      "session-1",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Item added to cart",
      cartSessionId: "session-1",
    });
  });

  it("returns conflict when service detects product inventory mismatch", async () => {
    vi.mocked(ensureCartSession).mockResolvedValue({
      cartSessionId: "session-1",
      created: false,
    });
    vi.mocked(addCartItem).mockResolvedValue({
      status: "conflict",
      message: "Product already exists in cart with another inventory item",
    });
    const res = createResponse();

    await addToCart(
      {
        headers: { "x-cart-session-id": "session-1" },
        body: {
          productId: "product-1",
          inventoryId: "inventory-2",
          quantity: 2,
        },
      } as any,
      res as any,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Product already exists in cart with another inventory item",
    });
  });

  it("clears cart and respects finalized checkout headers", async () => {
    vi.mocked(clearCart).mockResolvedValue(true);
    const res = createResponse();

    await clearCartController(
      {
        headers: {
          "x-cart-session-id": "session-1",
          "x-cart-finalized": "true",
        },
      } as any,
      res as any,
      vi.fn(),
    );

    expect(clearCart).toHaveBeenCalledWith("session-1", {
      releaseInventory: false,
    });
    expect(res.clearCookie).toHaveBeenCalledWith("x-cart-session-id");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Cart cleared" });
  });

  it("returns cart items", async () => {
    vi.mocked(getCartItems).mockResolvedValue([
      { productId: "product-1", inventoryId: "inventory-1", quantity: 2 },
    ]);
    const res = createResponse();

    await getMyCart(
      { headers: { "x-cart-session-id": "session-1" } } as any,
      res as any,
      vi.fn(),
    );

    expect(getCartItems).toHaveBeenCalledWith("session-1");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [{ productId: "product-1", inventoryId: "inventory-1", quantity: 2 }],
    });
  });
});
