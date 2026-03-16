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
      await markAllNotificationsAsRead(user.id);
    }
  };

  return (
    <div 
      className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative"
      onClick={handleClick}
    >
      <Image src="/announcement.png" alt="" width={20} height={20} />
      {count > 0 && (
        <div className="absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs">
          {count}
        </div>
      )}
    </div>
  );
};

export default NotificationBadge;
