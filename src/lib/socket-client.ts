"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (userId: string) => {
  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002";
    socket = io(socketUrl);
    socket.on("connect", () => {
      console.log("Connected to WebSocket server");
      socket?.emit("register", userId);
    });
  }
  return socket;
};
