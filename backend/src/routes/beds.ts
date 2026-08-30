import { Router } from "express";
import { z } from "zod";
import Bed from "../models/Bed";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validate";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";
import { BED_CATEGORIES } from "../utils/constants";
import { recalculateFacilityPressure } from "../services/pressureService";
import { emit } from "../sockets";
import { writeAuditLog } from "../utils/audit";
import { notifyUser } from "../services/notificationService";

const router = Router();

router.get(
  "/facility/:facilityId",
  asyncHandler(async (req, res) => {
    const beds = await Bed.find({ facilityId: req.params.facilityId }).lean();
    res.json({
      success: true,
      data: {
        beds: beds.map((b) => ({
          ...b,
          available: Math.max(0, b.total - b.occupied - b.reserved - b.cleaning),
          occupancyPercent: b.total > 0 ? Math.round((b.occupied / b.total) * 1000) / 10 : 0,
        })),
      },
    });
  })
);

const updateBedSchema = z.object({
  category: z.enum(BED_CATEGORIES),
  total: z.number().int().min(0).optional(),
  occupied: z.number().int().min(0).optional(),
  reserved: z.number().int().min(0).optional(),
  cleaning: z.number().int().min(0).optional(),
});

router.put(
  "/facility/:facilityId",
  requireAuth,
  requireRole("FACILITY_STAFF", "FACILITY_ADMIN"),
  validateBody(updateBedSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { category, ...updates } = req.body;

    const before = await Bed.findOne({ facilityId: req.params.facilityId, category }).lean();

    const bed = await Bed.findOneAndUpdate(
      { facilityId: req.params.facilityId, category },
      { ...updates, updatedBy: req.user!.id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (bed.occupied + bed.reserved + bed.cleaning > bed.total) {
      throw new ApiError(400, "Occupied + reserved + cleaning cannot exceed total beds");
    }

    await writeAuditLog({
      userId: req.user!.id,
      action: "BED_STATUS_UPDATED",
      resource: "Bed",
      resourceId: bed._id,
      facilityId: bed.facilityId,
      oldValue: before,
      newValue: bed.toObject(),
    });

    emit.toFacility(String(bed.facilityId), "bed:updated", { bed: bed.toObject() });
    await recalculateFacilityPressure(String(bed.facilityId));

    res.json({ success: true, data: { bed } });
  })
);

export default router;
