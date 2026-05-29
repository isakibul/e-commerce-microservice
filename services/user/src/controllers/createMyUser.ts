import { getAuthenticatedUser } from "@/lib/auth";
import { UserProfileCreateSchema } from "@/schemas";
import { createUserProfileForAuthenticatedUser } from "@/services";
import { NextFunction, Request, Response } from "express";

const createMyUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsedBody = UserProfileCreateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ message: parsedBody.error.message });
    }

    const result = await createUserProfileForAuthenticatedUser(
      parsedBody.data,
      authUser,
    );
    if (result.status === "conflict") {
      return res.status(409).json({ message: result.message });
    }

    return res.status(result.status === "created" ? 201 : 200).json(result.user);
  } catch (error) {
    next(error);
  }
};

export default createMyUser;
