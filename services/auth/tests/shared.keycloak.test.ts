import { afterEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import {
  claimsToAuthenticatedUser,
  clearJwksCache,
  extractBearerToken,
  verifyKeycloakToken,
} from "@ecommerce/shared";

const base64Url = (value: Buffer | string) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const createToken = ({
  privateKey,
  kid,
  claims = {},
}: {
  privateKey: crypto.KeyObject;
  kid: string;
  claims?: Record<string, unknown>;
}) => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT",
      kid,
    }),
  );
  const payload = base64Url(
    JSON.stringify({
      sub: "user-1",
      email: "user@example.com",
      name: "Ada Lovelace",
      iss: "http://localhost:8080/realms/ecommerce",
      aud: "ecommerce-api",
      exp: now + 300,
      realm_access: {
        roles: ["admin"],
      },
      ...claims,
    }),
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();

  return `${header}.${payload}.${base64Url(signer.sign(privateKey))}`;
};

describe("shared Keycloak auth helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearJwksCache();
  });

  it("extracts bearer tokens and maps Keycloak roles to app identity", () => {
    expect(extractBearerToken("Bearer token-1")).toBe("token-1");
    expect(extractBearerToken("basic token-1")).toBeNull();

    expect(
      claimsToAuthenticatedUser(
        {
          sub: "user-1",
          email: "user@example.com",
          preferred_username: "ada",
          realm_access: { roles: ["admin"] },
        },
        { clientId: "ecommerce-api" },
      ),
    ).toMatchObject({
      id: "user-1",
      email: "user@example.com",
      name: "ada",
      role: "ADMIN",
      roles: ["ADMIN"],
    });
  });

  it("verifies RS256 Keycloak tokens with issuer and audience checks", async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const jwk = publicKey.export({ format: "jwk" }) as JsonWebKey;
    const kid = "test-key";
    const token = createToken({ privateKey, kid });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          keys: [
            {
              ...jwk,
              kid,
              alg: "RS256",
              use: "sig",
            },
          ],
        }),
      }),
    );

    await expect(
      verifyKeycloakToken(token, {
        issuer: "http://localhost:8080/realms/ecommerce",
        audience: "ecommerce-api",
        jwksUri: "http://keycloak/realms/ecommerce/certs",
      }),
    ).resolves.toMatchObject({
      sub: "user-1",
      email: "user@example.com",
    });
  });

  it("rejects tokens with the wrong issuer", async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const kid = "test-key";
    const token = createToken({ privateKey, kid });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          keys: [
            {
              ...(publicKey.export({ format: "jwk" }) as JsonWebKey),
              kid,
            },
          ],
        }),
      }),
    );

    await expect(
      verifyKeycloakToken(token, {
        issuer: "http://localhost:8080/realms/other",
        audience: "ecommerce-api",
        jwksUri: "http://keycloak/realms/ecommerce/certs",
      }),
    ).rejects.toThrow("Invalid token issuer");
  });
});
