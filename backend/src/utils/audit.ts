import AuditLog from "../models/AuditLog";
import { Types } from "mongoose";

interface AuditParams {
  userId: Types.ObjectId | string;
  action: string;
  resource: string;
  resourceId?: Types.ObjectId | string;
  facilityId?: Types.ObjectId | string;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string;
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await AuditLog.create(params);
  } catch (err) {
    // Auditing must never crash the primary operation, but we do not want it to fail silently either.
    console.error("[audit] failed to write audit log", err);
  }
}
