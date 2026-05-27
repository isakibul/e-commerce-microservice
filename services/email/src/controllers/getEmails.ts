import { getAuthenticatedUser, isAdmin } from "@/lib/auth";
import { EmailQuerySchema } from "@/schemas";
import { listEmails } from "@/services/email.service";
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

    const { emails, meta } = await listEmails(parsedQuery.data);

    res.status(200).json({
      data: emails,
      meta,
    });
  } catch (error) {
    next(error);
  }
};

export default getEmails;
