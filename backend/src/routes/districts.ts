import { Router } from "express";
import District from "../models/District";
import Facility from "../models/Facility";
import Bed from "../models/Bed";
import Medicine from "../models/Medicine";
import Referral from "../models/Referral";
import Queue from "../models/Queue";
import QueueToken from "../models/QueueToken";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const districts = await District.find().lean();
    res.json({ success: true, data: { districts } });
  })
);

/** DISTRICT HEALTH COMMAND CENTER aggregate. */
router.get(
  "/:id/command-center",
  requireAuth,
  requireRole("DISTRICT_ADMIN", "STATE_ADMIN"),
  asyncHandler(async (req, res) => {
    const district = await District.findById(req.params.id).lean();
    if (!district) throw new ApiError(404, "District not found");

    const facilities = await Facility.find({ districtId: district._id, isActive: true }).lean();
    const facilityIds = facilities.map((f) => f._id);

    const today = new Date().toISOString().slice(0, 10);
    const queues = await Queue.find({ facilityId: { $in: facilityIds }, date: today }).lean();
    const queueIds = queues.map((q) => q._id);
    const waitingTotal = queueIds.length ? await QueueToken.countDocuments({ queueId: { $in: queueIds }, status: "WAITING" }) : 0;
    const patientsToday = queueIds.length ? await QueueToken.countDocuments({ queueId: { $in: queueIds } }) : 0;

    const beds = await Bed.find({ facilityId: { $in: facilityIds } }).lean();
    const totalBeds = beds.reduce((s, b) => s + b.total, 0);
    const occupiedBeds = beds.reduce((s, b) => s + b.occupied, 0);

    const shortageMedicines = await Medicine.countDocuments({
      facilityId: { $in: facilityIds },
      status: { $in: ["LOW_STOCK", "OUT_OF_STOCK"] },
    });

    const activeReferrals = await Referral.countDocuments({
      $or: [{ sendingFacilityId: { $in: facilityIds } }, { receivingFacilityId: { $in: facilityIds } }],
      status: { $nin: ["COMPLETED", "CANCELLED", "REJECTED"] },
    });

    const avgWaitMinutes = queues.length
      ? Math.round(queues.reduce((s, q) => s + q.averageConsultationMinutes, 0) / queues.length)
      : 0;

    const highPressureFacilities = facilities
      .filter((f) => f.pressureLevel === "HIGH" || f.pressureLevel === "CRITICAL")
      .sort((a, b) => b.pressureScore - a.pressureScore);

    res.json({
      success: true,
      data: {
        district,
        kpis: {
          totalFacilities: facilities.length,
          patientsToday,
          waitingNow: waitingTotal,
          avgWaitMinutes,
          totalBeds,
          occupiedBeds,
          bedOccupancyPercent: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 1000) / 10 : 0,
          shortageMedicines,
          activeReferrals,
        },
        facilities,
        highPressureFacilities,
      },
    });
  })
);

export default router;
