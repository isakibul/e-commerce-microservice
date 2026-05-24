import { Status } from "@prisma/client";
import { z } from "zod";

export const ProductCreateDTOSchema = z.object({
  sku: z.string().trim().min(3).max(10).toUpperCase(),
  name: z.string().trim().min(3).max(255),
  description: z.string().max(1000).optional(),
  price: z.number().nonnegative().optional().default(0),
  status: z.nativeEnum(Status).optional().default(Status.DRAFT),
});

export const ProductUpdateDTOSchema = ProductCreateDTOSchema.omit({
  sku: true,
}).partial();

export const ProductQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.nativeEnum(Status).optional(),
  search: z.string().trim().optional(),
});

export const InventoryCreateResponseSchema = z.object({
  id: z.string(),
  quantity: z.number().int().nonnegative().optional().default(0),
});

export const InventoryDetailsSchema = z.object({
  quantity: z.number().int().nonnegative(),
});
