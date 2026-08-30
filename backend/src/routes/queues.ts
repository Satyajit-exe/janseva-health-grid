import { Router } from "express";
import { z } from "zod";
import Queue from "../models/Queue";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validate";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";
import {
  callNext,
  markCompleted,
  markConsultationStarted,
  markSkippedOrNoShow,
  setPriority,
  listQueueTokens,
} from "../services/queueService";
import { estimateWaitMinutes } from "../services/waitTimeService";
import { PRIORITY_LEVELS } from "../utils/constants";

const router = Router();

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const queue = await Queue.findById(req.params.id).lean();
    if (!queue) throw new ApiError(404, "Queue not found");
    const tokens = await listQueueTokens(req.params.id);
    res.json({ success: true, data: { queue, tokens } });
  })
);

router.post(
  "/:id/call-next",
  requireAuth,
  requireRole("FACILITY_STAFF", "DOCTOR", "FACILITY_ADMIN"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const token = await callNext(req.params.id, req.user!.id);
    res.json({ success: true, data: { token } });
  })
);

router.post(
  "/tokens/:tokenId/consultation-start",
  requireAuth,
  requireRole("DOCTOR", "FACILITY_STAFF"),
  asyncHandler(async (req, res) => {
    const token = await markConsultationStarted(req.params.tokenId);

    // Synchronize care journey: WAITING -> DONE, DOCTOR_CONSULTATION -> IN_PROGRESS
    const CareJourney = (await import("../models/CareJourney")).default;
    const journey = await CareJourney.findOne({ tokenId: token._id, isActive: true });
    if (journey) {
      const { advanceJourney } = await import("../services/journeyService");
      // Auto-complete preceding CHECK_IN step if it was pending
      const checkInEvent = journey.events.find(e => e.step === "CHECK_IN");
      if (checkInEvent && checkInEvent.status === "PENDING") {
        await advanceJourney(journey._id, "CHECK_IN", "DONE");
      }
      await advanceJourney(journey._id, "WAITING", "DONE");
      await advanceJourney(journey._id, "DOCTOR_CONSULTATION", "IN_PROGRESS");
    }

    res.json({ success: true, data: { token } });
  })
);

router.post(
  "/tokens/:tokenId/complete",
  requireAuth,
  requireRole("DOCTOR", "FACILITY_STAFF"),
  asyncHandler(async (req, res) => {
    const token = await markCompleted(req.params.tokenId);

    // Synchronize care journey: DOCTOR_CONSULTATION -> DONE, CARE_COMPLETED -> DONE (if no referral)
    const CareJourney = (await import("../models/CareJourney")).default;
    const journey = await CareJourney.findOne({ tokenId: token._id, isActive: true });
    if (journey) {
      const { advanceJourney } = await import("../services/journeyService");
      await advanceJourney(journey._id, "DOCTOR_CONSULTATION", "DONE");
      if (!journey.referralId) {
        await advanceJourney(journey._id, "CARE_COMPLETED", "DONE");
      }
    }

    res.json({ success: true, data: { token } });
  })
);

router.post(
  "/tokens/:tokenId/skip",
  requireAuth,
  requireRole("FACILITY_STAFF", "DOCTOR"),
  asyncHandler(async (req, res) => {
    const token = await markSkippedOrNoShow(req.params.tokenId, "SKIPPED");
    res.json({ success: true, data: { token } });
  })
);

router.post(
  "/tokens/:tokenId/no-show",
  requireAuth,
  requireRole("FACILITY_STAFF", "DOCTOR"),
  asyncHandler(async (req, res) => {
    const token = await markSkippedOrNoShow(req.params.tokenId, "NO_SHOW");
    res.json({ success: true, data: { token } });
  })
);

const prioritySchema = z.object({
  priority: z.enum(PRIORITY_LEVELS),
  reason: z.string().min(3),
});

// Never allow ordinary citizens to manipulate priority - restricted to clinical/facility staff.
router.post(
  "/tokens/:tokenId/priority",
  requireAuth,
  requireRole("DOCTOR", "FACILITY_STAFF", "FACILITY_ADMIN"),
  validateBody(prioritySchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const token = await setPriority({
      tokenId: req.params.tokenId,
      priority: req.body.priority,
      reason: req.body.reason,
      staffUserId: req.user!.id,
    });
    res.json({ success: true, data: { token } });
  })
);

router.get(
  "/tokens/:tokenId/wait",
  asyncHandler(async (req, res) => {
    const QueueToken = (await import("../models/QueueToken")).default;
    const token = await QueueToken.findById(req.params.tokenId);
    if (!token) throw new ApiError(404, "Token not found");
    const queue = await Queue.findById(token.queueId);
    if (!queue) throw new ApiError(404, "Queue not found");
    const wait = await estimateWaitMinutes(queue, token.sequenceNumber);
    res.json({ success: true, data: { token, queue, wait } });
  })
);

export default router;
