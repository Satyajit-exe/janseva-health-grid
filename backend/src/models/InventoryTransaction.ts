import { Schema, model, Types } from "mongoose";

export interface IInventoryTransaction {
  _id: Types.ObjectId;
  medicineId: Types.ObjectId;
  facilityId: Types.ObjectId;
  type: "STOCK_IN" | "STOCK_OUT" | "DISPENSED" | "ADJUSTMENT";
  quantityChange: number; // positive or negative
  reason?: string;
  performedBy: Types.ObjectId;
}

const inventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true, index: true },
    facilityId: { type: Schema.Types.ObjectId, ref: "Facility", required: true, index: true },
    type: { type: String, enum: ["STOCK_IN", "STOCK_OUT", "DISPENSED", "ADJUSTMENT"], required: true },
    quantityChange: { type: Number, required: true },
    reason: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default model<IInventoryTransaction>("InventoryTransaction", inventoryTransactionSchema);
