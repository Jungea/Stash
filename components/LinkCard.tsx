"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Star, MoreHorizontal, Check } from "lucide-react";
import { Link } from "@/types";

type Props = {
  link: Link;
  onToggleFavorite: (id: string, value: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (link: Link) => void;
  onCopy: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export default function LinkCard({ link, onToggleFavorite, onDelete, onEdit, onCopy, selectionMode, selected, onSelect }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imageError, setImageError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const title = link.title ?? getDomain(link.url);
  const domain = getDomain(link.url);
  const tags = link.tags.map((t) => t.tag);

  function handleCopy() {
    navigator.clipboard.writeText(link.url).then(() => onCopy());
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  if (selectionMode) {
    return (
      <article
        onClick={() => onSelect?.(link.id)}
        className={`flex gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${selected ? "border-white/40 bg-white/10" : "border-white/10 bg-white/5"}`}
      >
        <div className="shrink-0 mt-0.5 relative">
          {link.image && !imageError ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/5">
              <Image src={link.image} alt="" width={56} height={56} className="w-full h-full object-cover" unoptimized onError={() => setImageError(true)} />
            </div>
          ) : (
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: link.folder?.color ? `${link.folder.color}33` : "rgba(255,255,255,0.05)" }}
            >
              <span className="text-sm font-medium" style={{ color: link.folder?.color ?? "rgba(255,255,255,0.3)" }}>
                {(link.title ?? getDomain(link.url)).slice(0, 2)}
              </span>
            </div>
          )}
          <div className={`absolute top-1 left-1 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? "bg-white border-white" : "border-white/60 bg-black/40"}`}>
            {selected && <Check className="w-2.5 h-2.5 text-black" />}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug line-clamp-2 text-white">{link.title ?? getDomain(link.url)}</p>
          <p className="text-xs text-white/30 truncate mt-0.5">{getDomain(link.url)}</p>
        </div>
      </article>
    );
  }

  return (
    <article onClick={handleCopy} className="flex gap-3 p-3 rounded-xl border border-white/10 bg-white/5 transition-colors cursor-pointer">
      {/* 썸네일 or 파비콘 */}
      <a href={link.url} target="_blank" rel="noopener noreferrer" className="shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
        {link.image && !imageError ? (
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/5">
            <Image src={link.image} alt="" width={56} height={56} className="w-full h-full object-cover" unoptimized onError={() => setImageError(true)} />
          </div>
        ) : (
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: link.folder?.color ? `${link.folder.color}33` : "rgba(255,255,255,0.05)" }}
          >
            <span className="text-sm font-medium" style={{ color: link.folder?.color ?? "rgba(255,255,255,0.3)" }}>
              {title.slice(0, 2)}
            </span>
          </div>
        )}
      </a>

      {/* 본문 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug line-clamp-2 text-white">
          {link.is_broken && <span className="text-red-400 mr-1">[깨짐]</span>}
          {title}
        </p>
        {link.description && (
          <p className="mt-0.5 text-xs text-white/40 line-clamp-2 leading-snug">{link.description}</p>
        )}
        <div className="mt-0.5 flex flex-col min-w-0">
          <p className="text-xs text-white/30 truncate">{domain}</p>
          {link.folder && (
            <span className="text-xs text-white/25 truncate">{link.folder.name}</span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tags.map((tag) => (
              <span key={tag.id} className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 우측 버튼 */}
      <div className="flex flex-col items-center gap-3 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(link.id, !link.is_favorite); }}
          className={`transition-colors ${
            link.is_favorite ? "text-yellow-400" : "text-white/20 hover:text-white/40"
          }`}
          aria-label="즐겨찾기"
        >
          <Star className="w-5 h-5" fill={link.is_favorite ? "currentColor" : "none"} />
        </button>

        <div ref={menuRef} className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setConfirmDelete(false); }}
            className="text-white/20 hover:text-white/60 p-0.5"
            aria-label="더보기"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-20 w-28 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl overflow-hidden text-sm" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { onEdit(link); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-white/70 hover:bg-white/5"
              >
                수정
              </button>
              <button
                onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-red-400 hover:bg-white/5"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setConfirmDelete(false)}>
          <div className="w-full max-w-md bg-[#1a1a1a] rounded-t-2xl p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-white/60">이 링크를 삭제할까요?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5">취소</button>
              <button onClick={() => { onDelete(link.id); setConfirmDelete(false); }} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-400">삭제</button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
