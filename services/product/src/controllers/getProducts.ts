import { prisma } from "@/prisma";
import { ProductQuerySchema } from "@/schemas";
import { serializeProduct } from "@/utils";
import { NextFunction, Request, Response } from "express";

const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedQuery = ProductQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ errors: parsedQuery.error.message });
    }

    const { page, limit, status, search } = parsedQuery.data;
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

    res.json({
      data: products.map(serializeProduct),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

export default getProducts;
