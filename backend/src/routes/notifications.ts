import { Router } from "express";
import Notification from "../models/Notification";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const notifications = await Notification.find({ userId: req.user!.id }).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ userId: req.user!.id, isRead: false });
    res.json({ success: true, data: { notifications, unreadCount } });
  })
);

router.post(
  "/:id/read",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      { isRead: true },
      { new: true }
    );
    res.json({ success: true, data: { notification } });
  })
);

router.post(
  "/read-all",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await Notification.updateMany({ userId: req.user!.id, isRead: false }, { isRead: true });
    res.json({ success: true, data: {} });
  })
);

export default router;
