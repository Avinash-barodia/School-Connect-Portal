"use server";

import { revalidatePath } from "next/cache";
import {
  SubjectSchema,
  TeacherSchema,
  AssignmentSchema,
  AttendanceSchema,
  LessonSchema,
  ClassSchema,
  ExamSchema,
  EventSchema,
  StudentSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { clerkClient } from "@clerk/nextjs/server";
import {
  canTeacherAccessClass,
  canTeacherAccessLesson,
  requireAuth,
  requireRole,
} from "./auth";
import { getSocketAuthSecret } from "./socket-auth";

type CurrentState = { success: boolean; error: boolean } | undefined;

const triggerNotification = async (userId: string, title: string, message: string) => {
  try {
    await prisma.notification.create({
      data: { userId, title, message },
    });

    const socketInternalUrl = process.env.SOCKET_SERVER_INTERNAL_URL || "http://localhost:3002";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      headers["x-socket-secret"] = getSocketAuthSecret();
    } catch {
      // If secret is not configured in local/test env, omit header (socket server will reject)
    }

    await fetch(`${socketInternalUrl}/notify`, {
      method: "POST",
      headers,
      body: JSON.stringify({ userId, title, message }),
    });
  } catch (err) {
    console.error("Failed to trigger notification:", err);
  }
};

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    requireRole(["admin"]);
    await prisma.subject.create({
      data: {
        name: data.name,
        teachers: {
          connect: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    requireRole(["admin"]);
    await prisma.subject.update({
      where: { id: data.id },
      data: {
        name: data.name,
        teachers: {
          set: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    requireRole(["admin"]);
    await prisma.subject.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    requireRole(["admin"]);
    await prisma.class.create({ data });

    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    requireRole(["admin"]);
    await prisma.class.update({
      where: { id: data.id },
      data,
    });

    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    requireRole(["admin"]);
    await prisma.class.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  try {
    requireRole(["admin"]);
    const user = await clerkClient().users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "teacher" },
    });

    await prisma.teacher.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        subjects: {
          connect: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });

    revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    requireRole(["admin"]);
    await clerkClient().users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.teacher.update({
      where: { id: data.id },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        subjects: {
          set: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });

    revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    requireRole(["admin"]);
    await clerkClient().users.deleteUser(id);

    await prisma.teacher.delete({
      where: { id },
    });

    revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  try {
    requireRole(["admin"]);
    const classItem = await prisma.class.findUnique({
      where: { id: data.classId },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity === classItem._count.students) {
      return { success: false, error: true };
    }

    const user = await clerkClient().users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "student" },
    });

    await prisma.student.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
      },
    });

    revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    requireRole(["admin"]);
    await clerkClient().users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.student.update({
      where: { id: data.id },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
      },
    });

    revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    requireRole(["admin"]);
    await clerkClient().users.deleteUser(id);

    await prisma.student.delete({
      where: { id },
    });

    revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  try {
    const session = requireRole(["admin", "teacher"]);

    if (session.role === "teacher") {
      const hasAccess = await canTeacherAccessLesson(prisma, session.userId, data.lessonId);
      if (!hasAccess) {
        return { success: false, error: true };
      }
    }

    await prisma.exam.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    const session = requireRole(["admin", "teacher"]);

    if (session.role === "teacher") {
      const existing = await prisma.exam.findUnique({
        where: { id: data.id },
        select: { lesson: { select: { teacherId: true } } },
      });
      if (!existing || existing.lesson.teacherId !== session.userId) {
        return { success: false, error: true };
      }
      const hasAccess = await canTeacherAccessLesson(prisma, session.userId, data.lessonId);
      if (!hasAccess) {
        return { success: false, error: true };
      }
    }

    await prisma.exam.update({
      where: { id: data.id },
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const session = requireRole(["admin", "teacher"]);

    await prisma.exam.delete({
      where: {
        id: parseInt(id),
        ...(session.role === "teacher" ? { lesson: { teacherId: session.userId } } : {}),
      },
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  try {
    requireRole(["admin"]);

    await prisma.event.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        classId: data.classId,
        description: data.description,
      },
    });

    revalidatePath("/list/events");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  try {
    requireRole(["admin"]);

    await prisma.event.update({
      where: { id: data.id },
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        classId: data.classId,
        description: data.description,
      },
    });

    revalidatePath("/list/events");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteEvent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    requireRole(["admin"]);

    await prisma.event.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/list/events");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteAnnouncement = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    requireRole(["admin"]);
    await prisma.announcement.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/list/announcements");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteResult = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const session = requireRole(["admin", "teacher"]);
    const resultId = parseInt(id);

    if (session.role === "teacher") {
      const existing = await prisma.result.findUnique({
        where: { id: resultId },
        select: {
          exam: { select: { lesson: { select: { teacherId: true } } } },
          assignment: {
            select: {
              teacherId: true,
              lesson: { select: { teacherId: true } },
            },
          },
        },
      });
      const ownsExam = existing?.exam?.lesson?.teacherId === session.userId;
      const ownsAssignment =
        existing?.assignment?.teacherId === session.userId ||
        existing?.assignment?.lesson?.teacherId === session.userId;
      if (!existing || (!ownsExam && !ownsAssignment)) {
        return { success: false, error: true };
      }
    }

    await prisma.result.delete({
      where: { id: resultId },
    });

    revalidatePath("/list/results");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
) => {
  try {
    const session = requireRole(["admin", "teacher"]);
    const parsedLessonId = data.lessonId ? parseInt(data.lessonId as unknown as string) : null;

    if (session.role === "teacher") {
      const hasClassAccess = await canTeacherAccessClass(prisma, session.userId, data.classId);
      if (!hasClassAccess) {
        return { success: false, error: true };
      }
      if (parsedLessonId !== null) {
        const hasLessonAccess = await canTeacherAccessLesson(prisma, session.userId, parsedLessonId);
        if (!hasLessonAccess) {
          return { success: false, error: true };
        }
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        dueDate: data.dueDate,
        lessonId: parsedLessonId,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: session.role === "teacher" ? session.userId : (data.teacherId || session.userId),
      },
      include: {
        class: {
          select: {
            students: { select: { id: true } },
          },
        },
        subject: { select: { name: true } },
      },
    });

    const students = assignment.class?.students || [];
    for (const student of students) {
      await triggerNotification(
        student.id,
        "New Assignment",
        `New assignment for ${assignment.subject?.name}: ${data.title}`
      );
    }

    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createAttendance = async (
  currentState: CurrentState,
  data: AttendanceSchema
) => {
  try {
    const session = requireRole(["admin", "teacher"]);

    const lesson = await prisma.lesson.findUnique({
      where: { id: data.lessonId },
      select: { classId: true, teacherId: true },
    });

    if (!lesson) {
      return { success: false, error: true };
    }

    if (session.role === "teacher" && lesson.teacherId !== session.userId) {
      return { success: false, error: true };
    }

    const studentInClass = await prisma.student.findFirst({
      where: { id: data.studentId, classId: lesson.classId },
      select: { id: true, parentId: true, name: true },
    });

    if (!studentInClass) {
      return { success: false, error: true };
    }

    await prisma.attendance.create({
      data: {
        date: data.date,
        present: data.present,
        studentId: data.studentId,
        lessonId: data.lessonId,
      },
    });

    const attendances = await prisma.attendance.findMany({
      where: {
        studentId: data.studentId,
        lessonId: data.lessonId,
      },
    });

    const total = attendances.length;
    const present = attendances.filter((a) => a.present).length;
    const percentage = (present / total) * 100;

    if (percentage < 75) {
      const message = `Attendance for ${studentInClass.name} is low (${percentage.toFixed(1)}%) in this lesson.`;
      await triggerNotification(data.studentId, "Low Attendance Alert", message);
      await triggerNotification(studentInClass.parentId, "Low Attendance Alert", message);
    }

    revalidatePath("/list/attendance");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  try {
    requireRole(["admin"]);
    await prisma.lesson.create({
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    revalidatePath("/list/lessons");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteLesson = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    requireRole(["admin"]);
    await prisma.lesson.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/list/lessons");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteAssignment = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const session = requireRole(["admin", "teacher"]);
    const assignmentId = parseInt(id);

    if (session.role === "teacher") {
      const existing = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { teacherId: true, lesson: { select: { teacherId: true } } },
      });
      if (
        !existing ||
        (existing.teacherId !== session.userId &&
          existing.lesson?.teacherId !== session.userId)
      ) {
        return { success: false, error: true };
      }
    }

    await prisma.assignment.delete({
      where: { id: assignmentId },
    });

    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteAttendance = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const session = requireRole(["admin", "teacher"]);
    const attendanceId = parseInt(id);

    await prisma.attendance.delete({
      where: {
        id: attendanceId,
        ...(session.role === "teacher" ? { lesson: { teacherId: session.userId } } : {}),
      },
    });

    revalidatePath("/list/attendance");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    const session = requireRole(["admin", "teacher"]);
    const parsedLessonId = data.lessonId ? parseInt(data.lessonId as unknown as string) : null;

    if (session.role === "teacher") {
      const existing = await prisma.assignment.findUnique({
        where: { id: data.id },
        select: { teacherId: true, lesson: { select: { teacherId: true } } },
      });
      if (
        !existing ||
        (existing.teacherId !== session.userId &&
          existing.lesson?.teacherId !== session.userId)
      ) {
        return { success: false, error: true };
      }

      const hasClassAccess = await canTeacherAccessClass(prisma, session.userId, data.classId);
      if (!hasClassAccess) {
        return { success: false, error: true };
      }
      if (parsedLessonId !== null) {
        const hasLessonAccess = await canTeacherAccessLesson(prisma, session.userId, parsedLessonId);
        if (!hasLessonAccess) {
          return { success: false, error: true };
        }
      }
    }

    await prisma.assignment.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        dueDate: data.dueDate,
        lessonId: parsedLessonId,
        subjectId: data.subjectId,
        classId: data.classId,
        ...(session.role === "teacher" ? { teacherId: session.userId } : {}),
      },
    });

    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    const session = requireAuth();
    await prisma.notification.updateMany({
      where: {
        userId: session.userId,
        read: false,
      },
      data: {
        read: true,
      },
    });
    return { success: true };
  } catch (err) {
    console.error("Failed to mark notifications as read:", err);
    return { success: false };
  }
};
