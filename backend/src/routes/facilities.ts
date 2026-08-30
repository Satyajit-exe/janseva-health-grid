import { Router } from "express";
import { z } from "zod";
import Facility from "../models/Facility";
import Department from "../models/Department";
import Queue from "../models/Queue";
import QueueToken from "../models/QueueToken";
import Bed from "../models/Bed";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { validateBody, validateQuery } from "../middleware/validate";
import { optionalAuth, requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";
import { computeAccessibilityScore, recalculateFacilityPressure } from "../services/pressureService";
import { writeAuditLog } from "../utils/audit";

const router = Router();

const searchSchema = z.object({
  q: z.string().optional(), // free text: name or service
  service: z.string().optional(),
  district: z.string().optional(),
  type: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  maxDistanceKm: z.coerce.number().optional(),
  language: z.string().optional(),
  sortBy: z.enum(["distance", "queue", "pressure"]).optional(),
});

/**
 * "FIND THE RIGHT CARE" - smart facility discovery.
 * Ranks by service match, distance, live queue length, and facility pressure.
 */
router.get(
  "/search",
  validateQuery(searchSchema),
  asyncHandler(async (req, res) => {
    const { q, service, district, type, lat, lng, maxDistanceKm, language } = req.query as any;

    const filter: Record<string, unknown> = { isActive: true };
    if (service) filter.services = { $regex: service, $options: "i" };
    if (district) filter.districtId = district;
    if (type) filter.type = type;
    if (language) filter.languagesSupported = { $regex: language, $options: "i" };

    let query = Facility.find(q ? { ...filter, $text: { $search: q } } : filter);

    if (lat !== undefined && lng !== undefined) {
      query = Facility.find({
        ...filter,
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [lng, lat] },
            $maxDistance: (maxDistanceKm || 50) * 1000,
          },
        },
      });
    }

    const facilities = await query.limit(50).lean();

    // Enrich each result with live queue length (General OPD, best-effort) for ranking/display.
    const enriched = await Promise.all(
      facilities.map(async (f) => {
        const today = new Date().toISOString().slice(0, 10);
        const queues = await Queue.find({ facilityId: f._id, date: today }).lean();
        const queueIds = queues.map((qq) => qq._id);
        const waitingCount = queueIds.length
          ? await QueueToken.countDocuments({ queueId: { $in: queueIds }, status: "WAITING" })
          : 0;

        let distanceKm: number | undefined;
        if (lat !== undefined && lng !== undefined) {
          distanceKm = haversineKm(lat, lng, f.location.coordinates[1], f.location.coordinates[0]);
        }

        return {
          ...f,
          liveQueueWaiting: waitingCount,
          distanceKm: distanceKm !== undefined ? Math.round(distanceKm * 10) / 10 : undefined,
        };
      })
    );

    enriched.sort((a, b) => {
      // Primary: pressure (lower is better), secondary: distance if known, then queue length.
      if (a.pressureScore !== b.pressureScore) return a.pressureScore - b.pressureScore;
      if (a.distanceKm !== undefined && b.distanceKm !== undefined && a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      return a.liveQueueWaiting - b.liveQueueWaiting;
    });

    res.json({ success: true, data: { facilities: enriched } });
  })
);

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const facility = await Facility.findById(req.params.id).populate("districtId").lean();
    if (!facility) throw new ApiError(404, "Facility not found");

    const departments = await Department.find({ facilityId: facility._id, isActive: true }).lean();
    const beds = await Bed.find({ facilityId: facility._id }).lean();

    const today = new Date().toISOString().slice(0, 10);
    const queues = await Queue.find({ facilityId: facility._id, date: today }).lean();
    const queuesWithCounts = await Promise.all(
      queues.map(async (qu) => ({
        ...qu,
        waiting: await QueueToken.countDocuments({ queueId: qu._id, status: "WAITING" }),
      }))
    );

    res.json({ success: true, data: { facility, departments, beds, queues: queuesWithCounts } });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const facilities = await Facility.find({ isActive: true }).lean();
    res.json({ success: true, data: { facilities } });
  })
);

const updateOperationalSchema = z.object({
  operatingHours: z.string().optional(),
  languagesSupported: z.array(z.string()).optional(),
  hasAccessibilityFacilities: z.boolean().optional(),
  services: z.array(z.string()).optional(),
  phone: z.string().optional(),
});

router.patch(
  "/:id/operational-info",
  requireAuth,
  requireRole("FACILITY_ADMIN", "FACILITY_STAFF", "DISTRICT_ADMIN", "STATE_ADMIN"),
  validateBody(updateOperationalSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const before = await Facility.findById(req.params.id).lean();
    if (!before) throw new ApiError(404, "Facility not found");

    const facility = await Facility.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!facility) throw new ApiError(404, "Facility not found");

    facility.accessibilityScore = computeAccessibilityScore({
      hasAccessibilityFacilities: facility.hasAccessibilityFacilities,
      languagesSupported: facility.languagesSupported,
      operatingHours: facility.operatingHours,
      servicesCount: facility.services.length,
    });
    await facility.save();

    await writeAuditLog({
      userId: req.user!.id,
      action: "FACILITY_OPERATIONAL_INFO_UPDATED",
      resource: "Facility",
      resourceId: facility._id,
      facilityId: facility._id,
      oldValue: before,
      newValue: req.body,
    });

    res.json({ success: true, data: { facility } });
  })
);

router.post(
  "/:id/recalculate-pressure",
  requireAuth,
  requireRole("FACILITY_STAFF", "FACILITY_ADMIN", "DISTRICT_ADMIN", "STATE_ADMIN"),
  asyncHandler(async (req, res) => {
    const score = await recalculateFacilityPressure(req.params.id);
    res.json({ success: true, data: { pressureScore: score } });
  })
);

export default router;
