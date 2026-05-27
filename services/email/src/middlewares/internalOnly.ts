import { INTERNAL_GATEWAY_SECRET } from "@/config";
import { NextFunction, Request, Response } from "express";

export const internalOnly = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.path === "/health") {
    return next();
  }

  if (
    process.env.NODE_ENV === "production" &&
    INTERNAL_GATEWAY_SECRET === "local_internal_gateway_secret"
  ) {
    return res.status(500).json({ message: "Internal secret is not configured" });
  }

  if (req.headers["x-internal-gateway-secret"] !== INTERNAL_GATEWAY_SECRET) {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};
