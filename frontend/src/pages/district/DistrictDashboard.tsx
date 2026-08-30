import { useEffect, useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { PressureBadge } from "../../components/PressureBadge";
import { Facility } from "../../lib/types";

interface Kpis {
  totalFacilities: number;
  patientsToday: number;
  waitingNow: number;
  avgWaitMinutes: number;
  totalBeds: number;
  occupiedBeds: number;
  bedOccupancyPercent: number;
  shortageMedicines: number;
  activeReferrals: number;
}

export function DistrictDashboard() {
  const { user } = useAuth();
  const { joinDistrict, socket } = useSocket();
  const districtId = user?.districtId;

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [highPressure, setHighPressure] = useState<Facility[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!districtId) return;
    try {
      const res = await api.get(`/districts/${districtId}/command-center`);
      setKpis(res.data.data.kpis);
      setFacilities(res.data.data.facilities);
      setHighPressure(res.data.data.highPressureFacilities);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, [districtId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (districtId) joinDistrict(districtId);
  }, [districtId, joinDistrict]);

  useEffect(() => {
    if (!socket) return;
    socket.on("facility:pressure-updated", load);
    return () => {
      socket.off("facility:pressure-updated", load);
    };
  }, [socket, load]);

  if (!districtId) return <div className="max-w-3xl mx-auto px-4 py-16 text-danger-500">No district assigned to your account.</div>;
  if (error) return <div className="max-w-3xl mx-auto px-4 py-16 text-danger-500">{error}</div>;
  if (!kpis) return <div className="max-w-3xl mx-auto px-4 py-16 text-ink/50">Loading district command center…</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="label mb-1">District Health Command Center</div>
      <h1 className="font-display text-2xl font-semibold mb-6">Live Facility Network</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Facilities", value: kpis.totalFacilities },
          { label: "Patients Today", value: kpis.patientsToday },
          { label: "Avg Wait", value: `${kpis.avgWaitMinutes} min` },
          { label: "Bed Occupancy", value: `${kpis.bedOccupancyPercent}%` },
          { label: "Waiting Now", value: kpis.waitingNow },
          { label: "Medicine Shortages", value: kpis.shortageMedicines },
          { label: "Active Referrals", value: kpis.activeReferrals },
          { label: "Total Beds", value: kpis.totalBeds },
        ].map((k) => (
          <div key={k.label} className="card p-4 text-center">
            <div className="kpi-number !text-2xl">{k.value}</div>
            <div className="text-[11px] text-ink/50 uppercase tracking-wide mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="label flex items-center gap-1.5 mb-3"><AlertTriangle size={14} /> High Pressure Facilities</div>
          {highPressure.length === 0 ? (
            <p className="text-sm text-ink/40 py-4 text-center">No facilities under high pressure right now.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-teal-50">
              {highPressure.map((f) => (
                <li key={f._id} className="py-3 flex items-center justify-between">
                  <span className="text-sm font-medium">{f.name}</span>
                  <PressureBadge level={f.pressureLevel} score={f.pressureScore} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="label mb-3">All Facilities</div>
          <ul className="flex flex-col divide-y divide-teal-50 max-h-96 overflow-y-auto">
            {facilities.map((f) => (
              <li key={f._id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{f.name}</div>
                  <div className="text-xs text-ink/40">{f.type.replace(/_/g, " ")}</div>
                </div>
                <PressureBadge level={f.pressureLevel} score={f.pressureScore} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
