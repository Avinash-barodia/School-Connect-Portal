import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendar from "@/components/EventCalendar";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { notFound } from "next/navigation";

const StudentPage = async () => {
  const session = getAuthSession();
  if (!session || session.role !== "student") {
    return notFound();
  }

  const classItem = await prisma.class.findMany({
    where: {
      students: { some: { id: session.userId } },
    },
  });

  const activeClass = classItem[0];

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">
            Schedule {activeClass ? `(${activeClass.name})` : ""}
          </h1>
          {activeClass ? (
            <BigCalendarContainer type="classId" id={activeClass.id} />
          ) : (
            <p className="text-sm text-gray-500 mt-4">No class assigned.</p>
          )}
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <EventCalendar />
        <Announcements />
      </div>
    </div>
  );
};

export default StudentPage;
