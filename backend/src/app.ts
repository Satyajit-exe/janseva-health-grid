import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth";
import facilityRoutes from "./routes/facilities";
import departmentRoutes from "./routes/departments";
import queueRoutes from "./routes/queues";
import tokenRoutes from "./routes/tokens";
import bedRoutes from "./routes/beds";
import medicineRoutes from "./routes/medicines";
import referralRoutes from "./routes/referrals";
import careJourneyRoutes from "./routes/careJourney";
import notificationRoutes from "./routes/notifications";
import districtRoutes from "./routes/districts";
import analyticsRoutes from "./routes/analytics";
import auditLogRoutes from "./routes/auditLogs";

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_URL || "*",
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? (Number(process.env.RATE_LIMIT_MAX) || 300) : 10000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", limiter);

  app.get("/health", (req, res) => {
    res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/facilities", facilityRoutes);
  app.use("/api/departments", departmentRoutes);
  app.use("/api/queues", queueRoutes);
  app.use("/api/tokens", tokenRoutes);
  app.use("/api/beds", bedRoutes);
  app.use("/api/medicines", medicineRoutes);
  app.use("/api/referrals", referralRoutes);
  app.use("/api/care-journey", careJourneyRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/districts", districtRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/audit-logs", auditLogRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
