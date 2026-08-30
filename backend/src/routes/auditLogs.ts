import { Router } from "express";
import AuditLog from "../models/AuditLog";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireRole("FACILITY_ADMIN", "DISTRICT_ADMIN", "STATE_ADMIN"),
  asyncHandler(async (req, res) => {
    const { facilityId, action, limit } = req.query as { facilityId?: string; action?: string; limit?: string };
    const filter: Record<string, unknown> = {};
    if (facilityId) filter.facilityId = facilityId;
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 100, 500))
      .populate("userId", "name email role");

    res.json({ success: true, data: { logs } });
  })
);

export default router;
