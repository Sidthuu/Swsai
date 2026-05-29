"use client";

import { Bell, FileText, CheckCheck, CheckCircle, XCircle, Info, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNotifications, AppNotification } from "@/context/NotificationContext";

function timeAgo(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const TYPE_STYLES: Record<AppNotification["type"], { icon: React.ReactNode; badge: string; row: string }> = {
  SUCCESS: {
    icon: <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />,
    badge: "bg-green-100 text-green-700",
    row: "hover:bg-green-50",
  },
  ERROR: {
    icon: <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />,
    badge: "bg-red-100 text-red-700",
    row: "hover:bg-red-50",
  },
  INFO: {
    icon: <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />,
    badge: "bg-blue-100 text-blue-700",
    row: "hover:bg-blue-50",
  },
};

export default function Header() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="bg-white border-b">
      <div className="mx-auto max-w-6xl h-16 flex items-center justify-between px-6">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <FileText size={16} color="white" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">SWS AI Document Hub</h1>
        </div>

        {/* Bell */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative p-2 rounded-lg hover:bg-slate-100 transition"
          >
            <Bell size={20} className="text-slate-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-12 w-[360px] rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="font-semibold text-slate-900 text-sm">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                      {unreadCount} unread
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition"
                    >
                      <CheckCheck size={13} />
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Bell size={28} className="mb-2 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const s = TYPE_STYLES[n.type];
                    return (
                      <div
                        key={n.id}
                        onClick={() => { if (!n.isRead) markRead(n.id); }}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition ${s.row} ${!n.isRead ? "bg-slate-50" : ""}`}
                      >
                        {s.icon}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-semibold uppercase rounded px-1.5 py-0.5 ${s.badge}`}>
                              {n.type}
                            </span>
                            {!n.isRead && (
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-slate-800 leading-snug">{n.message}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
