import { describe, expect, it } from "vitest";
import {
  InventoryCreateResponseSchema,
  InventoryDetailsSchema,
  ProductCreateDTOSchema,
  ProductQuerySchema,
  ProductUpdateDTOSchema,
} from "@/schemas";

describe("product schemas", () => {
  it("validates create payloads and normalizes SKU/defaults", () => {
    expect(
      ProductCreateDTOSchema.parse({
        sku: "abc123",
        name: "Keyboard",
      }),
    ).toMatchObject({
      sku: "ABC123",
      name: "Keyboard",
      price: 0,
      status: "DRAFT",
    });

    expect(
      ProductCreateDTOSchema.safeParse({
        sku: "AB",
        name: "No",
        price: -1,
      }).success,
    ).toBe(false);
  });

  it("validates update payloads without allowing SKU updates", () => {
    expect(
      ProductUpdateDTOSchema.safeParse({
        name: "Updated Product",
        price: 10,
        status: "PUBLISHED",
      }).success,
    ).toBe(true);

    expect(
      ProductUpdateDTOSchema.safeParse({
        sku: "NEWSKU",
      }).success,
    ).toBe(false);
  });

  it("coerces and validates list query params", () => {
    expect(
      ProductQuerySchema.parse({
        page: "2",
        limit: "10",
        status: "PUBLISHED",
        search: " keyboard ",
      }),
    ).toEqual({
      page: 2,
      limit: 10,
      status: "PUBLISHED",
      search: "keyboard",
    });

    expect(ProductQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });

  it("validates inventory service responses", () => {
    expect(
      InventoryCreateResponseSchema.parse({
        id: "inventory-1",
      }),
    ).toEqual({ id: "inventory-1", quantity: 0 });
    expect(
      InventoryDetailsSchema.safeParse({
        quantity: 5,
      }).success,
    ).toBe(true);
    expect(
      InventoryDetailsSchema.safeParse({
        quantity: -1,
      }).success,
    ).toBe(false);
  });
});
