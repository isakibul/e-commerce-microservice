import { serializeProduct } from "@/lib/serialize";
import { getProductDetailsRecord } from "@/services";
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
    const result = await getProductDetailsRecord(id);
    if (result.status === "not_found") {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      ...serializeProduct(result.product),
      stock: result.stock,
      stockStatus: result.stockStatus,
    });
  } catch (err) {
    next(err);
  }
};

export default getProductDetails;
