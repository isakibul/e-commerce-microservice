import { getCartItems } from "@/services";
import { NextFunction, Request, Response } from "express";

const getMyCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cartSessionId = (req.headers["x-cart-session-id"] as string) || null;

    if (!cartSessionId) {
      return res.status(200).json({ data: [] });
    }

    const items = await getCartItems(cartSessionId);

    return res.status(200).json({ data: items });
  } catch (error) {
    next(error);
  }
};

export default getMyCart;
