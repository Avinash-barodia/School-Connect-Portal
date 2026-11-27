import type { Prisma } from "@prisma/client";

export const VALID_ROLES = ["admin", "teacher", "student", "parent"] as const;
export type Role = (typeof VALID_ROLES)[number];

export type AuthSession = {
  userId: string;
  role: Role;
};

export class AuthorizationError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isValidRole(role: unknown): role is Role {
  return typeof role === "string" && (VALID_ROLES as readonly string[]).includes(role);
}

export function parseAuthSession(
  userId: string | null | undefined,
  role: unknown
): AuthSession | null {
  if (!userId || !isValidRole(role)) {
    return null;
  }
  return { userId, role };
}

export function assertAuthorizedRole(
  session: AuthSession | null,
  allowedRoles: readonly Role[]
): AuthSession {
  if (!session) {
    throw new AuthorizationError("Unauthorized", 401);
  }
  if (!allowedRoles.includes(session.role)) {
    throw new AuthorizationError("Forbidden", 403);
  }
  return session;
}

// --- Role-scoped Prisma query builders (default-deny for unknown roles) ---

export function buildAssignmentWhere(
  session: AuthSession,
  base: Prisma.AssignmentWhereInput = {}
): Prisma.AssignmentWhereInput {
  const query: Prisma.AssignmentWhereInput = { ...base };

  switch (session.role) {
    case "admin":
      return query;
    case "teacher":
      query.OR = [
        { teacherId: session.userId },
        { lesson: { teacherId: session.userId } },
      ];
      return query;
    case "student":
      query.class = { students: { some: { id: session.userId } } };
      return query;
    case "parent":
      query.class = { students: { some: { parentId: session.userId } } };
      return query;
  }
}

export function buildExamWhere(
  session: AuthSession,
  base: Prisma.ExamWhereInput = {}
): Prisma.ExamWhereInput {
  const query: Prisma.ExamWhereInput = { ...base };
  const lessonFilter: Prisma.LessonWhereInput = { ...(query.lesson as Prisma.LessonWhereInput) };

  switch (session.role) {
    case "admin":
      return query;
    case "teacher":
      lessonFilter.teacherId = session.userId;
      query.lesson = lessonFilter;
      return query;
    case "student":
      lessonFilter.class = { students: { some: { id: session.userId } } };
      query.lesson = lessonFilter;
      return query;
    case "parent":
      lessonFilter.class = { students: { some: { parentId: session.userId } } };
      query.lesson = lessonFilter;
      return query;
  }
}

export function buildResultWhere(
  session: AuthSession,
  base: Prisma.ResultWhereInput = {}
): Prisma.ResultWhereInput {
  const query: Prisma.ResultWhereInput = { ...base };

  switch (session.role) {
    case "admin":
      return query;
    case "teacher": {
      const teacherScope: Prisma.ResultWhereInput = {
        OR: [
          { exam: { lesson: { teacherId: session.userId } } },
          { assignment: { lesson: { teacherId: session.userId } } },
          { assignment: { teacherId: session.userId } },
        ],
      };
      return Object.keys(query).length > 0 ? { AND: [query, teacherScope] } : teacherScope;
    }
    case "student":
      query.studentId = session.userId;
      return query;
    case "parent":
      query.student = { parentId: session.userId };
      return query;
  }
}

export function buildLessonWhere(
  session: AuthSession,
  base: Prisma.LessonWhereInput = {}
): Prisma.LessonWhereInput {
  const query: Prisma.LessonWhereInput = { ...base };

  switch (session.role) {
    case "admin":
      return query;
    case "teacher":
      query.teacherId = session.userId;
      return query;
    case "student":
      query.class = { students: { some: { id: session.userId } } };
      return query;
    case "parent":
      query.class = { students: { some: { parentId: session.userId } } };
      return query;
  }
}

export function buildClassScopedWhere(session: AuthSession): {
  OR?: Array<{ classId: null } | { class: Prisma.ClassWhereInput }>;
} {
  switch (session.role) {
    case "admin":
      return {};
    case "teacher":
      return {
        OR: [
          { classId: null },
          {
            class: {
              OR: [
                { supervisorId: session.userId },
                { lessons: { some: { teacherId: session.userId } } },
              ],
            },
          },
        ],
      };
    case "student":
      return {
        OR: [
          { classId: null },
          { class: { students: { some: { id: session.userId } } } },
        ],
      };
    case "parent":
      return {
        OR: [
          { classId: null },
          { class: { students: { some: { parentId: session.userId } } } },
        ],
      };
  }
}

export type AuthDbClient = {
  lesson: {
    findFirst: (args: { where: { id: number; teacherId: string }; select: { id: true; classId: true } }) => Promise<{ id: number; classId: number } | null>;
    findUnique: (args: { where: { id: number }; select: { classId: true; teacherId: true } }) => Promise<{ classId: number; teacherId: string } | null>;
  };
  class: {
    findFirst: (args: {
      where: {
        id: number;
        OR: Array<{ supervisorId: string } | { lessons: { some: { teacherId: string } } }>;
      };
      select: { id: true };
    }) => Promise<{ id: number } | null>;
  };
  student: {
    findFirst: (args: {
      where: Prisma.StudentWhereInput;
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
};

export async function canTeacherAccessLesson(
  db: Pick<AuthDbClient, "lesson">,
  teacherId: string,
  lessonId: number
): Promise<boolean> {
  if (!Number.isInteger(lessonId) || lessonId <= 0) return false;
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, teacherId },
    select: { id: true, classId: true },
  });
  return lesson !== null;
}

export async function canTeacherAccessClass(
  db: Pick<AuthDbClient, "class">,
  teacherId: string,
  classId: number
): Promise<boolean> {
  if (!Number.isInteger(classId) || classId <= 0) return false;
  const cls = await db.class.findFirst({
    where: {
      id: classId,
      OR: [
        { supervisorId: teacherId },
        { lessons: { some: { teacherId } } },
      ],
    },
    select: { id: true },
  });
  return cls !== null;
}

export async function canAccessStudentRecord(
  db: Pick<AuthDbClient, "student">,
  session: AuthSession,
  studentId: string
): Promise<boolean> {
  switch (session.role) {
    case "admin":
      return true;
    case "student":
      return session.userId === studentId;
    case "parent": {
      const child = await db.student.findFirst({
        where: { id: studentId, parentId: session.userId },
        select: { id: true },
      });
      return child !== null;
    }
    case "teacher": {
      const student = await db.student.findFirst({
        where: {
          id: studentId,
          class: {
            OR: [
              { supervisorId: session.userId },
              { lessons: { some: { teacherId: session.userId } } },
            ],
          },
        },
        select: { id: true },
      });
      return student !== null;
    }
  }
}

export function canAccessTeacherRecord(session: AuthSession): boolean {
  return session.role === "admin" || session.role === "teacher";
}
