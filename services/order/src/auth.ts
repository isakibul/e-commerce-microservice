import { Request } from "express";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

const getHeader = (req: Request, name: string) => {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

export const getAuthenticatedUser = (req: Request): AuthenticatedUser | null => {
  const id = getHeader(req, "x-user-id");
  const email = getHeader(req, "x-user-email");
  const name = getHeader(req, "x-user-name");
  const role = getHeader(req, "x-user-role") || "USER";

  if (!id || !email || !name) {
    return null;
  }

  return { id, email, name, role };
};

export const isAdmin = (user: AuthenticatedUser) => user.role === "ADMIN";
