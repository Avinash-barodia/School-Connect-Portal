import {
  deleteAnnouncement,
  deleteAssignment,
  deleteAttendance,
  deleteClass,
  deleteEvent,
  deleteExam,
  deleteLesson,
  deleteResult,
  deleteStudent,
  deleteSubject,
  deleteTeacher,
} from "./actions";

export type DeletableTable =
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

export const deleteActionMap: Partial<
  Record<
    DeletableTable,
    (currentState: any, data: FormData) => Promise<{ success: boolean; error: boolean }>
  >
> = {
  subject: deleteSubject,
  class: deleteClass,
  teacher: deleteTeacher,
  student: deleteStudent,
  exam: deleteExam,
  lesson: deleteLesson,
  assignment: deleteAssignment,
  result: deleteResult,
  attendance: deleteAttendance,
  event: deleteEvent,
  announcement: deleteAnnouncement,
};
