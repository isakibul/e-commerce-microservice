import { NextFunction, Request, Response } from "express";

export const INTERNAL_GATEWAY_SECRET =
  process.env.INTERNAL_GATEWAY_SECRET || "local_internal_gateway_secret";

export const internalOnly = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.path === "/health") {
    return next();
  }

  if (req.headers["x-internal-gateway-secret"] !== INTERNAL_GATEWAY_SECRET) {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};
