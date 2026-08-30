import { Schema, model, Types } from "mongoose";
import { JOURNEY_STEPS, JourneyStep } from "../utils/constants";

export interface IJourneyEvent {
  step: JourneyStep;
  status: "PENDING" | "IN_PROGRESS" | "DONE" | "SKIPPED";
  facilityId?: Types.ObjectId;
  department?: string;
  timestamp: Date;
  notes?: string;
}

export interface ICareJourney {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  facilityId: Types.ObjectId;
  tokenId?: Types.ObjectId;
  referralId?: Types.ObjectId;
  events: IJourneyEvent[];
  isActive: boolean; // false once CARE_COMPLETED
  startedAt: Date;
  completedAt?: Date;
}

const journeyEventSchema = new Schema<IJourneyEvent>(
  {
    step: { type: String, enum: JOURNEY_STEPS, required: true },
    status: { type: String, enum: ["PENDING", "IN_PROGRESS", "DONE", "SKIPPED"], default: "PENDING" },
    facilityId: { type: Schema.Types.ObjectId, ref: "Facility" },
    department: { type: String },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { _id: false }
);

const careJourneySchema = new Schema<ICareJourney>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    facilityId: { type: Schema.Types.ObjectId, ref: "Facility", required: true },
    tokenId: { type: Schema.Types.ObjectId, ref: "QueueToken" },
    referralId: { type: Schema.Types.ObjectId, ref: "Referral" },
    events: { type: [journeyEventSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export default model<ICareJourney>("CareJourney", careJourneySchema);
