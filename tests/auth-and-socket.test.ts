import test from "node:test";
import assert from "node:assert/strict";
import {
  assertAuthorizedRole,
  AuthorizationError,
  buildAssignmentWhere,
  buildClassScopedWhere,
  buildExamWhere,
  buildResultWhere,
  canAccessStudentRecord,
  canAccessTeacherRecord,
  canTeacherAccessClass,
  canTeacherAccessLesson,
  isValidRole,
  parseAuthSession,
  type AuthDbClient,
} from "../src/lib/auth-rules";
import { createSocketToken, verifySocketToken } from "../src/lib/socket-auth";

const TEST_SECRET = "test-socket-secret-32-chars-minimum";

test("unauthenticated and unrecognized roles are rejected by default", () => {
  assert.equal(isValidRole(undefined), false);
  assert.equal(isValidRole(null), false);
  assert.equal(isValidRole(""), false);
  assert.equal(isValidRole("guest"), false);
  assert.equal(isValidRole("superadmin"), false);

  assert.equal(parseAuthSession(null, "admin"), null);
  assert.equal(parseAuthSession("user_1", undefined), null);
  assert.equal(parseAuthSession("user_1", "unknown"), null);
  assert.deepEqual(parseAuthSession("user_1", "teacher"), {
    userId: "user_1",
    role: "teacher",
  });

  assert.throws(
    () => assertAuthorizedRole(null, ["admin"]),
    (err: unknown) => err instanceof AuthorizationError && err.status === 401
  );
  assert.throws(
    () => assertAuthorizedRole({ userId: "s1", role: "student" }, ["admin", "teacher"]),
    (err: unknown) => err instanceof AuthorizationError && err.status === 403
  );
  assert.deepEqual(
    assertAuthorizedRole({ userId: "a1", role: "admin" }, ["admin"]),
    { userId: "a1", role: "admin" }
  );
});

test("teacher ownership checks block unauthorized lessons and classes", async () => {
  const mockDb: Pick<AuthDbClient, "lesson" | "class"> = {
    lesson: {
      findFirst: async ({ where }) =>
        where.id === 10 && where.teacherId === "teacher_1"
          ? { id: 10, classId: 100 }
          : null,
      findUnique: async ({ where }) =>
        where.id === 10 ? { classId: 100, teacherId: "teacher_1" } : null,
    },
    class: {
      findFirst: async ({ where }) => {
        const isTeacher1 = where.OR.some(
          (clause) =>
            ("supervisorId" in clause && clause.supervisorId === "teacher_1") ||
            ("lessons" in clause && clause.lessons.some.teacherId === "teacher_1")
        );
        return where.id === 100 && isTeacher1 ? { id: 100 } : null;
      },
    },
  };

  assert.equal(await canTeacherAccessLesson(mockDb, "teacher_1", 10), true);
  assert.equal(await canTeacherAccessLesson(mockDb, "teacher_2", 10), false);
  assert.equal(await canTeacherAccessLesson(mockDb, "teacher_1", 999), false);

  assert.equal(await canTeacherAccessClass(mockDb, "teacher_1", 100), true);
  assert.equal(await canTeacherAccessClass(mockDb, "teacher_2", 100), false);
});

test("student and parent record access enforces ownership and family links", async () => {
  const mockStudentDb: Pick<AuthDbClient, "student"> = {
    student: {
      findFirst: async ({ where }) => {
        if (where.id === "student_1" && where.parentId === "parent_1") {
          return { id: "student_1" };
        }
        if (
          where.id === "student_1" &&
          where.class &&
          JSON.stringify(where.class).includes("teacher_1")
        ) {
          return { id: "student_1" };
        }
        return null;
      },
    },
  };

  assert.equal(
    await canAccessStudentRecord(mockStudentDb, { userId: "student_1", role: "student" }, "student_1"),
    true
  );
  assert.equal(
    await canAccessStudentRecord(mockStudentDb, { userId: "student_1", role: "student" }, "student_2"),
    false
  );

  assert.equal(
    await canAccessStudentRecord(mockStudentDb, { userId: "parent_1", role: "parent" }, "student_1"),
    true
  );
  assert.equal(
    await canAccessStudentRecord(mockStudentDb, { userId: "parent_2", role: "parent" }, "student_1"),
    false
  );

  assert.equal(
    await canAccessStudentRecord(mockStudentDb, { userId: "teacher_1", role: "teacher" }, "student_1"),
    true
  );
  assert.equal(
    await canAccessStudentRecord(mockStudentDb, { userId: "teacher_2", role: "teacher" }, "student_1"),
    false
  );

  assert.equal(
    await canAccessStudentRecord(mockStudentDb, { userId: "admin_1", role: "admin" }, "student_2"),
    true
  );

  assert.equal(canAccessTeacherRecord({ userId: "admin_1", role: "admin" }), true);
  assert.equal(canAccessTeacherRecord({ userId: "teacher_1", role: "teacher" }), true);
  assert.equal(canAccessTeacherRecord({ userId: "student_1", role: "student" }), false);
  assert.equal(canAccessTeacherRecord({ userId: "parent_1", role: "parent" }), false);
});

test("role-scoped Prisma where builders restrict queries by role", () => {
  const teacherAssignment = buildAssignmentWhere({ userId: "t1", role: "teacher" });
  assert.deepEqual(teacherAssignment.OR, [
    { teacherId: "t1" },
    { lesson: { teacherId: "t1" } },
  ]);

  const studentResult = buildResultWhere({ userId: "s1", role: "student" });
  assert.equal(studentResult.studentId, "s1");

  const parentResult = buildResultWhere({ userId: "p1", role: "parent" });
  assert.deepEqual(parentResult.student, { parentId: "p1" });

  const studentExam = buildExamWhere({ userId: "s1", role: "student" });
  assert.deepEqual(studentExam.lesson, {
    class: { students: { some: { id: "s1" } } },
  });

  const parentAnnouncements = buildClassScopedWhere({ userId: "p1", role: "parent" });
  assert.ok(Array.isArray(parentAnnouncements.OR));
  assert.equal(parentAnnouncements.OR?.length, 2);
});

test("socket token signing and verification rejects tampering, missing tokens, and expiration", () => {
  assert.equal(verifySocketToken("", TEST_SECRET), null);
  assert.equal(verifySocketToken("malformed", TEST_SECRET), null);

  const token = createSocketToken("user_1", "student", TEST_SECRET, 60);
  const verified = verifySocketToken(token, TEST_SECRET);
  assert.equal(verified?.userId, "user_1");
  assert.equal(verified?.role, "student");

  assert.equal(verifySocketToken(token, "wrong-secret"), null);
  assert.equal(verifySocketToken(`${token}tampered`, TEST_SECRET), null);

  const expired = createSocketToken("user_1", "student", TEST_SECRET, -10);
  assert.equal(verifySocketToken(expired, TEST_SECRET), null);
});
