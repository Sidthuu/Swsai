import Header from "@/components/header";
import InfoBanner from "@/components/InfoBanner";
import Tabs from "@/components/Tabs";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <Tabs />
      <section className="mx-auto max-w-5xl px-6 py-8">
        <InfoBanner />

      </section>
    </main>
  );
}