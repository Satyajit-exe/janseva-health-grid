import { Link } from "react-router-dom";
import { Search, Pill, Map, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function HomePage() {
  const { user } = useAuth();

  return (
    <div>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <div>
          <div className="label mb-3">SIH26133 · Government of Maharashtra</div>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight text-ink">
            Find Care. Know the Wait.
            <br />
            <span className="text-teal-500">Reach the Right Facility.</span>
          </h1>
          <p className="mt-5 text-ink/70 text-lg max-w-xl">
            JANSEVA HEALTH GRID is a live digital layer over Maharashtra's public healthcare facilities — showing
            queues, beds, medicines, and referrals before and during your visit.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/find-care" className="btn-primary">
              <Search size={16} /> Find the right care
            </Link>
            <Link to="/medicine-finder" className="btn-secondary">
              <Pill size={16} /> Medicine finder
            </Link>
            <Link to="/transparency" className="btn-secondary">
              <Map size={16} /> Public dashboard
            </Link>
          </div>
          {!user && (
            <p className="mt-6 text-sm text-ink/60">
              Already registered?{" "}
              <Link to="/login" className="text-teal-500 font-medium underline">
                Log in
              </Link>{" "}
              or{" "}
              <Link to="/register" className="text-teal-500 font-medium underline">
                create a citizen account
              </Link>
              .
            </p>
          )}
        </div>

        <div className="card p-6">
          <div className="label mb-4">The Healthcare Journey</div>
          <ol className="flex flex-col gap-3 font-mono text-sm">
            {[
              "Searched Facility",
              "Selected Service",
              "Digital Token",
              "Check-In",
              "Waiting",
              "Doctor Consultation",
              "Medicine",
              "Referral / Follow-up",
              "Care Completed",
            ].map((step, i, arr) => (
              <li key={step} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-500 flex items-center justify-center text-[11px] font-semibold shrink-0">
                  {i + 1}
                </span>
                <span className={i === arr.length - 1 ? "text-teal-600 font-medium" : "text-ink/70"}>{step}</span>
                {i < arr.length - 1 && <ArrowRight size={12} className="text-teal-200 ml-auto shrink-0" />}
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
