import { Router } from "express";
import Facility from "../models/Facility";
import District from "../models/District";
import Bed from "../models/Bed";
import Medicine from "../models/Medicine";
import Referral from "../models/Referral";
import Queue from "../models/Queue";
import QueueToken from "../models/QueueToken";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

/** STATE COMMAND CENTER (section 28). Maharashtra-level KPIs + district comparison table. */
router.get(
  "/state",
  requireAuth,
  requireRole("STATE_ADMIN"),
  asyncHandler(async (req, res) => {
    const facilities = await Facility.find({ isActive: true }).lean();
    const districts = await District.find().lean();

    const beds = await Bed.find().lean();
    const totalBeds = beds.reduce((s, b) => s + b.total, 0);
    const occupiedBeds = beds.reduce((s, b) => s + b.occupied, 0);

    const today = new Date().toISOString().slice(0, 10);
    const queues = await Queue.find({ date: today }).lean();
    const queueIds = queues.map((q) => q._id);
    const patientsServedToday = queueIds.length
      ? await QueueToken.countDocuments({ queueId: { $in: queueIds }, status: "COMPLETED" })
      : 0;
    const avgWaitMinutes = queues.length
      ? Math.round(queues.reduce((s, q) => s + q.averageConsultationMinutes, 0) / queues.length)
      : 0;

    const shortageFacilities = await Medicine.distinct("facilityId", { status: { $in: ["LOW_STOCK", "OUT_OF_STOCK"] } });
    const referralVolume = await Referral.countDocuments();
    const criticalFacilities = facilities.filter((f) => f.pressureLevel === "CRITICAL");

    const districtComparison = await Promise.all(
      districts.map(async (d) => {
        const districtFacilities = facilities.filter((f) => String(f.districtId) === String(d._id));
        const fIds = districtFacilities.map((f) => f._id);
        const districtBeds = beds.filter((b) => fIds.some((id) => String(id) === String(b.facilityId)));
        const dTotalBeds = districtBeds.reduce((s, b) => s + b.total, 0);
        const dOccupiedBeds = districtBeds.reduce((s, b) => s + b.occupied, 0);
        const dReferrals = await Referral.countDocuments({ sendingFacilityId: { $in: fIds } });
        const avgPressure = districtFacilities.length
          ? Math.round(districtFacilities.reduce((s, f) => s + f.pressureScore, 0) / districtFacilities.length)
          : 0;

        return {
          districtId: d._id,
          districtName: d.name,
          facilities: districtFacilities.length,
          bedOccupancyPercent: dTotalBeds > 0 ? Math.round((dOccupiedBeds / dTotalBeds) * 1000) / 10 : 0,
          avgPressure,
          referrals: dReferrals,
        };
      })
    );

    res.json({
      success: true,
      data: {
        kpis: {
          totalFacilities: facilities.length,
          patientsServedToday,
          avgWaitMinutes,
          totalBeds,
          occupiedBeds,
          bedOccupancyPercent: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 1000) / 10 : 0,
          shortageFacilityCount: shortageFacilities.length,
          referralVolume,
          criticalFacilityCount: criticalFacilities.length,
        },
        districtComparison,
        facilities,
      },
    });
  })
);

/**
 * PUBLIC TRANSPARENCY MODE (section 29): read-only, no auth required, no patient identities.
 * Only operational/aggregate information is exposed.
 */
router.get(
  "/public",
  asyncHandler(async (req, res) => {
    const facilities = await Facility.find({ isActive: true })
      .select("name type districtId address location services pressureLevel pressureScore accessibilityScore operationalUpdatedAt")
      .lean();

    res.json({ success: true, data: { facilities } });
  })
);

export default router;
