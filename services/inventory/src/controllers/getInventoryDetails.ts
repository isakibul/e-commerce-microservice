import { prisma } from "@/prisma";
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
    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: {
        histories: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    return res.status(200).json(inventory);
  } catch (err) {
    next(err);
  }
};

export default getInventoryDetails;
