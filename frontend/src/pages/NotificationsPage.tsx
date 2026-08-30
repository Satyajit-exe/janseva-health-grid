import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { api, apiErrorMessage } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { NotificationItem } from "../lib/types";

export function NotificationsPage() {
  const { socket } = useSocket();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await api.get("/notifications");
      setItems(res.data.data.notifications);
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
    const handler = (n: NotificationItem) => setItems((prev) => [n, ...prev]);
    socket.on("notification:new", handler);
    return () => {
      socket.off("notification:new", handler);
    };
  }, [socket]);

  async function markAllRead() {
    await api.post("/notifications/read-all");
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-16 text-ink/50">Loading notifications…</div>;
  if (error) return <div className="max-w-2xl mx-auto px-4 py-16 text-danger-500">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-semibold">Notifications</h1>
        {items.some((n) => !n.isRead) && (
          <button onClick={markAllRead} className="btn-secondary !py-1.5 !px-3 text-sm">
            <Check size={14} /> Mark all read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-ink/50 flex flex-col items-center gap-2">
          <Bell size={24} className="text-teal-200" />
          You're all caught up.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li key={n._id} className={`card p-4 ${!n.isRead ? "border-teal-400" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium text-sm">{n.title}</div>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-saffron-500 shrink-0 mt-1" />}
              </div>
              <p className="text-sm text-ink/60 mt-1">{n.message}</p>
              <div className="text-xs text-ink/40 mt-2">
                {new Date(n.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
