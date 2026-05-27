import { getAuthenticatedUser } from "@/lib/auth";
import { UserUpdateSchema } from "@/schemas";
import { updateUserRecord } from "@/services";
import { NextFunction, Request, Response } from "express";

interface Params {
  id: string;
}

const updateUser = async (
  req: Request<Params>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsedBody = UserUpdateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ message: parsedBody.error.message });
    }

    const { id } = req.params;
    const result = await updateUserRecord(id, parsedBody.data, authUser);
    if (result.status === "not_found") {
      return res.status(404).json({ message: "User not found" });
    }

    if (result.status === "forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (result.status === "conflict") {
      return res.status(409).json({ message: result.message });
    }

    return res.status(200).json(result.user);
  } catch (error) {
    next(error);
  }
};

export default updateUser;
