import { prisma } from "@/lib/prisma";
import { InventoryCreateInput, InventoryUpdateInput } from "@/schemas";

export type InventoryUpdateResult =
  | { status: "updated"; inventory: { id: string; quantity: number } }
  | { status: "not_found" }
  | { status: "insufficient" };

export const createInventoryRecord = async (input: InventoryCreateInput) => {
  const existingInventory = await prisma.inventory.findFirst({
    where: {
      OR: [{ productId: input.productId }, { sku: input.sku }],
    },
    select: {
      id: true,
      productId: true,
      sku: true,
      quantity: true,
    },
  });

  if (existingInventory) {
    if (
      existingInventory.productId !== input.productId ||
      existingInventory.sku !== input.sku
    ) {
      return {
        status: "conflict" as const,
        message: "Inventory already exists for this product or SKU",
      };
    }

    return {
      status: "exists" as const,
      inventory: {
        id: existingInventory.id,
        quantity: existingInventory.quantity,
      },
    };
  }

  try {
    const inventory = await prisma.inventory.create({
      data: {
        ...input,
        histories: {
          create: {
            actionType: "In",
            quantityChanged: input.quantity,
            lastQuantity: 0,
            newQuantity: input.quantity,
          },
        },
      },
      select: {
        id: true,
        quantity: true,
      },
    });

    return {
      status: "created" as const,
      inventory,
    };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        return {
          status: "conflict" as const,
          message: "Inventory already exists for this product or SKU",
        };
      }
    }

    throw error;
  }
};

export const updateInventoryQuantity = async (
  id: string,
  { actionType, quantity }: InventoryUpdateInput,
): Promise<InventoryUpdateResult> => {
  const updatedInventory = await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findUnique({
      where: { id },
      select: {
        id: true,
        quantity: true,
      },
    });

    if (!inventory) {
      return null;
    }

    const updated =
      actionType === "In"
        ? await tx.inventory.update({
            where: { id },
            data: {
              quantity: {
                increment: quantity,
              },
            },
            select: {
              id: true,
              quantity: true,
            },
          })
        : await tx.inventory
            .update({
              where: {
                id,
                quantity: {
                  gte: quantity,
                },
              },
              data: {
                quantity: {
                  decrement: quantity,
                },
              },
              select: {
                id: true,
                quantity: true,
              },
            })
            .catch(() => null);

    if (!updated) {
      return "INSUFFICIENT" as const;
    }

    await tx.history.create({
      data: {
        inventoryId: id,
        actionType,
        quantityChanged: quantity,
        lastQuantity:
          actionType === "In"
            ? updated.quantity - quantity
            : updated.quantity + quantity,
        newQuantity: updated.quantity,
      },
    });

    return updated;
  });

  if (!updatedInventory) {
    return { status: "not_found" };
  }

  if (updatedInventory === "INSUFFICIENT") {
    return { status: "insufficient" };
  }

  return {
    status: "updated",
    inventory: updatedInventory,
  };
};

export const getInventoryQuantity = async (id: string) => {
  return prisma.inventory.findUnique({
    where: { id },
    select: {
      quantity: true,
    },
  });
};

export const getInventoryWithHistory = async (
  id: string,
  historyLimit: number,
) => {
  return prisma.inventory.findUnique({
    where: { id },
    include: {
      histories: {
        orderBy: {
          createdAt: "desc",
        },
        take: historyLimit,
      },
    },
  });
};
