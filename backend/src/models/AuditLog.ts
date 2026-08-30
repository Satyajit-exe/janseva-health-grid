import { Schema, model, Types } from "mongoose";

export interface IAuditLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  action: string; // e.g. "BED_UPDATED", "REFERRAL_ACCEPTED", "PRIORITY_CHANGED"
  resource: string; // e.g. "Bed", "Referral"
  resourceId?: Types.ObjectId;
  facilityId?: Types.ObjectId;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true },
    resourceId: { type: Schema.Types.ObjectId },
    facilityId: { type: Schema.Types.ObjectId, ref: "Facility" },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default model<IAuditLog>("AuditLog", auditLogSchema);
