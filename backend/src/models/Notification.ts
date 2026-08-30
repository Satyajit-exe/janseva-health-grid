import { Schema, model, Types } from "mongoose";

export type NotificationType =
  | "TOKEN_GENERATED"
  | "QUEUE_APPROACHING"
  | "TOKEN_CALLED"
  | "APPOINTMENT_REMINDER"
  | "REFERRAL_ACCEPTED"
  | "REFERRAL_REJECTED"
  | "REFERRAL_PATIENT_ARRIVED"
  | "MEDICINE_LOW_STOCK"
  | "BED_STATUS_CHANGED"
  | "EMERGENCY_ALERT";

export interface INotification {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedFacilityId?: Types.ObjectId;
  isRead: boolean;
  // Architecture is integration-ready for SMS/WhatsApp; channel below reflects only what
  // this system actually delivers today (in-app), never a channel we haven't implemented.
  channel: "IN_APP";
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedFacilityId: { type: Schema.Types.ObjectId, ref: "Facility" },
    isRead: { type: Boolean, default: false },
    channel: { type: String, enum: ["IN_APP"], default: "IN_APP" },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default model<INotification>("Notification", notificationSchema);
