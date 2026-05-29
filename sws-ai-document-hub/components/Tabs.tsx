import { Upload, Bot } from "lucide-react";

export default function Tabs() {
  return (
    <div className="bg-white border-b">

      <div className="mx-auto max-w-6xl flex gap-10 px-6">

        <button
          className="
          h-14
          border-b-2
          border-blue-600
          text-blue-600
          flex
          items-center
          gap-2
          text-sm
          font-medium
          "
        >
          <Upload size={16} />
          Document Upload
        </button>

        <button
          className="
          h-14
          flex
          items-center
          gap-2
          text-sm
          text-slate-500
          "
        >
          <Bot size={16} />
          AI Assistant
        </button>

      </div>

    </div>
  );
}