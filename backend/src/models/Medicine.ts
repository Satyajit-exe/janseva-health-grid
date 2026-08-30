import { Schema, model, Types } from "mongoose";
import { MEDICINE_STATUSES, MedicineStatus } from "../utils/constants";

export interface IMedicine {
  _id: Types.ObjectId;
  facilityId: Types.ObjectId;
  name: string;
  genericName: string;
  batchNumber: string;
  quantity: number;
  minimumThreshold: number;
  expiryDate: Date;
  status: MedicineStatus; // derived, recalculated on every mutation
  updatedAt: Date;
}

const medicineSchema = new Schema<IMedicine>(
  {
    facilityId: { type: Schema.Types.ObjectId, ref: "Facility", required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    genericName: { type: String, required: true, trim: true },
    batchNumber: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    minimumThreshold: { type: Number, required: true, default: 20 },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: MEDICINE_STATUSES, default: "AVAILABLE" },
  },
  { timestamps: true }
);

medicineSchema.index({ facilityId: 1, name: 1, batchNumber: 1 }, { unique: true });
medicineSchema.index({ name: "text", genericName: "text" });

export function computeMedicineStatus(m: Pick<IMedicine, "quantity" | "minimumThreshold" | "expiryDate">): MedicineStatus {
  if (m.expiryDate.getTime() < Date.now()) return "EXPIRED";
  if (m.quantity <= 0) return "OUT_OF_STOCK";
  if (m.quantity <= m.minimumThreshold) return "LOW_STOCK";
  return "AVAILABLE";
}

export default model<IMedicine>("Medicine", medicineSchema);
