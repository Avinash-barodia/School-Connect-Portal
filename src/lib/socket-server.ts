import { Server } from "socket.io";
import http from "http";

const httpServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200);
    res.end("OK");
    return;
  }
  if (req.method === "POST" && req.url === "/notify") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { userId, title, message } = JSON.parse(body);
        const socketId = userSockets.get(userId);
        if (socketId) {
          io.to(socketId).emit("notification", { title, message });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "User not connected" }));
        }
      } catch (e) {
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

const userSockets = new Map<string, string>();

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("register", (userId: string) => {
    userSockets.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });

  // Internal event for backend to trigger notifications
  socket.on("sendNotification", ({ userId, title, message }: { userId: string, title: string, message: string }) => {
    console.log(`Received sendNotification for user ${userId}: ${title}`);
    const socketId = userSockets.get(userId);
    if (socketId) {
      console.log(`Forwarding notification to socket ${socketId}`);
      io.to(socketId).emit("notification", { title, message });
    } else {
      console.log(`User ${userId} not found in userSockets map. Current users: ${Array.from(userSockets.keys()).join(", ")}`);
    }
  });
});

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
