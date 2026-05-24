import { clearCart as clearCartService } from "@/services";
import { NextFunction, Request, Response } from "express";

const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cartSessionId = (req.headers["x-cart-session-id"] as string) || null;

    if (!cartSessionId) {
      return res.status(200).json({ message: "Cart is empty" });
    }

    const finalized = req.headers["x-cart-finalized"] === "true";
    const cleared = await clearCartService(cartSessionId, {
      releaseInventory: !finalized,
    });
    if (!cleared) {
      return res.status(200).json({ message: "Cart is empty" });
    }

    res.clearCookie("x-cart-session-id");
    res.status(200).json({ message: "Cart cleared" });
  } catch (error) {
    next(error);
  }
};

export default clearCart;
