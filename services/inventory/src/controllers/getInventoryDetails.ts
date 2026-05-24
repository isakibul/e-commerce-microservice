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
    const historyLimit = Math.min(
      Math.max(Number(req.query.historyLimit) || 50, 1),
      200,
    );

    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: {
        histories: {
          orderBy: {
            createdAt: "desc",
          },
          take: historyLimit,
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
