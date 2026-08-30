import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import User from "../models/User";
import Doctor from "../models/Doctor";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validate";
import { signToken } from "../utils/jwt";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { ROLES } from "../utils/constants";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  // Only CITIZEN self-registration is open. Staff/doctor/admin roles are provisioned by an
  // administrator (kept simple here for the demo seed, but never exposed on public register).
  preferredLanguage: z.string().optional(),
});

router.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, phone, preferredLanguage } = req.body;

    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(409, "An account with this email already exists");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role: "CITIZEN",
      preferredLanguage: preferredLanguage || "en",
    });

    const token = signToken({ sub: String(user._id), role: user.role });
    res.status(201).json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } },
    });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !user.isActive) throw new ApiError(401, "Invalid email or password");

    const valid = await user.comparePassword(password);
    if (!valid) throw new ApiError(401, "Invalid email or password");

    const token = signToken({
      sub: String(user._id),
      role: user.role,
      facilityId: user.facilityId ? String(user.facilityId) : undefined,
      districtId: user.districtId ? String(user.districtId) : undefined,
    });

    let doctorProfile = null;
    if (user.role === "DOCTOR") {
      doctorProfile = await Doctor.findOne({ userId: user._id }).lean();
    }

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          facilityId: user.facilityId,
          districtId: user.districtId,
          preferredLanguage: user.preferredLanguage,
          doctorProfile,
        },
      },
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userDoc = await User.findById(req.user!.id).populate("facilityId districtId");
    if (!userDoc) throw new ApiError(404, "User not found");

    const userObj = userDoc.toObject();
    let doctorProfile = null;
    if (userObj.role === "DOCTOR") {
      doctorProfile = await Doctor.findOne({ userId: userObj._id }).lean();
    }

    res.json({ success: true, data: { user: { ...userObj, doctorProfile } } });
  })
);

// Exposed only so the demo seed / admin tooling can create non-citizen accounts consistently.
// In production this route would be locked behind STATE_ADMIN + an invite flow, not public.
router.get("/roles", (req, res) => {
  res.json({ success: true, data: { roles: ROLES } });
});

export default router;
