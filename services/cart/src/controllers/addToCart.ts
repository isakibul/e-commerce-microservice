import { isInventoryClientError } from "@/clients/inventory.client";
import { CartItemSchema } from "@/schemas";
import { addCartItem, ensureCartSession } from "@/services";
import { NextFunction, Request, Response } from "express";

const addToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedBody = CartItemSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ errors: parsedBody.error.message });
    }

    const requestedSessionId = (req.headers["x-cart-session-id"] as string) || null;
    const { cartSessionId, created } = await ensureCartSession(requestedSessionId);

    if (created) {
      res.setHeader("x-cart-session-id", cartSessionId);
    }

    const result = await addCartItem(cartSessionId, parsedBody.data);
    if (result.status === "conflict") {
      return res.status(409).json({
        message: result.message,
      });
    }

    return res.status(200).json({
      message: result.message,
      cartSessionId,
    });
  } catch (error) {
    if (isInventoryClientError(error)) {
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
