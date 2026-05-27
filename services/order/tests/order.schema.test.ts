import { describe, expect, it } from "vitest";
import {
  CartItemSchema,
  OrderQuerySchema,
  OrderSchema,
  ProductDetailsSchema,
} from "@/schemas";

describe("order schemas", () => {
  it("validates checkout payloads", () => {
    expect(OrderSchema.safeParse({ cartSessionId: "cart-1" }).success).toBe(true);
    expect(OrderSchema.safeParse({ cartSessionId: "" }).success).toBe(false);
  });

  it("coerces and bounds order query pagination", () => {
    expect(OrderQuerySchema.parse({ page: "2", limit: "10" })).toEqual({
      page: 2,
      limit: 10,
    });
    expect(OrderQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(OrderQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });

  it("validates cart items and product details from downstream services", () => {
    expect(
      CartItemSchema.safeParse({
        productId: "product-1",
        inventoryId: "inventory-1",
        quantity: 2,
      }).success,
    ).toBe(true);
    expect(
      CartItemSchema.safeParse({
        productId: "product-1",
        inventoryId: "inventory-1",
        quantity: 0,
      }).success,
    ).toBe(false);

    expect(
      ProductDetailsSchema.safeParse({
        id: "product-1",
        name: "Keyboard",
        sku: "KEYBOARD",
        price: 99,
      }).success,
    ).toBe(true);
    expect(
      ProductDetailsSchema.safeParse({
        id: "product-1",
        name: "Keyboard",
        sku: "KEYBOARD",
        price: -1,
      }).success,
    ).toBe(false);
  });
});
