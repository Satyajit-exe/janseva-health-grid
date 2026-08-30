export type Role =
  | "CITIZEN"
  | "FACILITY_STAFF"
  | "DOCTOR"
  | "PHARMACY_STAFF"
  | "FACILITY_ADMIN"
  | "DISTRICT_ADMIN"
  | "STATE_ADMIN";

export type PressureLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  facilityId?: string;
  districtId?: string;
  preferredLanguage?: string;
}

export interface Facility {
  _id: string;
  name: string;
  type: string;
  districtId: string | { _id: string; name: string };
  address: string;
  location: { type: "Point"; coordinates: [number, number] };
  services: string[];
  languagesSupported: string[];
  operatingHours: string;
  hasAccessibilityFacilities: boolean;
  phone: string;
  pressureScore: number;
  pressureLevel: PressureLevel;
  accessibilityScore: number;
  operationalUpdatedAt: string;
  liveQueueWaiting?: number;
  distanceKm?: number;
}

export interface Department {
  _id: string;
  facilityId: string;
  name: string;
  averageConsultationMinutes: number;
}

export interface QueueToken {
  _id: string;
  queueId: string;
  facilityId: string;
  departmentId: string;
  patientId: string;
  tokenCode: string;
  sequenceNumber: number;
  status: "WAITING" | "CALLED" | "IN_CONSULTATION" | "COMPLETED" | "SKIPPED" | "NO_SHOW" | "CANCELLED";
  priority: "NORMAL" | "PRIORITY" | "URGENT" | "EMERGENCY";
  createdAt: string;
}

export interface Queue {
  _id: string;
  facilityId: string;
  departmentId: string;
  date: string;
  currentTokenNumber: number;
  lastTokenNumber: number;
  averageConsultationMinutes: number;
}

export interface WaitEstimate {
  patientsAhead: number;
  priorityAhead: number;
  estimatedMinutes: number;
}

export interface Bed {
  _id: string;
  facilityId: string;
  category: "GENERAL" | "ICU" | "EMERGENCY" | "PEDIATRIC" | "MATERNITY" | "ISOLATION";
  total: number;
  occupied: number;
  reserved: number;
  cleaning: number;
  available?: number;
  occupancyPercent?: number;
  updatedAt: string;
}

export interface Medicine {
  _id: string;
  facilityId: string;
  name: string;
  genericName: string;
  batchNumber: string;
  quantity: number;
  minimumThreshold: number;
  expiryDate: string;
  status: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" | "EXPIRED";
  updatedAt: string;
}

export interface MedicineSearchResult {
  medicineId: string;
  name: string;
  genericName: string;
  status: Medicine["status"];
  facility: { id: string; name: string; address: string } | null;
  distanceKm?: number;
  lastUpdated: string;
}

export interface Referral {
  _id: string;
  patientId: string | { _id: string; name: string };
  sendingFacilityId: string | Facility;
  receivingFacilityId: string | Facility;
  departmentOrSpecialty: string;
  reason: string;
  priority: "NORMAL" | "PRIORITY" | "URGENT" | "EMERGENCY";
  status:
    | "CREATED"
    | "SENT"
    | "RECEIVED"
    | "ACCEPTED"
    | "REJECTED"
    | "PATIENT_IN_TRANSIT"
    | "PATIENT_ARRIVED"
    | "UNDER_CARE"
    | "COMPLETED"
    | "CANCELLED";
  createdAt: string;
}

export type JourneyStep =
  | "SEARCHED_FACILITY"
  | "SELECTED_SERVICE"
  | "DIGITAL_TOKEN"
  | "CHECK_IN"
  | "WAITING"
  | "DOCTOR_CONSULTATION"
  | "MEDICINE"
  | "REFERRAL_FOLLOWUP"
  | "CARE_COMPLETED";

export interface JourneyEvent {
  step: JourneyStep;
  status: "PENDING" | "IN_PROGRESS" | "DONE" | "SKIPPED";
  facilityId?: string;
  department?: string;
  timestamp: string;
  notes?: string;
}

export interface CareJourney {
  _id: string;
  patientId: string;
  facilityId: string;
  tokenId?: string;
  referralId?: string;
  events: JourneyEvent[];
  isActive: boolean;
  startedAt: string;
  completedAt?: string;
}

export interface District {
  _id: string;
  name: string;
  code: string;
  centerLat: number;
  centerLng: number;
}

export interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { message: string; details?: unknown };
}
