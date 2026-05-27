import {
  createInventoryForProduct,
  getInventoryQuantity,
} from "@/clients/inventory.client";
import { prisma } from "@/lib/prisma";
import {
  ProductCreateInput,
  ProductQueryInput,
  ProductUpdateInput,
} from "@/schemas";

export const createProductRecord = async (input: ProductCreateInput) => {
  let product;

  try {
    product = await prisma.product.create({
      data: input,
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        return {
          status: "conflict" as const,
          message: "Product with the same SKU already exists",
        };
      }
    }

    throw error;
  }

  try {
    const inventory = await createInventoryForProduct({
      productId: product.id,
      sku: product.sku,
    });

    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: {
        inventoryId: inventory.id,
      },
    });

    return {
      status: "created" as const,
      product: updatedProduct,
    };
  } catch (error) {
    await prisma.product.delete({
      where: { id: product.id },
    });

    throw error;
  }
};

export const updateProductRecord = async (
  id: string,
  input: ProductUpdateInput,
) => {
  const product = await prisma.product.findUnique({
    where: {
      id,
    },
  });

  if (!product) {
    return {
      status: "not_found" as const,
    };
  }

  const updatedProduct = await prisma.product.update({
    where: {
      id,
    },
    data: input,
  });

  return {
    status: "updated" as const,
    product: updatedProduct,
  };
};

export const listProducts = async ({
  page,
  limit,
  status,
  search,
}: ProductQueryInput) => {
  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getProductDetailsRecord = async (id: string) => {
  let product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return {
      status: "not_found" as const,
    };
  }

  let inventoryId = product.inventoryId;
  if (inventoryId === null) {
    const inventory = await createInventoryForProduct({
      productId: product.id,
      sku: product.sku,
    });

    product = await prisma.product.update({
      where: { id: product.id },
      data: {
        inventoryId: inventory.id,
      },
    });
    inventoryId = inventory.id;
  }

  const inventory = await getInventoryQuantity(inventoryId);

  return {
    status: "found" as const,
    product,
    stock: inventory.quantity,
    stockStatus: inventory.quantity > 0 ? "In stock" : "Out of stock",
  };
};
