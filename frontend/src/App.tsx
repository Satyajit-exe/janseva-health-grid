import { Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { FindCarePage } from "./pages/FindCarePage";
import { FacilityDetailPage } from "./pages/FacilityDetailPage";
import { MedicineFinderPage } from "./pages/MedicineFinderPage";
import { TransparencyPage } from "./pages/TransparencyPage";
import { NotificationsPage } from "./pages/NotificationsPage";

import { CitizenDashboard } from "./pages/CitizenDashboard";
import { TokenTrackerPage } from "./pages/TokenTrackerPage";
import { CareJourneyPage } from "./pages/CareJourneyPage";
import { ReferralsPage } from "./pages/ReferralsPage";

import { FacilityDashboard } from "./pages/facility/FacilityDashboard";
import { DoctorDashboard } from "./pages/doctor/DoctorDashboard";
import { PharmacyDashboard } from "./pages/pharmacy/PharmacyDashboard";
import { DistrictDashboard } from "./pages/district/DistrictDashboard";
import { StateDashboard } from "./pages/state/StateDashboard";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/find-care" element={<FindCarePage />} />
          <Route path="/facility/:id" element={<FacilityDetailPage />} />
          <Route path="/medicine-finder" element={<MedicineFinderPage />} />
          <Route path="/transparency" element={<TransparencyPage />} />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/citizen"
            element={
              <ProtectedRoute roles={["CITIZEN"]}>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/token/:id"
            element={
              <ProtectedRoute roles={["CITIZEN"]}>
                <TokenTrackerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/journey"
            element={
              <ProtectedRoute roles={["CITIZEN"]}>
                <CareJourneyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/referrals"
            element={
              <ProtectedRoute roles={["CITIZEN"]}>
                <ReferralsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/facility"
            element={
              <ProtectedRoute roles={["FACILITY_STAFF", "FACILITY_ADMIN", "DOCTOR"]}>
                <FacilityDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute roles={["DOCTOR"]}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy"
            element={
              <ProtectedRoute roles={["PHARMACY_STAFF"]}>
                <PharmacyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/district"
            element={
              <ProtectedRoute roles={["DISTRICT_ADMIN"]}>
                <DistrictDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/state"
            element={
              <ProtectedRoute roles={["STATE_ADMIN"]}>
                <StateDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <footer className="border-t border-teal-100 py-6 text-center text-xs text-ink/40">
        JANSEVA HEALTH GRID — Government of Maharashtra · SIH26133 Demo Build
      </footer>
    </div>
  );
}
