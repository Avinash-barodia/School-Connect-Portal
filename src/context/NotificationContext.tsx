"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { getAuthenticatedSocket } from "@/lib/socket-client";

interface NotificationContextType {
  count: number;
  incrementCount: () => void;
  resetCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [count, setCount] = useState(0);
  const { user } = useUser();

  useEffect(() => {
    let active = true;
    let attachedSocket: Awaited<ReturnType<typeof getAuthenticatedSocket>> = null;
    const handleNotification = () => {
      setCount((prev) => prev + 1);
    };

    if (user) {
      fetchUnreadCount();

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
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications/unread-count");
      if (!response.ok) return;
      const data = await response.json();
      setCount(data.count || 0);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  const incrementCount = () => setCount((prev) => prev + 1);
  const resetCount = () => setCount(0);

  return (
    <NotificationContext.Provider value={{ count, incrementCount, resetCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
