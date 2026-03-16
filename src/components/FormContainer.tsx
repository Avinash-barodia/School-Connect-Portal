import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { auth } from "@clerk/nextjs/server";

export type FormContainerProps = {
  table:
    | "teacher"
    | "student"
    | "parent"
    | "subject"
    | "class"
    | "lesson"
    | "exam"
    | "assignment"
    | "result"
    | "attendance"
    | "event"
    | "announcement";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {
  let relatedData = {};

  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;

  if (type !== "delete") {
    switch (table) {
      case "subject": {
        const subjectTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: subjectTeachers };
        break;
      }
      case "class": {
        const classGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const classTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: classTeachers, grades: classGrades };
        break;
      }
      case "teacher": {
        const teacherSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        relatedData = { subjects: teacherSubjects };
        break;
      }
      case "student": {
        const studentGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const studentClasses = await prisma.class.findMany({
          include: { _count: { select: { students: true } } },
        });
        relatedData = { classes: studentClasses, grades: studentGrades };
        break;
      }
      case "exam": {
        const examLessons = await prisma.lesson.findMany({
          where: {
            ...(role === "teacher" ? { teacherId: currentUserId! } : {}),
          },
          select: { 
            id: true, 
            name: true,
            subject: { select: { name: true } },
            class: { select: { name: true } }
          },
        });
        relatedData = { lessons: examLessons };
        break;
      }
      case "lesson": {
        const lessonSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        const lessonClasses = await prisma.class.findMany({
          select: { id: true, name: true },
        });
        const lessonTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = {
          subjects: lessonSubjects,
          classes: lessonClasses,
          teachers: lessonTeachers,
        };
        break;
      }
      case "assignment": {
        const assignmentSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        const assignmentClasses = await prisma.class.findMany({
          select: { id: true, name: true },
        });
        const assignmentLessons = await prisma.lesson.findMany({
          where: {
            ...(role === "teacher" ? { teacherId: currentUserId! } : {}),
          },
          select: { 
            id: true, 
            name: true,
            subject: { select: { id: true, name: true } },
            class: { select: { id: true, name: true } }
          },
        });
        relatedData = { 
          lessons: assignmentLessons, 
          subjects: assignmentSubjects, 
          classes: assignmentClasses 
        };
        break;
      }
      case "attendance": {
        const attendanceLessons = await prisma.lesson.findMany({
          where: {
            ...(role === "teacher" ? { teacherId: currentUserId! } : {}),
          },
          select: { id: true, name: true },
        });
        const attendanceStudents = await prisma.student.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { lessons: attendanceLessons, students: attendanceStudents };
        break;
      }
      case "result": {
        const resultExams = await prisma.exam.findMany({
          where: {
            ...(role === "teacher" ? { lesson: { teacherId: currentUserId! } } : {}),
          },
          select: { id: true, title: true },
        });
        const resultAssignments = await prisma.assignment.findMany({
          where: {
            ...(role === "teacher" ? { lesson: { teacherId: currentUserId! } } : {}),
          },
          select: { id: true, title: true },
        });
        const resultStudents = await prisma.student.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = {
          exams: resultExams,
          assignments: resultAssignments,
          students: resultStudents,
        };
        break;
      }

      default:
        break;
    }
  }

  return (
    <div className="">
      <FormModal
        table={table}
        type={type}
        data={data}
        id={id}
        relatedData={relatedData}
      />
    </div>
  );
};

export default FormContainer;
