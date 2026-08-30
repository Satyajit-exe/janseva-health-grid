import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_HOME } from "../lib/roleHome";

const DEMO_ACCOUNTS = [
  { role: "Citizen (Priya)", email: "priya.citizen@example.com" },
  { role: "Citizen (Ramesh - EMR)", email: "ramesh.citizen@example.com" },
  { role: "Citizen (Fatima)", email: "fatima.citizen@example.com" },
  { role: "Doctor (Sion OPD)", email: "doctor.sion@janseva.gov.in" },
  { role: "Doctor (Nagpur Cardio)", email: "doctor.cardio.nagpur@janseva.gov.in" },
  { role: "Facility Staff (Sion)", email: "staff.sion@janseva.gov.in" },
  { role: "Pharmacy Staff (Sion)", email: "pharmacy.sion@janseva.gov.in" },
  { role: "Facility Admin (Sion)", email: "admin.sion@janseva.gov.in" },
  { role: "District Admin (Mumbai)", email: "district.mumbai@janseva.gov.in" },
  { role: "State Admin", email: "state.admin@janseva.gov.in" },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Demo@1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(ROLE_HOME[user.role] || "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-10">
      <div>
        <h1 className="font-display text-2xl font-semibold mb-1">Log in to JANSEVA</h1>
        <p className="text-ink/60 text-sm mb-6">Access your citizen, facility, or administrative dashboard.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" required className="input mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-danger-500 bg-danger-100 px-3 py-2 rounded">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-sm text-ink/60">
          New citizen?{" "}
          <Link to="/register" className="text-teal-500 font-medium underline">
            Create an account
          </Link>
        </p>
      </div>

      <div className="card p-5 h-fit">
        <div className="label mb-3">Demo accounts (judges)</div>
        <p className="text-xs text-ink/50 mb-3">Password for every demo account: <code className="font-mono bg-teal-50 px-1 rounded">Demo@1234</code></p>
        <ul className="flex flex-col divide-y divide-teal-50">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email} className="py-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{a.role}</span>
              <button
                type="button"
                className="text-xs font-mono text-teal-500 hover:underline"
                onClick={() => setEmail(a.email)}
              >
                {a.email}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
