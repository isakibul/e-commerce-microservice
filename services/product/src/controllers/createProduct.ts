import { INVENTORY_URL } from "@/config";
import { prisma } from "@/prisma";
import { InventoryCreateResponseSchema, ProductCreateDTOSchema } from "@/schemas";
import { getAuthenticatedUser, isAdmin } from "@/auth";
import { serializeProduct } from "@/utils";
import axios from "axios";
import { NextFunction, Request, Response } from "express";

const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isAdmin(user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    /**
     * Validate request body
     */
    const parsedBody = ProductCreateDTOSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsedBody.error.message,
      });
    }

    /**
     * Create product
     */
    let product;
    try {
      product = await prisma.product.create({
        data: parsedBody.data,
      });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error) {
        const code = (error as { code?: string }).code;
        if (code === "P2002") {
          return res
            .status(409)
            .json({ message: "Product with the same SKU already exists" });
        }
      }

      throw error;
    }

    /**
     * Create inventory record for the product
     */
    let inventory;
    try {
      const { data } = await axios.post(`${INVENTORY_URL}/inventories`, {
        productId: product.id,
        sku: product.sku,
      });
      inventory = InventoryCreateResponseSchema.parse(data);
    } catch (error) {
      await prisma.product.delete({
        where: { id: product.id },
      });

      throw error;
    }

    /**
     * Update product and store inventory id
     */
    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: {
        inventoryId: inventory.id,
      },
    });

    res.status(201).json(serializeProduct(updatedProduct));
  } catch (err) {
    next(err);
  }
};

export default createProduct;
