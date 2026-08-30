import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { JourneyTimeline } from "../components/JourneyTimeline";
import { CareJourney } from "../lib/types";

export function CareJourneyPage() {
  const { socket } = useSocket();
  const [journey, setJourney] = useState<CareJourney | null>(null);
  const [history, setHistory] = useState<CareJourney[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [activeRes, historyRes] = await Promise.all([
        api.get("/care-journey/active"),
        api.get("/care-journey/history"),
      ]);
      setJourney(activeRes.data.data.journey);
      setHistory(historyRes.data.data.journeys);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => load();
    socket.on("care-journey:updated", handler);
    return () => {
      socket.off("care-journey:updated", handler);
    };
  }, [socket]);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-16 text-ink/50">Loading your care journey…</div>;
  if (error) return <div className="max-w-3xl mx-auto px-4 py-16 text-danger-500">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl font-semibold mb-1">My Care Journey</h1>
      <p className="text-ink/60 mb-8">Every step of your healthcare visit, timestamped and traceable.</p>

      {journey ? (
        <div className="card p-6 mb-8">
          <JourneyTimeline journey={journey} />
        </div>
      ) : (
        <div className="card p-10 text-center text-ink/50 mb-8">
          No active journey right now. Take a token at a facility to start one.
        </div>
      )}

      {history.length > 0 && (
        <>
          <div className="label mb-3">Past visits</div>
          <ul className="flex flex-col gap-3">
            {history
              .filter((j) => j._id !== journey?._id)
              .map((j) => (
                <li key={j._id} className="card p-4 flex items-center justify-between text-sm">
                  <span>Started {new Date(j.startedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                  <span className={j.isActive ? "text-saffron-600 font-medium" : "text-ok-500 font-medium"}>
                    {j.isActive ? "In progress" : "Completed"}
                  </span>
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}
