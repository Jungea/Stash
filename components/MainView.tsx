"use client";

import { useState, useEffect, useCallback } from "react";
import { Link, Folder, Tag } from "@/types";
import LinkCard from "./LinkCard";
import FolderSidebar from "./FolderSidebar";
import AddLinkModal from "./AddLinkModal";
import Toast from "./Toast";

type Props = {
  showSavedToast: boolean;
};

export default function MainView({ showSavedToast }: Props) {
  const [links, setLinks] = useState<Link[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sort, setSort] = useState<"latest" | "title" | "favorite">("latest");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<string | null>(showSavedToast ? "저장됨 ✓" : null);

  const fetchLinks = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedFolderId) params.set("folderId", selectedFolderId);
    if (selectedTagId) params.set("tagId", selectedTagId);
    if (favoriteOnly) params.set("favorite", "1");
    params.set("sort", sort);

    const res = await fetch(`/api/links?${params}`);
    if (res.ok) setLinks(await res.json());
  }, [searchQuery, selectedFolderId, selectedTagId, favoriteOnly, sort]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([
        fetchLinks(),
        fetch("/api/folders").then((r) => r.json()).then((d) => setFolders(Array.isArray(d) ? d : [])),
        fetch("/api/tags").then((r) => r.json()).then((d) => setTags(Array.isArray(d) ? d : [])),
      ]);
      setLoading(false);
    }
    init();
  }, [fetchLinks]);

  async function handleAddLink(data: {
    url: string;
    title?: string;
    description?: string;
    folderId?: string;
  }) {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("저장 실패");
    await fetchLinks();
    setToast("저장됨 ✓");
  }

  async function handleToggleFavorite(id: string, value: boolean) {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, is_favorite: value } : l))
    );
    await fetch(`/api/links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite: value }),
    });
  }

  async function handleToggleRead(id: string, value: boolean) {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, is_read: value } : l))
    );
    await fetch(`/api/links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: value }),
    });
  }

  async function handleDelete(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/links/${id}`, { method: "DELETE" });
  }

  function handleSelectFolder(id: string | null) {
    setSelectedFolderId(id);
    setSelectedTagId(null);
    setFavoriteOnly(false);
  }

  function handleSelectTag(id: string | null) {
    setSelectedTagId(id);
    setSelectedFolderId(null);
    setFavoriteOnly(false);
  }

  function handleToggleFavoriteFilter() {
    setFavoriteOnly((v) => !v);
    setSelectedFolderId(null);
    setSelectedTagId(null);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-white">
      {/* 모바일 사이드바 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed sm:static z-30 h-full w-64 shrink-0 border-r border-white/5 bg-[#111] overflow-y-auto transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        <div className="p-4">
          <p className="text-xs text-white/30 font-medium mb-2 tracking-wider uppercase">Stash</p>
          <FolderSidebar
            folders={folders}
            tags={tags}
            selectedFolderId={selectedFolderId}
            selectedTagId={selectedTagId}
            favoriteOnly={favoriteOnly}
            onSelectFolder={handleSelectFolder}
            onSelectTag={handleSelectTag}
            onToggleFavorite={handleToggleFavoriteFilter}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </aside>

      {/* 메인 */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* 헤더 */}
        <header className="flex items-center gap-2 px-3 py-3 border-b border-white/5 shrink-0">
          <button
            className="sm:hidden p-2 text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(true)}
            aria-label="메뉴"
          >
            ☰
          </button>
          <input
            type="search"
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/20"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-sm text-white/60 outline-none hidden sm:block"
          >
            <option value="latest">최신순</option>
            <option value="title">이름순</option>
            <option value="favorite">즐겨찾기</option>
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/90 shrink-0"
          >
            + 추가
          </button>
        </header>

        {/* 링크 목록 */}
        <main className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <p className="text-center text-white/30 mt-12 text-sm">불러오는 중...</p>
          ) : links.length === 0 ? (
            <p className="text-center text-white/30 mt-12 text-sm">링크가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2 max-w-2xl mx-auto">
              {links.map((link) => (
                <li key={link.id}>
                  <LinkCard
                    link={link}
                    onToggleFavorite={handleToggleFavorite}
                    onToggleRead={handleToggleRead}
                    onDelete={handleDelete}
                  />
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>

      {/* 모달 */}
      {showAddModal && (
        <AddLinkModal
          folders={folders}
          onAdd={handleAddLink}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* 토스트 */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
