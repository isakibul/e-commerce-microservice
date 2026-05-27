import { z } from "zod";

export const OrderSchema = z.object({
  cartSessionId: z.string().min(1),
});

export const OrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
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

export type OrderInput = z.infer<typeof OrderSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type ProductDetails = z.infer<typeof ProductDetailsSchema>;
