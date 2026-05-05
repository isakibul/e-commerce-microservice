import { CART_TTL } from "@/config";
import redis from "@/redis";
import { CartItemSchema } from "@/schemas";
import { NextFunction, Request, Response } from "express";
import { v4 as uuid } from "uuid";

const addToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pareseBody = CartItemSchema.safeParse(req.body);
    if (!pareseBody.success) {
      return res.status(400).json({ errors: pareseBody.error.message });
    }

    let cartSessionId = (req.headers["x-cart-session-id"] as string) || null;

    /**
     * Check if the cart session ID exists in the request headers and exist in the store
     */
    if (cartSessionId) {
      const exists = await redis.exists(`sessions:${cartSessionId}`);

      if (!exists) {
        cartSessionId = null;
      }
    }

    /**
     * If cart session id is not present, create a new one
     */
    if (!cartSessionId) {
      cartSessionId = uuid();

      /**
       * Set the cart session Id in the redis store
       */
      await redis.setex(`sessions:${cartSessionId}`, CART_TTL, cartSessionId);

      /**
       * Set the cart session Id in the response headers
       */
      res.setHeader("x-cart-session-id", cartSessionId);
    }

    /**
     * Add item to the cart
     */
    await redis.hset(
      `cart:${cartSessionId}`,
      pareseBody.data.productId,
      JSON.stringify({
        inventoryId: pareseBody.data.inventoryId,
        quantity: pareseBody.data.quantity,
      }),
    );

    return res.status(200).json({ message: "Item added to cart" });

    // TODO: check inventory for availability
    // TODO: update the inventory
  } catch (error) {
    next(error);
  }
};

export default addToCart;
