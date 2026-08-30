import { Router } from "express";
import { z } from "zod";
import Referral from "../models/Referral";
import Facility from "../models/Facility";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { validateBody, validateQuery } from "../middleware/validate";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";
import { PRIORITY_LEVELS } from "../utils/constants";
import { emit } from "../sockets";
import { writeAuditLog } from "../utils/audit";
import { notifyUser } from "../services/notificationService";
import { recalculateFacilityPressure } from "../services/pressureService";
import { advanceJourney } from "../services/journeyService";
import CareJourney from "../models/CareJourney";

const router = Router();

const recommendSchema = z.object({
  facilityId: z.string(),
  specialty: z.string().min(1),
});

/**
 * Referral intelligence: suggests nearby facilities for a specialty, ranked by
 * distance, pressure, and (roughly) bed/service availability. Decision support only -
 * the doctor still explicitly creates the referral.
 */
router.get(
  "/recommend",
  requireAuth,
  requireRole("DOCTOR"),
  validateQuery(recommendSchema),
  asyncHandler(async (req, res) => {
    const { facilityId, specialty } = req.query as any;
    const origin = await Facility.findById(facilityId).lean();
    if (!origin) throw new ApiError(404, "Sending facility not found");

    const candidates = await Facility.find({
      _id: { $ne: facilityId },
      isActive: true,
      services: { $regex: specialty, $options: "i" },
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: origin.location.coordinates },
          $maxDistance: 1500000,
        },
      },
    })
      .limit(10)
      .lean();

    const ranked = candidates
      .map((c) => ({
        facility: c,
        // Lower is better: pressure dominates, tie-broken implicitly by Mongo's distance-sorted order.
        rankScore: c.pressureScore,
      }))
      .sort((a, b) => a.rankScore - b.rankScore);

    res.json({ success: true, data: { recommendations: ranked } });
  })
);

const createReferralSchema = z.object({
  patientId: z.string(),
  sendingFacilityId: z.string(),
  receivingFacilityId: z.string(),
  departmentOrSpecialty: z.string().min(1),
  reason: z.string().min(3),
  priority: z.enum(PRIORITY_LEVELS).default("NORMAL"),
});

router.post(
  "/",
  requireAuth,
  requireRole("DOCTOR"),
  validateBody(createReferralSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referral = await Referral.create({ ...req.body, status: "SENT", createdBy: req.user!.id });

    emit.toFacility(String(referral.receivingFacilityId), "referral:updated", { referral: referral.toObject() });

    await writeAuditLog({
      userId: req.user!.id,
      action: "REFERRAL_CREATED",
      resource: "Referral",
      resourceId: referral._id,
      facilityId: referral.sendingFacilityId,
      newValue: referral.toObject(),
    });

    const journey = await CareJourney.findOne({ patientId: referral.patientId, isActive: true });
    if (journey) {
      journey.referralId = referral._id;
      await journey.save();
      await advanceJourney(journey._id, "REFERRAL_FOLLOWUP", "IN_PROGRESS", {
        facilityId: referral.receivingFacilityId,
        notes: `Referred for ${referral.departmentOrSpecialty}`,
      });
    }

    await notifyUser({
      userId: String(referral.patientId),
      type: "REFERRAL_ACCEPTED", // reused type family; message clarifies actual state
      title: "Referral created",
      message: `You've been referred for ${referral.departmentOrSpecialty}. You'll be notified once the receiving facility responds.`,
      relatedFacilityId: referral.receivingFacilityId,
    });

    res.status(201).json({ success: true, data: { referral } });
  })
);

router.get(
  "/facility/:facilityId/inbound",
  requireAuth,
  requireRole("FACILITY_STAFF", "FACILITY_ADMIN", "DOCTOR"),
  asyncHandler(async (req, res) => {
    const referrals = await Referral.find({ receivingFacilityId: req.params.facilityId })
      .sort({ createdAt: -1 })
      .populate("patientId sendingFacilityId");
    res.json({ success: true, data: { referrals } });
  })
);

