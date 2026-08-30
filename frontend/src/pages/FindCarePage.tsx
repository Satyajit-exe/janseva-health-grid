import { useEffect, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { api, apiErrorMessage } from "../api/client";
import { Facility } from "../lib/types";
import { FacilityCard } from "../components/FacilityCard";

export function FindCarePage() {
  const [q, setQ] = useState("");
  const [service, setService] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      if (q) params.q = q;
      if (service) params.service = service;
      if (coords) {
        params.lat = coords.lat;
        params.lng = coords.lng;
      }
      const res = await api.get("/facilities/search", { params });
      setFacilities(res.data.data.facilities);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }

  const commonServices = ["OPD", "Emergency", "Cardiology", "Maternal Health", "Pediatrics", "Orthopedics"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl font-semibold mb-1">Find the Right Care</h1>
      <p className="text-ink/60 mb-6">Ranked by service match, distance, live queue, and facility pressure.</p>

      <div className="card p-4 mb-6 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-400" />
            <input
              className="input pl-9"
              placeholder="Search by facility name or problem (e.g. fever, fracture)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
          </div>
          <button type="button" onClick={useMyLocation} className="btn-secondary shrink-0">
            <MapPin size={16} /> {coords ? "Location set" : "Use my location"}
          </button>
          <button type="button" onClick={runSearch} className="btn-primary shrink-0">
            Search
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {commonServices.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setService(s === service ? "" : s);
                setTimeout(runSearch, 0);
              }}
              className={`text-xs px-3 py-1 rounded-full border font-medium ${
                service === s ? "bg-teal-500 text-white border-teal-500" : "border-teal-200 text-teal-600 hover:bg-teal-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-danger-500 bg-danger-100 px-3 py-2 rounded mb-4">{error}</p>}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 h-40 animate-pulse bg-teal-50/50" />
          ))}
        </div>
      ) : facilities.length === 0 ? (
        <div className="card p-10 text-center text-ink/60">
          No facilities matched your search. Try a broader term or clear the service filter.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((f) => (
            <FacilityCard key={f._id} facility={f} />
          ))}
        </div>
      )}
    </div>
  );
}
