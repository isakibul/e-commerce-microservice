import { Product } from "@prisma/client";

export const serializeProduct = (product: Product) => ({
  ...product,
  price: Number(product.price),
});
