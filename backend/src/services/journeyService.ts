import CareJourney, { IJourneyEvent } from "../models/CareJourney";
import { JourneyStep } from "../utils/constants";
import { Types } from "mongoose";
import { emit } from "../sockets";

const STEP_ORDER: JourneyStep[] = [
  "SEARCHED_FACILITY",
  "SELECTED_SERVICE",
  "DIGITAL_TOKEN",
  "CHECK_IN",
  "WAITING",
  "DOCTOR_CONSULTATION",
  "MEDICINE",
  "REFERRAL_FOLLOWUP",
  "CARE_COMPLETED",
];

function blankTimeline(): IJourneyEvent[] {
  return STEP_ORDER.map((step) => ({ step, status: "PENDING", timestamp: new Date() }));
}

export async function startJourney(params: {
  patientId: Types.ObjectId | string;
  facilityId: Types.ObjectId | string;
  tokenId?: Types.ObjectId | string;
}) {
  // Deactivate any previous active journeys for this patient
  await CareJourney.updateMany({ patientId: params.patientId, isActive: true }, { isActive: false });

  const journey = await CareJourney.create({
    patientId: params.patientId,
    facilityId: params.facilityId,
    tokenId: params.tokenId,
    events: blankTimeline(),
    isActive: true,
  });

  await advanceJourney(journey._id, "SEARCHED_FACILITY", "DONE");
  await advanceJourney(journey._id, "SELECTED_SERVICE", "DONE");
  if (params.tokenId) await advanceJourney(journey._id, "DIGITAL_TOKEN", "DONE");

  return journey;
}

export async function advanceJourney(
  journeyId: Types.ObjectId | string,
  step: JourneyStep,
  status: "PENDING" | "IN_PROGRESS" | "DONE" | "SKIPPED",
  extra?: { facilityId?: Types.ObjectId | string; department?: string; notes?: string }
) {
  const journey = await CareJourney.findById(journeyId);
  if (!journey) return null;

  const event = journey.events.find((e) => e.step === step);
  if (event) {
    event.status = status;
    event.timestamp = new Date();
    if (extra?.facilityId) event.facilityId = new Types.ObjectId(extra.facilityId);
    if (extra?.department) event.department = extra.department;
    if (extra?.notes) event.notes = extra.notes;
  }

  if (step === "CARE_COMPLETED" && status === "DONE") {
    journey.isActive = false;
    journey.completedAt = new Date();
  }

  await journey.save();

  emit.toUser(String(journey.patientId), "care-journey:updated", journey.toObject());

  return journey;
}

export async function getActiveJourneyForPatient(patientId: Types.ObjectId | string) {
  return CareJourney.findOne({ patientId, isActive: true }).sort({ createdAt: -1 });
}

export async function getJourneyHistory(patientId: Types.ObjectId | string) {
  return CareJourney.find({ patientId }).sort({ createdAt: -1 });
}
