import { useEffect, useState, useCallback } from "react";
import { Stethoscope, GitBranch } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { QueueToken, Facility } from "../../lib/types";

export function DoctorDashboard() {
  const { user } = useAuth();
  const { socket, joinQueue } = useSocket();
  const facilityId = user?.facilityId;

  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [queueId, setQueueId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<{ facility: Facility; rankScore: number }[]>([]);
  const [referralTarget, setReferralTarget] = useState<QueueToken | null>(null);
  const [specialty, setSpecialty] = useState("Cardiology");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    if (!facilityId) return;
    const facilityRes = await api.get(`/facilities/${facilityId}`);
    const queues = facilityRes.data.data.queues;
    
    // Find the queue that matches the doctor's departmentId
    const doctorDeptId = (user as any)?.doctorProfile?.departmentId;
    let activeQueue = queues.find((q: any) => q.departmentId === doctorDeptId);
    
    // Fallback to queues[0] if no specific department match is found
    if (!activeQueue && queues[0]) {
      activeQueue = queues[0];
    }
    
    if (activeQueue) {
      setQueueId(activeQueue._id);
      const qRes = await api.get(`/queues/${activeQueue._id}`);
      setTokens(qRes.data.data.tokens);
    }
  }, [facilityId, user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (queueId) joinQueue(queueId);
  }, [queueId, joinQueue]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      load();
    };
    socket.on("queue:updated", handler);
    socket.on("token:called", handler);
    return () => {
      socket.off("queue:updated", handler);
      socket.off("token:called", handler);
    };
  }, [socket, load]);

  async function callNext() {
    if (!queueId) return;
    try {
      await api.post(`/queues/${queueId}/call-next`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function startConsultation(tokenId: string) {
    await api.post(`/queues/tokens/${tokenId}/consultation-start`);
    load();
  }

  async function completeConsultation(tokenId: string) {
    await api.post(`/queues/tokens/${tokenId}/complete`);
    load();
  }

  async function openReferral(token: QueueToken) {
    setReferralTarget(token);
    setRecommendations([]);
    if (!facilityId) return;
    try {
      const res = await api.get("/referrals/recommend", { params: { facilityId, specialty } });
      setRecommendations(res.data.data.recommendations);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function createReferral(receivingFacilityId: string) {
    if (!referralTarget || !facilityId) return;
    try {
      await api.post("/referrals", {
        patientId: referralTarget.patientId,
        sendingFacilityId: facilityId,
        receivingFacilityId,
        departmentOrSpecialty: specialty,
        reason: reason || `Referred for ${specialty} evaluation`,
        priority: referralTarget.priority || "NORMAL",
      });
      
      // Auto-complete the consultation token at the sending facility
      await api.post(`/queues/tokens/${referralTarget._id}/complete`);
      
      setReferralTarget(null);
      setReason("");
      load(); // Reload the doctor console
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const waiting = tokens.filter((t) => t.status === "WAITING");
  const current = tokens.find((t) => t.status === "CALLED" || t.status === "IN_CONSULTATION");

  if (!facilityId) return <div className="max-w-3xl mx-auto px-4 py-16 text-danger-500">No facility assigned to your account.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="label mb-1 flex items-center gap-1.5"><Stethoscope size={14} /> Doctor Console</div>
      <h1 className="font-display text-2xl font-semibold mb-6">Today's Queue</h1>

      {error && <p role="alert" className="text-sm text-danger-500 bg-danger-100 px-3 py-2 rounded mb-4">{error}</p>}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="label mb-3">Current Patient</div>
          {current ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-2xl font-semibold">{current.tokenCode}</div>
                <div className="text-xs text-ink/50 uppercase mt-1">{current.status.replace(/_/g, " ")}</div>
              </div>
              <div className="flex gap-2">
                {current.status === "CALLED" && (
                  <button className="btn-secondary text-sm" onClick={() => startConsultation(current._id)}>Start</button>
                )}
                <button className="btn-primary text-sm" onClick={() => completeConsultation(current._id)}>Complete</button>
                <button className="btn-accent text-sm" onClick={() => openReferral(current)}>
                  <GitBranch size={14} /> Refer
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-ink/40 py-6 text-center">No patient currently being seen.</div>
          )}
          <button className="btn-secondary w-full mt-4" onClick={callNext} disabled={waiting.length === 0}>
            Call Next Patient
          </button>
        </div>

        <div className="card p-5">
          <div className="label mb-3">Upcoming Patients ({waiting.length})</div>
          <ul className="flex flex-col divide-y divide-teal-50 max-h-72 overflow-y-auto">
            {waiting.map((t) => (
              <li key={t._id} className="py-2 flex items-center justify-between text-sm">
                <span className="font-mono">{t.tokenCode}</span>
                {t.priority !== "NORMAL" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger-100 text-danger-500 font-semibold uppercase">{t.priority}</span>
                )}
              </li>
            ))}
            {waiting.length === 0 && <li className="py-6 text-center text-sm text-ink/40">No one waiting.</li>}
          </ul>
        </div>
      </div>

      {referralTarget && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
          <div className="card p-6 w-full max-w-lg bg-surface">
            <h2 className="font-display text-lg font-semibold mb-1">Create Referral</h2>
            <p className="text-sm text-ink/50 mb-4">Recommended nearby facilities for {specialty} — decision support only.</p>

            <div className="flex gap-2 mb-3">
              <input className="input" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Specialty" />
              <button className="btn-secondary shrink-0 text-sm" onClick={() => openReferral(referralTarget)}>Refresh</button>
            </div>
            <textarea className="input mb-4" rows={2} placeholder="Reason for referral" value={reason} onChange={(e) => setReason(e.target.value)} />

            <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto mb-4">
              {recommendations.map((r) => (
                <li key={r.facility._id} className="flex items-center justify-between border border-teal-100 rounded p-3">
                  <div>
                    <div className="font-medium text-sm">{r.facility.name}</div>
                    <div className="text-xs text-ink/50">Pressure score: {r.facility.pressureScore}</div>
                  </div>
                  <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => createReferral(r.facility._id)}>
                    Create Referral
                  </button>
                </li>
              ))}
              {recommendations.length === 0 && <li className="text-sm text-ink/40 text-center py-4">No nearby facilities found for this specialty.</li>}
            </ul>

            <button className="btn-secondary w-full" onClick={() => setReferralTarget(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
