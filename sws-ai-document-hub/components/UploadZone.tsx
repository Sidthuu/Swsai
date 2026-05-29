"use client";

import { Upload } from "lucide-react";

export default function UploadZone() {
  return (
    <div
      className="
      rounded-2xl
      border
      border-dashed
      border-slate-300
      bg-white
      h-[280px]
      flex
      flex-col
      items-center
      justify-center
      transition
      hover:border-blue-400
      hover:bg-blue-50
      "
    >

      <div
        className="
        h-16
        w-16
        rounded-2xl
        bg-slate-100
        flex
        items-center
        justify-center
        transition
        hover:bg-blue-100
        "
      >
        <Upload
          size={28}
          className="text-slate-400"
        />
      </div>

      <h2 className="mt-5 text-2xl font-medium text-slate-800">
        Drop files here or click to browse
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Any file type • Up to 20 MB per file
      </p>

      <div className="mt-6 flex gap-3">

        <button
          className="
         h-9
          px-4
          rounded-lg
          border
          border-slate-200
          bg-gray-200
          rounded-full
          text-sm
          font-medium
          text-black
          "
        >
          Single file
        </button>

        <button
          className="
        h-9
          px-4
          rounded-lg
          border
          border-slate-200
          bg-gray-200
          rounded-full
          text-sm
          font-medium
          text-black
          "
        >
          Bulk upload
        </button>

        <button
          className="
          h-9
          px-4
          rounded-full
          bg-blue-50
          text-blue-600
          text-sm
          font-medium
          "
        >
          Try 4+ files to trigger notifications
        </button>

      </div>
    </div>
  );
}