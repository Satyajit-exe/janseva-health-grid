import Notification, { NotificationType } from "../models/Notification";
import { emit } from "../sockets";
import { Types } from "mongoose";

export async function notifyUser(params: {
  userId: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  relatedFacilityId?: Types.ObjectId | string;
}) {
  const notification = await Notification.create({
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    relatedFacilityId: params.relatedFacilityId,
  });

  emit.toUser(String(params.userId), "notification:new", notification.toObject());

  return notification;
}
