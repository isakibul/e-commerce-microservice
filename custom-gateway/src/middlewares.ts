import axios from "axios";
import { NextFunction, Request, Response } from "express";
import {
  AUTH_SERVICE_URL,
  INTERNAL_GATEWAY_SECRET,
  REQUEST_TIMEOUT_MS,
} from "./env";

const auth = async (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.headers["authorization"];
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { data } = await axios.post(
      `${AUTH_SERVICE_URL}/auth/verify-token`,
      {
        accessToken: token,
      },
      {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          "x-internal-gateway-secret": INTERNAL_GATEWAY_SECRET,
          "x-forwarded-for": req.ip,
          "user-agent": req.headers["user-agent"],
        },
      },
    );

    res.locals.user = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role,
    };

    next();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(
        "Auth middleware error:",
        error.response?.data || error.message,
      );
    } else {
      console.log("Auth middleware error:", error);
    }

    return res.status(401).json({ message: "Unauthorized" });
  }
};

const middlewares = { auth };

export default middlewares;
