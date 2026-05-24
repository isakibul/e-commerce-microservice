const DEFAULT_JWT_SECRET = "super_secret_key";

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret === DEFAULT_JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
};
