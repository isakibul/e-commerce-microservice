import { getAuthenticatedUser } from "@/lib/auth";
import { getAuthorizedOrderById } from "@/services";
import { NextFunction, Request, Response } from "express";

const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const result = await getAuthorizedOrderById(id, user);
    if (result.status === "not_found") {
      return res.status(404).json({ message: "Order not found" });
    }

    if (result.status === "forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json(result.order);
  } catch (error) {
    next(error);
  }
};

export default getOrderById;
