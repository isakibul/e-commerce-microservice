import { AuthenticatedUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const listOrders = async ({
  user,
  page,
  limit,
}: {
  user: AuthenticatedUser;
  page: number;
  limit: number;
}) => {
  const where = isAdmin(user) ? {} : { userId: user.id };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        orderItems: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAuthorizedOrderById = async (
  id: string,
  user: AuthenticatedUser,
) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: true,
    },
  });

  if (!order) {
    return { status: "not_found" as const };
  }

  if (!isAdmin(user) && order.userId !== user.id) {
    return { status: "forbidden" as const };
  }

  return {
    status: "found" as const,
    order,
  };
};
