import { useState, FormEvent } from "react";
import { Search, MapPin } from "lucide-react";
import { api, apiErrorMessage } from "../api/client";
import { MedicineSearchResult } from "../lib/types";

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-ok-100 text-ok-500",
  LOW_STOCK: "bg-warn-100 text-warn-500",
  OUT_OF_STOCK: "bg-danger-100 text-danger-500",
  EXPIRED: "bg-danger-100 text-danger-500",
};

export function MedicineFinderPage() {
  const [q, setQ] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [results, setResults] = useState<MedicineSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { q };
      if (coords) {
        params.lat = coords.lat;
        params.lng = coords.lng;
      }
      const res = await api.get("/medicines/search", { params });
      setResults(res.data.data.results);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl font-semibold mb-1">Medicine Finder</h1>
      <p className="text-ink/60 mb-6">Check availability across nearby public facilities. No patient information is ever shown.</p>

      <form onSubmit={search} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-400" />
          <input className="input pl-9" placeholder="e.g. Paracetamol" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button type="button" onClick={useMyLocation} className="btn-secondary shrink-0">
          <MapPin size={16} /> {coords ? "Location set" : "Use my location"}
        </button>
        <button type="submit" className="btn-primary shrink-0" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p role="alert" className="text-sm text-danger-500 bg-danger-100 px-3 py-2 rounded mb-4">{error}</p>}

      {results && (
        results.length === 0 ? (
          <div className="card p-10 text-center text-ink/50">No results for "{q}". Try a different or more generic name.</div>
        ) : (
          <ul className="flex flex-col gap-3">
            {results.map((r) => (
              <li key={`${r.medicineId}`} className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-teal-700">{r.name}</div>
                  <div className="text-xs text-ink/50 mb-2">Generic: {r.genericName}</div>
                  <div className="font-medium text-sm text-ink/90">{r.facility?.name ?? "Unknown facility"}</div>
                  <div className="text-xs text-ink/50">{r.facility?.address}</div>
                  <div className="text-xs text-ink/40 mt-2">
                    Last updated {new Date(r.lastUpdated).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {r.distanceKm !== undefined && <div className="text-sm text-teal-600 font-medium mb-1">{r.distanceKm} km</div>}
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wide ${STATUS_STYLES[r.status]}`}>
                    {r.status.replace(/_/g, " ")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
