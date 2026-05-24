import axios from "axios";
import { Express, Request, Response } from "express";
import config from "./config.json";
import {
  INTERNAL_GATEWAY_SECRET,
  REQUEST_TIMEOUT_MS,
  resolveServiceUrl,
} from "./env";
import middlewares from "./middlewares";

const getHeader = (req: Request, name: string) => {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

const getGatewayHeaders = (req: Request, res: Response) => {
  const headers: Record<string, string> = {
    origin: "http://localhost:8081",
    "x-internal-gateway-secret": INTERNAL_GATEWAY_SECRET,
  };

  const user = res.locals.user as AuthenticatedUser | undefined;
  const cartSessionId = getHeader(req, "x-cart-session-id");
  const userAgent = getHeader(req, "user-agent");

  if (user) {
    headers["x-user-id"] = user.id;
    headers["x-user-email"] = user.email;
    headers["x-user-name"] = user.name;
    headers["x-user-role"] = user.role;
  }

  if (cartSessionId) headers["x-cart-session-id"] = cartSessionId;
  if (userAgent) headers["user-agent"] = userAgent;

  return headers;
};

const createHandler = (hostname: string, path: string, method: string) => {
  return async (req: Request, res: Response) => {
    try {
      let url = `${hostname}${path}`;
      req.params &&
        Object.keys(req.params).forEach((param) => {
          url = url.replace(`:${param}`, String(req.params[param]));
        });

      const { data, headers, status } = await axios({
        method,
        url,
        data: req.body,
        params: req.query,
        headers: getGatewayHeaders(req, res),
        timeout: REQUEST_TIMEOUT_MS,
      });

      if (headers["x-cart-session-id"]) {
        res.setHeader("x-cart-session-id", headers["x-cart-session-id"]);
      }

      res.status(status).json(data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return res.status(error.response?.status || 500).json({
          message: error.response?.data?.message || error.message,
          details: error.response?.data || null,
        });
      } else {
        return res.status(500).json({
          message: "Internal Server Error",
        });
      }
    }
  };
};

export const getMiddlewares = (names: (keyof typeof middlewares)[]) => {
  return names.map((name) => {
    const middleware = middlewares[name];

    if (!middleware) {
      throw new Error(`Unknown middleware: ${name}`);
    }

    return middleware;
  });
};

export const configureRoutes = (app: Express) => {
  Object.entries(config.services).forEach(([name, service]) => {
    const hostname = resolveServiceUrl(name, service.url);

    service.routes.forEach((route) => {
      route.methods.forEach((method) => {
        const endpoint = `/api${route.path}`;
        const middleware = getMiddlewares(
          route.middleware as (keyof typeof middlewares)[],
        );
        const handler = createHandler(hostname, route.path, method);
        app[method as keyof Express](endpoint, ...middleware, handler);
      });
    });
  });
};
