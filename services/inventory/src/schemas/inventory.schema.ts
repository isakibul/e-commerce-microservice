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

export const InventoryDetailsQuerySchema = z.object({
  historyLimit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export type InventoryCreateInput = z.infer<typeof InventoryCreateDTOSchema>;
export type InventoryUpdateInput = z.infer<typeof InventoryUpdateDTOSchema>;
