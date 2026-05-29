"use client";

import { useNotifications } from "@/context/NotificationContext";
import DocumentLibrary from "@/components/DocumentLibrary";
import Header from "@/components/header";
import InfoBanner from "@/components/InfoBanner";
import Tabs from "@/components/Tabs";
import UploadZone from "@/components/UploadZone";

export default function Home() {
  const { refresh, addToast } = useNotifications();

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <Tabs />
      <section className="mx-auto max-w-5xl px-6 py-8">
        <InfoBanner />
        <UploadZone onUploadComplete={() => {}} />
        <DocumentLibrary refresh={refresh} />
      </section>
    </main>
  );
}
