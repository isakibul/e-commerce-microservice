import { UserCreateSchema } from "@/schemas";
import { createUserRecord } from "@/services";
import { NextFunction, Request, Response } from "express";

const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    /**
     * Validate the request body
     */
    const parsedBody = UserCreateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ message: parsedBody.error.message });
    }

    const result = await createUserRecord(parsedBody.data);
    if (result.status === "conflict") {
      return res.status(409).json({ message: result.message });
    }

    return res.status(result.status === "created" ? 201 : 200).json(result.user);
  } catch (error) {
    next(error);
  }
};

export default createUser;
