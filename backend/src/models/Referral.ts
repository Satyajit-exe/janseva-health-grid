import { Schema, model, Types } from "mongoose";
import { PRIORITY_LEVELS, PriorityLevel, REFERRAL_STATUSES, ReferralStatus } from "../utils/constants";

export interface IReferral {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  sendingFacilityId: Types.ObjectId;
  receivingFacilityId: Types.ObjectId;
  departmentOrSpecialty: string;
  reason: string;
  priority: PriorityLevel;
  status: ReferralStatus;
  createdBy: Types.ObjectId; // doctor
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  patientArrivedAt?: Date;
  treatmentStartedAt?: Date;
  completedAt?: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sendingFacilityId: { type: Schema.Types.ObjectId, ref: "Facility", required: true, index: true },
    receivingFacilityId: { type: Schema.Types.ObjectId, ref: "Facility", required: true, index: true },
    departmentOrSpecialty: { type: String, required: true },
    reason: { type: String, required: true },
    priority: { type: String, enum: PRIORITY_LEVELS, default: "NORMAL" },
    status: { type: String, enum: REFERRAL_STATUSES, default: "CREATED", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    patientArrivedAt: { type: Date },
    treatmentStartedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export default model<IReferral>("Referral", referralSchema);
