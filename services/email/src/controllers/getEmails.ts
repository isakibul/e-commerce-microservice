import { prisma } from "@/prisma";
import { NextFunction, Request, Response } from "express";

const getEmails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const emails = await prisma.email.findMany();
    res.status(200).json({
      data: emails,
    });
  } catch (error) {
    next(error);
  }
};
