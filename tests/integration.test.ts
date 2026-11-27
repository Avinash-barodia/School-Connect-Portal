import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
import Module from "node:module";
import path from "node:path";
import { Server } from "socket.io";
import { io as ioClient } from "socket.io-client";
import { createSocketToken, verifySocketToken } from "../src/lib/socket-auth";

const TEST_SECRET = "integration-test-socket-secret-32chars";
process.env.SOCKET_AUTH_SECRET = TEST_SECRET;

type MockAuth = { userId: string | null; role: string | null };
let currentAuth: MockAuth = { userId: null, role: null };

const dbCalls: Array<{ model: string; op: string; args: any }> = [];

const mockPrisma = {
  subject: {
    create: async (args: any) => {
      dbCalls.push({ model: "subject", op: "create", args });
      return { id: 1, ...args.data };
    },
    delete: async (args: any) => {
      dbCalls.push({ model: "subject", op: "delete", args });
      return { id: args.where.id };
    },
  },
  class: {
    findFirst: async ({ where }: any) => {
      const isTeacher1 = where.OR?.some(
        (c: any) => c.supervisorId === "teacher_1" || c.lessons?.some?.teacherId === "teacher_1"
      );
      return where.id === 10 && isTeacher1 ? { id: 10 } : null;
    },
  },
  lesson: {
    findFirst: async ({ where }: any) =>
      where.id === 20 && where.teacherId === "teacher_1"
        ? { id: 20, classId: 10 }
        : null,
    findUnique: async ({ where }: any) =>
      where.id === 20 ? { classId: 10, teacherId: "teacher_1" } : null,
  },
  assignment: {
    create: async (args: any) => {
      dbCalls.push({ model: "assignment", op: "create", args });
      return {
        id: 101,
        ...args.data,
        class: { students: [] },
        subject: { name: "Math" },
      };
    },
    findUnique: async ({ where }: any) => {
      if (where.id === 101) {
        return { teacherId: "teacher_1", lesson: { teacherId: "teacher_1" } };
      }
      if (where.id === 102) {
        return { teacherId: "teacher_2", lesson: { teacherId: "teacher_2" } };
      }
      return null;
    },
    update: async (args: any) => {
      dbCalls.push({ model: "assignment", op: "update", args });
      return { id: args.where.id };
    },
    delete: async (args: any) => {
      dbCalls.push({ model: "assignment", op: "delete", args });
      return { id: args.where.id };
    },
  },
  result: {
    findUnique: async ({ where }: any) => {
      if (where.id === 301) {
        return { exam: { lesson: { teacherId: "teacher_1" } }, assignment: null };
      }
      if (where.id === 302) {
        return { exam: { lesson: { teacherId: "teacher_2" } }, assignment: null };
      }
      return null;
    },
    delete: async (args: any) => {
      dbCalls.push({ model: "result", op: "delete", args });
      return { id: args.where.id };
    },
  },
  event: {
    delete: async (args: any) => {
      dbCalls.push({ model: "event", op: "delete", args });
      return { id: args.where.id };
    },
  },
  announcement: {
    delete: async (args: any) => {
      dbCalls.push({ model: "announcement", op: "delete", args });
      return { id: args.where.id };
    },
  },
  notification: {
    count: async (args: any) => {
      dbCalls.push({ model: "notification", op: "count", args });
      return 3;
    },
    updateMany: async (args: any) => {
      dbCalls.push({ model: "notification", op: "updateMany", args });
      return { count: 3 };
    },
  },
};

// Intercept Next.js/Clerk/Prisma imports for in-process Server Action & Route Handler testing
const origLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "@clerk/nextjs/server") {
    return {
      auth: () => ({
        userId: currentAuth.userId,
        sessionClaims: currentAuth.role ? { metadata: { role: currentAuth.role } } : undefined,
      }),
      clerkClient: () => ({ users: {} }),
    };
  }
  if (request === "next/cache") {
    return { revalidatePath: () => {} };
  }
  if (request === "@/lib/prisma" || (request === "./prisma" && parent?.filename?.includes("actions"))) {
    return { __esModule: true, default: mockPrisma };
  }
  if (request.startsWith("@/")) {
    const resolved = path.resolve(__dirname, "..", "src", request.slice(2));
    return origLoad.call(this, resolved, parent, isMain);
  }
  return origLoad.call(this, request, parent, isMain);
};

