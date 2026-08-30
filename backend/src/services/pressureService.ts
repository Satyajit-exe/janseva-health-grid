import Facility from "../models/Facility";
import Bed from "../models/Bed";
import QueueToken from "../models/QueueToken";
import Queue from "../models/Queue";
import Doctor from "../models/Doctor";
import Referral from "../models/Referral";
import { pressureLevelFromScore } from "../utils/constants";
import { emit } from "../sockets";
import { Types } from "mongoose";

/**
 * Facility Pressure Score (0-100) = weighted sum of:
 *   - Queue pressure (waiting patients relative to a capacity baseline)
 *   - Bed occupancy pressure (% beds occupied)
 *   - Doctor availability pressure (inverse of available doctors)
 *   - Referral pressure (pending inbound referrals)
 * Weights are intentionally centralized here so the formula stays configurable.
 */
const WEIGHTS = { queue: 0.35, bed: 0.3, doctor: 0.15, referral: 0.2 };
const QUEUE_BASELINE = 40; // waiting patients considered "fully loaded" for scoring purposes

export async function recalculateFacilityPressure(facilityId: Types.ObjectId | string): Promise<number> {
  const fid = new Types.ObjectId(facilityId);

  const todaysQueues = await Queue.find({ facilityId: fid, isActive: true }).lean();
  const queueIds = todaysQueues.map((q) => q._id);
  const waitingCount = queueIds.length
    ? await QueueToken.countDocuments({ queueId: { $in: queueIds }, status: "WAITING" })
    : 0;
  const queuePressure = Math.min(100, (waitingCount / QUEUE_BASELINE) * 100);

  const beds = await Bed.find({ facilityId: fid }).lean();
  const totalBeds = beds.reduce((sum, b) => sum + b.total, 0);
  const occupiedBeds = beds.reduce((sum, b) => sum + b.occupied, 0);
  const bedPressure = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  const doctorsTotal = await Doctor.countDocuments({ facilityId: fid });
  const doctorsAvailable = await Doctor.countDocuments({ facilityId: fid, isAvailableToday: true });
  const doctorPressure = doctorsTotal > 0 ? (1 - doctorsAvailable / doctorsTotal) * 100 : 0;

  const pendingReferrals = await Referral.countDocuments({
    receivingFacilityId: fid,
    status: { $in: ["SENT", "RECEIVED"] },
  });
  const referralPressure = Math.min(100, pendingReferrals * 12.5); // 8 pending referrals ~ saturates this component

  const score = Math.round(
    queuePressure * WEIGHTS.queue + bedPressure * WEIGHTS.bed + doctorPressure * WEIGHTS.doctor + referralPressure * WEIGHTS.referral
  );

  const level = pressureLevelFromScore(score);

  const facility = await Facility.findByIdAndUpdate(
    fid,
    { pressureScore: score, pressureLevel: level, operationalUpdatedAt: new Date() },
    { new: true }
  ).lean();

  if (facility) {
    emit.toFacility(String(fid), "facility:pressure-updated", {
      facilityId: String(fid),
      pressureScore: score,
      pressureLevel: level,
      updatedAt: facility.operationalUpdatedAt,
    });
    emit.toDistrict(String(facility.districtId), "facility:pressure-updated", {
      facilityId: String(fid),
      pressureScore: score,
      pressureLevel: level,
    });
  }

  return score;
}

/**
 * Accessibility Score (0-100): a separate metric from operational pressure.
 * Reflects how easy the facility is to reach and use, not how busy it is right now.
 */
export function computeAccessibilityScore(input: {
  hasAccessibilityFacilities: boolean;
  languagesSupported: string[];
  operatingHours: string;
  servicesCount: number;
}): number {
  let score = 40; // baseline
  if (input.hasAccessibilityFacilities) score += 15;
  score += Math.min(20, input.languagesSupported.length * 5);
  if (input.operatingHours.trim() === "24x7") score += 15;
  score += Math.min(10, input.servicesCount);
  return Math.max(0, Math.min(100, score));
}
