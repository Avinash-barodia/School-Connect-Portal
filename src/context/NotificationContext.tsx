"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { getSocket } from "@/lib/socket-client";

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
    if (user) {
      // Fetch initial count from server action (to be implemented)
      fetchUnreadCount(user.id);

      const socket = getSocket(user.id);
      socket.on("notification", () => {
        setCount((prev) => prev + 1);
      });

      return () => {
        socket.off("notification");
      };
    }
  }, [user]);

  const fetchUnreadCount = async (userId: string) => {
    try {
      const response = await fetch(`/api/notifications/unread-count?userId=${userId}`);
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