router.get(
  "/mine",
  requireAuth,
  requireRole("CITIZEN"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referrals = await Referral.find({ patientId: req.user!.id })
      .sort({ createdAt: -1 })
      .populate("sendingFacilityId receivingFacilityId");
    res.json({ success: true, data: { referrals } });
  })
);

async function transition(referralId: string, updates: Record<string, unknown>, action: string, userId: string) {
  const before = await Referral.findById(referralId).lean();
  if (!before) throw new ApiError(404, "Referral not found");

  const referral = await Referral.findByIdAndUpdate(referralId, updates, { new: true });
  if (!referral) throw new ApiError(404, "Referral not found");

  emit.toFacility(String(referral.sendingFacilityId), "referral:updated", { referral: referral.toObject() });
  emit.toFacility(String(referral.receivingFacilityId), "referral:updated", { referral: referral.toObject() });

  await writeAuditLog({
    userId,
    action,
    resource: "Referral",
    resourceId: referral._id,
    facilityId: referral.receivingFacilityId,
    oldValue: before,
    newValue: referral.toObject(),
  });

  await recalculateFacilityPressure(String(referral.receivingFacilityId));

  return referral;
}

router.post(
  "/:id/accept",
  requireAuth,
  requireRole("FACILITY_STAFF", "FACILITY_ADMIN", "DOCTOR"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referral = await transition(req.params.id, { status: "ACCEPTED", acceptedAt: new Date() }, "REFERRAL_ACCEPTED", req.user!.id);
    await notifyUser({
      userId: String(referral.patientId),
      type: "REFERRAL_ACCEPTED",
      title: "Referral accepted",
      message: "The receiving facility has accepted your referral. Please proceed as advised by your doctor.",
      relatedFacilityId: referral.receivingFacilityId,
    });
    res.json({ success: true, data: { referral } });
  })
);

const rejectSchema = z.object({ rejectionReason: z.string().min(3) });

router.post(
  "/:id/reject",
  requireAuth,
  requireRole("FACILITY_STAFF", "FACILITY_ADMIN", "DOCTOR"),
  validateBody(rejectSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referral = await transition(
      req.params.id,
      { status: "REJECTED", rejectedAt: new Date(), rejectionReason: req.body.rejectionReason },
      "REFERRAL_REJECTED",
      req.user!.id
    );
    await notifyUser({
      userId: String(referral.patientId),
      type: "REFERRAL_REJECTED",
      title: "Referral could not be accepted",
      message: `Reason: ${referral.rejectionReason}. Your doctor will advise on next steps.`,
      relatedFacilityId: referral.receivingFacilityId,
    });
    res.json({ success: true, data: { referral } });
  })
);

router.post(
  "/:id/patient-arrived",
  requireAuth,
  requireRole("FACILITY_STAFF", "FACILITY_ADMIN"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referral = await transition(req.params.id, { status: "PATIENT_ARRIVED", patientArrivedAt: new Date() }, "REFERRAL_PATIENT_ARRIVED", req.user!.id);
    res.json({ success: true, data: { referral } });
  })
);

router.post(
  "/:id/treatment-start",
  requireAuth,
  requireRole("DOCTOR", "FACILITY_STAFF"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referral = await transition(req.params.id, { status: "UNDER_CARE", treatmentStartedAt: new Date() }, "REFERRAL_TREATMENT_STARTED", req.user!.id);
    res.json({ success: true, data: { referral } });
  })
);

router.post(
  "/:id/complete",
  requireAuth,
  requireRole("DOCTOR", "FACILITY_STAFF"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referral = await transition(req.params.id, { status: "COMPLETED", completedAt: new Date() }, "REFERRAL_COMPLETED", req.user!.id);

    const journey = await CareJourney.findOne({ patientId: referral.patientId, referralId: referral._id });
    if (journey) {
      await advanceJourney(journey._id, "REFERRAL_FOLLOWUP", "DONE");
      await advanceJourney(journey._id, "CARE_COMPLETED", "DONE");
    }

    res.json({ success: true, data: { referral } });
  })
);

export default router;
