import { getAuthenticatedUser, isAdmin } from "@/auth";
import { prisma } from "@/prisma";
import { EmailQuerySchema } from "@/schemas";
import { NextFunction, Request, Response } from "express";

const getEmails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isAdmin(user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsedQuery = EmailQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ errors: parsedQuery.error.message });
    }

    const { page, limit, recipient, source } = parsedQuery.data;
    const where = {
      ...(recipient ? { recipient } : {}),
      ...(source ? { source } : {}),
    };

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: {
          sentAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.email.count({ where }),
    ]);

    res.status(200).json({
      data: emails,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export default getEmails;
