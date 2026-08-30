import { Router } from "express";
import Department from "../models/Department";
import Doctor from "../models/Doctor";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.get(
  "/facility/:facilityId",
  asyncHandler(async (req, res) => {
    const departments = await Department.find({ facilityId: req.params.facilityId, isActive: true }).lean();
    res.json({ success: true, data: { departments } });
  })
);

router.get(
  "/:id/doctors",
  asyncHandler(async (req, res) => {
    const doctors = await Doctor.find({ departmentId: req.params.id }).lean();
    res.json({ success: true, data: { doctors } });
  })
);

export default router;
