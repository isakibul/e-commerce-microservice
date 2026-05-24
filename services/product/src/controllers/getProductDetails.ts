import { INVENTORY_URL } from "@/config";
import { prisma } from "@/prisma";
import {
  InventoryCreateResponseSchema,
  InventoryDetailsSchema,
} from "@/schemas";
import { serializeProduct } from "@/utils";
import axios from "axios";
import { NextFunction, Request, Response } from "express";

interface Params {
  id: string;
}

const getProductDetails = async (
  req: Request<Params>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    let product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let inventoryId = product.inventoryId;
    if (inventoryId === null) {
      const { data } = await axios.post(`${INVENTORY_URL}/inventories`, {
        productId: product.id,
        sku: product.sku,
      });
      const inventory = InventoryCreateResponseSchema.parse(data);

      product = await prisma.product.update({
        where: { id: product.id },
        data: {
          inventoryId: inventory.id,
        },
      });
      inventoryId = inventory.id;
    }

    /**
     * fetch inventory
     */
    const { data } = await axios.get(
      `${INVENTORY_URL}/inventories/${inventoryId}`,
    );
    const inventory = InventoryDetailsSchema.parse(data);

    return res.status(200).json({
      ...serializeProduct(product),
      stock: inventory.quantity,
      stockStatus: inventory.quantity > 0 ? "In stock" : "Out of stock",
    });
  } catch (err) {
    next(err);
  }
};

export default getProductDetails;
