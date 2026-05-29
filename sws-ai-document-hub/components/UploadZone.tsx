"use client";

import {
  Upload, X, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, FileText,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNotifications } from "@/context/NotificationContext";

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXT = ".pdf";
const ALLOWED_TYPE = "application/pdf";
const BULK_THRESHOLD = 3;
const MAX_CONCURRENT = 3;

type UploadStatus = "pending" | "uploading" | "complete" | "failed";

interface FileEntry {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_ICON: Record<UploadStatus, React.ReactNode> = {
  pending:   <Loader2 size={14} className="text-slate-300" />,
  uploading: <Loader2 size={14} className="text-blue-500 animate-spin" />,
  complete:  <CheckCircle size={14} className="text-green-500" />,
  failed:    <AlertCircle size={14} className="text-red-500" />,
};

const STATUS_LABEL: Record<UploadStatus, string> = {
  pending:   "Pending",
  uploading: "Uploading",
  complete:  "Complete",
  failed:    "Failed",
};

// Smoothly animate progress toward a target value using rAF
function useProgressAnimator() {
  const targets = useRef<Map<string, number>>(new Map());
  const current = useRef<Map<string, number>>(new Map());
  const rafId   = useRef<number | null>(null);

  const setTarget = useCallback(
    (id: string, target: number, setter: (id: string, pct: number) => void) => {
      targets.current.set(id, target);
      if (!current.current.has(id)) current.current.set(id, 0);

      const animate = () => {
        let anyMoving = false;
        for (const [entryId, tgt] of targets.current) {
          const cur = current.current.get(entryId) ?? 0;
          if (cur < tgt) {
            // ease toward target — faster when far, slower near end
            const step = Math.max(0.5, (tgt - cur) * 0.08);
            const next = Math.min(tgt, cur + step);
            current.current.set(entryId, next);
            setter(entryId, Math.round(next));
            if (next < tgt) anyMoving = true;
          }
        }
        if (anyMoving) rafId.current = requestAnimationFrame(animate);
        else rafId.current = null;
      };

      if (!rafId.current) rafId.current = requestAnimationFrame(animate);
    },
    []
  );

  const clear = useCallback((id: string) => {
    targets.current.delete(id);
    current.current.delete(id);
  }, []);

  return { setTarget, clear };
}

export default function UploadZone() {
  const { addToast, fetchNotifications, triggerRefresh } = useNotifications();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isBulkBatch, setIsBulkBatch] = useState(false);
  const singleRef = useRef<HTMLInputElement>(null);
  const bulkRef   = useRef<HTMLInputElement>(null);
  const queue     = useRef<FileEntry[]>([]);
  const active    = useRef(0);
  const jobIdRef  = useRef<string | null>(null);
  const jobTotalRef = useRef(0);
  const { setTarget, clear } = useProgressAnimator();

  const updateEntry = useCallback(
    (id: string, patch: Partial<FileEntry>) =>
      setEntries((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f)),
    []
  );

  const setProgress = useCallback(
    (id: string, pct: number) => updateEntry(id, { progress: pct }),
    [updateEntry]
  );

  const uploadOne = useCallback(
    (entry: FileEntry) => {
      active.current += 1;
      updateEntry(entry.id, { status: "uploading", progress: 0 });

      const xhr = new XMLHttpRequest();
      const fd  = new FormData();
      fd.append("file", entry.file);
      if (jobIdRef.current) {
        fd.append("jobId", jobIdRef.current);
        fd.append("jobTotal", String(jobTotalRef.current));
      }

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        // Only animate to 90% during transfer — snap to 100 on load
        const pct = Math.min(90, Math.round((e.loaded / e.total) * 90));
        setTarget(entry.id, pct, setProgress);
      };

      xhr.onload = () => {
        const ok = xhr.status >= 200 && xhr.status < 300;
        clear(entry.id);
        updateEntry(entry.id, { progress: 100, status: ok ? "complete" : "failed" });
        if (ok) {
          triggerRefresh();      // refresh document library immediately
          fetchNotifications();  // update notification bell
        }
        active.current -= 1;
        drainQueue();
      };

      xhr.onerror = () => {
        clear(entry.id);
        updateEntry(entry.id, { status: "failed", progress: 0 });
        active.current -= 1;
        drainQueue();
      };

      xhr.open("POST", "/api/upload");
      xhr.send(fd);
    },
    [updateEntry, setTarget, setProgress, clear, triggerRefresh, fetchNotifications]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const drainQueue = useCallback(() => {
    while (active.current < MAX_CONCURRENT && queue.current.length > 0) {
      const next = queue.current.shift()!;
      uploadOne(next);
    }
  }, [uploadOne]);

