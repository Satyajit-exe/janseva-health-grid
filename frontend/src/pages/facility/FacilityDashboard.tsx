import { useEffect, useState, useCallback } from "react";
import { PhoneCall, BedDouble, GitBranch, AlertTriangle } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { PressureBadge } from "../../components/PressureBadge";
import { Facility, Department, Bed, Queue, QueueToken, Referral } from "../../lib/types";

export function FacilityDashboard() {
  const { user } = useAuth();
  const { joinFacility, socket } = useSocket();
  const facilityId = user?.facilityId;

  const [facility, setFacility] = useState<Facility | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [queues, setQueues] = useState<(Queue & { waiting: number })[]>([]);
  const [activeQueueId, setActiveQueueId] = useState<string>("");
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadFacility = useCallback(async () => {
    if (!facilityId) return;
    const res = await api.get(`/facilities/${facilityId}`);
    setFacility(res.data.data.facility);
    setDepartments(res.data.data.departments);
    setBeds(res.data.data.beds);
    setQueues(res.data.data.queues);
    if (!activeQueueId && res.data.data.queues[0]) setActiveQueueId(res.data.data.queues[0]._id);
  }, [facilityId, activeQueueId]);

  const loadTokens = useCallback(async () => {
    if (!activeQueueId) return;
    const res = await api.get(`/queues/${activeQueueId}`);
    setTokens(res.data.data.tokens);
  }, [activeQueueId]);

  const loadReferrals = useCallback(async () => {
    if (!facilityId) return;
    const res = await api.get(`/referrals/facility/${facilityId}/inbound`);
    setReferrals(res.data.data.referrals);
  }, [facilityId]);

  useEffect(() => {
    loadFacility();
    loadReferrals();
  }, [loadFacility, loadReferrals]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  useEffect(() => {
    if (facilityId) joinFacility(facilityId);
  }, [facilityId, joinFacility]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      loadTokens();
      loadFacility();
    };
    const refHandler = () => loadReferrals();
    socket.on("queue:updated", handler);
    socket.on("bed:updated", loadFacility);
    socket.on("referral:updated", refHandler);
    return () => {
      socket.off("queue:updated", handler);
      socket.off("bed:updated", loadFacility);
      socket.off("referral:updated", refHandler);
    };
  }, [socket, loadTokens, loadFacility, loadReferrals]);

  async function callNext() {
    if (!activeQueueId) return;
    setError(null);
    try {
      await api.post(`/queues/${activeQueueId}/call-next`);
      loadTokens();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function completeToken(tokenId: string) {
    await api.post(`/queues/tokens/${tokenId}/complete`);
    loadTokens();
  }

  async function updateBed(category: string, field: "occupied" | "reserved" | "cleaning", delta: number) {
    const bed = beds.find((b) => b.category === category);
    if (!bed || !facilityId) return;
    const nextValue = Math.max(0, (bed[field] as number) + delta);
    try {
      await api.put(`/beds/facility/${facilityId}`, { category, [field]: nextValue });
      loadFacility();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function respondReferral(id: string, action: "accept" | "reject") {
    if (action === "accept") {
      await api.post(`/referrals/${id}/accept`);
    } else {
      await api.post(`/referrals/${id}/reject`, { rejectionReason: "Facility at capacity for this specialty" });
    }
    loadReferrals();
  }

  async function progressReferral(id: string, endpoint: string) {
    try {
      await api.post(`/referrals/${id}/${endpoint}`);
      loadReferrals();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (!facilityId) return <div className="max-w-3xl mx-auto px-4 py-16 text-danger-500">No facility assigned to your account.</div>;
  if (!facility) return <div className="max-w-3xl mx-auto px-4 py-16 text-ink/50">Loading operations center…</div>;

  const waitingCount = tokens.filter((t) => t.status === "WAITING").length;
  const activeQueue = queues.find((q) => q._id === activeQueueId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <div className="label mb-1">Facility Operations Center</div>
          <h1 className="font-display text-2xl font-semibold">{facility.name}</h1>
        </div>
        <PressureBadge level={facility.pressureLevel} score={facility.pressureScore} />
      </div>

      {error && <p role="alert" className="text-sm text-danger-500 bg-danger-100 px-3 py-2 rounded mb-4">{error}</p>}

      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { label: "Today's Patients", value: tokens.length },
          { label: "Current Queue", value: waitingCount },
          { label: "Avg Wait", value: `${activeQueue?.averageConsultationMinutes ?? "-"} min` },
          { label: "Available Beds", value: beds.reduce((s, b) => s + Math.max(0, b.total - b.occupied - b.reserved - b.cleaning), 0) },
          { label: "Active Referrals", value: referrals.filter((r) => !["COMPLETED", "REJECTED", "CANCELLED"].includes(r.status)).length },
          { label: "Pressure Score", value: facility.pressureScore },
        ].map((k) => (
          <div key={k.label} className="card p-3 text-center">
            <div className="kpi-number !text-xl">{k.value}</div>
            <div className="text-[11px] text-ink/50 uppercase tracking-wide mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="label flex items-center gap-1.5"><PhoneCall size={14} /> Live Queue</div>
            <select className="input !w-auto !py-1 text-sm" value={activeQueueId} onChange={(e) => setActiveQueueId(e.target.value)}>
              {queues.map((q) => (
                <option key={q._id} value={q._id}>
                  {departments.find((d) => d._id === q.departmentId)?.name ?? "Department"} ({q.waiting} waiting)
                </option>
              ))}
            </select>
          </div>
          <button className="btn-accent w-full mb-4" onClick={callNext} disabled={waitingCount === 0}>
            Call Next
          </button>
          <ul className="flex flex-col divide-y divide-teal-50 max-h-80 overflow-y-auto">
            {tokens.filter((t) => t.status !== "COMPLETED").map((t) => (
              <li key={t._id} className="py-2 flex items-center justify-between text-sm">
                <span className="font-mono font-medium">
                  {t.tokenCode}
                  {t.priority !== "NORMAL" && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-danger-100 text-danger-500 font-semibold uppercase">
                      {t.priority}
                    </span>
                  )}
                </span>
                <span className="text-xs text-ink/50 uppercase tracking-wide">{t.status.replace(/_/g, " ")}</span>
                {(t.status === "CALLED" || t.status === "IN_CONSULTATION") && (
                  <button className="text-xs text-teal-500 font-medium underline" onClick={() => completeToken(t._id)}>
                    Mark complete
                  </button>
                )}
              </li>
            ))}
            {tokens.filter((t) => t.status !== "COMPLETED").length === 0 && (
              <li className="py-6 text-center text-sm text-ink/40">Queue is empty.</li>
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card p-5">
            <div className="label flex items-center gap-1.5 mb-3"><BedDouble size={14} /> Bed Capacity</div>
            <ul className="flex flex-col gap-3">
              {beds.map((b) => {
                const available = b.total - b.occupied - b.reserved - b.cleaning;
                return (
                  <li key={b._id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium w-28 shrink-0">{b.category}</span>
                    <span className={`w-16 text-right ${available > 0 ? "text-ok-500" : "text-danger-500"}`}>{Math.max(0, available)} free</span>
                    <div className="flex items-center gap-1 ml-auto">
                      <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => updateBed(b.category, "occupied", -1)}>Release</button>
                      <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => updateBed(b.category, "occupied", 1)}>Occupy</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card p-5">
            <div className="label flex items-center gap-1.5 mb-3"><GitBranch size={14} /> Referral Requests</div>
            <ul className="flex flex-col divide-y divide-teal-50 font-sans">
              {referrals.filter((r) => ["SENT", "RECEIVED", "ACCEPTED", "PATIENT_ARRIVED", "UNDER_CARE"].includes(r.status)).map((r) => (
                <li key={r._id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {r.departmentOrSpecialty}
                        {r.priority !== "NORMAL" && <AlertTriangle size={13} className="text-danger-500" />}
                      </div>
                      <p className="text-xs text-ink/50 mt-0.5">{r.reason}</p>
                      <span className="inline-block text-[10px] uppercase font-semibold tracking-wider text-teal-600 mt-1">
                        Status: {r.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0 align-middle items-center my-auto">
                      {(r.status === "SENT" || r.status === "RECEIVED") && (
                        <>
                          <button className="btn-primary !px-2 !py-1 text-xs" onClick={() => respondReferral(r._id, "accept")}>Accept</button>
                          <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => respondReferral(r._id, "reject")}>Reject</button>
                        </>
                      )}
                      {r.status === "ACCEPTED" && (
                        <button className="btn-primary !px-2 !py-1 text-xs" onClick={() => progressReferral(r._id, "patient-arrived")}>Arrived</button>
                      )}
                      {r.status === "PATIENT_ARRIVED" && (
                        <button className="btn-primary !px-2 !py-1 text-xs" onClick={() => progressReferral(r._id, "treatment-start")}>Start Care</button>
                      )}
                      {r.status === "UNDER_CARE" && (
                        <button className="btn-accent !px-2 !py-1 text-xs" onClick={() => progressReferral(r._id, "complete")}>Complete</button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              {referrals.filter((r) => ["SENT", "RECEIVED", "ACCEPTED", "PATIENT_ARRIVED", "UNDER_CARE"].includes(r.status)).length === 0 && (
                <li className="py-6 text-center text-sm text-ink/40">No active referral requests.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
