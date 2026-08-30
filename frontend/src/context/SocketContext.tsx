import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "../api/client";
import { useAuth } from "./AuthContext";

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string) || API_BASE_URL.replace(/\/api$/, "");

interface SocketContextValue {
  socket: Socket | null;
  joinFacility: (facilityId: string) => void;
  joinQueue: (queueId: string) => void;
  joinDistrict: (districtId: string) => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  joinFacility: () => {},
  joinQueue: () => {},
  joinDistrict: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    setSocket(s);

    s.on("connect", () => {
      if (token) s.emit("join:me", token);
    });

    return () => {
      s.disconnect();
    };
  }, [token]);

  const value: SocketContextValue = {
    socket,
    joinFacility: (facilityId: string) => socket?.emit("join:facility", facilityId),
    joinQueue: (queueId: string) => socket?.emit("join:queue", queueId),
    joinDistrict: (districtId: string) => socket?.emit("join:district", districtId),
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
