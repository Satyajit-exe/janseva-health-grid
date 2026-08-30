import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api, apiErrorMessage } from "../../api/client";
import { PressureBadge } from "../../components/PressureBadge";
import { Facility } from "../../lib/types";

interface Kpis {
  totalFacilities: number;
  patientsServedToday: number;
  avgWaitMinutes: number;
  totalBeds: number;
  occupiedBeds: number;
  bedOccupancyPercent: number;
  shortageFacilityCount: number;
  referralVolume: number;
  criticalFacilityCount: number;
}

interface DistrictRow {
  districtId: string;
  districtName: string;
  facilities: number;
  bedOccupancyPercent: number;
  avgPressure: number;
  referrals: number;
}

export function StateDashboard() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/analytics/state")
      .then((res) => {
        setKpis(res.data.data.kpis);
        setDistricts(res.data.data.districtComparison);
        setFacilities(res.data.data.facilities);
      })
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  if (error) return <div className="max-w-3xl mx-auto px-4 py-16 text-danger-500">{error}</div>;
  if (!kpis) return <div className="max-w-3xl mx-auto px-4 py-16 text-ink/50">Loading state command center…</div>;

  const criticalFacilities = facilities.filter((f) => f.pressureLevel === "CRITICAL").sort((a, b) => b.pressureScore - a.pressureScore);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="label mb-1">Maharashtra Healthcare Network</div>
      <h1 className="font-display text-2xl font-semibold mb-6">State Command Center</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Facilities", value: kpis.totalFacilities },
          { label: "Patients Served Today", value: kpis.patientsServedToday },
          { label: "Avg Wait", value: `${kpis.avgWaitMinutes} min` },
          { label: "Bed Occupancy", value: `${kpis.bedOccupancyPercent}%` },
          { label: "Critical Facilities", value: kpis.criticalFacilityCount },
          { label: "Medicine Shortage Sites", value: kpis.shortageFacilityCount },
          { label: "Referral Volume", value: kpis.referralVolume },
          { label: "Total Beds", value: kpis.totalBeds },
        ].map((k) => (
          <div key={k.label} className="card p-4 text-center">
            <div className="kpi-number !text-2xl">{k.value}</div>
            <div className="text-[11px] text-ink/50 uppercase tracking-wide mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <div className="label mb-3">District Comparison — Average Pressure</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAF2F3" />
                <XAxis dataKey="districtName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avgPressure" fill="#0B4F6C" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="label mb-3">Critical Facilities</div>
          {criticalFacilities.length === 0 ? (
            <p className="text-sm text-ink/40 py-8 text-center">No facilities currently in critical pressure.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-teal-50 max-h-64 overflow-y-auto">
              {criticalFacilities.map((f) => (
                <li key={f._id} className="py-2.5 flex items-center justify-between">
                  <span className="text-sm font-medium">{f.name}</span>
                  <PressureBadge level={f.pressureLevel} score={f.pressureScore} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="label p-4 pb-0">District Comparison Table</div>
        <table className="w-full text-sm mt-3">
          <thead className="bg-teal-50 text-teal-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2">District</th>
              <th className="text-left px-4 py-2">Facilities</th>
              <th className="text-left px-4 py-2">Bed Occupancy</th>
              <th className="text-left px-4 py-2">Avg Pressure</th>
              <th className="text-left px-4 py-2">Referrals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {districts.map((d) => (
              <tr key={d.districtId}>
                <td className="px-4 py-3 font-medium">{d.districtName}</td>
                <td className="px-4 py-3">{d.facilities}</td>
                <td className="px-4 py-3">{d.bedOccupancyPercent}%</td>
                <td className="px-4 py-3">{d.avgPressure}</td>
                <td className="px-4 py-3">{d.referrals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
