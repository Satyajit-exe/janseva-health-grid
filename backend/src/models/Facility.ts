import { Schema, model, Types } from "mongoose";
import { FACILITY_TYPES, FacilityType, PRESSURE_LEVELS, PressureLevel } from "../utils/constants";

export interface IFacility {
  _id: Types.ObjectId;
  name: string;
  type: FacilityType;
  districtId: Types.ObjectId;
  address: string;
  location: { type: "Point"; coordinates: [number, number] }; // [lng, lat]
  services: string[]; // e.g. ["OPD", "Emergency", "Cardiology"]
  languagesSupported: string[];
  operatingHours: string;
  hasAccessibilityFacilities: boolean;
  phone: string;
  // Live/derived operational snapshot (updated by services, not hand-edited by clients directly)
  pressureScore: number; // 0-100
  pressureLevel: PressureLevel;
  accessibilityScore: number; // 0-100
  operationalUpdatedAt: Date;
  isActive: boolean;
}

const facilitySchema = new Schema<IFacility>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: FACILITY_TYPES, required: true },
    districtId: { type: Schema.Types.ObjectId, ref: "District", required: true, index: true },
    address: { type: String, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    services: { type: [String], default: [] },
    languagesSupported: { type: [String], default: ["English"] },
    operatingHours: { type: String, default: "24x7" },
    hasAccessibilityFacilities: { type: Boolean, default: false },
    phone: { type: String, default: "" },
    pressureScore: { type: Number, default: 0, min: 0, max: 100 },
    pressureLevel: { type: String, enum: PRESSURE_LEVELS, default: "LOW" },
    accessibilityScore: { type: Number, default: 50, min: 0, max: 100 },
    operationalUpdatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

facilitySchema.index({ location: "2dsphere" });
facilitySchema.index({ name: "text", services: "text" });
facilitySchema.index({ districtId: 1, type: 1 });

export default model<IFacility>("Facility", facilitySchema);
