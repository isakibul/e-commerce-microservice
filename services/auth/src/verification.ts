import bcrypt from "bcrypt";
import { randomInt } from "crypto";

export const generateVerificationCode = () => {
  return randomInt(100000, 1000000).toString();
};

export const hashVerificationCode = async (code: string) => {
  return bcrypt.hash(code, 10);
};

export const compareVerificationCode = async (code: string, hash: string) => {
  return bcrypt.compare(code, hash);
};
