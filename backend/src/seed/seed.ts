import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db";

import District from "../models/District";
import Facility from "../models/Facility";
import Department from "../models/Department";
import User from "../models/User";
import Doctor from "../models/Doctor";
import Queue from "../models/Queue";
import QueueToken from "../models/QueueToken";
import Bed from "../models/Bed";
import Medicine, { computeMedicineStatus } from "../models/Medicine";
import Referral from "../models/Referral";

import { recalculateFacilityPressure, computeAccessibilityScore } from "../services/pressureService";

const DEMO_PASSWORD = "Demo@1234";

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function reset() {
  console.log("[seed] clearing existing collections...");
  await Promise.all([
    District.deleteMany({}),
    Facility.deleteMany({}),
    Department.deleteMany({}),
    User.deleteMany({}),
    Doctor.deleteMany({}),
    Queue.deleteMany({}),
    QueueToken.deleteMany({}),
    Bed.deleteMany({}),
    Medicine.deleteMany({}),
    Referral.deleteMany({}),
  ]);
}

async function seed() {
  await connectDB();
  await reset();

  console.log("[seed] creating districts...");
  const [mumbai, pune, nagpur, nashik] = await District.create([
    { name: "Mumbai City", code: "MUM", centerLat: 19.076, centerLng: 72.8777, population: 3100000 },
    { name: "Pune", code: "PUN", centerLat: 18.5204, centerLng: 73.8567, population: 3100000 },
    { name: "Nagpur", code: "NAG", centerLat: 21.1458, centerLng: 79.0882, population: 2400000 },
    { name: "Nashik", code: "NSK", centerLat: 19.9975, centerLng: 73.7898, population: 1500000 },
  ]);

  console.log("[seed] creating facilities...");

  // Scenario A: Overloaded hospital (Mumbai) + Scenario B: nearby facility with spare capacity
  const civilHospitalA = await Facility.create({
    name: "Sion Civil Hospital",
    type: "DISTRICT_HOSPITAL",
    districtId: mumbai._id,
    address: "Sion, Mumbai, Maharashtra",
    location: { type: "Point", coordinates: [72.8619, 19.0448] },
    services: ["OPD", "Emergency", "Cardiology", "Orthopedics", "Pediatrics", "General Surgery"],
    languagesSupported: ["English", "Hindi", "Marathi"],
    operatingHours: "24x7",
    hasAccessibilityFacilities: true,
    phone: "022-24076381",
  });

  const facilityB = await Facility.create({
    name: "Rajawadi Municipal Hospital",
    type: "SUB_DISTRICT_HOSPITAL",
    districtId: mumbai._id,
    address: "Ghatkopar East, Mumbai, Maharashtra",
    location: { type: "Point", coordinates: [72.9081, 19.0855] },
    services: ["OPD", "Emergency", "Orthopedics", "Pediatrics"],
    languagesSupported: ["English", "Hindi", "Marathi"],
    operatingHours: "24x7",
    hasAccessibilityFacilities: true,
    phone: "022-25012500",
  });

  const phcMumbai = await Facility.create({
    name: "Dharavi Urban PHC",
    type: "PHC",
    districtId: mumbai._id,
    address: "Dharavi, Mumbai, Maharashtra",
    location: { type: "Point", coordinates: [72.857, 19.0432] },
    services: ["OPD", "Immunization", "Maternal Health"],
    languagesSupported: ["Hindi", "Marathi"],
    operatingHours: "9:00 AM - 5:00 PM",
    hasAccessibilityFacilities: false,
    phone: "022-24012345",
  });

  const districtHospitalPune = await Facility.create({
    name: "Sassoon General Hospital",
    type: "DISTRICT_HOSPITAL",
    districtId: pune._id,
    address: "Pune, Maharashtra",
    location: { type: "Point", coordinates: [73.8636, 18.5286] },
    services: ["OPD", "Emergency", "Cardiology", "Nephrology", "General Surgery"],
    languagesSupported: ["English", "Hindi", "Marathi"],
    operatingHours: "24x7",
    hasAccessibilityFacilities: true,
    phone: "020-26128000",
  });

  const chcPune = await Facility.create({
    name: "Hadapsar CHC",
    type: "CHC",
    districtId: pune._id,
    address: "Hadapsar, Pune, Maharashtra",
    location: { type: "Point", coordinates: [73.9259, 18.5089] },
    services: ["OPD", "Emergency", "Maternal Health"],
    languagesSupported: ["Hindi", "Marathi"],
    operatingHours: "24x7",
    hasAccessibilityFacilities: false,
    phone: "020-26991234",
  });

  const specialistNagpur = await Facility.create({
    name: "Nagpur Institute of Cardiology",
    type: "SPECIALIST_CENTRE",
    districtId: nagpur._id,
    address: "Nagpur, Maharashtra",
    location: { type: "Point", coordinates: [79.0882, 21.1458] },
    services: ["Cardiology", "Cardiac Surgery"],
    languagesSupported: ["English", "Hindi", "Marathi"],
    operatingHours: "24x7",
    hasAccessibilityFacilities: true,
    phone: "0712-2727000",
  });

  const districtHospitalNagpur = await Facility.create({
    name: "Government Medical College Hospital Nagpur",
    type: "DISTRICT_HOSPITAL",
    districtId: nagpur._id,
    address: "Nagpur, Maharashtra",
    location: { type: "Point", coordinates: [79.0921, 21.1345] },
    services: ["OPD", "Emergency", "Cardiology", "Orthopedics"],
    languagesSupported: ["English", "Hindi", "Marathi"],
    operatingHours: "24x7",
    hasAccessibilityFacilities: true,
    phone: "0712-2700000",
  });

  // Scenario F: low-connectivity rural facility
  const phcNashikRural = await Facility.create({
    name: "Igatpuri Rural PHC",
    type: "PHC",
    districtId: nashik._id,
    address: "Igatpuri, Nashik, Maharashtra",
    location: { type: "Point", coordinates: [73.5626, 19.6968] },
    services: ["OPD", "Immunization"],
    languagesSupported: ["Marathi"],
    operatingHours: "9:00 AM - 4:00 PM",
    hasAccessibilityFacilities: false,
    phone: "02553-244000",
  });

  const chcNashik = await Facility.create({
    name: "Nashik Road CHC",
    type: "CHC",
    districtId: nashik._id,
    address: "Nashik Road, Nashik, Maharashtra",
    location: { type: "Point", coordinates: [73.8375, 19.9483] },
    services: ["OPD", "Emergency", "General Surgery"],
    languagesSupported: ["Hindi", "Marathi"],
    operatingHours: "24x7",
    hasAccessibilityFacilities: true,
    phone: "0253-2451234",
  });

  const facilities = [
    civilHospitalA,
    facilityB,
    phcMumbai,
    districtHospitalPune,
    chcPune,
    specialistNagpur,
    districtHospitalNagpur,
    phcNashikRural,
    chcNashik,
  ];

  console.log("[seed] computing accessibility scores...");
  for (const f of facilities) {
    f.accessibilityScore = computeAccessibilityScore({
      hasAccessibilityFacilities: f.hasAccessibilityFacilities,
      languagesSupported: f.languagesSupported,
      operatingHours: f.operatingHours,
      servicesCount: f.services.length,
    });
    await f.save();
  }

  console.log("[seed] creating departments...");
  const deptMap: Record<string, any> = {};
  for (const f of facilities) {
    for (const service of f.services) {
      const dept = await Department.create({
        facilityId: f._id,
        name: service,
        averageConsultationMinutes: service === "Emergency" ? 6 : 10,
      });
      deptMap[`${f._id}:${service}`] = dept;
    }
  }

  console.log("[seed] creating users (all roles)...");
  const passwordHash = await hash(DEMO_PASSWORD);

  const stateAdmin = await User.create({
    name: "Anjali Deshmukh",
    email: "state.admin@janseva.gov.in",
    passwordHash,
    role: "STATE_ADMIN",
    preferredLanguage: "en",
  });

  const districtAdminMumbai = await User.create({
    name: "Ravi Kulkarni",
    email: "district.mumbai@janseva.gov.in",
    passwordHash,
    role: "DISTRICT_ADMIN",
    districtId: mumbai._id,
  });

  const facilityAdminA = await User.create({
    name: "Sunita Patil",
    email: "admin.sion@janseva.gov.in",
    passwordHash,
    role: "FACILITY_ADMIN",
    facilityId: civilHospitalA._id,
  });

  const facilityStaffA = await User.create({
    name: "Vikram Shinde",
    email: "staff.sion@janseva.gov.in",
    passwordHash,
    role: "FACILITY_STAFF",
    facilityId: civilHospitalA._id,
  });

  const pharmacyStaffA = await User.create({
    name: "Meera Joshi",
    email: "pharmacy.sion@janseva.gov.in",
    passwordHash,
    role: "PHARMACY_STAFF",
    facilityId: civilHospitalA._id,
  });

  const doctorUserA = await User.create({
    name: "Dr. Arjun Rao",
    email: "doctor.sion@janseva.gov.in",
    passwordHash,
    role: "DOCTOR",
    facilityId: civilHospitalA._id,
  });

  const doctorUserCardio = await User.create({
    name: "Dr. Neha Iyer",
    email: "doctor.cardio.nagpur@janseva.gov.in",
    passwordHash,
    role: "DOCTOR",
    facilityId: specialistNagpur._id,
  });

  const citizen1 = await User.create({
    name: "Priya Sharma",
    email: "priya.citizen@example.com",
    passwordHash,
    role: "CITIZEN",
    preferredLanguage: "en",
    phone: "9820012345",
  });

  const citizen2 = await User.create({
    name: "Ramesh Gaikwad",
    email: "ramesh.citizen@example.com",
    passwordHash,
    role: "CITIZEN",
    preferredLanguage: "mr",
    phone: "9822098765",
  });

  const citizen3 = await User.create({
    name: "Fatima Sheikh",
    email: "fatima.citizen@example.com",
    passwordHash,
    role: "CITIZEN",
    preferredLanguage: "hi",
    phone: "9765432109",
  });

  console.log("[seed] creating doctor profiles...");
  const generalOpdDeptA = deptMap[`${civilHospitalA._id}:OPD`];
  const doctorA = await Doctor.create({
    userId: doctorUserA._id,
    facilityId: civilHospitalA._id,
    departmentId: generalOpdDeptA._id,
    name: doctorUserA.name,
    specialty: "General Medicine",
    isAvailableToday: true,
  });

  const cardioDeptNagpur = deptMap[`${specialistNagpur._id}:Cardiology`];
  await Doctor.create({
    userId: doctorUserCardio._id,
    facilityId: specialistNagpur._id,
    departmentId: cardioDeptNagpur._id,
    name: doctorUserCardio.name,
    specialty: "Cardiology",
    isAvailableToday: true,
  });

  console.log("[seed] SCENARIO A: overloaded hospital queue at Sion Civil Hospital...");
  const queueA = await Queue.create({
    facilityId: civilHospitalA._id,
    departmentId: generalOpdDeptA._id,
    doctorId: doctorA._id,
    date: todayStr(),
    averageConsultationMinutes: 10,
    lastTokenNumber: 0,
    currentTokenNumber: 0,
  });

  // 87 waiting patients to simulate a critically overloaded queue, plus a handful completed.
  const overloadedPatientNames = Array.from({ length: 87 }, (_, i) => `Demo Patient A${i + 1}`);
  let seq = 0;
  for (const name of overloadedPatientNames) {
    seq += 1;
    const demoUser = await User.create({
      name,
      email: `demo.a${seq}@janseva.gov.in`,
      passwordHash,
      role: "CITIZEN",
    });
    await QueueToken.create({
      queueId: queueA._id,
      facilityId: civilHospitalA._id,
      departmentId: generalOpdDeptA._id,
      patientId: demoUser._id,
      tokenCode: `G-${String(seq).padStart(3, "0")}`,
      sequenceNumber: seq,
      status: "WAITING",
    });
  }
  queueA.lastTokenNumber = seq;
  queueA.currentTokenNumber = 0;
  await queueA.save();

  console.log("[seed] SCENARIO B: light queue at Rajawadi Municipal Hospital...");
  const generalOpdDeptB = deptMap[`${facilityB._id}:OPD`];
  const queueB = await Queue.create({
    facilityId: facilityB._id,
    departmentId: generalOpdDeptB._id,
    date: todayStr(),
    averageConsultationMinutes: 10,
    lastTokenNumber: 12,
    currentTokenNumber: 7,
  });
  for (let i = 1; i <= 12; i++) {
    const demoUser = await User.create({
      name: `Demo Patient B${i}`,
      email: `demo.b${i}@janseva.gov.in`,
      passwordHash,
      role: "CITIZEN",
    });
    await QueueToken.create({
      queueId: queueB._id,
      facilityId: facilityB._id,
      departmentId: generalOpdDeptB._id,
      patientId: demoUser._id,
      tokenCode: `G-${String(i).padStart(3, "0")}`,
      sequenceNumber: i,
      status: i <= 7 ? "COMPLETED" : "WAITING",
    });
  }

  console.log("[seed] creating bed data (feeds Scenario A/B pressure contrast)...");
  await Bed.create([
    { facilityId: civilHospitalA._id, category: "GENERAL", total: 120, occupied: 108, reserved: 4, cleaning: 2 },
    { facilityId: civilHospitalA._id, category: "ICU", total: 20, occupied: 19, reserved: 1, cleaning: 0 },
    { facilityId: civilHospitalA._id, category: "EMERGENCY", total: 15, occupied: 13, reserved: 0, cleaning: 1 },
    { facilityId: civilHospitalA._id, category: "PEDIATRIC", total: 25, occupied: 14, reserved: 2, cleaning: 0 },
    { facilityId: civilHospitalA._id, category: "MATERNITY", total: 30, occupied: 20, reserved: 3, cleaning: 1 },

    { facilityId: facilityB._id, category: "GENERAL", total: 60, occupied: 22, reserved: 2, cleaning: 1 },
    { facilityId: facilityB._id, category: "EMERGENCY", total: 10, occupied: 3, reserved: 0, cleaning: 0 },
    { facilityId: facilityB._id, category: "PEDIATRIC", total: 15, occupied: 5, reserved: 0, cleaning: 0 },

    { facilityId: districtHospitalPune._id, category: "GENERAL", total: 150, occupied: 90, reserved: 5, cleaning: 3 },
    { facilityId: districtHospitalPune._id, category: "ICU", total: 25, occupied: 15, reserved: 2, cleaning: 0 },
    { facilityId: districtHospitalPune._id, category: "MATERNITY", total: 20, occupied: 12, reserved: 0, cleaning: 0 },

    { facilityId: chcPune._id, category: "GENERAL", total: 30, occupied: 10, reserved: 0, cleaning: 0 },

    { facilityId: specialistNagpur._id, category: "ICU", total: 18, occupied: 10, reserved: 2, cleaning: 0 },
    { facilityId: specialistNagpur._id, category: "GENERAL", total: 40, occupied: 22, reserved: 0, cleaning: 1 },

    { facilityId: districtHospitalNagpur._id, category: "GENERAL", total: 100, occupied: 60, reserved: 3, cleaning: 2 },
    { facilityId: districtHospitalNagpur._id, category: "EMERGENCY", total: 12, occupied: 5, reserved: 0, cleaning: 0 },

    { facilityId: phcMumbai._id, category: "GENERAL", total: 6, occupied: 3, reserved: 0, cleaning: 0 },
    { facilityId: phcNashikRural._id, category: "GENERAL", total: 8, occupied: 2, reserved: 0, cleaning: 0 },
    { facilityId: chcNashik._id, category: "GENERAL", total: 25, occupied: 9, reserved: 0, cleaning: 0 },
  ]);

  console.log("[seed] SCENARIO C: medicine shortage...");
  const medicineDocs = [
    { facilityId: civilHospitalA._id, name: "Paracetamol 500mg", genericName: "Paracetamol", batchNumber: "PCM-2026-01", quantity: 4, minimumThreshold: 50, expiryDate: new Date("2027-06-01") }, // LOW_STOCK
    { facilityId: civilHospitalA._id, name: "Amoxicillin 250mg", genericName: "Amoxicillin", batchNumber: "AMX-2026-02", quantity: 0, minimumThreshold: 30, expiryDate: new Date("2027-01-01") }, // OUT_OF_STOCK
    { facilityId: civilHospitalA._id, name: "Insulin (Regular)", genericName: "Insulin", batchNumber: "INS-2025-11", quantity: 40, minimumThreshold: 20, expiryDate: new Date("2026-02-01") }, // near expiry -> effectively EXPIRED soon; keep future for now
    { facilityId: facilityB._id, name: "Paracetamol 500mg", genericName: "Paracetamol", batchNumber: "PCM-2026-05", quantity: 300, minimumThreshold: 50, expiryDate: new Date("2027-08-01") }, // AVAILABLE
    { facilityId: facilityB._id, name: "ORS Sachets", genericName: "Oral Rehydration Salts", batchNumber: "ORS-2026-01", quantity: 500, minimumThreshold: 100, expiryDate: new Date("2027-12-01") },
    { facilityId: districtHospitalPune._id, name: "Paracetamol 500mg", genericName: "Paracetamol", batchNumber: "PCM-2026-09", quantity: 220, minimumThreshold: 50, expiryDate: new Date("2027-09-01") },
    { facilityId: districtHospitalPune._id, name: "Atorvastatin 10mg", genericName: "Atorvastatin", batchNumber: "ATV-2026-02", quantity: 15, minimumThreshold: 40, expiryDate: new Date("2027-03-01") }, // LOW_STOCK
    { facilityId: phcNashikRural._id, name: "Paracetamol 500mg", genericName: "Paracetamol", batchNumber: "PCM-2025-12", quantity: 60, minimumThreshold: 50, expiryDate: new Date("2026-01-01") }, // EXPIRED (past today)
  ];
  for (const m of medicineDocs) {
    const status = computeMedicineStatus(m as any);
    await Medicine.create({ ...m, status });
  }

  console.log("[seed] SCENARIO D: referral waiting for acceptance (Sion -> Nagpur Cardiology)...");
  await Referral.create({
    patientId: citizen1._id,
    sendingFacilityId: civilHospitalA._id,
    receivingFacilityId: specialistNagpur._id,
    departmentOrSpecialty: "Cardiology",
    reason: "Suspected coronary artery disease, needs specialist evaluation and possible angiography.",
    priority: "URGENT",
    status: "SENT",
    createdBy: doctorUserA._id,
  });

  console.log("[seed] SCENARIO E: emergency patient with priority override...");
  const emergencyUser = citizen2;
  const emergencyToken = await QueueToken.create({
    queueId: queueA._id,
    facilityId: civilHospitalA._id,
    departmentId: generalOpdDeptA._id,
    patientId: emergencyUser._id,
    tokenCode: `G-EMR`,
    sequenceNumber: seq + 1,
    status: "WAITING",
    priority: "EMERGENCY",
    priorityReason: "Chest pain, suspected cardiac event - triaged as emergency on arrival.",
    priorityAssignedBy: facilityStaffA._id,
  });
  queueA.lastTokenNumber = seq + 1;
  await queueA.save();

  console.log("[seed] SCENARIO F: low-connectivity rural PHC (Igatpuri) - light data footprint...");
  const deptIgatpuri = deptMap[`${phcNashikRural._id}:OPD`];
  const queueF = await Queue.create({
    facilityId: phcNashikRural._id,
    departmentId: deptIgatpuri._id,
    date: todayStr(),
    averageConsultationMinutes: 12,
    lastTokenNumber: 3,
    currentTokenNumber: 1,
  });
  for (let i = 1; i <= 3; i++) {
    const demoUser = await User.create({
      name: `Demo Patient F${i}`,
      email: `demo.f${i}@janseva.gov.in`,
      passwordHash,
      role: "CITIZEN",
    });
    await QueueToken.create({
      queueId: queueF._id,
      facilityId: phcNashikRural._id,
      departmentId: deptIgatpuri._id,
      patientId: demoUser._id,
      tokenCode: `G-${String(i).padStart(3, "0")}`,
      sequenceNumber: i,
      status: i === 1 ? "COMPLETED" : "WAITING",
    });
  }

  console.log("[seed] recalculating pressure for all facilities...");
  for (const f of facilities) {
    await recalculateFacilityPressure(f._id);
  }

  console.log("\n[seed] DONE. Demo accounts (all use password: " + DEMO_PASSWORD + ")\n");
  console.table([
    { role: "STATE_ADMIN", email: stateAdmin.email },
    { role: "DISTRICT_ADMIN (Mumbai)", email: districtAdminMumbai.email },
    { role: "FACILITY_ADMIN (Sion)", email: facilityAdminA.email },
    { role: "FACILITY_STAFF (Sion)", email: facilityStaffA.email },
    { role: "PHARMACY_STAFF (Sion)", email: pharmacyStaffA.email },
    { role: "DOCTOR (Sion, General Medicine)", email: doctorUserA.email },
    { role: "DOCTOR (Nagpur, Cardiology)", email: doctorUserCardio.email },
    { role: "CITIZEN", email: citizen1.email },
    { role: "CITIZEN (has emergency token)", email: citizen2.email },
    { role: "CITIZEN", email: citizen3.email },
  ]);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
