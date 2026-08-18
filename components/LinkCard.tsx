"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/types";

type Props = {
  link: Link;
  onToggleFavorite: (id: string, value: boolean) => void;
  onToggleRead: (id: string, value: boolean) => void;
  onDelete: (id: string) => void;
};

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export default function LinkCard({ link, onToggleFavorite, onToggleRead, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const title = link.title ?? getDomain(link.url);
  const domain = getDomain(link.url);
  const tags = link.tags.map((t) => t.tag);

  return (
    <article
      className={`flex gap-3 p-3 rounded-xl border transition-colors ${
        link.is_read
          ? "border-white/5 bg-white/2"
          : "border-white/10 bg-white/5"
      }`}
    >
      {/* 썸네일 or 파비콘 */}
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 mt-0.5"
        onClick={() => !link.is_read && onToggleRead(link.id, true)}
      >
        {link.image ? (
          <div className="w-16 h-12 rounded-lg overflow-hidden bg-white/5">
            <Image
              src={link.image}
              alt=""
              width={64}
              height={48}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
            {link.favicon ? (
              <Image src={link.favicon} alt="" width={20} height={20} unoptimized />
            ) : (
              <span className="text-white/30 text-xs">{domain[0]?.toUpperCase()}</span>
            )}
          </div>
        )}
      </a>

      {/* 본문 */}
      <div className="flex-1 min-w-0">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          onClick={() => !link.is_read && onToggleRead(link.id, true)}
        >
          <p
            className={`text-sm font-medium leading-snug line-clamp-2 ${
              link.is_read ? "text-white/40" : "text-white"
            }`}
          >
            {link.is_broken && <span className="text-red-400 mr-1">[깨짐]</span>}
            {title}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
            <p className="text-xs text-white/30 truncate shrink-0">{domain}</p>
            {link.folder && (
              <span className="text-xs text-white/25 truncate">· {link.folder.name}</span>
            )}
          </div>
        </a>

        {/* 태그 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 우측 버튼 */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        {/* 즐겨찾기 */}
        <button
          onClick={() => onToggleFavorite(link.id, !link.is_favorite)}
          className={`text-lg leading-none transition-colors ${
            link.is_favorite ? "text-yellow-400" : "text-white/20 hover:text-white/40"
          }`}
          aria-label="즐겨찾기"
        >
          ★
        </button>

        {/* 더보기 메뉴 */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white/20 hover:text-white/60 text-lg leading-none px-1"
            aria-label="더보기"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-20 w-36 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl overflow-hidden text-sm">
              <button
                onClick={() => { onToggleRead(link.id, !link.is_read); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-white/70 hover:bg-white/5"
              >
                {link.is_read ? "안읽음으로" : "읽음으로"}
              </button>
              <button
                onClick={() => { onDelete(link.id); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-red-400 hover:bg-white/5"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
