import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Phone, MapPin, Globe, Accessibility, BedDouble } from "lucide-react";
import { api, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PressureBadge } from "../components/PressureBadge";
import { Facility, Department, Bed, Queue } from "../lib/types";

export function FacilityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [facility, setFacility] = useState<Facility | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [queues, setQueues] = useState<(Queue & { waiting: number })[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/facilities/${id}`);
        setFacility(res.data.data.facility);
        setDepartments(res.data.data.departments);
        setBeds(res.data.data.beds);
        setQueues(res.data.data.queues);
        if (res.data.data.departments[0]) setSelectedDept(res.data.data.departments[0]._id);
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function takeToken() {
    if (!user) return navigate("/login");
    if (!selectedDept) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.post("/tokens", { facilityId: id, departmentId: selectedDept });
      navigate(`/citizen/token/${res.data.data.token._id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-ink/50">Loading facility…</div>;
  if (!facility) return <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-danger-500">Facility not found.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="label mb-1">{facility.type.replace(/_/g, " ")}</div>
          <h1 className="font-display text-3xl font-semibold">{facility.name}</h1>
        </div>
        <PressureBadge level={facility.pressureLevel} score={facility.pressureScore} />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/70 mt-3 mb-6">
        <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {facility.address}</span>
        <span className="inline-flex items-center gap-1.5"><Phone size={14} /> {facility.phone || "Not listed"}</span>
        <span className="inline-flex items-center gap-1.5"><Globe size={14} /> {facility.languagesSupported.join(", ")}</span>
        {facility.hasAccessibilityFacilities && (
          <span className="inline-flex items-center gap-1.5 text-ok-500"><Accessibility size={14} /> Accessible facilities available</span>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-6">
          {(!user || user.role === "CITIZEN") && (
            <div className="card p-5">
              <div className="label mb-3">Take a digital token</div>
              <div className="flex flex-col sm:flex-row gap-3">
                <select className="input" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
                  {departments.map((d) => {
                    const q = queues.find((qq) => qq.departmentId === d._id);
                    return (
                      <option key={d._id} value={d._id}>
                        {d.name} {q ? `(${q.waiting} waiting)` : ""}
                      </option>
                    );
                  })}
                </select>
                <button className="btn-accent shrink-0" onClick={takeToken} disabled={creating || !selectedDept}>
                  {creating ? "Generating…" : "Get Token"}
                </button>
              </div>
              {error && <p role="alert" className="text-sm text-danger-500 mt-3">{error}</p>}
            </div>
          )}

          <div className="card p-5">
            <div className="label mb-3">Services available</div>
            <div className="flex flex-wrap gap-2">
              {facility.services.map((s) => (
                <span key={s} className="text-xs px-2.5 py-1 rounded bg-teal-50 text-teal-600 font-medium">{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-5 h-fit">
          <div className="label mb-3 flex items-center gap-1.5"><BedDouble size={14} /> Bed availability</div>
          <ul className="flex flex-col gap-3">
            {beds.map((b) => {
              const available = b.total - b.occupied - b.reserved - b.cleaning;
              return (
                <li key={b._id}>
                  <div className="flex justify-between text-sm font-medium">
                    <span>{b.category}</span>
                    <span className={available > 0 ? "text-ok-500" : "text-danger-500"}>{Math.max(0, available)} available</span>
                  </div>
                  <div className="w-full h-1.5 bg-teal-50 rounded mt-1 overflow-hidden">
                    <div
                      className="h-full bg-teal-500"
                      style={{ width: `${b.total > 0 ? Math.min(100, (b.occupied / b.total) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-ink/40 mt-1">
                    Total {b.total} · Last updated {new Date(b.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </li>
              );
            })}
            {beds.length === 0 && <p className="text-sm text-ink/40">No bed data reported for this facility yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
