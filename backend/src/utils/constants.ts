export const ROLES = [
  "CITIZEN",
  "FACILITY_STAFF",
  "DOCTOR",
  "PHARMACY_STAFF",
  "FACILITY_ADMIN",
  "DISTRICT_ADMIN",
  "STATE_ADMIN",
] as const;
export type Role = (typeof ROLES)[number];

export const FACILITY_TYPES = ["PHC", "CHC", "SUB_DISTRICT_HOSPITAL", "DISTRICT_HOSPITAL", "SPECIALIST_CENTRE"] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];

export const PRESSURE_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
export type PressureLevel = (typeof PRESSURE_LEVELS)[number];

export const TOKEN_STATUSES = [
  "WAITING",
  "CALLED",
  "IN_CONSULTATION",
  "COMPLETED",
  "SKIPPED",
  "NO_SHOW",
  "CANCELLED",
] as const;
export type TokenStatus = (typeof TOKEN_STATUSES)[number];

export const PRIORITY_LEVELS = ["NORMAL", "PRIORITY", "URGENT", "EMERGENCY"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const BED_CATEGORIES = ["GENERAL", "ICU", "EMERGENCY", "PEDIATRIC", "MATERNITY", "ISOLATION"] as const;
export type BedCategory = (typeof BED_CATEGORIES)[number];

export const MEDICINE_STATUSES = ["AVAILABLE", "LOW_STOCK", "OUT_OF_STOCK", "EXPIRED"] as const;
export type MedicineStatus = (typeof MEDICINE_STATUSES)[number];

export const REFERRAL_STATUSES = [
  "CREATED",
  "SENT",
  "RECEIVED",
  "ACCEPTED",
  "REJECTED",
  "PATIENT_IN_TRANSIT",
  "PATIENT_ARRIVED",
  "UNDER_CARE",
  "COMPLETED",
  "CANCELLED",
] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const JOURNEY_STEPS = [
  "SEARCHED_FACILITY",
  "SELECTED_SERVICE",
  "DIGITAL_TOKEN",
  "CHECK_IN",
  "WAITING",
  "DOCTOR_CONSULTATION",
  "MEDICINE",
  "REFERRAL_FOLLOWUP",
  "CARE_COMPLETED",
] as const;
export type JourneyStep = (typeof JOURNEY_STEPS)[number];

/** Pressure score -> level, per section 22 of the spec. Kept centralized so it's configurable. */
export function pressureLevelFromScore(score: number): PressureLevel {
  if (score <= 30) return "LOW";
  if (score <= 60) return "MODERATE";
  if (score <= 80) return "HIGH";
  return "CRITICAL";
}
