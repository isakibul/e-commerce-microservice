import { getAuthenticatedUser, isAdmin } from "@/auth";
import { prisma } from "@/prisma";
import { ProductUpdateDTOSchema } from "@/schemas";
import { serializeProduct } from "@/utils";
import { NextFunction, Request, Response } from "express";

interface Params {
  id: string;
}

const updateProduct = async (
  req: Request<Params>,
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
     * Verify if the request body is valid
     */
    const parsedBody = ProductUpdateDTOSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ errors: parsedBody.error.message });
    }

    /**
     * Check if the product exists
     */
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: {
        id,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    /**
     * Update the product
     */
    const updatedProduct = await prisma.product.update({
      where: {
        id,
      },
      data: parsedBody.data,
    });

    res.status(200).json({ data: serializeProduct(updatedProduct) });
  } catch (error) {
    next(error);
  }
};

export default updateProduct;
