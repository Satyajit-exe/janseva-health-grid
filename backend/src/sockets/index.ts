import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";

let io: Server | null = null;

export function initSockets(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || "*", credentials: true },
  });

  io.on("connection", (socket: Socket) => {
    // Clients join rooms explicitly after connecting, based on what they're viewing.
    // Auth token is optional here (public transparency dashboards can watch facility/district
    // rooms without logging in), but user-scoped rooms are only joined if the token is valid.
    socket.on("join:facility", (facilityId: string) => {
      if (facilityId) socket.join(`facility:${facilityId}`);
    });

    socket.on("join:queue", (queueId: string) => {
      if (queueId) socket.join(`queue:${queueId}`);
    });

    socket.on("join:district", (districtId: string) => {
      if (districtId) socket.join(`district:${districtId}`);
    });

    socket.on("join:me", (token: string) => {
      try {
        const payload = verifyToken(token);
        socket.join(`user:${payload.sub}`);
      } catch {
        // ignore - socket simply won't receive user-scoped events
      }
    });

    socket.on("disconnect", () => {
      // no-op; rooms are cleaned up automatically by socket.io
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO not initialized yet");
  return io;
}

/** Convenience emitters used by services so route/service code never touches io directly. */
export const emit = {
  toFacility: (facilityId: string, event: string, payload: unknown) => {
    if (io) io.to(`facility:${facilityId}`).emit(event, payload);
  },
  toQueue: (queueId: string, event: string, payload: unknown) => {
    if (io) io.to(`queue:${queueId}`).emit(event, payload);
  },
  toDistrict: (districtId: string, event: string, payload: unknown) => {
    if (io) io.to(`district:${districtId}`).emit(event, payload);
  },
  toUser: (userId: string, event: string, payload: unknown) => {
    if (io) io.to(`user:${userId}`).emit(event, payload);
  },
};

