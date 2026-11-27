"use client";

import { useNotifications } from "@/context/NotificationContext";
import Image from "next/image";
import { markAllNotificationsAsRead } from "@/lib/actions";
import { useUser } from "@clerk/nextjs";

const NotificationBadge = () => {
  const { count, resetCount } = useNotifications();
  const { user } = useUser();

  const handleClick = async () => {
    if (user && count > 0) {
      resetCount();
      await markAllNotificationsAsRead();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        count > 0
          ? `Notifications (${count} unread), mark all as read`
          : "Notifications"
      }
      className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative"
    >
      <Image src="/announcement.png" alt="" width={20} height={20} />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs"
        >
          {count}
        </span>
      )}
    </button>
  );
};

export default NotificationBadge;
