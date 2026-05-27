import { beforeEach, describe, expect, it, vi } from "vitest";

const txMock = vi.hoisted(() => ({
  inventory: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  history: {
    create: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  inventory: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { prisma } from "@/lib/prisma";
import {
  createInventoryRecord,
  getInventoryQuantity,
  getInventoryWithHistory,
  updateInventoryQuantity,
} from "@/services/inventory.service";

describe("inventory service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
      callback(txMock),
    );
    vi.mocked(prisma.inventory.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.inventory.create).mockResolvedValue({
      id: "inventory-1",
      quantity: 5,
    } as any);
    txMock.inventory.findUnique.mockResolvedValue({
      id: "inventory-1",
      quantity: 10,
    });
    txMock.inventory.update.mockResolvedValue({
      id: "inventory-1",
      quantity: 15,
    });
    txMock.history.create.mockResolvedValue({ id: "history-1" });
  });

  it("creates inventory with initial history", async () => {
    await expect(
      createInventoryRecord({
        productId: "product-1",
        sku: "SKU1",
        quantity: 5,
      }),
    ).resolves.toEqual({
      status: "created",
      inventory: {
        id: "inventory-1",
        quantity: 5,
      },
    });

    expect(prisma.inventory.create).toHaveBeenCalledWith({
      data: {
        productId: "product-1",
        sku: "SKU1",
        quantity: 5,
        histories: {
          create: {
            actionType: "In",
            quantityChanged: 5,
            lastQuantity: 0,
            newQuantity: 5,
          },
        },
      },
      select: {
        id: true,
        quantity: true,
      },
    });
  });

  it("returns existing inventory for matching product and SKU", async () => {
    vi.mocked(prisma.inventory.findFirst).mockResolvedValue({
      id: "inventory-1",
      productId: "product-1",
      sku: "SKU1",
      quantity: 3,
    } as any);

    await expect(
      createInventoryRecord({
        productId: "product-1",
        sku: "SKU1",
        quantity: 10,
      }),
    ).resolves.toEqual({
      status: "exists",
      inventory: {
        id: "inventory-1",
        quantity: 3,
      },
    });
    expect(prisma.inventory.create).not.toHaveBeenCalled();
  });

  it("returns conflict for product/SKU mismatches or unique races", async () => {
    vi.mocked(prisma.inventory.findFirst).mockResolvedValueOnce({
      id: "inventory-1",
      productId: "other-product",
      sku: "SKU1",
      quantity: 3,
    } as any);

    await expect(
      createInventoryRecord({
        productId: "product-1",
        sku: "SKU1",
        quantity: 1,
      }),
    ).resolves.toMatchObject({ status: "conflict" });

    vi.mocked(prisma.inventory.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.inventory.create).mockRejectedValueOnce({ code: "P2002" });

    await expect(
      createInventoryRecord({
        productId: "product-1",
        sku: "SKU1",
        quantity: 1,
      }),
    ).resolves.toMatchObject({ status: "conflict" });
  });

  it("increments stock and writes history", async () => {
    txMock.inventory.update.mockResolvedValueOnce({
      id: "inventory-1",
      quantity: 15,
    });

    await expect(
      updateInventoryQuantity("inventory-1", {
        actionType: "In",
        quantity: 5,
      }),
    ).resolves.toEqual({
      status: "updated",
      inventory: {
        id: "inventory-1",
        quantity: 15,
      },
    });

    expect(txMock.inventory.update).toHaveBeenCalledWith({
      where: { id: "inventory-1" },
      data: {
        quantity: {
          increment: 5,
        },
      },
      select: {
        id: true,
        quantity: true,
      },
    });
    expect(txMock.history.create).toHaveBeenCalledWith({
      data: {
        inventoryId: "inventory-1",
        actionType: "In",
        quantityChanged: 5,
        lastQuantity: 10,
        newQuantity: 15,
      },
    });
  });

  it("decrements stock only when enough quantity exists", async () => {
    txMock.inventory.update.mockResolvedValueOnce({
      id: "inventory-1",
      quantity: 7,
    });

    await updateInventoryQuantity("inventory-1", {
      actionType: "Out",
      quantity: 3,
    });

    expect(txMock.inventory.update).toHaveBeenCalledWith({
      where: {
        id: "inventory-1",
        quantity: {
          gte: 3,
        },
      },
      data: {
        quantity: {
          decrement: 3,
        },
      },
      select: {
        id: true,
        quantity: true,
      },
    });
    expect(txMock.history.create).toHaveBeenCalledWith({
      data: {
        inventoryId: "inventory-1",
        actionType: "Out",
        quantityChanged: 3,
        lastQuantity: 10,
        newQuantity: 7,
      },
    });
  });

  it("returns not_found and insufficient states", async () => {
    txMock.inventory.findUnique.mockResolvedValueOnce(null);

    await expect(
      updateInventoryQuantity("missing", {
        actionType: "Out",
        quantity: 1,
      }),
    ).resolves.toEqual({ status: "not_found" });

    txMock.inventory.findUnique.mockResolvedValueOnce({
      id: "inventory-1",
      quantity: 1,
    });
    txMock.inventory.update.mockRejectedValueOnce(new Error("not enough"));

    await expect(
      updateInventoryQuantity("inventory-1", {
        actionType: "Out",
        quantity: 5,
      }),
    ).resolves.toEqual({ status: "insufficient" });
    expect(txMock.history.create).not.toHaveBeenCalled();
  });

  it("gets inventory quantity and details with history", async () => {
    vi.mocked(prisma.inventory.findUnique).mockResolvedValueOnce({
      quantity: 8,
    } as any);

    await expect(getInventoryQuantity("inventory-1")).resolves.toEqual({
      quantity: 8,
    });
    expect(prisma.inventory.findUnique).toHaveBeenCalledWith({
      where: { id: "inventory-1" },
      select: {
        quantity: true,
      },
    });

    vi.mocked(prisma.inventory.findUnique).mockResolvedValueOnce({
      id: "inventory-1",
      histories: [],
    } as any);

    await getInventoryWithHistory("inventory-1", 25);
    expect(prisma.inventory.findUnique).toHaveBeenLastCalledWith({
      where: { id: "inventory-1" },
      include: {
        histories: {
          orderBy: {
            createdAt: "desc",
          },
          take: 25,
        },
      },
    });
  });
});
