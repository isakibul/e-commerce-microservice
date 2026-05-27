import { serializeProduct } from "@/lib/serialize";
import { ProductQuerySchema } from "@/schemas";
import { listProducts } from "@/services";
import { NextFunction, Request, Response } from "express";

const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedQuery = ProductQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ errors: parsedQuery.error.message });
    }

    const { products, meta } = await listProducts(parsedQuery.data);

    res.json({
      data: products.map(serializeProduct),
      meta,
    });
  } catch (err) {
    next(err);
  }
};

export default getProducts;
