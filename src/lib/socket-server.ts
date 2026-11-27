import { Server } from "socket.io";
import http from "http";
import crypto from "crypto";
import { getSocketAuthSecret, verifySocketToken } from "./socket-auth";

function isAuthorizedInternalRequest(req: http.IncomingMessage, secret: string): boolean {
  const provided = req.headers["x-socket-secret"];
  if (typeof provided !== "string" || !provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const httpServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200);
    res.end("OK");
    return;
  }
  if (req.method === "POST" && req.url === "/notify") {
    let secret: string;
    try {
      secret = getSocketAuthSecret();
    } catch {
      res.writeHead(500);
      res.end();
      return;
    }

    if (!isAuthorizedInternalRequest(req, secret)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { userId, title, message } = JSON.parse(body);
        if (typeof userId !== "string" || !userId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Invalid userId" }));
          return;
        }
        io.to(`user:${userId}`).emit("notification", { title, message });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token) {
      return next(new Error("Unauthorized: missing token"));
    }
    const payload = verifySocketToken(token, getSocketAuthSecret());
    if (!payload) {
      return next(new Error("Unauthorized: invalid token"));
    }
    socket.data.userId = payload.userId;
    socket.data.role = payload.role;
    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId as string;
  socket.join(`user:${userId}`);
  console.log(`Authenticated user ${userId} connected (${socket.id})`);

  // Reject any attempt to subscribe to another user's room
  socket.on("register", (requestedUserId: unknown, ack?: (res: { ok: boolean; error?: string }) => void) => {
    if (requestedUserId !== userId) {
      ack?.({ ok: false, error: "Forbidden: cannot subscribe as another user" });
      return;
    }
    socket.join(`user:${userId}`);
    ack?.({ ok: true });
  });

  socket.on("disconnect", () => {
    console.log(`User ${userId} disconnected (${socket.id})`);
  });
});

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
