import { Schema, model, Types } from "mongoose";

export interface IDepartment {
  _id: Types.ObjectId;
  facilityId: Types.ObjectId;
  name: string; // e.g. "General OPD", "Cardiology"
  averageConsultationMinutes: number;
  isActive: boolean;
}

const departmentSchema = new Schema<IDepartment>(
  {
    facilityId: { type: Schema.Types.ObjectId, ref: "Facility", required: true, index: true },
    name: { type: String, required: true },
    averageConsultationMinutes: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

departmentSchema.index({ facilityId: 1, name: 1 }, { unique: true });

export default model<IDepartment>("Department", departmentSchema);
