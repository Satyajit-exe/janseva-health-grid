import { Link, useNavigate, useLocation } from "react-router-dom";
import { Activity, Bell, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { api } from "../api/client";
import { useState, useEffect } from "react";

const ROLE_HOME: Record<string, string> = {
  CITIZEN: "/citizen",
  FACILITY_STAFF: "/facility",
  DOCTOR: "/doctor",
  PHARMACY_STAFF: "/pharmacy",
  FACILITY_ADMIN: "/facility",
  DISTRICT_ADMIN: "/district",
  STATE_ADMIN: "/state",
};

export function Navbar() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    (async () => {
      try {
        const res = await api.get("/notifications");
        setUnreadCount(res.data.data.unreadCount || 0);
      } catch {
        // ignore
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!socket || !user) return;
    const handler = () => {
      setUnreadCount((c) => c + 1);
    };
    socket.on("notification:new", handler);
    return () => {
      socket.off("notification:new", handler);
    };
  }, [socket, user]);

  useEffect(() => {
    if (location.pathname === "/notifications") {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-teal-100">
      <div className="gov-strip" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to={user ? ROLE_HOME[user.role] : "/"} className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded bg-teal-500 text-white flex items-center justify-center">
            <Activity size={18} strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold text-teal-500 text-sm sm:text-base">JANSEVA HEALTH GRID</div>
            <div className="text-[10px] uppercase tracking-wider text-teal-400 hidden sm:block">Govt. of Maharashtra</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ink/80">
          <Link to="/find-care" className="hover:text-teal-500">Find Care</Link>
          <Link to="/medicine-finder" className="hover:text-teal-500">Medicine Finder</Link>
          <Link to="/transparency" className="hover:text-teal-500">Public Dashboard</Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/notifications" className="relative p-2 rounded hover:bg-teal-50 text-teal-600" aria-label="Notifications">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-danger-500 border border-surface" />
                )}
              </Link>
              <div className="hidden sm:block text-right leading-tight">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-[11px] uppercase tracking-wide text-teal-500">{user.role.replace(/_/g, " ")}</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="p-2 rounded hover:bg-teal-50 text-teal-600"
                aria-label="Log out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-secondary !px-3 !py-1.5 text-sm">Log in</Link>
              <Link to="/register" className="btn-primary !px-3 !py-1.5 text-sm">Register</Link>
            </div>
          )}
          <button className="md:hidden p-2" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-teal-100 px-4 py-3 flex flex-col gap-3 text-sm font-medium">
          <Link to="/find-care" onClick={() => setOpen(false)}>Find Care</Link>
          <Link to="/medicine-finder" onClick={() => setOpen(false)}>Medicine Finder</Link>
          <Link to="/transparency" onClick={() => setOpen(false)}>Public Dashboard</Link>
        </div>
      )}
    </header>
  );
}
