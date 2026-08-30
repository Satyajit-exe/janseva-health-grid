import { useEffect, useState, useCallback, FormEvent } from "react";
import { Pill, AlertTriangle, Plus, Minus } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Medicine } from "../../lib/types";

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-ok-100 text-ok-500",
  LOW_STOCK: "bg-warn-100 text-warn-500",
  OUT_OF_STOCK: "bg-danger-100 text-danger-500",
  EXPIRED: "bg-danger-100 text-danger-500",
};

export function PharmacyDashboard() {
  const { user } = useAuth();
  const facilityId = user?.facilityId;

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", genericName: "", batchNumber: "", quantity: 100, minimumThreshold: 20, expiryDate: "2027-01-01" });

  const load = useCallback(async () => {
    if (!facilityId) return;
    try {
      const res = await api.get(`/medicines/facility/${facilityId}`);
      setMedicines(res.data.data.medicines);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, [facilityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function adjustStock(id: string, delta: number) {
    try {
      await api.post(`/medicines/${id}/stock`, {
        quantityChange: delta,
        type: delta > 0 ? "STOCK_IN" : "DISPENSED",
        reason: delta > 0 ? "Restock" : "Dispensed to patient",
      });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function addMedicine(e: FormEvent) {
    e.preventDefault();
    if (!facilityId) return;
    try {
      await api.post("/medicines", { ...form, facilityId });
      setShowForm(false);
      setForm({ name: "", genericName: "", batchNumber: "", quantity: 100, minimumThreshold: 20, expiryDate: "2027-01-01" });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const alerts = medicines.filter((m) => m.status === "LOW_STOCK" || m.status === "OUT_OF_STOCK" || m.status === "EXPIRED");

  if (!facilityId) return <div className="max-w-3xl mx-auto px-4 py-16 text-danger-500">No facility assigned to your account.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="label mb-1 flex items-center gap-1.5"><Pill size={14} /> Pharmacy Inventory</div>
          <h1 className="font-display text-2xl font-semibold">Medicine Stock</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          <Plus size={16} /> Add Medicine
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-danger-500 bg-danger-100 px-3 py-2 rounded mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={addMedicine} className="card p-5 mb-6 grid sm:grid-cols-2 gap-3">
          <input required placeholder="Medicine name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required placeholder="Generic name" className="input" value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} />
          <input required placeholder="Batch number" className="input" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
          <input required type="date" className="input" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          <input required type="number" min={0} placeholder="Quantity" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          <input required type="number" min={0} placeholder="Minimum threshold" className="input" value={form.minimumThreshold} onChange={(e) => setForm({ ...form, minimumThreshold: Number(e.target.value) })} />
          <button type="submit" className="btn-primary sm:col-span-2">Save medicine</button>
        </form>
      )}

      {alerts.length > 0 && (
        <div className="card p-4 mb-6 border-warn-500 bg-warn-100">
          <div className="flex items-center gap-1.5 text-warn-500 font-semibold text-sm mb-2">
            <AlertTriangle size={14} /> {alerts.length} medicine(s) need attention
          </div>
          <ul className="text-sm text-ink/70 flex flex-col gap-0.5">
            {alerts.map((m) => (
              <li key={m._id}>{m.name} — {m.status.replace(/_/g, " ")}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-teal-50 text-teal-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2">Medicine</th>
              <th className="text-left px-4 py-2">Batch</th>
              <th className="text-left px-4 py-2">Quantity</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-50">
            {medicines.map((m) => (
              <tr key={m._id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-ink/40">{m.genericName}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{m.batchNumber}</td>
                <td className="px-4 py-3 tabular-nums">{m.quantity}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${STATUS_STYLES[m.status]}`}>{m.status.replace(/_/g, " ")}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button className="btn-secondary !px-2 !py-1" onClick={() => adjustStock(m._id, -10)} aria-label="Dispense 10">
                      <Minus size={12} />
                    </button>
                    <button className="btn-secondary !px-2 !py-1" onClick={() => adjustStock(m._id, 10)} aria-label="Restock 10">
                      <Plus size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {medicines.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-ink/40">No medicines recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
