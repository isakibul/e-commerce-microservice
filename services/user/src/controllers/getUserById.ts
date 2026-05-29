import { getAuthenticatedUser } from "@/lib/auth";
import { UserLookupQuerySchema } from "@/schemas";
import { getAuthorizedUser } from "@/services";
import { NextFunction, Request, Response } from "express";

const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const parsedQuery = UserLookupQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ message: parsedQuery.error.message });
    }

    const field = parsedQuery.data.filed || parsedQuery.data.field;
    const userId = Array.isArray(id) ? id[0] : id;
    const result = await getAuthorizedUser({
      id: userId,
      field,
      authUser,
    });

    if (result.status === "not_found") {
      return res.status(404).json({ message: "User not found" });
    }

    if (result.status === "forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json(result.user);
  } catch (error) {
    next(error);
  }
};

export default getUserById;
