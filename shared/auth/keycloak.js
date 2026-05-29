const crypto = require("crypto");

const DEFAULT_JWKS_CACHE_MS = 5 * 60 * 1000;
const DEFAULT_CLOCK_TOLERANCE_SECONDS = 30;

const jwksCache = new Map();

const base64UrlDecode = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return Buffer.from(padded, "base64");
};

const parseJsonSegment = (segment, label) => {
  try {
    return JSON.parse(base64UrlDecode(segment).toString("utf8"));
  } catch (_error) {
    throw new Error(`Invalid JWT ${label}`);
  }
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to fetch JWKS: ${response.status}`);
  }

  return response.json();
};

const getJwks = async (jwksUri, cacheMs = DEFAULT_JWKS_CACHE_MS) => {
  const cached = jwksCache.get(jwksUri);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.keys;
  }

  const jwks = await fetchJson(jwksUri);
  if (!Array.isArray(jwks.keys)) {
    throw new Error("Invalid JWKS response");
  }

  jwksCache.set(jwksUri, {
    keys: jwks.keys,
    expiresAt: Date.now() + cacheMs,
  });

  return jwks.keys;
};

const assertRegisteredClaims = (claims, options) => {
  const now = Math.floor(Date.now() / 1000);
  const tolerance =
    options.clockToleranceSeconds ?? DEFAULT_CLOCK_TOLERANCE_SECONDS;

  if (typeof claims.exp !== "number" || claims.exp + tolerance < now) {
    throw new Error("Token expired");
  }

  if (typeof claims.nbf === "number" && claims.nbf - tolerance > now) {
    throw new Error("Token not yet valid");
  }

  if (options.issuer && claims.iss !== options.issuer) {
    throw new Error("Invalid token issuer");
  }

  const acceptedAudiences = options.audience
    ? Array.isArray(options.audience)
      ? options.audience
      : [options.audience]
    : [];

  if (acceptedAudiences.length > 0) {
    const tokenAudiences = Array.isArray(claims.aud)
      ? claims.aud
      : claims.aud
        ? [claims.aud]
        : [];

    const hasAudience = acceptedAudiences.some((audience) =>
      tokenAudiences.includes(audience),
    );
    const hasAuthorizedParty = acceptedAudiences.includes(claims.azp);

    if (!hasAudience && !hasAuthorizedParty) {
      throw new Error("Invalid token audience");
    }
  }
};

const verifySignature = (token, jwk) => {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  const verifier = crypto.createVerify("RSA-SHA256");

  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const signature = base64UrlDecode(encodedSignature);

  if (!verifier.verify(publicKey, signature)) {
    throw new Error("Invalid token signature");
  }
};

const verifyKeycloakToken = async (token, options = {}) => {
  if (!token || typeof token !== "string") {
    throw new Error("Missing token");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  const header = parseJsonSegment(parts[0], "header");
  const claims = parseJsonSegment(parts[1], "payload");

  if (header.alg !== "RS256") {
    throw new Error("Unsupported token algorithm");
  }

  if (!header.kid) {
    throw new Error("Missing token key id");
  }

  if (!options.jwksUri) {
    throw new Error("Keycloak JWKS URI is not configured");
  }

  const keys = await getJwks(options.jwksUri, options.jwksCacheMs);
  const jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) {
    throw new Error("Signing key not found");
  }

  verifySignature(token, jwk);
  assertRegisteredClaims(claims, options);

  return claims;
};

const extractBearerToken = (authorizationHeader) => {
  if (Array.isArray(authorizationHeader)) {
    return extractBearerToken(authorizationHeader[0]);
  }

  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
};

const collectRoles = (claims, clientId) => {
  const realmRoles = claims.realm_access?.roles || [];
  const clientRoles = clientId
    ? claims.resource_access?.[clientId]?.roles || []
    : [];

  return [...new Set([...realmRoles, ...clientRoles])].filter(
    (role) => typeof role === "string" && role.trim(),
  );
};

const claimsToAuthenticatedUser = (claims, { clientId } = {}) => {
  const roles = collectRoles(claims, clientId);
  const normalizedRoles = roles.map((role) => role.toUpperCase());
  const role = normalizedRoles.includes("ADMIN") ? "ADMIN" : "USER";
  const name = claims.name || claims.preferred_username || claims.email;

  if (!claims.sub || !claims.email || !name) {
    return null;
  }

  return {
    id: String(claims.sub),
    email: String(claims.email),
    name: String(name),
    role,
    roles: normalizedRoles,
  };
};

const clearJwksCache = () => {
  jwksCache.clear();
};

module.exports = {
  clearJwksCache,
  claimsToAuthenticatedUser,
  extractBearerToken,
  verifyKeycloakToken,
};
