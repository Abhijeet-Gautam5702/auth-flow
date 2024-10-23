// Utility function for generating tokens
import jwt from "jsonwebtoken";

export const generateToken = (
  payload: object,
  secret: string,
  expiry: string
): string => {
  const token = jwt.sign(payload, secret, {
    expiresIn: expiry,
  });

  return token;
};
