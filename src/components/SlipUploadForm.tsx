"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { SLIP_ALLOWED_TYPES, SLIP_MAX_BYTES } from "@/lib/validation";

export function SlipUploadForm({ token }: { token: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please choose your payment slip file first.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const isMimeAllowed = file.type in SLIP_ALLOWED_TYPES;
    const isExtAllowed = ext && ["jpg", "jpeg", "png", "webp", "pdf"].includes(ext);

    if (!isMimeAllowed && !isExtAllowed) {
      setError("Only JPG, PNG, WebP or PDF files are accepted.");
      return;
    }
    if (file.size > SLIP_MAX_BYTES) {
      setError("The file is larger than 5 MB. Please upload a smaller file.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.set("token", token);
      form.set("file", file);
      const res = await fetch("/api/slip", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <label
          htmlFor="slip"
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition focus-within:ring-2 focus-within:ring-orange-300 ${
            fileName
              ? "border-emerald-300 bg-emerald-50/60"
              : "border-orange-200 bg-orange-50/40 hover:border-orange-400 hover:bg-orange-50"
          }`}
        >
          <span className="text-2xl">{fileName ? "✅" : "🧾"}</span>
          <span className="mt-2 text-sm font-semibold text-slate-700 text-ellipsis overflow-hidden max-w-full px-4">
            {fileName ?? "Tap to choose your payment slip"}
          </span>
          <span className="mt-1 text-xs text-slate-500">
            {fileName ? "Tap to choose a different file" : "JPG · PNG · WebP · PDF, up to 5 MB"}
          </span>
          {/* sr-only (not display:none) keeps the input keyboard-focusable */}
          <input
            id="slip"
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        {fileName && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setFileName(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-200/80 text-slate-600 hover:bg-red-100 hover:text-red-700 transition"
            title="Remove selected slip"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={uploading}
        className="w-full rounded-full bg-orange-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-xl hover:shadow-orange-600/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {uploading ? "Uploading…" : "Upload payment slip"}
      </button>
    </form>
  );
}
