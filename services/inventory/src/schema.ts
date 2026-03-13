import { z } from "zod";

export const InventoryCreateDTOSchema = z.object({
  productId: z.string(),
  sku: z.string(),
  quantity: z.number().int().nonnegative().optional().default(0),
});