// Load compiled modules after hook is installed
const actions = require("../src/lib/actions");
const { deleteActionMap } = require("../src/lib/delete-actions");
const { GET: unreadCountGET } = require("../src/app/api/notifications/unread-count/route");
const { GET: socketTokenGET } = require("../src/app/api/socket-token/route");

test("deleteActionMap regression: parent is disabled and event/announcement/result never call deleteSubject", () => {
  assert.equal(deleteActionMap.parent, undefined);
  assert.notEqual(deleteActionMap.result, deleteActionMap.subject);
  assert.notEqual(deleteActionMap.event, deleteActionMap.subject);
  assert.notEqual(deleteActionMap.announcement, deleteActionMap.subject);

  assert.equal(deleteActionMap.result, actions.deleteResult);
  assert.equal(deleteActionMap.event, actions.deleteEvent);
  assert.equal(deleteActionMap.announcement, actions.deleteAnnouncement);
});

test("Server Actions reject unauthenticated and unauthorized roles", async () => {
  dbCalls.length = 0;

  // Unauthenticated
  currentAuth = { userId: null, role: null };
  assert.deepEqual(
    await actions.createSubject(undefined, { name: "Physics", teachers: [] }),
    { success: false, error: true }
  );
  assert.equal(dbCalls.length, 0);

  // Wrong role (student cannot createSubject, deleteEvent, or deleteAnnouncement)
  currentAuth = { userId: "student_1", role: "student" };
  assert.deepEqual(
    await actions.createSubject(undefined, { name: "Physics", teachers: [] }),
    { success: false, error: true }
  );
  const fd = new FormData();
  fd.set("id", "5");
  assert.deepEqual(await actions.deleteEvent(undefined, fd), { success: false, error: true });
  assert.deepEqual(await actions.deleteAnnouncement(undefined, fd), { success: false, error: true });
  assert.equal(dbCalls.length, 0);

  // Admin succeeds
  currentAuth = { userId: "admin_1", role: "admin" };
  assert.deepEqual(
    await actions.createSubject(undefined, { name: "Physics", teachers: [] }),
    { success: true, error: false }
  );
  assert.deepEqual(await actions.deleteEvent(undefined, fd), { success: true, error: false });
  assert.deepEqual(await actions.deleteAnnouncement(undefined, fd), { success: true, error: false });
  assert.equal(dbCalls.some((c) => c.model === "event" && c.op === "delete"), true);
  assert.equal(dbCalls.some((c) => c.model === "announcement" && c.op === "delete"), true);
});

test("Server Actions enforce teacher ownership for assignments and results", async () => {
  dbCalls.length = 0;
  currentAuth = { userId: "teacher_1", role: "teacher" };

  // Teacher 1 cannot create assignment for unassigned class (999)
  assert.deepEqual(
    await actions.createAssignment(undefined, {
      title: "HW 1",
      description: "Desc",
      startDate: new Date(),
      dueDate: new Date(),
      subjectId: 1,
      classId: 999,
    }),
    { success: false, error: true }
  );

  // Teacher 1 CAN create assignment for assigned class (10) and lesson (20)
  assert.deepEqual(
    await actions.createAssignment(undefined, {
      title: "HW 1",
      description: "Desc",
      startDate: new Date(),
      dueDate: new Date(),
      subjectId: 1,
      classId: 10,
      lessonId: 20,
    }),
    { success: true, error: false }
  );

  // Teacher 1 cannot update Teacher 2's assignment (102)
  assert.deepEqual(
    await actions.updateAssignment(undefined, {
      id: 102,
      title: "Hijack",
      description: "Desc",
      startDate: new Date(),
      dueDate: new Date(),
      subjectId: 1,
      classId: 10,
    }),
    { success: false, error: true }
  );

  // Teacher 1 cannot delete Teacher 2's result (302), but CAN delete own result (301)
  const fdOther = new FormData();
  fdOther.set("id", "302");
  assert.deepEqual(await actions.deleteResult(undefined, fdOther), { success: false, error: true });

  const fdOwn = new FormData();
  fdOwn.set("id", "301");
  assert.deepEqual(await actions.deleteResult(undefined, fdOwn), { success: true, error: false });
});

