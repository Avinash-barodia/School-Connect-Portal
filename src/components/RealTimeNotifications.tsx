"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { getAuthenticatedSocket } from "@/lib/socket-client";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const RealTimeNotifications = () => {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let attachedSocket: Awaited<ReturnType<typeof getAuthenticatedSocket>> = null;

    const handleNotification = (data: { title: string; message: string }) => {
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
    };

    if (user) {
      getAuthenticatedSocket().then((socket) => {
        if (!active || !socket) return;
        attachedSocket = socket;
        socket.on("notification", handleNotification);
      });
    }

    return () => {
      active = false;
      attachedSocket?.off("notification", handleNotification);
    };
  }, [user, router]);

  return null;
};

export default RealTimeNotifications;
