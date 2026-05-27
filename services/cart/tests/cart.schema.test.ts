import { describe, expect, it } from "vitest";
import { CartItemSchema } from "@/schemas";

describe("cart schemas", () => {
  it("accepts valid cart items", () => {
    expect(
      CartItemSchema.safeParse({
        productId: "product-1",
        inventoryId: "inventory-1",
        quantity: 2,
      }).success,
    ).toBe(true);
  });

  it("allows zero quantity so clients can remove an item", () => {
    expect(
      CartItemSchema.safeParse({
        productId: "product-1",
        inventoryId: "inventory-1",
        quantity: 0,
      }).success,
    ).toBe(true);
  });

  it("rejects invalid cart items", () => {
    expect(
      CartItemSchema.safeParse({
        productId: "",
        inventoryId: "inventory-1",
        quantity: 1,
      }).success,
    ).toBe(false);

    expect(
      CartItemSchema.safeParse({
        productId: "product-1",
        inventoryId: "inventory-1",
        quantity: -1,
      }).success,
    ).toBe(false);
  });
});
