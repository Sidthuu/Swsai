"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

// ── Toast (transient UI) ──────────────────────────────────────────────────────
export interface Toast {
  id: string;
  type: "progress" | "complete";
  message: string;
  timestamp?: string;
}

// ── Persistent Notification ───────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  message: string;
  type: "SUCCESS" | "ERROR" | "INFO";
  timestamp: string;
  isRead: boolean;
}

interface NotificationCtx {
  toasts: Toast[];
  addToast: (t: Toast) => void;
  dismissToast: (id: string) => void;
  refresh: number;
  triggerRefresh: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const Ctx = createContext<NotificationCtx>({
  toasts: [], addToast: () => {}, dismissToast: () => {}, refresh: 0, triggerRefresh: () => {},
  notifications: [], unreadCount: 0,
  fetchNotifications: async () => {}, markRead: async () => {}, markAllRead: async () => {},
});

export function useNotifications() { return useContext(Ctx); }

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const triggerRefresh = useCallback(() => setRefresh((r) => r + 1), []);

  const addToast = useCallback((t: Toast) =>
    setToasts((prev) => [...prev.filter((x) => x.id !== t.id), t]), []);

  const dismissToast = useCallback((id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    const data: AppNotification[] = await res.json();
    setNotifications(data);
    setUnreadCount(data.filter((n) => !n.isRead).length);
  }, []);

  const markRead = useCallback(async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  // Initial fetch
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // SSE — mounted once at layout level, never unmounts
  useEffect(() => {
    const es = new EventSource("/api/notifications", {});

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === "new-notification") {
          const n: AppNotification = data.notification;
          setNotifications((prev) => [n, ...prev]);
          setUnreadCount((c) => c + 1);

          // also show a toast for bulk-complete SUCCESS
          if (n.type === "SUCCESS") {
            const ts = new Date(n.timestamp).toLocaleTimeString("en-US", {
              hour: "2-digit", minute: "2-digit", hour12: true,
            });
            setToasts((prev) => [
              ...prev.filter((t) => !t.id.startsWith("progress-")),
              { id: `complete-${n.id}`, type: "complete", message: n.message, timestamp: ts },
            ]);
            setRefresh((r) => r + 1);
          }
        }

        if (data.type === "unread-count") {
          setUnreadCount(data.count);
        }
      } catch { /* ignore ping lines */ }
    };

    return () => es.close();
  }, []);

  return (
    <Ctx.Provider value={{
      toasts, addToast, dismissToast, refresh, triggerRefresh,
      notifications, unreadCount, fetchNotifications, markRead, markAllRead,
    }}>
      {children}
    </Ctx.Provider>
  );
}
