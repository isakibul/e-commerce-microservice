import redis from "@/redis";
import { clearCart } from "@/services";
import { NextFunction, Request, Response } from "express";

const getMyCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cartSessionId = (req.headers["x-cart-session-id"] as string) || null;

    if (!cartSessionId) {
      return res.status(200).json({ data: [] });
    }

    /**
     * Check if the session id exists in the store
     */
    const session = await redis.exists(`sessions:${cartSessionId}`);
    if (!session) {
      await clearCart(cartSessionId);
      return res.status(200).json({ data: [] });
    }

    const items = await redis.hgetall(`cart:${cartSessionId}`);
    if (Object.keys(items).length === 0) {
      return res.status(200).json({ data: [] });
    }

    /**
     * Formate the items
     */
    const formatedItems = Object.keys(items).map((key) => {
      const { quantity, inventoryId } = JSON.parse(items[key]) as {
        quantity: number;
        inventoryId: string;
      };
      return {
        productId: key,
        quantity,
        inventoryId,
      };
    });

    return res.status(200).json({ data: formatedItems });
  } catch (error) {
    next(error);
  }
};

export default getMyCart;
