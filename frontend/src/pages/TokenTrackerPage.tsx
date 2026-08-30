import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { api, apiErrorMessage } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { TokenBoard } from "../components/TokenBoard";
import { QueueToken, Queue, WaitEstimate } from "../lib/types";

export function TokenTrackerPage() {
  const { id } = useParams();
  const { joinQueue, socket } = useSocket();

  const [token, setToken] = useState<QueueToken | null>(null);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [wait, setWait] = useState<WaitEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get(`/tokens/${id}`);
      setToken(res.data.data.token);
      setQueue(res.data.data.queue);
      setWait(res.data.data.wait);
      if (res.data.data.token.checkedInAt) setCheckedIn(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (queue?._id) joinQueue(queue._id);
  }, [queue?._id, joinQueue]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => refresh();
    socket.on("queue:updated", handler);
    socket.on("token:called", handler);
    return () => {
      socket.off("queue:updated", handler);
      socket.off("token:called", handler);
    };
  }, [socket, refresh]);

  async function checkIn() {
    if (!token) return;
    try {
      await api.post(`/tokens/${token._id}/check-in`);
      setCheckedIn(true);
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (error) return <div className="max-w-xl mx-auto px-4 py-16 text-danger-500">{error}</div>;
  if (!token || !queue) return <div className="max-w-xl mx-auto px-4 py-16 text-ink/50">Loading your token…</div>;

  const called = token.status === "CALLED" || token.status === "IN_CONSULTATION";
  const completed = token.status === "COMPLETED";

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Your Token</h1>
        <p className="text-ink/60 text-sm">Updates live — no need to refresh this page.</p>
      </div>

      {completed ? (
        <div className="card p-8 text-center flex flex-col items-center gap-3">
          <CheckCircle2 size={40} className="text-ok-500" />
          <div className="font-display text-xl font-semibold">Consultation completed</div>
          <p className="text-ink/60 text-sm">Check your Care Journey for medicine and follow-up details.</p>
          <Link to="/citizen/journey" className="btn-primary mt-2">View my care journey</Link>
        </div>
      ) : (
        <>
          <TokenBoard queue={queue} myToken={token} wait={wait ?? undefined} />

          {called && (
            <div className="card p-4 bg-saffron-50 border-saffron-500 text-saffron-600 font-medium text-sm">
              You're being called — please proceed to the counter/consultation room now.
            </div>
          )}

          {!checkedIn && !called && (
            <button className="btn-primary" onClick={checkIn}>
              I've arrived — Check in
            </button>
          )}
          {checkedIn && !called && (
            <div className="text-sm text-ok-500 font-medium">✓ Checked in — waiting to be called.</div>
          )}

          <div className="card p-4 text-sm text-ink/60">
            Queue status: <strong className="text-ink">{queue.currentTokenNumber < token.sequenceNumber ? "MODERATE" : "ALMOST YOUR TURN"}</strong>
          </div>
        </>
      )}
    </div>
  );
}
