import { Info } from "lucide-react";

export default function InfoBanner() {
  return (
    <div
      className="
      mb-8
      rounded-xl
      border
      border-blue-100
      bg-blue-50
      px-5
      py-4
      text-sm
      text-slate-700
      "
    >
      <div className="flex gap-3">

        <Info
          size={18}
          className="text-blue-600 mt-0.5"
        />

        <p>
          <span className="font-semibold">
           Working demo -
          </span>{" "}
          files are processed client-side only,
          files are stored. Upload 1–3 files to
          see individual progress bars. Upload 4
          or more files to trigger the bulk
          notification flow.
        </p>

      </div>
    </div>
  );
}