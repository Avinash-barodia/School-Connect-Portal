"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let socketPromise: Promise<Socket | null> | null = null;

export const getAuthenticatedSocket = async (): Promise<Socket | null> => {
  if (socket && socket.connected) {
    return socket;
  }

  if (!socketPromise) {
    socketPromise = (async () => {
      try {
        const res = await fetch("/api/socket-token");
        if (!res.ok) return null;
        const { token } = (await res.json()) as { token?: string };
        if (!token) return null;

        const socketUrl =
          process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002";
        socket = io(socketUrl, {
          auth: { token },
        });
        return socket;
      } catch (err) {
        console.error("Failed to initialize authenticated socket:", err);
        return null;
      } finally {
        socketPromise = null;
      }
    })();
  }

  return socketPromise;
};
