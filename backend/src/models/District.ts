import { Schema, model, Types } from "mongoose";

export interface IDistrict {
  _id: Types.ObjectId;
  name: string;
  code: string;
  centerLat: number;
  centerLng: number;
  population?: number;
}

const districtSchema = new Schema<IDistrict>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    centerLat: { type: Number, required: true },
    centerLng: { type: Number, required: true },
    population: { type: Number },
  },
  { timestamps: true }
);

export default model<IDistrict>("District", districtSchema);
