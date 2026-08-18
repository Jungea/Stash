"use client";

import { useState, FormEvent } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Folder } from "@/types";
import CustomSelect from "./CustomSelect";

type Props = {
  folders: Folder[];
  onAdd: (data: {
    url: string;
    title?: string;
    description?: string;
    folderId?: string;
  }) => Promise<void>;
  onClose: () => void;
  initialUrl?: string;
  initialFolderId?: string | null;
};

export default function AddLinkModal({ folders, onAdd, onClose, initialUrl = "", initialFolderId }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState(initialFolderId ?? "");
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchMeta(targetUrl: string) {
    if (!targetUrl.trim()) return;
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
    if (!url.trim()) return;
    setError("");
    setLoading(true);
    try {
      await onAdd({
        url: url.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        folderId: folderId || undefined,
      });
      onClose();
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-md bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">링크 추가</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* URL */}
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={(e) => fetchMeta(e.target.value)}
              autoFocus
              required
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm"
            />
            <button
              type="button"
              onClick={() => fetchMeta(url)}
              disabled={fetching || !url}
              className="rounded-xl border border-white/10 px-3 py-3 text-white/50 hover:text-white hover:bg-white/5 text-sm disabled:opacity-30 shrink-0"
            >
              {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
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
              onClick={onClose}
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
    </div>
  );
}
