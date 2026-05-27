import { beforeEach, describe, expect, it, vi } from "vitest";

const redisMock = vi.hoisted(() => ({
  exists: vi.fn(),
  setex: vi.fn(),
  hget: vi.fn(),
  hset: vi.fn(),
  hdel: vi.fn(),
  expire: vi.fn(),
  persist: vi.fn(),
  hgetall: vi.fn(),
  del: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  default: redisMock,
  redis: redisMock,
  pingRedis: vi.fn(),
}));

vi.mock("@/clients/inventory.client", () => ({
  updateInventory: vi.fn(),
  isInventoryClientError: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: () => "session-new",
}));

import { updateInventory } from "@/clients/inventory.client";
import {
  addCartItem,
  clearCart,
  ensureCartSession,
  getCartItems,
} from "@/services/cart.service";

const storedItem = (inventoryId: string, quantity: number) =>
  JSON.stringify({ inventoryId, quantity });

describe("cart service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.exists.mockResolvedValue(1);
    redisMock.setex.mockResolvedValue("OK");
    redisMock.hget.mockResolvedValue(null);
    redisMock.hset.mockResolvedValue(1);
    redisMock.hdel.mockResolvedValue(1);
    redisMock.expire.mockResolvedValue(1);
    redisMock.persist.mockResolvedValue(1);
    redisMock.hgetall.mockResolvedValue({});
    redisMock.del.mockResolvedValue(1);
    vi.mocked(updateInventory).mockResolvedValue(undefined);
  });

  it("reuses an existing cart session", async () => {
    const result = await ensureCartSession("session-1");

    expect(result).toEqual({ cartSessionId: "session-1", created: false });
    expect(redisMock.exists).toHaveBeenCalledWith("sessions:session-1");
    expect(redisMock.setex).not.toHaveBeenCalled();
  });

  it("creates a new session when the requested session is missing", async () => {
    redisMock.exists.mockResolvedValue(0);

    const result = await ensureCartSession("missing-session");

    expect(result).toEqual({ cartSessionId: "session-new", created: true });
    expect(redisMock.setex).toHaveBeenCalledWith(
      "sessions:session-new",
      expect.any(Number),
      "session-new",
    );
  });

  it("adds a new item and reserves inventory", async () => {
    const result = await addCartItem("session-1", {
      productId: "product-1",
      inventoryId: "inventory-1",
      quantity: 3,
    });

    expect(updateInventory).toHaveBeenCalledWith("inventory-1", 3, "Out");
    expect(redisMock.hset).toHaveBeenCalledWith(
      "cart:session-1",
      "product-1",
      storedItem("inventory-1", 3),
    );
    expect(redisMock.expire).toHaveBeenCalledWith(
      "sessions:session-1",
      expect.any(Number),
    );
    expect(redisMock.persist).toHaveBeenCalledWith("cart:session-1");
    expect(result).toEqual({
      status: "updated",
      message: "Item added to cart",
    });
  });

  it("only reserves the increased quantity when updating an item upward", async () => {
    redisMock.hget.mockResolvedValue(storedItem("inventory-1", 2));

    await addCartItem("session-1", {
      productId: "product-1",
      inventoryId: "inventory-1",
      quantity: 5,
    });

    expect(updateInventory).toHaveBeenCalledWith("inventory-1", 3, "Out");
  });

  it("releases inventory when quantity is decreased", async () => {
    redisMock.hget.mockResolvedValue(storedItem("inventory-1", 5));

    await addCartItem("session-1", {
      productId: "product-1",
      inventoryId: "inventory-1",
      quantity: 2,
    });

    expect(redisMock.hset).toHaveBeenCalledWith(
      "cart:session-1",
      "product-1",
      storedItem("inventory-1", 2),
    );
    expect(updateInventory).toHaveBeenCalledWith("inventory-1", 3, "In");
  });

  it("removes an item and releases its reserved inventory", async () => {
    redisMock.hget.mockResolvedValue(storedItem("inventory-1", 5));

    const result = await addCartItem("session-1", {
      productId: "product-1",
      inventoryId: "inventory-1",
      quantity: 0,
    });

    expect(redisMock.hdel).toHaveBeenCalledWith("cart:session-1", "product-1");
    expect(updateInventory).toHaveBeenCalledWith("inventory-1", 5, "In");
    expect(result).toEqual({
      status: "updated",
      message: "Item removed from cart",
    });
  });

  it("rejects conflicting inventory ids for the same product", async () => {
    redisMock.hget.mockResolvedValue(storedItem("inventory-old", 2));

    const result = await addCartItem("session-1", {
      productId: "product-1",
      inventoryId: "inventory-new",
      quantity: 2,
    });

    expect(result).toEqual({
      status: "conflict",
      message: "Product already exists in cart with another inventory item",
    });
    expect(updateInventory).not.toHaveBeenCalled();
    expect(redisMock.hset).not.toHaveBeenCalled();
  });

  it("compensates inventory reservation when Redis update fails", async () => {
    redisMock.hset.mockRejectedValue(new Error("redis down"));

    await expect(
      addCartItem("session-1", {
        productId: "product-1",
        inventoryId: "inventory-1",
        quantity: 2,
      }),
    ).rejects.toThrow("redis down");

    expect(updateInventory).toHaveBeenNthCalledWith(1, "inventory-1", 2, "Out");
    expect(updateInventory).toHaveBeenNthCalledWith(2, "inventory-1", 2, "In");
  });

  it("returns cart items for an active session", async () => {
    redisMock.exists.mockResolvedValue(1);
    redisMock.hgetall.mockResolvedValue({
      "product-1": storedItem("inventory-1", 2),
      "product-2": storedItem("inventory-2", 1),
    });

    await expect(getCartItems("session-1")).resolves.toEqual([
      { productId: "product-1", inventoryId: "inventory-1", quantity: 2 },
      { productId: "product-2", inventoryId: "inventory-2", quantity: 1 },
    ]);
  });

  it("clears stale sessions when fetching an expired cart", async () => {
    redisMock.exists.mockResolvedValue(0);

    await expect(getCartItems("session-1")).resolves.toEqual([]);

    expect(redisMock.hgetall).toHaveBeenCalledWith("cart:session-1");
    expect(redisMock.del).toHaveBeenCalledWith("sessions:session-1");
  });

  it("groups inventory releases when clearing a cart", async () => {
    redisMock.hgetall.mockResolvedValue({
      "product-1": storedItem("inventory-1", 2),
      "product-2": storedItem("inventory-1", 3),
      "product-3": storedItem("inventory-2", 4),
    });

    await expect(clearCart("session-1")).resolves.toBe(true);

    expect(updateInventory).toHaveBeenCalledWith("inventory-1", 5, "In");
    expect(updateInventory).toHaveBeenCalledWith("inventory-2", 4, "In");
    expect(redisMock.del).toHaveBeenCalledWith("cart:session-1");
    expect(redisMock.del).toHaveBeenCalledWith("sessions:session-1");
  });

  it("clears finalized carts without releasing inventory", async () => {
    redisMock.hgetall.mockResolvedValue({
      "product-1": storedItem("inventory-1", 2),
    });

    await expect(
      clearCart("session-1", { releaseInventory: false }),
    ).resolves.toBe(true);

    expect(updateInventory).not.toHaveBeenCalled();
    expect(redisMock.del).toHaveBeenCalledWith("cart:session-1");
    expect(redisMock.del).toHaveBeenCalledWith("sessions:session-1");
  });
});
