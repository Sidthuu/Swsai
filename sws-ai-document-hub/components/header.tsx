import { Bell, FileText } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white border-b">
      <div className="mx-auto max-w-6xl h-16 flex items-center justify-between px-6">

        <div className="flex items-center gap-4">


          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-3">

            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <FileText size={16} color="white" />
            </div>

            <h1 className="text-lg font-semibold text-slate-900">
              SWS AI Document Hub
            </h1>


          </div>

        </div>

        <Bell
          size={20}
          className="text-slate-500"
        />
      </div>
    </header>
  );
}