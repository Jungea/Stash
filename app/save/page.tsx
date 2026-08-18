"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Folder } from "@/types";
import CustomSelect from "@/components/CustomSelect";

function SaveForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") ?? "";

  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/folders")
      .then((r) => r.json())
      .then((d) => setFolders(Array.isArray(d) ? d : []));

    if (initialUrl) fetchMeta(initialUrl);
  }, [initialUrl]);

  async function fetchMeta(targetUrl: string) {
    setFetching(true);
    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(targetUrl)}`);
      if (res.ok) {
        const meta = await res.json();
        if (meta.title) setTitle(meta.title);
      }
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          folderId: folderId || undefined,
        }),
      });

      if (!res.ok) throw new Error("저장 실패");
      router.replace("/?saved=1");
    } catch {
      setError("저장에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-xl font-bold text-white">링크 저장</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* URL */}
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm"
            />
            <button
              type="button"
              onClick={() => fetchMeta(url)}
              disabled={fetching || !url}
              className="rounded-xl border border-white/10 px-3 text-white/50 hover:text-white hover:bg-white/5 text-sm disabled:opacity-30 shrink-0"
            >
              {fetching ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              )}
            </button>
          </div>

          {/* 이름 */}
          <input
            type="text"
            placeholder="이름 (자동 완성)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm"
          />

          {/* 설명 */}
          <textarea
            placeholder="설명 (자동 완성)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm resize-none"
          />

          {/* 폴더 */}
          {folders.length > 0 && (
            <CustomSelect
              value={folderId}
              onChange={setFolderId}
              options={folders.map((f) => ({ value: f.id, label: f.name }))}
              placeholder="폴더 선택 (선택사항)"
            />
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-50"
            >
              {loading ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function SavePage() {
  return (
    <Suspense>
      <SaveForm />
    </Suspense>
  );
}
