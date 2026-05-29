"use client";

import { Upload, X, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useNotifications } from "@/context/NotificationContext";

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXT = ".pdf";
const ALLOWED_TYPE = "application/pdf";

type UploadStatus = "pending" | "uploading" | "complete" | "failed";

interface FileEntry {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
}

interface UploadZoneProps {
  onUploadComplete: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_ICON: Record<UploadStatus, React.ReactNode> = {
  pending: <Loader2 size={14} className="text-slate-400 animate-spin" />,
  uploading: <Loader2 size={14} className="text-blue-500 animate-spin" />,
  complete: <CheckCircle size={14} className="text-green-500" />,
  failed: <AlertCircle size={14} className="text-red-500" />,
};

const STATUS_LABEL: Record<UploadStatus, string> = {
  pending: "Pending",
  uploading: "Uploading",
  complete: "Complete",
  failed: "Failed",
};

const BULK_THRESHOLD = 3;

export default function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const { addToast } = useNotifications();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const singleRef = useRef<HTMLInputElement>(null);
  const bulkRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    (entry: FileEntry, jobId: string | null, jobTotal: number, onComplete: () => void) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", entry.file);
      if (jobId) {
        formData.append("jobId", jobId);
        formData.append("jobTotal", String(jobTotal));
      }

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        setEntries((prev) =>
          prev.map((f) => f.id === entry.id ? { ...f, progress: pct, status: "uploading" } : f)
        );
      };

      xhr.onload = () => {
        const success = xhr.status >= 200 && xhr.status < 300;
        setEntries((prev) =>
          prev.map((f) =>
            f.id === entry.id ? { ...f, progress: 100, status: success ? "complete" : "failed" } : f
          )
        );
        if (success) onComplete();
      };

      xhr.onerror = () => {
        setEntries((prev) =>
          prev.map((f) => f.id === entry.id ? { ...f, status: "failed" } : f)
        );
      };

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    },
    []
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const validated: FileEntry[] = files.map((file) => {
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        if (ext !== ALLOWED_EXT || file.type !== ALLOWED_TYPE) {
          return { id: `${Date.now()}-${Math.random()}`, file, progress: 0, status: "failed" as UploadStatus, error: "Only PDF files are allowed." };
        }
        if (file.size > MAX_SIZE) {
          return { id: `${Date.now()}-${Math.random()}`, file, progress: 0, status: "failed" as UploadStatus, error: "Exceeds 20 MB limit." };
        }
        return { id: `${Date.now()}-${Math.random()}`, file, progress: 0, status: "pending" as UploadStatus };
      });

      const valid = validated.filter((e) => !e.error);
      const isBulk = valid.length > BULK_THRESHOLD;
      const jobId = isBulk ? `job-${Date.now()}` : null;

      setEntries((prev) => [...prev, ...validated]);

      if (isBulk) {
        setCollapsed(true);
        addToast({
          id: `progress-${jobId}`,
          type: "progress",
          message: `Upload in progress — processing ${valid.length} files in background.`,
        });
      }

      valid.forEach((entry) =>
        uploadFile(entry, jobId, valid.length, () => {
          if (!isBulk) onUploadComplete();
        })
      );
    },
    [uploadFile, onUploadComplete, addToast]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const removeEntry = (id: string) =>
    setEntries((prev) => prev.filter((f) => f.id !== id));

  const isBulkBatch = entries.length > BULK_THRESHOLD;
  const doneCount = entries.filter((e) => e.status === "complete" || e.status === "failed").length;
  const allDone = entries.length > 0 && doneCount === entries.length;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-2xl border border-dashed h-[220px] flex flex-col items-center justify-center transition-colors ${
          dragging ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Upload size={26} className="text-slate-400" />
        </div>
        <h2 className="mt-4 text-xl font-medium text-slate-800">
          Drop files here or click to browse
        </h2>
        <p className="mt-1 text-sm text-slate-500">PDF files • Up to 20 MB per file</p>

        <div className="mt-5 flex gap-3">
          <input ref={singleRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) addFiles([e.target.files[0]]); }} />
          <input ref={bulkRef} type="file" accept=".pdf" multiple className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); }} />

          <button onClick={() => singleRef.current?.click()}
            className="h-9 px-4 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
            Single file
          </button>
          <button onClick={() => bulkRef.current?.click()}
            className="h-9 px-4 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
            Bulk upload
          </button>
        </div>
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {/* Header row for bulk */}
          {isBulkBatch && (
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <span className="text-sm font-medium text-slate-700">
                {allDone
                  ? `${doneCount} files processed`
                  : `Processing ${entries.length} files — ${doneCount}/${entries.length} done`}
              </span>
              <button
                onClick={() => setCollapsed((c) => !c)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition"
              >
                {collapsed ? <><ChevronDown size={14} /> Show</> : <><ChevronUp size={14} /> Hide</>}
              </button>
            </div>
          )}

          {/* Individual rows */}
          {!collapsed && (
            <div className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800 truncate max-w-[260px]">
                        {entry.file.name}
                      </span>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <span className="text-xs text-slate-400">{formatSize(entry.file.size)}</span>
                        <span className="text-xs text-slate-400">{entry.file.type || "unknown"}</span>
                        <div className="flex items-center gap-1">
                          {STATUS_ICON[entry.status]}
                          <span className={`text-xs font-medium ${
                            entry.status === "complete" ? "text-green-600" :
                            entry.status === "failed" ? "text-red-500" :
                            entry.status === "uploading" ? "text-blue-500" : "text-slate-400"
                          }`}>
                            {STATUS_LABEL[entry.status]}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{entry.progress}%</span>
                      </div>
                    </div>
                    {entry.error && (
                      <p className="text-xs text-red-500 mb-1">{entry.error}</p>
                    )}
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          entry.status === "complete" ? "bg-green-500" :
                          entry.status === "failed" ? "bg-red-400" : "bg-blue-500"
                        }`}
                        style={{ width: `${entry.progress}%` }}
                      />
                    </div>
                  </div>
                  <button onClick={() => removeEntry(entry.id)}
                    className="ml-2 text-slate-300 hover:text-slate-500 transition shrink-0">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
