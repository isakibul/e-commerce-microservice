import {
  CART_TTL,
  INTERNAL_GATEWAY_SECRET,
  INVENTORY_SERVICE_URL,
} from "@/config";
import redis from "@/redis";
import { CartItemSchema } from "@/schemas";
import axios from "axios";
import { NextFunction, Request, Response } from "express";
import { v4 as uuid } from "uuid";

type StoredCartItem = {
  inventoryId: string;
  quantity: number;
};

const updateInventory = async (
  inventoryId: string,
  quantity: number,
  actionType: "In" | "Out",
) => {
  await axios.put(`${INVENTORY_SERVICE_URL}/inventories/${inventoryId}`, {
    quantity,
    actionType,
  }, {
    headers: {
      "x-internal-gateway-secret": INTERNAL_GATEWAY_SECRET,
    },
  });
};

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
    const parsedExistingItem = existingItem
      ? (JSON.parse(existingItem) as StoredCartItem)
      : null;
    const existingQuantity = parsedExistingItem?.quantity || 0;

    if (
      parsedExistingItem &&
      parsedExistingItem.inventoryId !== parsedBody.data.inventoryId
    ) {
      return res.status(409).json({
        message: "Product already exists in cart with another inventory item",
      });
    }

    const quantityDelta = parsedBody.data.quantity - existingQuantity;

    if (quantityDelta > 0) {
      await updateInventory(
        parsedBody.data.inventoryId,
        quantityDelta,
        "Out",
      );
    }

    try {
      if (parsedBody.data.quantity === 0) {
        await redis.hdel(`cart:${cartSessionId}`, parsedBody.data.productId);
      } else {
        await redis.hset(
          `cart:${cartSessionId}`,
          parsedBody.data.productId,
          JSON.stringify({
            inventoryId: parsedBody.data.inventoryId,
            quantity: parsedBody.data.quantity,
          }),
        );
      }

      await redis.expire(`sessions:${cartSessionId}`, CART_TTL);
      await redis.persist(`cart:${cartSessionId}`);
    } catch (error) {
      if (quantityDelta > 0) {
        await updateInventory(parsedBody.data.inventoryId, quantityDelta, "In");
      }

      throw error;
    }

    if (quantityDelta < 0) {
      try {
        await updateInventory(
          parsedBody.data.inventoryId,
          Math.abs(quantityDelta),
          "In",
        );
      } catch (error) {
        if (parsedExistingItem) {
          await redis.hset(
            `cart:${cartSessionId}`,
            parsedBody.data.productId,
            JSON.stringify(parsedExistingItem),
          );
        }

        throw error;
      }
    }

    return res
      .status(200)
      .json({
        message:
          parsedBody.data.quantity === 0
            ? "Item removed from cart"
            : "Item added to cart",
        cartSessionId,
      });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return res.status(error.response?.status || 500).json({
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to update cart inventory",
      });
    }

    next(error);
  }
};

export default addToCart;
