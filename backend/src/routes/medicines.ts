import { Router } from "express";
import { z } from "zod";
import Medicine, { computeMedicineStatus } from "../models/Medicine";
import InventoryTransaction from "../models/InventoryTransaction";
import Facility from "../models/Facility";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { validateBody, validateQuery } from "../middleware/validate";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";
import { emit } from "../sockets";
import { writeAuditLog } from "../utils/audit";
import { notifyUser } from "../services/notificationService";
import User from "../models/User";

const router = Router();

const searchSchema = z.object({
  q: z.string().min(1),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** MEDICINE FINDER - citizen search across facilities. Never exposes patient info. */
router.get(
  "/search",
  validateQuery(searchSchema),
  asyncHandler(async (req, res) => {
    const { q, lat, lng } = req.query as any;

    const matches = await Medicine.find({
      $or: [{ name: { $regex: q, $options: "i" } }, { genericName: { $regex: q, $options: "i" } }],
    })
      .populate("facilityId")
      .lean();

    // Collapse to one row per facility+medicine name showing aggregate status/quantity band.
    const results = matches.map((m) => {
      const facility = m.facilityId as any;
      let distanceKm: number | undefined;
      if (lat !== undefined && lng !== undefined && facility?.location?.coordinates) {
        distanceKm = haversineKm(lat, lng, facility.location.coordinates[1], facility.location.coordinates[0]);
      }
      return {
        medicineId: m._id,
        name: m.name,
        genericName: m.genericName,
        status: m.status,
        facility: facility ? { id: facility._id, name: facility.name, address: facility.address } : null,
        distanceKm: distanceKm !== undefined ? Math.round(distanceKm * 10) / 10 : undefined,
        lastUpdated: m.updatedAt,
      };
    });

    results.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

    res.json({ success: true, data: { results } });
  })
);

router.get(
  "/facility/:facilityId",
  requireAuth,
  requireRole("PHARMACY_STAFF", "FACILITY_ADMIN", "FACILITY_STAFF"),
  asyncHandler(async (req, res) => {
    const medicines = await Medicine.find({ facilityId: req.params.facilityId }).sort({ name: 1 }).lean();
    res.json({ success: true, data: { medicines } });
  })
);

const createMedicineSchema = z.object({
  facilityId: z.string(),
  name: z.string().min(1),
  genericName: z.string().min(1),
  batchNumber: z.string().min(1),
  quantity: z.number().int().min(0),
  minimumThreshold: z.number().int().min(0).default(20),
  expiryDate: z.string(), // ISO date
});

router.post(
  "/",
  requireAuth,
  requireRole("PHARMACY_STAFF", "FACILITY_ADMIN"),
  validateBody(createMedicineSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const expiryDate = new Date(req.body.expiryDate);
    const status = computeMedicineStatus({ quantity: req.body.quantity, minimumThreshold: req.body.minimumThreshold, expiryDate });

    const medicine = await Medicine.create({ ...req.body, expiryDate, status });

    await InventoryTransaction.create({
      medicineId: medicine._id,
      facilityId: medicine.facilityId,
      type: "STOCK_IN",
      quantityChange: medicine.quantity,
      reason: "Initial stock entry",
      performedBy: req.user!.id,
    });

    res.status(201).json({ success: true, data: { medicine } });
  })
);

const stockAdjustSchema = z.object({
  quantityChange: z.number().int(),
  type: z.enum(["STOCK_IN", "STOCK_OUT", "DISPENSED", "ADJUSTMENT"]),
  reason: z.string().optional(),
});

router.post(
  "/:id/stock",
  requireAuth,
  requireRole("PHARMACY_STAFF", "FACILITY_ADMIN"),
  validateBody(stockAdjustSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) throw new ApiError(404, "Medicine not found");

    const newQuantity = medicine.quantity + req.body.quantityChange;
    if (newQuantity < 0) throw new ApiError(400, "Stock cannot go below zero");

    medicine.quantity = newQuantity;
    medicine.status = computeMedicineStatus(medicine);
    await medicine.save();

    await InventoryTransaction.create({
      medicineId: medicine._id,
      facilityId: medicine.facilityId,
      type: req.body.type,
      quantityChange: req.body.quantityChange,
      reason: req.body.reason,
      performedBy: req.user!.id,
    });

    await writeAuditLog({
      userId: req.user!.id,
      action: "MEDICINE_STOCK_ADJUSTED",
      resource: "Medicine",
      resourceId: medicine._id,
      facilityId: medicine.facilityId,
      newValue: { quantityChange: req.body.quantityChange, newQuantity, status: medicine.status },
    });

    emit.toFacility(String(medicine.facilityId), "medicine:updated", { medicine: medicine.toObject() });

    if (medicine.status === "LOW_STOCK" || medicine.status === "OUT_OF_STOCK") {
      const facilityAdmins = await User.find({ facilityId: medicine.facilityId, role: { $in: ["FACILITY_ADMIN", "PHARMACY_STAFF"] } }).lean();
      await Promise.all(
        facilityAdmins.map((u) =>
          notifyUser({
            userId: u._id,
            type: "MEDICINE_LOW_STOCK",
            title: `${medicine.status === "OUT_OF_STOCK" ? "Out of stock" : "Low stock"}: ${medicine.name}`,
            message: `${medicine.name} (batch ${medicine.batchNumber}) is now ${medicine.status}. Current quantity: ${medicine.quantity}.`,
            relatedFacilityId: medicine.facilityId,
          })
        )
      );
    }

    res.json({ success: true, data: { medicine } });
  })
);

export default router;
