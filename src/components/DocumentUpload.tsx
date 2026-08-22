"use client";
import { useRef, useState } from "react";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";

type State = "idle" | "uploading" | "done" | "error";

/**
 * Real Zero-Data-Entry upload: presign → PUT directly to object storage →
 * commit (which emits document.received into the OCR pipeline). No fake
 * confirmations — state reflects the actual upload result.
 */
export function DocumentUpload({ orgId, type, label }: { orgId: string; type: string; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>("idle");
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setName(file.name);
    setState("uploading");
    setError(null);
    try {
      const { documentId, uploadUrl } = await api.presignDoc(orgId, type, file.name, file.type || "application/octet-stream");
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!put.ok) throw new Error(`upload_failed_${put.status}`);
      await api.commitDoc(orgId, documentId);
      setState("done");
    } catch (err) {
      setState("error");
      setError(err instanceof ApiError ? err.code : err instanceof Error ? err.message : "upload_failed");
    }
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="truncate text-xs text-muted">{name ?? "PDF, JPG or PNG"}</p>
      </div>
      <div className="flex items-center gap-2">
        {state === "done" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        {state === "uploading" && <Loader2 className="h-5 w-5 animate-spin text-brand" />}
        {state === "error" && <span className="text-xs text-danger">{error?.replaceAll("_", " ")}</span>}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-bg2"
        >
          <Upload className="h-3.5 w-3.5" /> {state === "done" ? "Replace" : "Upload"}
        </button>
        <input ref={inputRef} type="file" hidden onChange={onFile} accept=".pdf,.jpg,.jpeg,.png" />
      </div>
    </div>
  );
}
