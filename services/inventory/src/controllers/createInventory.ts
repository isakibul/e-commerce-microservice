import { getAuthenticatedUser, isAdmin } from "@/lib/auth";
import { InventoryCreateDTOSchema } from "@/schemas";
import { createInventoryRecord } from "@/services";
import { NextFunction, Request, Response } from "express";

const createInventory = async (
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
    const parsedBody = InventoryCreateDTOSchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.message });
    }

    const result = await createInventoryRecord(parsedBody.data);

    if (result.status === "conflict") {
      return res.status(409).json({ message: result.message });
    }

    return res
      .status(result.status === "created" ? 201 : 200)
      .json(result.inventory);
  } catch (error) {
    next(error);
  }
};

export default createInventory;
