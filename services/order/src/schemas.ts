import { z } from "zod";

export const OrderSchema = z.object({
  cartSessionId: z.string().min(1),
});

export const CartItemSchema = z.object({
  productId: z.string(),
  inventoryId: z.string(),
  quantity: z.number().int().positive(),
});

export const ProductDetailsSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  price: z.number().nonnegative(),
});