test("Notification endpoints and action derive userId from session", async () => {
  dbCalls.length = 0;

  // Unauthenticated
  currentAuth = { userId: null, role: null };
  assert.equal((await unreadCountGET()).status, 401);
  assert.equal((await socketTokenGET()).status, 401);
  assert.deepEqual(await actions.markAllNotificationsAsRead(), { success: false });

  // Authenticated as student_1
  currentAuth = { userId: "student_1", role: "student" };
  const unreadRes = await unreadCountGET();
  assert.equal(unreadRes.status, 200);
  const unreadJson = await unreadRes.json();
  assert.equal(unreadJson.count, 3);
  assert.equal(dbCalls[0].args.where.userId, "student_1");

  const tokenRes = await socketTokenGET();
  assert.equal(tokenRes.status, 200);
  const { token } = await tokenRes.json();
  const verified = verifySocketToken(token, TEST_SECRET);
  assert.equal(verified?.userId, "student_1");
  assert.equal(verified?.role, "student");

  assert.deepEqual(await actions.markAllNotificationsAsRead(), { success: true });
  assert.equal(dbCalls[1].args.where.userId, "student_1");
});

test("Socket.IO rejects invalid/expired tokens and cross-user room registration", async () => {
  const httpServer = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/notify") {
      const provided = req.headers["x-socket-secret"];
      const valid =
        typeof provided === "string" &&
        provided.length === TEST_SECRET.length &&
        crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(TEST_SECRET));
      if (!valid) {
        res.writeHead(401);
        res.end();
        return;
      }
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const { userId, title, message } = JSON.parse(body);
        io.to(`user:${userId}`).emit("notification", { title, message });
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      });
    }
  });

  const io = new Server(httpServer);
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string") return next(new Error("Unauthorized"));
    const payload = verifySocketToken(token, TEST_SECRET);
    if (!payload) return next(new Error("Unauthorized"));
    socket.data.userId = payload.userId;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    socket.on("register", (requestedUserId: unknown, ack?: (res: { ok: boolean; error?: string }) => void) => {
      if (requestedUserId !== userId) {
        ack?.({ ok: false, error: "Forbidden" });
        return;
      }
      ack?.({ ok: true });
    });
  });

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}`;

  try {
    // Missing token rejected
    await assert.rejects(
      () =>
        new Promise<void>((resolve, reject) => {
          const c = ioClient(url, { reconnection: false });
          c.on("connect", () => { c.close(); resolve(); });
          c.on("connect_error", (err) => { c.close(); reject(err); });
        }),
      /Unauthorized/
    );

    // Expired token rejected
    const expired = createSocketToken("student_1", "student", TEST_SECRET, -10);
    await assert.rejects(
      () =>
        new Promise<void>((resolve, reject) => {
          const c = ioClient(url, { auth: { token: expired }, reconnection: false });
          c.on("connect", () => { c.close(); resolve(); });
          c.on("connect_error", (err) => { c.close(); reject(err); });
        }),
      /Unauthorized/
    );

    // Valid token connects, cannot register as another user, receives own notifications
    const token = createSocketToken("student_1", "student", TEST_SECRET, 60);
    const client = ioClient(url, { auth: { token }, reconnection: false });
    await new Promise<void>((resolve, reject) => {
      client.on("connect", () => resolve());
      client.on("connect_error", reject);
    });

    const crossUserAck = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      client.emit("register", "student_2", resolve);
    });
    assert.equal(crossUserAck.ok, false);

    const received = new Promise<{ title: string; message: string }>((resolve) => {
      client.on("notification", resolve);
    });
    const notifyRes = await fetch(`${url}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-socket-secret": TEST_SECRET,
      },
      body: JSON.stringify({ userId: "student_1", title: "Quiz", message: "Posted" }),
    });
    assert.equal(notifyRes.status, 200);
    assert.deepEqual(await received, { title: "Quiz", message: "Posted" });

    client.close();
  } finally {
    io.close();
    httpServer.close();
  }
});
