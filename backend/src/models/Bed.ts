import { Schema, model, Types } from "mongoose";
import { BED_CATEGORIES, BedCategory } from "../utils/constants";

export interface IBed {
  _id: Types.ObjectId;
  facilityId: Types.ObjectId;
  category: BedCategory;
  total: number;
  occupied: number;
  reserved: number;
  cleaning: number;
  updatedAt: Date;
  updatedBy?: Types.ObjectId;
}

const bedSchema = new Schema<IBed>(
  {
    facilityId: { type: Schema.Types.ObjectId, ref: "Facility", required: true, index: true },
    category: { type: String, enum: BED_CATEGORIES, required: true },
    total: { type: Number, required: true, min: 0 },
    occupied: { type: Number, required: true, min: 0, default: 0 },
    reserved: { type: Number, required: true, min: 0, default: 0 },
    cleaning: { type: Number, required: true, min: 0, default: 0 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

bedSchema.index({ facilityId: 1, category: 1 }, { unique: true });

export default model<IBed>("Bed", bedSchema);
