import { getAuthenticatedUser, isAdmin } from "@/auth";
import { prisma } from "@/prisma";
import { NextFunction, Request, Response } from "express";

const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!isAdmin(user) && order.userId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

export default getOrderById;
