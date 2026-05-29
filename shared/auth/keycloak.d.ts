export type KeycloakVerifyOptions = {
  jwksUri: string;
  issuer?: string;
  audience?: string | string[];
  clientId?: string;
  jwksCacheMs?: number;
  clockToleranceSeconds?: number;
};

export type KeycloakClaims = {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  azp?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
  [claim: string]: unknown;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  roles: string[];
};

export function verifyKeycloakToken(
  token: string,
  options: KeycloakVerifyOptions,
): Promise<KeycloakClaims>;

export function extractBearerToken(
  authorizationHeader: string | string[] | undefined,
): string | null;

export function claimsToAuthenticatedUser(
  claims: KeycloakClaims,
  options?: { clientId?: string },
): AuthenticatedUser | null;

export function clearJwksCache(): void;
