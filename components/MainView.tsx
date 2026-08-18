"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Link, Folder, Tag } from "@/types";
import LinkCard from "./LinkCard";
import AddLinkModal from "./AddLinkModal";
import EditLinkModal from "./EditLinkModal";
import Toast from "./Toast";

const FolderSidebar = dynamic(() => import("./FolderSidebar"), { ssr: false });

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
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [toast, setToast] = useState<string | null>(showSavedToast ? "저장됨 ✓" : null);

  const showFolderView = !selectedTagId && !favoriteOnly && !searchQuery;

  const currentLevelFolders = useMemo(
    () => folders.filter((f) => f.parent_id === (selectedFolderId ?? null)),
    [folders, selectedFolderId]
  );

  const folderPath = useMemo(() => {
    const path: typeof folders = [];
    let id: string | null = selectedFolderId;
    while (id) {
      const f = folders.find((x) => x.id === id);
      if (!f) break;
      path.unshift(f);
      id = f.parent_id;
    }
    return path;
  }, [folders, selectedFolderId]);

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

  async function handleEditLink(data: {
    url: string;
    title: string | null;
    description: string | null;
    folder_id: string | null;
  }) {
    if (!editingLink) return;
    const res = await fetch(`/api/links/${editingLink.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("수정 실패");
    await fetchLinks();
    setToast("수정됨 ✓");
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

  async function fetchFolders() {
    const d = await fetch("/api/folders").then((r) => r.json());
    setFolders(Array.isArray(d) ? d : []);
  }

  async function handleCreateFolder(name: string, parentId?: string) {
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId }),
    });
    await fetchFolders();
  }

  async function handleRenameFolder(id: string, name: string) {
    await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await fetchFolders();
  }

  async function handleDeleteFolder(id: string) {
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    if (selectedFolderId === id) setSelectedFolderId(null);
    await fetchFolders();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-white">
      {/* 사이드바 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed z-40 h-full w-64 border-r border-white/5 bg-[#111] overflow-y-auto transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
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
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </aside>

      {/* 메인 */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* 헤더 */}
        <header className="flex items-center gap-2 px-3 py-3 border-b border-white/5 shrink-0">
          <button
            className="p-2 text-white/60 hover:text-white"
            onClick={() => setSidebarOpen((v) => !v)}
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
            +
          </button>
        </header>

        {/* 링크 목록 */}
        <main className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <p className="text-center text-white/30 mt-12 text-sm">불러오는 중...</p>
          ) : (
            <div className="max-w-2xl mx-auto">
              {/* 브레드크럼 */}
              {showFolderView && folderPath.length > 0 && (
                <div className="flex items-center gap-1 mb-3 text-xs text-white/40 flex-wrap">
                  <button
                    onClick={() => handleSelectFolder(null)}
                    className="hover:text-white transition-colors"
                  >
                    전체
                  </button>
                  {folderPath.map((f, i) => (
                    <span key={f.id} className="flex items-center gap-1">
                      <span>›</span>
                      <button
                        onClick={() => handleSelectFolder(f.id)}
                        className={
                          i === folderPath.length - 1
                            ? "text-white/80"
                            : "hover:text-white transition-colors"
                        }
                      >
                        {f.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* 하위 폴더 카드 */}
              {showFolderView && (selectedFolderId || currentLevelFolders.length > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {/* 상위 폴더로 이동 */}
                  {selectedFolderId && (
                    <button
                      onClick={() => handleSelectFolder(folderPath[folderPath.length - 2]?.id ?? null)}
                      className="flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] text-left transition-colors"
                    >
                      <span className="text-base shrink-0">↩</span>
                      <span className="text-sm text-white/50 truncate">..</span>
                    </button>
                  )}
                  {currentLevelFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleSelectFolder(folder.id)}
                      className="flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] text-left transition-colors"
                    >
                      <span className="text-base shrink-0">📁</span>
                      <span className="text-sm text-white truncate">{folder.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* 링크 */}
              {links.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {links.map((link) => (
                    <li key={link.id}>
                      <LinkCard
                        link={link}
                        onToggleFavorite={handleToggleFavorite}

                        onDelete={handleDelete}
                        onEdit={setEditingLink}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                (!showFolderView || currentLevelFolders.length === 0) && (
                  <p className="text-center text-white/30 mt-12 text-sm">링크가 없습니다.</p>
                )
              )}
            </div>
          )}
        </main>
      </div>

      {/* 모달 */}
      {showAddModal && (
        <AddLinkModal
          folders={folders}
          onAdd={handleAddLink}
          onClose={() => setShowAddModal(false)}
          initialFolderId={selectedFolderId}
        />
      )}

      {/* 수정 모달 */}
      {editingLink && (
        <EditLinkModal
          link={editingLink}
          folders={folders}
          onSave={handleEditLink}
          onClose={() => setEditingLink(null)}
        />
      )}

      {/* 토스트 */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
