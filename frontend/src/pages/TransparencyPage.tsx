import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { api } from "../api/client";
import { Facility } from "../lib/types";
import { PressureBadge } from "../components/PressureBadge";

export function TransparencyPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/analytics/public")
      .then((res) => setFacilities(res.data.data.facilities))
      .finally(() => setLoading(false));
  }, []);

  const counts = facilities.reduce(
    (acc, f) => {
      acc[f.pressureLevel] = (acc[f.pressureLevel] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="inline-flex items-center gap-1.5 label mb-2">
        <Eye size={13} /> Public Transparency Mode
      </div>
      <h1 className="font-display text-3xl font-semibold mb-1">Live Public Healthcare Status</h1>
      <p className="text-ink/60 mb-8 max-w-2xl">
        Read-only, no login required. Shows aggregate facility status only — no patient identities or clinical
        details are exposed here.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {(["LOW", "MODERATE", "HIGH", "CRITICAL"] as const).map((level) => (
          <div key={level} className="card p-4 text-center">
            <div className="kpi-number">{counts[level] || 0}</div>
            <PressureBadge level={level} />
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-ink/50">Loading facilities…</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((f) => (
            <Link key={f._id} to={`/facility/${f._id}`} className="card p-4 hover:border-teal-400 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-teal-500 font-semibold">{f.type.replace(/_/g, " ")}</div>
                  <div className="font-medium">{f.name}</div>
                </div>
                <PressureBadge level={f.pressureLevel} score={f.pressureScore} />
              </div>
              <p className="text-xs text-ink/50 truncate">{f.address}</p>
              <p className="text-[11px] text-ink/40 mt-2">
                Last updated {new Date(f.operationalUpdatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
