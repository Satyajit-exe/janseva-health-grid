import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { ApiError } from "./errorHandler";
import { Role } from "../utils/constants";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: Role;
    facilityId?: string;
    districtId?: string;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new ApiError(401, "Authentication required"));
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      facilityId: payload.facilityId,
      districtId: payload.districtId,
    };
    return next();
  } catch {
    return next(new ApiError(401, "Invalid or expired token"));
  }
}

/** Allows the request through only if the user is one of the given roles. */
export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, "Authentication required"));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `This action requires one of these roles: ${roles.join(", ")}`));
    }
    return next();
  };
}

/** Optional auth: attaches req.user if a valid token is present, but never blocks the request. */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return next();
  try {
    const payload = verifyToken(header.slice("Bearer ".length));
    req.user = { id: payload.sub, role: payload.role, facilityId: payload.facilityId, districtId: payload.districtId };
  } catch {
    // ignore invalid token on optional routes
  }
  return next();
}
