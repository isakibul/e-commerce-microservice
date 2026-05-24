import { getAuthenticatedUser, isAdmin } from "@/auth";
import { prisma } from "@/prisma";
import { NextFunction, Request, Response } from "express";

const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

    const where = isAdmin(user) ? {} : { userId: user.id };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          orderItems: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.status(200).json({
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
export default getOrders;
