"use client";

import { useState, useRef, FormEvent } from "react";
import { Loader2, Import } from "lucide-react";
import Image from "next/image";
import { Link } from "@/types";

type Props = {
  link: Link;
  onSave: (data: {
    url: string;
    title: string | null;
    description: string | null;
  }) => Promise<void>;
  onClose: () => void;
};

export default function EditLinkModal({ link, onSave, onClose }: Props) {
  const [url, setUrl] = useState(link.url);
  const [title, setTitle] = useState(link.title ?? "");
  const [description, setDescription] = useState(link.description ?? "");
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const dragStartY = useRef<number | null>(null);

  function handleHandlePointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleHandlePointerUp(e: React.PointerEvent) {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta < -30) setExpanded(true);
    else if (delta > 30) expanded ? setExpanded(false) : onClose();
    dragStartY.current = null;
  }

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
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full bg-[#1a1a1a] flex flex-col transition-all duration-300 ${
          expanded ? "h-full rounded-none" : "max-h-[85vh] rounded-t-2xl"
        }`}
      >
        {/* 핸들 */}
        <div
          className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none shrink-0"
          onPointerDown={handleHandlePointerDown}
          onPointerUp={handleHandlePointerUp}
        >
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white">링크 수정</h2>
          {link.image && (
            <div className="relative w-32 h-20 rounded-xl overflow-hidden bg-white/5">
              <Image src={link.image} alt="" fill className="object-cover" unoptimized />
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm"
            />

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="이름"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm"
              />
              <button
                type="button"
                onClick={fetchMeta}
                disabled={fetching || !url}
                className="rounded-xl border border-white/10 px-3 py-3 text-white/50 hover:text-white hover:bg-white/5 text-sm disabled:opacity-30 shrink-0"
              >
                {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Import className="w-4 h-4" />}
              </button>
            </div>

            <textarea
              placeholder="설명"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm resize-none"
            />

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
    </div>
  );
}
