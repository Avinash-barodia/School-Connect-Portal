"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { getSocket } from "@/lib/socket-client";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const RealTimeNotifications = () => {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const socket = getSocket(user.id);

      socket.on("notification", (data: { title: string; message: string }) => {
        router.refresh();
        toast.info(
          <div>
            <strong>{data.title}</strong>
            <div>{data.message}</div>
          </div>,
          {
            position: "bottom-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );
      });

      return () => {
        socket.off("notification");
      };
    }
  }, [user, router]);

  return null;
};

export default RealTimeNotifications;
