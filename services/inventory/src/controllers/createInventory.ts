import { prisma } from "@/prisma";
import { InventoryCreateDTOSchema } from "@/schemas";
import { NextFunction, Request, Response } from "express";

const createInventory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    /**
     * Validate request body
     */
    const parsedBody = InventoryCreateDTOSchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.message });
    }

    const existingInventory = await prisma.inventory.findFirst({
      where: {
        OR: [
          { productId: parsedBody.data.productId },
          { sku: parsedBody.data.sku },
        ],
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
        existingInventory.productId !== parsedBody.data.productId ||
        existingInventory.sku !== parsedBody.data.sku
      ) {
        return res.status(409).json({
          message: "Inventory already exists for this product or SKU",
        });
      }

      return res.status(200).json({
        id: existingInventory.id,
        quantity: existingInventory.quantity,
      });
    }

    /**
     * Create inventory
     */
    let inventory;
    try {
      inventory = await prisma.inventory.create({
        data: {
          ...parsedBody.data,
          histories: {
            create: {
              actionType: "In",
              quantityChanged: parsedBody.data.quantity,
              lastQuantity: 0,
              newQuantity: parsedBody.data.quantity,
            },
          },
        },
        select: {
          id: true,
          quantity: true,
        },
      });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error) {
        const code = (error as { code?: string }).code;
        if (code === "P2002") {
          return res.status(409).json({
            message: "Inventory already exists for this product or SKU",
          });
        }
      }

      throw error;
    }

    return res.status(201).json(inventory);
  } catch (error) {
    next(error);
  }
};

export default createInventory;
