import jwt from "jsonwebtoken";
import { Role } from "./constants";

export interface JwtPayload {
  sub: string; // user id
  role: Role;
  facilityId?: string;
  districtId?: string;
}

export function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN as any) || "7d",
  });
}

export function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.verify(token, secret) as JwtPayload;
}
