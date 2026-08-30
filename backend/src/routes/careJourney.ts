import { Router } from "express";
import CareJourney from "../models/CareJourney";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";
import { getActiveJourneyForPatient, getJourneyHistory, advanceJourney } from "../services/journeyService";
import { z } from "zod";
import { validateBody } from "../middleware/validate";
import { JOURNEY_STEPS } from "../utils/constants";

const router = Router();

router.get(
  "/active",
  requireAuth,
  requireRole("CITIZEN"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const journey = await getActiveJourneyForPatient(req.user!.id);
    res.json({ success: true, data: { journey } });
  })
);

router.get(
  "/history",
  requireAuth,
  requireRole("CITIZEN"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const journeys = await getJourneyHistory(req.user!.id);
    res.json({ success: true, data: { journeys } });
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const journey = await CareJourney.findById(req.params.id);
    if (!journey) throw new ApiError(404, "Journey not found");
    res.json({ success: true, data: { journey } });
  })
);

const advanceSchema = z.object({
  step: z.enum(JOURNEY_STEPS),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE", "SKIPPED"]),
  notes: z.string().optional(),
});

// Used by clinical/facility staff to advance steps (e.g. DOCTOR_CONSULTATION, MEDICINE)
// that citizens themselves don't directly control.
router.post(
  "/:id/advance",
  requireAuth,
  requireRole("DOCTOR", "FACILITY_STAFF", "PHARMACY_STAFF"),
  validateBody(advanceSchema),
  asyncHandler(async (req, res) => {
    const journey = await advanceJourney(req.params.id, req.body.step, req.body.status, { notes: req.body.notes });
    if (!journey) throw new ApiError(404, "Journey not found");
    res.json({ success: true, data: { journey } });
  })
);

export default router;
