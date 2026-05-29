import { getAuthenticatedUser } from "@/lib/auth";
import { OrderSchema } from "@/schemas";
import { checkoutCart } from "@/services";
import { NextFunction, Request, Response } from "express";

const checkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    /**
     * Validate request body
     */
    const parsedBody = OrderSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ errors: parsedBody.error.message });
    }

    const result = await checkoutCart(parsedBody.data.cartSessionId, user);
    if (result.status === "forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (result.status === "empty_cart") {
      return res.status(400).json({ message: "Cart is empty" });
    }

    return res
      .status(result.status === "created" ? 201 : 200)
      .json(result.order);
  } catch (error) {
    next(error);
  }
};

export default checkout;
