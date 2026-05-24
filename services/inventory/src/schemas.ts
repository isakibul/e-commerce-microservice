import { ActionType } from "@prisma/client";
import { z } from "zod";

export const InventoryCreateDTOSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().trim().min(3).max(10).toUpperCase(),
  quantity: z.number().int().nonnegative().optional().default(0),
});

export const InventoryUpdateDTOSchema = z.object({
  quantity: z.number().int().positive(),
  actionType: z.nativeEnum(ActionType),
});
