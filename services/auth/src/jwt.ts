import jwt from "jsonwebtoken";

const DEFAULT_JWT_SECRET = "super_secret_key";
export const ACCESS_TOKEN_EXPIRES_IN = "1h";

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret === DEFAULT_JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
};

type AccessTokenUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export const signAccessToken = (user: AccessTokenUser) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    },
  );
};
