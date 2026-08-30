import { Schema, model, Types } from "mongoose";
import { PRIORITY_LEVELS, PriorityLevel, TOKEN_STATUSES, TokenStatus } from "../utils/constants";

export interface IQueueToken {
  _id: Types.ObjectId; // ObjectId is the real unique identity; tokenCode is only a display label
  queueId: Types.ObjectId;
  facilityId: Types.ObjectId;
  departmentId: Types.ObjectId;
  patientId: Types.ObjectId;
  tokenCode: string; // e.g. "A-057" - human friendly, NOT relied on for uniqueness alone
  sequenceNumber: number; // position in today's queue for this department
  status: TokenStatus;
  priority: PriorityLevel;
  priorityReason?: string;
  priorityAssignedBy?: Types.ObjectId;
  checkedInAt?: Date;
  calledAt?: Date;
  consultationStartedAt?: Date;
  completedAt?: Date;
}

const queueTokenSchema = new Schema<IQueueToken>(
  {
    queueId: { type: Schema.Types.ObjectId, ref: "Queue", required: true, index: true },
    facilityId: { type: Schema.Types.ObjectId, ref: "Facility", required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenCode: { type: String, required: true },
    sequenceNumber: { type: Number, required: true },
    status: { type: String, enum: TOKEN_STATUSES, default: "WAITING", index: true },
    priority: { type: String, enum: PRIORITY_LEVELS, default: "NORMAL" },
    priorityReason: { type: String },
    priorityAssignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    checkedInAt: { type: Date },
    calledAt: { type: Date },
    consultationStartedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

queueTokenSchema.index({ queueId: 1, sequenceNumber: 1 });
queueTokenSchema.index({ queueId: 1, status: 1 });

export default model<IQueueToken>("QueueToken", queueTokenSchema);