  const addFiles = useCallback(
    (files: File[]) => {
      const validated: FileEntry[] = files.map((file) => {
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        if (ext !== ALLOWED_EXT || file.type !== ALLOWED_TYPE) {
          return {
            id: `${Date.now()}-${Math.random()}`, file, progress: 0,
            status: "failed" as UploadStatus, error: "Only PDF files are allowed.",
          };
        }
        if (file.size > MAX_SIZE) {
          return {
            id: `${Date.now()}-${Math.random()}`, file, progress: 0,
            status: "failed" as UploadStatus, error: "Exceeds 20 MB limit.",
          };
        }
        return { id: `${Date.now()}-${Math.random()}`, file, progress: 0, status: "pending" as UploadStatus };
      });

      const valid = validated.filter((e) => !e.error);
      const bulk  = valid.length > BULK_THRESHOLD;

      // Reset batch state
      setIsBulkBatch(bulk);
      setCollapsed(bulk);
      setEntries([]);
      queue.current  = [];
      active.current = 0;

      if (bulk) {
        const jobId = `job-${Date.now()}`;
        jobIdRef.current   = jobId;
        jobTotalRef.current = valid.length;
        addToast({
          id: `progress-${jobId}`,
          type: "progress",
          message: `Upload in progress — processing ${valid.length} files in background.`,
        });
      } else {
        jobIdRef.current    = null;
        jobTotalRef.current = 0;
      }

      setEntries(validated);
      queue.current = [...valid];
      drainQueue();
    },
    [addToast, drainQueue]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const removeEntry = (id: string) => {
    clear(id);
    setEntries((prev) => prev.filter((f) => f.id !== id));
  };

  const doneCount = entries.filter((e) => e.status === "complete" || e.status === "failed").length;
  const allDone   = entries.length > 0 && doneCount === entries.length;
  const validCount = entries.filter((e) => !e.error).length;

  // Auto-dismiss bulk progress toast when all done
  useEffect(() => {
    if (allDone && isBulkBatch && jobIdRef.current) {
      // toast dismissal handled by SSE new-notification event in context
    }
  }, [allDone, isBulkBatch]);

  return (
    <div className="space-y-4">

      {/* ── Drop zone ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed h-[220px] flex flex-col items-center justify-center transition-all cursor-pointer ${
          dragging
            ? "border-blue-400 bg-blue-50 scale-[1.01]"
            : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
        }`}
      >
        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors ${
          dragging ? "bg-blue-100" : "bg-slate-100"
        }`}>
          <Upload size={26} className={dragging ? "text-blue-500" : "text-slate-400"} />
        </div>
        <h2 className="mt-4 text-xl font-medium text-slate-800">
          Drop files here or click to browse
        </h2>
        <p className="mt-1 text-sm text-slate-500">PDF only • Max 20 MB per file</p>

        <div className="mt-5 flex gap-3">
          <input ref={singleRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) addFiles([e.target.files[0]]); e.target.value = ""; }} />
          <input ref={bulkRef} type="file" accept=".pdf" multiple className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ""; }} />

          <button
            onClick={() => singleRef.current?.click()}
            className="h-9 px-5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
          >
            Single file
          </button>
          <button
            onClick={() => bulkRef.current?.click()}
            className="h-9 px-5 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            Bulk upload
          </button>
        </div>
      </div>

      {/* ── Upload queue ── */}
      {entries.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">

          {/* Bulk header */}
          {isBulkBatch && (
            <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-100 ${
              allDone ? "bg-green-50" : "bg-blue-50"
            }`}>
              <div className="flex items-center gap-2">
                {!allDone
                  ? <Loader2 size={14} className="text-blue-500 animate-spin" />
                  : <CheckCircle size={14} className="text-green-500" />
                }
                <span className="text-sm font-medium text-slate-700">
                  {allDone
                    ? `All ${validCount} files processed`
                    : `Uploading ${validCount} files — ${doneCount} / ${validCount} done`}
                </span>
              </div>
              <button
                onClick={() => setCollapsed((c) => !c)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition"
              >
                {collapsed
                  ? <><ChevronDown size={13} /> Show files</>
                  : <><ChevronUp size={13} /> Hide files</>}
              </button>
            </div>
          )}

          {/* Overall progress bar for bulk */}
          {isBulkBatch && validCount > 0 && (
            <div className="h-1 w-full bg-slate-100">
              <div
                className={`h-full transition-all duration-500 ${allDone ? "bg-green-500" : "bg-blue-500"}`}
                style={{ width: `${Math.round((doneCount / validCount) * 100)}%` }}
              />
            </div>
          )}

          {/* Individual file rows */}
          {!collapsed && (
            <div className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  {/* File icon */}
                  <div className="shrink-0 h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FileText size={16} className="text-slate-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Top row: name + meta */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {entry.file.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400">{formatSize(entry.file.size)}</span>
                        <div className="flex items-center gap-1">
                          {STATUS_ICON[entry.status]}
                          <span className={`text-xs font-medium ${
                            entry.status === "complete"  ? "text-green-600" :
                            entry.status === "failed"    ? "text-red-500"   :
                            entry.status === "uploading" ? "text-blue-500"  : "text-slate-400"
                          }`}>
                            {STATUS_LABEL[entry.status]}
                          </span>
                        </div>
                        {entry.status !== "failed" && (
                          <span className="text-xs tabular-nums text-slate-400 w-8 text-right">
                            {entry.progress}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Validation error */}
                    {entry.error && (
                      <p className="text-xs text-red-500 mb-1">{entry.error}</p>
                    )}

                    {/* Progress bar — only for non-validation-failed files */}
                    {!entry.error && (
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-none ${
                            entry.status === "complete"  ? "bg-green-500" :
                            entry.status === "failed"    ? "bg-red-400"   : "bg-blue-500"
                          }`}
                          style={{ width: `${entry.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="shrink-0 ml-1 p-1 rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition"
                  >
                    <X size={14} />
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
