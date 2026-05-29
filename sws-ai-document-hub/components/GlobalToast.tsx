"use client";

import { CheckCircle, Loader2, X } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";

export default function GlobalToast() {
  const { toasts, dismissToast } = useNotifications();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-[340px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg border text-sm ${
            t.type === "complete"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {t.type === "complete" ? (
              <CheckCircle size={16} className="text-green-500" />
            ) : (
              <Loader2 size={16} className="text-blue-500 animate-spin" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{t.message}</p>
            {t.timestamp && (
              <p className="text-xs mt-0.5 opacity-70">{t.timestamp}</p>
            )}
          </div>
          <button
            onClick={() => dismissToast(t.id)}
            className="shrink-0 opacity-50 hover:opacity-100 transition"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
