import { CART_SERVICE, INTERNAL_GATEWAY_SECRET } from "@/config";
import { CartItemSchema } from "@/schemas";
import axios from "axios";
import { z } from "zod";

export const getCartItems = async (cartSessionId: string) => {
  const { data: cartData } = await axios.get(`${CART_SERVICE}/cart/me`, {
    headers: {
      "x-cart-session-id": cartSessionId,
      "x-internal-gateway-secret": INTERNAL_GATEWAY_SECRET,
    },
  });

  return z.array(CartItemSchema).parse(cartData.data);
};
