import { CART_TTL, INVENTORY_SERVICE_URL } from "@/config";
import redis from "@/redis";
import { CartItemSchema } from "@/schemas";
import axios from "axios";
import { NextFunction, Request, Response } from "express";
import { v4 as uuid } from "uuid";

const addToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedBody = CartItemSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ errors: parsedBody.error.message });
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
    if (cartSessionId === null) {
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
    const existingItem = await redis.hget(
      `cart:${cartSessionId}`,
      parsedBody.data.productId,
    );
    const existingQuantity = existingItem
      ? (JSON.parse(existingItem) as { quantity: number }).quantity
      : 0;
    const quantityDelta = parsedBody.data.quantity - existingQuantity;

    if (quantityDelta > 0) {
      /**
       * Check if the additional inventory is available
       */
      const { data } = await axios.get(
        `${INVENTORY_SERVICE_URL}/inventories/${parsedBody.data.inventoryId}`,
      );
      if (Number(data.quantity) < quantityDelta) {
        return res.status(400).json({ message: "Inventory not available" });
      }
    }

    await redis.hset(
      `cart:${cartSessionId}`,
      parsedBody.data.productId,
      JSON.stringify({
        inventoryId: parsedBody.data.inventoryId,
        quantity: parsedBody.data.quantity,
      }),
    );
    await redis.expire(`sessions:${cartSessionId}`, CART_TTL);
    await redis.persist(`cart:${cartSessionId}`);

    /**
     * update inventory
     */
    if (quantityDelta !== 0) {
      await axios.put(
        `${INVENTORY_SERVICE_URL}/inventories/${parsedBody.data.inventoryId}`,
        {
          quantity: Math.abs(quantityDelta),
          actionType: quantityDelta > 0 ? "Out" : "In",
        },
      );
    }

    return res
      .status(200)
      .json({ message: "Item added to cart", cartSessionId });
  } catch (error) {
    next(error);
  }
};

export default addToCart;
