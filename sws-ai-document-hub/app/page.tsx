"use client";

import { useEffect, useRef, useState } from "react";
import DocumentLibrary from "@/components/DocumentLibrary";
import Header from "@/components/header";
import InfoBanner from "@/components/InfoBanner";
import NotificationToast, { Toast } from "@/components/NotificationToast";
import Tabs from "@/components/Tabs";
import UploadZone from "@/components/UploadZone";

export default function Home() {
  const [refresh, setRefresh] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sseRef = useRef<EventSource | null>(null);

  const addToast = (toast: Toast) =>
    setToasts((prev) => [...prev.filter((t) => t.id !== toast.id), toast]);

  const dismissToast = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // SSE — persists even if user navigates within the SPA
  useEffect(() => {
    const es = new EventSource("/api/notifications");
    sseRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "bulk-complete") {
          const ts = new Date(data.finishedAt).toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit", second: "2-digit",
          });
          // dismiss the in-progress toast for this job
          dismissToast(`toast-progress-job-${data.jobId}`);
          addToast({
            id: `toast-done-${data.jobId}`,
            type: "complete",
            message: `${data.completed} file${data.completed !== 1 ? "s" : ""} uploaded successfully${data.failed ? ` (${data.failed} failed)` : ""}.`,
            timestamp: ts,
          });
          setRefresh((r) => r + 1);
        }
      } catch { /* ignore malformed */ }
    };

    return () => es.close();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <Tabs />
      <section className="mx-auto max-w-5xl px-6 py-8">
        <InfoBanner />
        <UploadZone
          onUploadComplete={() => setRefresh((r) => r + 1)}
          onToast={addToast}
          onDismissToast={dismissToast}
        />
        <DocumentLibrary refresh={refresh} />
      </section>
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
