import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Referral, Facility } from "../lib/types";

const STATUS_STYLES: Record<string, string> = {
  CREATED: "bg-teal-50 text-teal-500",
  SENT: "bg-warn-100 text-warn-500",
  RECEIVED: "bg-warn-100 text-warn-500",
  ACCEPTED: "bg-ok-100 text-ok-500",
  REJECTED: "bg-danger-100 text-danger-500",
  PATIENT_IN_TRANSIT: "bg-saffron-100 text-saffron-600",
  PATIENT_ARRIVED: "bg-saffron-100 text-saffron-600",
  UNDER_CARE: "bg-teal-100 text-teal-600",
  COMPLETED: "bg-ok-100 text-ok-500",
  CANCELLED: "bg-danger-100 text-danger-500",
};

function facilityName(f: string | Facility) {
  return typeof f === "string" ? f : f.name;
}

export function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/referrals/mine")
      .then((res) => setReferrals(res.data.data.referrals))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-16 text-ink/50">Loading your referrals…</div>;
  if (error) return <div className="max-w-3xl mx-auto px-4 py-16 text-danger-500">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl font-semibold mb-1">My Referrals</h1>
      <p className="text-ink/60 mb-8">Live status of referrals between facilities in your care chain.</p>

      {referrals.length === 0 ? (
        <div className="card p-10 text-center text-ink/50">No referrals yet.</div>
      ) : (
        <ul className="flex flex-col gap-4">
          {referrals.map((r) => (
            <li key={r._id} className="card p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="font-medium">{r.departmentOrSpecialty}</div>
                <span className={`text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wide ${STATUS_STYLES[r.status]}`}>
                  {r.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="text-sm text-ink/60 flex items-center gap-2 flex-wrap">
                <span>{facilityName(r.sendingFacilityId)}</span>
                <span className="text-teal-300">→</span>
                <span>{facilityName(r.receivingFacilityId)}</span>
              </div>
              <p className="text-sm text-ink/70 mt-2">{r.reason}</p>
              <div className="text-xs text-ink/40 mt-2">
                Created {new Date(r.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
