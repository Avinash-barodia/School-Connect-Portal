"use client";

import { deleteActionMap } from "@/lib/delete-actions";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useId, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { toast } from "react-toastify";
import { FormContainerProps } from "./FormContainer";

// deleteActionMap is imported from @/lib/delete-actions

// USE LAZY LOADING

// import TeacherForm from "./forms/TeacherForm";
// import StudentForm from "./forms/StudentForm";

const TeacherForm = dynamic(() => import("./forms/TeacherForm"), {
  loading: () => <h1>Loading...</h1>,
});
const StudentForm = dynamic(() => import("./forms/StudentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SubjectForm = dynamic(() => import("./forms/SubjectForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ClassForm = dynamic(() => import("./forms/ClassForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ExamForm = dynamic(() => import("./forms/ExamForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AssignmentForm = dynamic(() => import("./forms/AssignmentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AttendanceForm = dynamic(() => import("./forms/AttendanceForm"), {
  loading: () => <h1>Loading...</h1>,
});
const LessonForm = dynamic(() => import("./forms/LessonForm"), {
  loading: () => <h1>Loading...</h1>,
});
// TODO: OTHER FORMS

// const ParentForm = dynamic(() => import("./forms/ParentForm"), {
//   loading: () => <h1>Loading...</h1>,
// });

const EventForm = dynamic(() => import("./forms/EventForm"), {
  loading: () => <h1>Loading...</h1>,
});

const forms: {
  [key: string]: (
    setOpen: Dispatch<SetStateAction<boolean>>,
    type: "create" | "update",
    data?: any,
    relatedData?: any
  ) => JSX.Element;
} = {
  subject: (setOpen, type, data, relatedData) => (
    <SubjectForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  class: (setOpen, type, data, relatedData) => (
    <ClassForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  teacher: (setOpen, type, data, relatedData) => (
    <TeacherForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  student: (setOpen, type, data, relatedData) => (
    <StudentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  exam: (setOpen, type, data, relatedData) => (
    <ExamForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  assignment: (setOpen, type, data, relatedData) => (
    <AssignmentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  attendance: (setOpen, type, data, relatedData) => (
    <AttendanceForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  // TODO OTHER LIST ITEMS
  // parent: (setOpen, type, data, relatedData) => (
  //   <ParentForm
  //     type={type}
  //     data={data}
  //     setOpen={setOpen}
  //     relatedData={relatedData}
  //   />
  //),

  lesson: (setOpen, type, data, relatedData) => (
    <LessonForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  event: (setOpen, type, data, relatedData) => (
    <EventForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),

};

const FormModal = ({
  table,
  type,
  data,
  id,
  relatedData,
}: FormContainerProps & { relatedData?: any }) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-lamaYellow"
      : type === "update"
      ? "bg-lamaSky"
      : "bg-lamaPurple";

  const [open, setOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const dialogEl = dialogRef.current;
      if (!dialogEl) return;

      const getFocusable = () =>
        Array.from(
          dialogEl.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

      const focusable = getFocusable();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        dialogEl.focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setOpen(false);
          return;
        }
        if (e.key === "Tab") {
          const items = getFocusable();
          if (items.length === 0) {
            e.preventDefault();
            return;
          }
          const first = items[0];
          const last = items[items.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first || !dialogEl.contains(document.activeElement)) {
              e.preventDefault();
              last.focus();
            }
          } else if (document.activeElement === last || !dialogEl.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  const deleteAction = deleteActionMap[table];
  const isDeleteUnsupported = type === "delete" && !deleteAction;

  const Form = () => {
    const [state, formAction] = useFormState(
      deleteAction ?? (async () => ({ success: false, error: true })),
      {
        success: false,
        error: false,
      }
    );

    const router = useRouter();

    useEffect(() => {
      if (state.success) {
        toast(`${table} has been deleted!`);
        setOpen(false);
        router.refresh();
      }
    }, [state, router]);

    return type === "delete" && id ? (
      deleteAction ? (
        <form action={formAction} className="p-4 flex flex-col gap-4">
          <input type="hidden" name="id" value={id} />
          <span className="text-center font-medium">
            All data will be lost. Are you sure you want to delete this {table}?
          </span>
          <button
            type="submit"
            className="bg-red-700 text-white py-2 px-4 rounded-md border-none w-max self-center"
          >
            Delete
          </button>
        </form>
      ) : (
        <p className="p-4 text-center text-sm text-gray-600">
          Delete is not supported for {table}.
        </p>
      )
    ) : type === "create" || type === "update" ? (
      forms[table] ? (
        forms[table](setOpen, type, data, relatedData)
      ) : (
        <p className="p-4 text-center text-sm text-gray-600">
          Form not available for {table}.
        </p>
      )
    ) : (
      "Form not found!"
    );
  };

  const actionLabel = `${type.charAt(0).toUpperCase() + type.slice(1)} ${table}`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={isDeleteUnsupported}
        title={isDeleteUnsupported ? `Delete not supported for ${table}` : undefined}
        aria-label={
          isDeleteUnsupported
            ? `Delete ${table} (not supported)`
            : actionLabel
        }
        className={`${size} flex items-center justify-center rounded-full ${bgColor} disabled:opacity-40 disabled:cursor-not-allowed`}
        onClick={() => setOpen(true)}
      >
        <Image src={`/${type}.png`} alt="" width={16} height={16} />
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="bg-white p-4 rounded-md relative w-[90%] md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%] max-h-[90vh] overflow-y-auto focus:outline-none"
          >
            <h2 id={titleId} className="sr-only">
              {actionLabel}
            </h2>
            <Form />
            <button
              type="button"
              aria-label={`Close ${actionLabel} dialog`}
              className="absolute top-4 right-4 cursor-pointer p-1"
              onClick={() => setOpen(false)}
            >
              <Image src="/close.png" alt="" width={14} height={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;
