import { InventoryDetailsQuerySchema } from "@/schemas";
import { getInventoryWithHistory } from "@/services";
import { NextFunction, Request, Response } from "express";

interface Params {
  id: string;
}

const getInventoryDetails = async (
  req: Request<Params>,
  res: Response,
  next: NextFunction,
) => {
    try {
      const { id } = req.params;
    const parsedQuery = InventoryDetailsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ error: parsedQuery.error.message });
    }

    const inventory = await getInventoryWithHistory(
      id,
      parsedQuery.data.historyLimit,
    );

    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    return res.status(200).json(inventory);
  } catch (err) {
    next(err);
  }
};

export default getInventoryDetails;
