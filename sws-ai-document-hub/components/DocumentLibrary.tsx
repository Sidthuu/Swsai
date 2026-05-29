"use client";

import { Archive, Download, FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Doc {
  name: string;
  size: number;
  uploadedAt: string;
  url: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function DocumentLibrary({ refresh }: { refresh: number }) {
  const [docs, setDocs] = useState<Doc[]>([]);

  const fetchDocs = useCallback(async () => {
    const res = await fetch("/api/documents");
    const data = await res.json();
    setDocs(data);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs, refresh]);

  return (
    <div className="mt-10">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">Document Library</h3>

      {docs.length === 0 ? (
        <div className="h-[220px] rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center">
          <Archive size={42} className="text-slate-300" />
          <p className="mt-4 text-base font-medium text-slate-700">No documents yet</p>
          <p className="text-sm text-slate-400">Upload files above — they'll appear here once complete</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Size</th>
                <th className="px-5 py-3">Uploaded</th>
                <th className="px-5 py-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-blue-400 shrink-0" />
                      <span className="font-medium text-slate-800 truncate max-w-[260px]">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatSize(doc.size)}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(doc.uploadedAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <a href={doc.url} download
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition">
                      <Download size={13} />
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
