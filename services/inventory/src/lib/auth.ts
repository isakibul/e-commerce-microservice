import { Request } from "express";
import {
  claimsToAuthenticatedUser,
  extractBearerToken,
  verifyKeycloakToken,
} from "@ecommerce/shared";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  roles?: string[];
};

const getHeader = (req: Request<any>, name: string) => {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

const getKeycloakOptions = () => ({
  issuer: process.env.KEYCLOAK_ISSUER || "http://localhost:8080/realms/ecommerce",
  jwksUri:
    process.env.KEYCLOAK_JWKS_URI ||
    "http://localhost:8080/realms/ecommerce/protocol/openid-connect/certs",
  audience: process.env.KEYCLOAK_AUDIENCE || "ecommerce-api",
  clientId: process.env.KEYCLOAK_CLIENT_ID || "ecommerce-api",
});

export const getAuthenticatedUser = (
  req: Request<any>,
): Promise<AuthenticatedUser | null> => {
  const token = extractBearerToken(req.headers.authorization);
  if (token) {
    return verifyKeycloakToken(token, getKeycloakOptions())
      .then((claims) =>
        claimsToAuthenticatedUser(claims, {
          clientId: process.env.KEYCLOAK_CLIENT_ID || "ecommerce-api",
        }),
      )
      .catch(() => null);
  }

  const id = getHeader(req, "x-user-id");
  const email = getHeader(req, "x-user-email");
  const name = getHeader(req, "x-user-name");
  const role = getHeader(req, "x-user-role") || "USER";

  if (!id || !email || !name) {
    return Promise.resolve(null);
  }

  return Promise.resolve({ id, email, name, role });
};

export const isAdmin = (user: AuthenticatedUser) => user.role === "ADMIN";
