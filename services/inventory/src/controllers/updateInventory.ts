import { prisma } from "@/prisma";
import { InventoryUpdateDTOSchema } from "@/schemas";
import { NextFunction, Request, Response } from "express";

interface Params {
  id: string;
}

const updateInventory = async (
  req: Request<Params>,
  res: Response,
  next: NextFunction,
) => {
  try {
    /**
     * update the inventory
     */
    const parsedBody = InventoryUpdateDTOSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json(parsedBody.error.format());
    }

    const { id } = req.params;
    const { actionType, quantity } = parsedBody.data;

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
      return res.status(404).json({ message: "Inventory not found" });
    }

    if (updatedInventory === "INSUFFICIENT") {
      return res.status(400).json({
        message: "Insufficient inventory",
      });
    }

    return res.status(200).json(updatedInventory);
  } catch (error) {
    next(error);
  }
};

export default updateInventory;
