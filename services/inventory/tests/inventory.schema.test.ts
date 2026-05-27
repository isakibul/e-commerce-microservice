import { describe, expect, it } from "vitest";
import {
  InventoryCreateDTOSchema,
  InventoryDetailsQuerySchema,
  InventoryUpdateDTOSchema,
} from "@/schemas";

describe("inventory schemas", () => {
  it("validates create payloads and normalizes SKU", () => {
    const parsed = InventoryCreateDTOSchema.parse({
      productId: "product-1",
      sku: "abc123",
      quantity: 5,
    });

    expect(parsed).toEqual({
      productId: "product-1",
      sku: "ABC123",
      quantity: 5,
    });
    expect(
      InventoryCreateDTOSchema.parse({
        productId: "product-1",
        sku: "ABC",
      }).quantity,
    ).toBe(0);
    expect(
      InventoryCreateDTOSchema.safeParse({
        productId: "",
        sku: "AB",
        quantity: -1,
      }).success,
    ).toBe(false);
  });

  it("validates stock update payloads", () => {
    expect(
      InventoryUpdateDTOSchema.safeParse({
        actionType: "In",
        quantity: 1,
      }).success,
    ).toBe(true);
    expect(
      InventoryUpdateDTOSchema.safeParse({
        actionType: "Out",
        quantity: 2,
      }).success,
    ).toBe(true);
    expect(
      InventoryUpdateDTOSchema.safeParse({
        actionType: "Out",
        quantity: 0,
      }).success,
    ).toBe(false);
  });

  it("coerces and bounds history limit query", () => {
    expect(
      InventoryDetailsQuerySchema.parse({ historyLimit: "25" }).historyLimit,
    ).toBe(25);
    expect(InventoryDetailsQuerySchema.parse({}).historyLimit).toBe(50);
    expect(
      InventoryDetailsQuerySchema.safeParse({ historyLimit: "201" }).success,
    ).toBe(false);
  });
});
