"use client";

import { useState, FormEvent } from "react";
import { Link, Folder } from "@/types";
import CustomSelect from "./CustomSelect";

type Props = {
  link: Link;
  folders: Folder[];
  onSave: (data: {
    url: string;
    title: string | null;
    description: string | null;
    folder_id: string | null;
  }) => Promise<void>;
  onClose: () => void;
};

export default function EditLinkModal({ link, folders, onSave, onClose }: Props) {
  const [url, setUrl] = useState(link.url);
  const [title, setTitle] = useState(link.title ?? "");
  const [description, setDescription] = useState(link.description ?? "");
  const [folderId, setFolderId] = useState(link.folder_id ?? "");
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchMeta() {
    if (!url.trim()) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
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
      await onSave({
        url: url.trim(),
        title: title.trim() || null,
        description: description.trim() || null,
        folder_id: folderId || null,
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
        <h2 className="text-lg font-semibold text-white">링크 수정</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
              onClick={fetchMeta}
              disabled={fetching || !url}
              className="rounded-xl border border-white/10 px-3 py-3 text-white/50 hover:text-white hover:bg-white/5 text-sm disabled:opacity-30 shrink-0"
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

          <input
            type="text"
            placeholder="이름"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm"
          />

          <textarea
            placeholder="설명"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm resize-none"
          />

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
