import { getAuthenticatedUser } from "@/lib/auth";
import { OrderQuerySchema } from "@/schemas";
import { listOrders } from "@/services";
import { NextFunction, Request, Response } from "express";

const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsedQuery = OrderQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ errors: parsedQuery.error.message });
    }

    const { orders, meta } = await listOrders({
      user,
      ...parsedQuery.data,
    });

    res.status(200).json({
      data: orders,
      meta,
    });
  } catch (error) {
    next(error);
  }
};
export default getOrders;
