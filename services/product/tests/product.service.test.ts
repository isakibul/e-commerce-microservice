import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  product: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/clients/inventory.client", () => ({
  createInventoryForProduct: vi.fn(),
  getInventoryQuantity: vi.fn(),
}));

import {
  createInventoryForProduct,
  getInventoryQuantity,
} from "@/clients/inventory.client";
import { prisma } from "@/lib/prisma";
import {
  createProductRecord,
  getProductDetailsRecord,
  listProducts,
  updateProductRecord,
} from "@/services/product.service";

const product = {
  id: "product-1",
  sku: "KEYBOARD",
  name: "Keyboard",
  description: null,
  price: 50,
  inventoryId: "inventory-1",
  status: "DRAFT",
};

describe("product service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.product.create).mockResolvedValue(product as any);
    vi.mocked(prisma.product.update).mockResolvedValue(product as any);
    vi.mocked(prisma.product.delete).mockResolvedValue(product as any);
    vi.mocked(createInventoryForProduct).mockResolvedValue({
      id: "inventory-1",
      quantity: 0,
    });
    vi.mocked(getInventoryQuantity).mockResolvedValue({ quantity: 5 });
  });

  it("creates product, creates inventory, and stores inventory id", async () => {
    await expect(
      createProductRecord({
        sku: "KEYBOARD",
        name: "Keyboard",
        price: 50,
        status: "DRAFT",
      }),
    ).resolves.toEqual({
      status: "created",
      product,
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        sku: "KEYBOARD",
        name: "Keyboard",
        price: 50,
        status: "DRAFT",
      },
    });
    expect(createInventoryForProduct).toHaveBeenCalledWith({
      productId: "product-1",
      sku: "KEYBOARD",
    });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: "product-1" },
      data: { inventoryId: "inventory-1" },
    });
  });

  it("returns conflict when SKU is already used", async () => {
    vi.mocked(prisma.product.create).mockRejectedValue({ code: "P2002" });

    await expect(
      createProductRecord({
        sku: "KEYBOARD",
        name: "Keyboard",
        price: 50,
        status: "DRAFT",
      }),
    ).resolves.toEqual({
      status: "conflict",
      message: "Product with the same SKU already exists",
    });

    expect(createInventoryForProduct).not.toHaveBeenCalled();
  });

  it("rolls back product creation when inventory creation fails", async () => {
    vi.mocked(createInventoryForProduct).mockRejectedValue(
      new Error("inventory down"),
    );

    await expect(
      createProductRecord({
        sku: "KEYBOARD",
        name: "Keyboard",
        price: 50,
        status: "DRAFT",
      }),
    ).rejects.toThrow("inventory down");

    expect(prisma.product.delete).toHaveBeenCalledWith({
      where: { id: "product-1" },
    });
  });

  it("updates existing products and returns not_found for missing products", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null);

    await expect(
      updateProductRecord("missing", { name: "Updated Product" }),
    ).resolves.toEqual({ status: "not_found" });

    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(product as any);
    vi.mocked(prisma.product.update).mockResolvedValueOnce({
      ...product,
      name: "Updated Product",
    } as any);

    await expect(
      updateProductRecord("product-1", { name: "Updated Product" }),
    ).resolves.toMatchObject({
      status: "updated",
      product: {
        name: "Updated Product",
      },
    });
  });

  it("lists products with status and search filters", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([product] as any);
    vi.mocked(prisma.product.count).mockResolvedValue(21);

    await expect(
      listProducts({
        page: 2,
        limit: 10,
        status: "PUBLISHED",
        search: "key",
      }),
    ).resolves.toEqual({
      products: [product],
      meta: {
        page: 2,
        limit: 10,
        total: 21,
        totalPages: 3,
      },
    });

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: {
        status: "PUBLISHED",
        OR: [
          { name: { contains: "key", mode: "insensitive" } },
          { sku: { contains: "key", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 10,
    });
  });

  it("returns product details with stock for existing inventory links", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(product as any);

    await expect(getProductDetailsRecord("product-1")).resolves.toEqual({
      status: "found",
      product,
      stock: 5,
      stockStatus: "In stock",
    });

    expect(createInventoryForProduct).not.toHaveBeenCalled();
    expect(getInventoryQuantity).toHaveBeenCalledWith("inventory-1");
  });

  it("repairs missing inventory links while fetching product details", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue({
      ...product,
      inventoryId: null,
    } as any);
    vi.mocked(prisma.product.update).mockResolvedValue(product as any);
    vi.mocked(getInventoryQuantity).mockResolvedValue({ quantity: 0 });

    await expect(getProductDetailsRecord("product-1")).resolves.toMatchObject({
      status: "found",
      stock: 0,
      stockStatus: "Out of stock",
    });

    expect(createInventoryForProduct).toHaveBeenCalledWith({
      productId: "product-1",
      sku: "KEYBOARD",
    });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: "product-1" },
      data: { inventoryId: "inventory-1" },
    });
  });

  it("returns not_found for missing product details", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    await expect(getProductDetailsRecord("missing")).resolves.toEqual({
      status: "not_found",
    });
  });
});
