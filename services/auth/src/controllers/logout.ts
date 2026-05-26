import { RefreshTokenSchema } from "@/schemas";
import { revokeRefreshToken } from "@/tokens";
import { NextFunction, Request, Response } from "express";

const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedBody = RefreshTokenSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.message });
    }

    await revokeRefreshToken(parsedBody.data.refreshToken);

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export default logout;
