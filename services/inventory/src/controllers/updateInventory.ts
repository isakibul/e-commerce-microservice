import { InventoryUpdateDTOSchema } from "@/schemas";
import { updateInventoryQuantity } from "@/services";
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
    const result = await updateInventoryQuantity(id, parsedBody.data);

    if (result.status === "not_found") {
      return res.status(404).json({ message: "Inventory not found" });
    }

    if (result.status === "insufficient") {
      return res.status(400).json({
        message: "Insufficient inventory",
      });
    }

    return res.status(200).json(result.inventory);
  } catch (error) {
    next(error);
  }
};

export default updateInventory;
