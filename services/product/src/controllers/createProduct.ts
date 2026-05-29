import { getAuthenticatedUser, isAdmin } from "@/lib/auth";
import { serializeProduct } from "@/lib/serialize";
import { ProductCreateDTOSchema } from "@/schemas";
import { createProductRecord } from "@/services";
import { NextFunction, Request, Response } from "express";

const createProduct = async (
  req: Request,
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
     * Validate request body
     */
    const parsedBody = ProductCreateDTOSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsedBody.error.message,
      });
    }

    const result = await createProductRecord(parsedBody.data);
    if (result.status === "conflict") {
      return res.status(409).json({ message: result.message });
    }

    res.status(201).json(serializeProduct(result.product));
  } catch (err) {
    next(err);
  }
};

export default createProduct;
