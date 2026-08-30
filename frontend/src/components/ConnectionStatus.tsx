import { useEffect, useState } from "react";

export function ConnectionStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [lastSynced, setLastSynced] = useState(new Date());

  useEffect(() => {
    function goOnline() {
      setOnline(true);
      setLastSynced(new Date());
    }
    function goOffline() {
      setOnline(false);
    }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={`w-2 h-2 rounded-full ${online ? "bg-ok-500" : "bg-danger-500"}`} aria-hidden="true" />
      {online ? (
        <span className="text-ink/60">
          ONLINE · Last synced {lastSynced.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      ) : (
        <span className="text-danger-500">OFFLINE · Changes will sync automatically when connection returns.</span>
      )}
    </div>
  );
}
