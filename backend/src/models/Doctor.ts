import { Schema, model, Types } from "mongoose";

export interface IDoctor {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  facilityId: Types.ObjectId;
  departmentId: Types.ObjectId;
  name: string;
  specialty: string;
  isAvailableToday: boolean;
}

const doctorSchema = new Schema<IDoctor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    facilityId: { type: Schema.Types.ObjectId, ref: "Facility", required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    isAvailableToday: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model<IDoctor>("Doctor", doctorSchema);
