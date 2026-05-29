import { Archive } from "lucide-react";

export default function DocumentLibrary() {
  return (
    <div className="mt-10">

      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Document Library
      </h3>

      <div
        className="
        h-[220px]
        rounded-2xl
        border
        border-slate-200
        bg-white
        flex
        flex-col
        items-center
        justify-center
        "
      >

        <Archive
          size={42}
          className="text-slate-300"
        />

        <p className="mt-4 text-base font-medium text-slate-700">
          No documents yet
        </p>

        <p className="text-sm text-slate-400">
          Upload files above — they'll appear here once complete
        </p>

      </div>

    </div>
  );
}