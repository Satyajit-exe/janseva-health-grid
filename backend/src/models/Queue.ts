import { Schema, model, Types } from "mongoose";

export interface IQueue {
  _id: Types.ObjectId;
  facilityId: Types.ObjectId;
  departmentId: Types.ObjectId;
  doctorId?: Types.ObjectId;
  date: string; // YYYY-MM-DD, queues reset daily
  currentTokenNumber: number; // last called token sequence number
  lastTokenNumber: number; // last generated token sequence number
  averageConsultationMinutes: number;
  isActive: boolean;
}

const queueSchema = new Schema<IQueue>(
  {
    facilityId: { type: Schema.Types.ObjectId, ref: "Facility", required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor" },
    date: { type: String, required: true },
    currentTokenNumber: { type: Number, default: 0 },
    lastTokenNumber: { type: Number, default: 0 },
    averageConsultationMinutes: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

queueSchema.index({ facilityId: 1, departmentId: 1, doctorId: 1, date: 1 }, { unique: true });

export default model<IQueue>("Queue", queueSchema);
