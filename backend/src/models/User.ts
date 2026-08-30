import { Schema, model, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, Role } from "../utils/constants";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: Role;
  facilityId?: Types.ObjectId; // required for FACILITY_STAFF / DOCTOR / PHARMACY_STAFF / FACILITY_ADMIN
  districtId?: Types.ObjectId; // required for DISTRICT_ADMIN
  preferredLanguage: string;
  savedFacilityIds: Types.ObjectId[];
  isActive: boolean;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: "CITIZEN" },
    facilityId: { type: Schema.Types.ObjectId, ref: "Facility" },
    districtId: { type: Schema.Types.ObjectId, ref: "District" },
    preferredLanguage: { type: String, default: "en" },
    savedFacilityIds: [{ type: Schema.Types.ObjectId, ref: "Facility" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

export default model<IUser>("User", userSchema);
