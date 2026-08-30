import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Pill, Route, GitBranch, Ticket, Clock } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { QueueToken } from "../lib/types";

export function CitizenDashboard() {
  const { user } = useAuth();
  const [recentTokens, setRecentTokens] = useState<QueueToken[]>([]);

  useEffect(() => {
    api.get("/tokens/mine").then((res) => setRecentTokens(res.data.data.tokens.slice(0, 3))).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const cards = [
    { to: "/find-care", icon: Search, title: "Find Care", desc: "Search facilities by service, distance, and wait time." },
    { to: "/medicine-finder", icon: Pill, title: "Medicine Finder", desc: "Check medicine availability nearby." },
    { to: "/citizen/journey", icon: Route, title: "My Care Journey", desc: "Track your visit from search to follow-up." },
    { to: "/citizen/referrals", icon: GitBranch, title: "My Referrals", desc: "See status of referrals to other facilities." },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h1 className="font-display text-3xl font-semibold">{greeting}, {user?.name?.split(" ")[0]}</h1>
        <ConnectionStatus />
      </div>
      <p className="text-ink/60 mb-8">What healthcare service do you need today?</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="card p-5 hover:border-teal-400 transition-colors flex flex-col gap-3">
            <div className="w-9 h-9 rounded bg-teal-50 text-teal-500 flex items-center justify-center">
              <c.icon size={18} />
            </div>
            <div>
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-ink/50 mt-1">{c.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="label flex items-center gap-1.5"><Ticket size={14} /> My Recent Tokens</div>
          <Link to="/find-care" className="text-xs text-teal-500 font-medium underline">Take a new token</Link>
        </div>
        {recentTokens.length === 0 ? (
          <p className="text-sm text-ink/40 py-4 text-center">No tokens yet. Find a facility to get started.</p>
        ) : (
          <ul className="divide-y divide-teal-50">
            {recentTokens.map((t) => (
              <li key={t._id}>
                <Link to={`/citizen/token/${t._id}`} className="flex items-center justify-between py-3 text-sm hover:text-teal-500">
                  <span className="font-mono font-medium">{t.tokenCode}</span>
                  <span className="inline-flex items-center gap-1.5 text-ink/50">
                    <Clock size={13} /> {new Date(t.createdAt).toLocaleDateString("en-IN")}
                  </span>
                  <span className="text-xs uppercase tracking-wide font-semibold text-teal-500">{t.status.replace(/_/g, " ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
