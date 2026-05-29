"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export interface Toast {
  id: string;
  type: "progress" | "complete";
  message: string;
  timestamp?: string;
}

interface NotificationCtx {
  toasts: Toast[];
  addToast: (t: Toast) => void;
  dismissToast: (id: string) => void;
  refresh: number;
}

const Ctx = createContext<NotificationCtx>({
  toasts: [],
  addToast: () => {},
  dismissToast: () => {},
  refresh: 0,
});

export function useNotifications() {
  return useContext(Ctx);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [refresh, setRefresh] = useState(0);
  const toastsRef = useRef<Toast[]>([]);
  toastsRef.current = toasts;

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev.filter((x) => x.id !== t.id), t]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Mounted once at layout level — never unmounts, survives page navigation
  useEffect(() => {
    const es = new EventSource("/api/notifications");

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type !== "bulk-complete") return;

        const ts = new Date(data.finishedAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        setToasts((prev) => [
          // remove the matching in-progress toast
          ...prev.filter((t) => t.id !== `progress-${data.jobId}`),
          {
            id: `complete-${data.jobId}`,
            type: "complete",
            message: `${data.completed} file${data.completed !== 1 ? "s" : ""} uploaded successfully${
              data.failed ? ` (${data.failed} failed)` : ""
            }.`,
            timestamp: ts,
          },
        ]);

        setRefresh((r) => r + 1);
      } catch { /* ignore ping lines */ }
    };

    return () => es.close();
  }, []);

  return (
    <Ctx.Provider value={{ toasts, addToast, dismissToast, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
