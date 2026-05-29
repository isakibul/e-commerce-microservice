import { getAuthenticatedUser, isAdmin } from "@/lib/auth";
import { serializeProduct } from "@/lib/serialize";
import { ProductUpdateDTOSchema } from "@/schemas";
import { updateProductRecord } from "@/services";
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
    const user = await getAuthenticatedUser(req);
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

    const { id } = req.params;
    const result = await updateProductRecord(id, parsedBody.data);
    if (result.status === "not_found") {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ data: serializeProduct(result.product) });
  } catch (error) {
    next(error);
  }
};

export default updateProduct;
