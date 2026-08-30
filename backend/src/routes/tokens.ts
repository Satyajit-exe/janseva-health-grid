import { Router } from "express";
import { z } from "zod";
import QueueToken from "../models/QueueToken";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validate";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";
import { generateToken, getTokenStatus, checkInToken } from "../services/queueService";
import { startJourney, advanceJourney } from "../services/journeyService";

const router = Router();

const createTokenSchema = z.object({
  facilityId: z.string(),
  departmentId: z.string(),
  doctorId: z.string().optional(),
});

router.post(
  "/",
  requireAuth,
  requireRole("CITIZEN"),
  validateBody(createTokenSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { facilityId, departmentId, doctorId } = req.body;
    const { token, queue, wait } = await generateToken({
      facilityId,
      departmentId,
      doctorId,
      patientId: req.user!.id,
    });

    const journey = await startJourney({ patientId: req.user!.id, facilityId, tokenId: token._id });

    res.status(201).json({ success: true, data: { token, queue, wait, journeyId: journey._id } });
  })
);

router.get(
  "/mine",
  requireAuth,
  requireRole("CITIZEN"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tokens = await QueueToken.find({ patientId: req.user!.id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, data: { tokens } });
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { token, queue, wait } = await getTokenStatus(req.params.id);
    res.json({ success: true, data: { token, queue, wait } });
  })
);

router.post(
  "/:id/check-in",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const token = await checkInToken(req.params.id);

    // Best-effort: advance the patient's active journey to CHECK_IN / WAITING.
    const CareJourney = (await import("../models/CareJourney")).default;
    const journey = await CareJourney.findOne({ patientId: req.user!.id, tokenId: token._id, isActive: true });
    if (journey) {
      await advanceJourney(journey._id, "CHECK_IN", "DONE");
      await advanceJourney(journey._id, "WAITING", "IN_PROGRESS");
    }

    res.json({ success: true, data: { token } });
  })
);

export default router;

// Basic runtime guard: statuses list is re-exported so the frontend type layer can stay in sync
// without duplicating the enum definition by hand.
export function _tokenStatuses() {
  return ["WAITING", "CALLED", "IN_CONSULTATION", "COMPLETED", "SKIPPED", "NO_SHOW", "CANCELLED"];
}
