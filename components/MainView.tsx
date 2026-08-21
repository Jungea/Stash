"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Menu, ChevronRight, CornerUpLeft, Folder as FolderIcon, FolderOpen, FolderInput, Folders, Plus, Search, ArrowLeft, X, MoreHorizontal, Trash2 } from "lucide-react";
import { Link, Folder, Tag } from "@/types";
import LinkCard from "./LinkCard";
import AddLinkModal from "./AddLinkModal";
import CustomSelect from "./CustomSelect";
import EditLinkModal from "./EditLinkModal";
import Toast from "./Toast";
import SortModal from "./SortModal";

const FolderSidebar = dynamic(() => import("./FolderSidebar"), { ssr: false });

type Props = {
  showSavedToast: boolean;
};

export default function MainView({ showSavedToast }: Props) {
  const router = useRouter();
  const [links, setLinks] = useState<Link[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [unclassifiedCount, setUnclassifiedCount] = useState<number>(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("stash_folderId") ?? null;
  });
  const [selectedTagId, setSelectedTagId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("stash_tagId") ?? null;
  });
  const [favoriteOnly, setFavoriteOnly] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("stash_favoriteOnly") === "true";
  });
  const [sort, setSort] = useState<"latest" | "title">("latest");
  const [pinFavorites, setPinFavorites] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(showSavedToast ? "저장됨 ✓" : null);
  const [linkSelectionMode, setLinkSelectionMode] = useState(false);
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  const [moveFolderOpen, setMoveFolderOpen] = useState(false);
  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#9ca3af");
  const [addingFolder, setAddingFolder] = useState(false);

  const FOLDER_COLORS = ["#9ca3af","#f87171","#fb923c","#facc15","#4ade80","#60a5fa","#a78bfa","#f472b6"];

  const showFolderView = !selectedTagId && !favoriteOnly && !searchQuery;

  const currentLevelFolders = useMemo(
    () => selectedFolderId === "none" ? [] : folders.filter((f) => f.parent_id === (selectedFolderId ?? null)),
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

  useEffect(() => {
    if (selectedFolderId !== null) localStorage.setItem("stash_folderId", selectedFolderId);
    else localStorage.removeItem("stash_folderId");
  }, [selectedFolderId]);

  useEffect(() => {
    if (selectedTagId !== null) localStorage.setItem("stash_tagId", selectedTagId);
    else localStorage.removeItem("stash_tagId");
  }, [selectedTagId]);

  useEffect(() => {
    localStorage.setItem("stash_favoriteOnly", String(favoriteOnly));
  }, [favoriteOnly]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((prefs) => {
        if (prefs.sort) setSort(prefs.sort);
        if (prefs.pinFavorites !== undefined) setPinFavorites(prefs.pinFavorites);
      })
      .catch(() => {});
  }, []);

  const fetchLinks = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedFolderId) params.set("folderId", selectedFolderId);
    if (selectedTagId) params.set("tagId", selectedTagId);
    if (favoriteOnly) params.set("favorite", "1");
    params.set("sort", sort);
    if (pinFavorites) params.set("pinFavorites", "1");

    const res = await fetch(`/api/links?${params}`);
    if (res.ok) setLinks(await res.json());
  }, [searchQuery, selectedFolderId, selectedTagId, favoriteOnly, sort, pinFavorites]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([
        fetchLinks(),
        fetch("/api/folders").then((r) => r.json()).then((d) => setFolders(Array.isArray(d) ? d : [])),
        fetch("/api/tags").then((r) => r.json()).then((d) => setTags(Array.isArray(d) ? d : [])),
        fetch("/api/links?count=1&folderId=none").then((r) => r.json()).then((d) => setUnclassifiedCount(d?.count ?? 0)),
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

  function handleSelectFolder(id: string | null | "none") {
    setSelectedFolderId(id as string | null);
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

  async function handleCreateFolder(name: string, parentId?: string, color?: string) {
    const siblings = folders.filter((f) => (f.parent_id ?? undefined) === parentId);
    const maxOrder = Math.max(-1, ...siblings.map((f) => f.order));
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId, color, order: maxOrder + 1 }),
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

  async function handleChangeColor(id: string, color: string | null) {
    await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
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
            onChangeColor={handleChangeColor}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </aside>

      {/* 메인 */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* 헤더 */}
        <header className="flex items-center gap-2 px-3 py-3 shrink-0">
          {linkSelectionMode ? (
            <>
              <span className="text-sm text-white/60 flex-1">{selectedLinkIds.size}개 선택됨</span>
              <button onClick={() => { setLinkSelectionMode(false); setSelectedLinkIds(new Set()); }} className="text-sm text-white/60 hover:text-white p-2">취소</button>
            </>
          ) : (
          <>
          <button
            className="p-2 text-white/60 hover:text-white"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="메뉴"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 text-white/60 hover:text-white"
            aria-label="검색"
          >
            <Search className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setSortMenuOpen((v) => !v)}
              className="p-2 text-white/60 hover:text-white"
              aria-label="정렬"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {sortMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setSortMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-40 w-36 rounded-xl border border-white/10 bg-[#1e1e1e] shadow-xl overflow-hidden text-sm">
                  <button
                    onClick={() => { setLinkSelectionMode(true); setSortMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-white/70 hover:bg-white/5 transition-colors"
                  >
                    선택
                  </button>
                  <button
                    onClick={() => { setSortModalOpen(true); setSortMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-white/70 hover:bg-white/5 transition-colors"
                  >
                    정렬방식
                  </button>
                  {selectedFolderId !== "none" && (
                    <button
                      onClick={() => { setNewFolderName(""); setNewFolderColor("#9ca3af"); setAddFolderOpen(true); setSortMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-white/70 hover:bg-white/5 transition-colors"
                    >
                      폴더 추가
                    </button>
                  )}
                  <button
                    onClick={() => { router.push("/folders"); setSortMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-white/70 hover:bg-white/5 transition-colors"
                  >
                    폴더 관리
                  </button>
                </div>
              </>
            )}
          </div>
          </>
          )}
        </header>

        {/* 브레드크럼 (고정) */}
        <div className="shrink-0 px-3 pb-2">
          <div className="flex items-center gap-1 text-xs text-white/40 flex-wrap bg-white/[0.03] rounded-lg px-3 py-2 max-w-4xl mx-auto">
            <button
              onClick={() => handleSelectFolder(null)}
              className={folderPath.length === 0 && selectedFolderId !== "none" ? "text-white/80" : "hover:text-white transition-colors"}
            >
              전체
            </button>
            {selectedFolderId === "none" ? (
              <span className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                <span className="text-white/80">미분류</span>
              </span>
            ) : (
              folderPath.map((f, i) => (
                <span key={f.id} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />
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
              ))
            )}
          </div>
        </div>

        {/* 링크 목록 */}
        <main className="flex-1 overflow-y-auto px-3 py-3 pb-24">
          {loading ? (
            <p className="text-center text-white/30 mt-12 text-sm">불러오는 중...</p>
          ) : (
            <div className="max-w-4xl mx-auto">
              {/* 브레드크럼 자리 제거됨 */}

              {/* 하위 폴더 카드 */}
              {showFolderView && selectedFolderId !== "none" && (selectedFolderId || currentLevelFolders.length > 0 || unclassifiedCount > 0) && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
                  {/* 상위 폴더로 이동 */}
                  {selectedFolderId && (
                    <button
                      onClick={() => handleSelectFolder(folderPath[folderPath.length - 2]?.id ?? null)}
                      className="aspect-square relative rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] overflow-hidden transition-colors"
                    >
                      <CornerUpLeft className="absolute inset-0 m-auto w-1/2 h-1/2 opacity-20 text-white" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    </button>
                  )}
                  {currentLevelFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleSelectFolder(folder.id)}
                      className="aspect-square relative rounded-xl border overflow-hidden transition-colors"
                      style={{
                        backgroundColor: `${folder.color ?? "#9ca3af"}18`,
                        borderColor: `${folder.color ?? "#9ca3af"}40`,
                      }}
                    >
                      {/* 배경 아이콘 */}
                      <FolderIcon
                        className="absolute -bottom-3 -right-3 w-4/5 h-4/5 opacity-30"
                        fill="currentColor"
                        style={{ color: folder.color ?? "#9ca3af" }}
                      />
                      {/* 하단 오버레이 */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      {/* 텍스트 */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 flex items-end justify-between gap-1">
                        <span className="text-[10px] text-white break-words leading-tight text-left">{folder.name}</span>
                        <span className="text-[10px] text-white/40 shrink-0">{folder.links?.[0]?.count ?? 0}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* 링크 */}
              {links.length > 0 ? (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {links.map((link) => (
                    <li key={link.id}>
                      <LinkCard
                        link={link}
                        onToggleFavorite={handleToggleFavorite}
                        onDelete={handleDelete}
                        onEdit={setEditingLink}
                        onCopy={() => setToast("복사됨 ✓")}
                        selectionMode={linkSelectionMode}
                        selected={selectedLinkIds.has(link.id)}
                        onSelect={(id) => setSelectedLinkIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; })}
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
          onSave={handleEditLink}
          onClose={() => setEditingLink(null)}
        />
      )}

      {/* 검색 오버레이 */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
          <header className="flex items-center gap-2 px-3 py-3 border-b border-white/5 shrink-0">
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
              className="p-2 text-white/60 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <input
              autoFocus
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-white/30 outline-none text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="p-1 text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </header>
          <main className="flex-1 overflow-y-auto px-3 py-3">
            {loading ? (
              <p className="text-center text-white/30 mt-12 text-sm">불러오는 중...</p>
            ) : searchQuery && links.length === 0 ? (
              <p className="text-center text-white/30 mt-12 text-sm">검색 결과 없음</p>
            ) : searchQuery ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-4xl mx-auto">
                {links.map((link) => (
                  <li key={link.id}>
                    <LinkCard
                      link={link}
                      onToggleFavorite={handleToggleFavorite}
                      onDelete={handleDelete}
                      onEdit={setEditingLink}
                      onCopy={() => setToast("복사됨 ✓")}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-white/30 mt-12 text-sm">검색어를 입력하세요</p>
            )}
          </main>
        </div>
      )}

      {/* 정렬 모달 */}
      {sortModalOpen && (
        <SortModal
          current={sort}
          pinFavorites={pinFavorites}
          onConfirm={(v, pin) => {
            setSort(v);
            setPinFavorites(pin);
            setSortModalOpen(false);
            fetch("/api/settings", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sort: v, pinFavorites: pin }),
            }).catch(() => {});
          }}
          onClose={() => setSortModalOpen(false)}
        />
      )}

      {/* 폴더 추가 모달 */}
      {addFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={(e) => e.target === e.currentTarget && setAddFolderOpen(false)}>
          <div className="w-full max-w-md bg-[#1a1a1a] rounded-t-2xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-white">
              {selectedFolderId ? "하위 폴더 추가" : "폴더 추가"}
            </h2>
            <input
              autoFocus
              type="text"
              placeholder="폴더 이름"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newFolderName.trim() && !addingFolder) {
                  setAddingFolder(true);
                  await handleCreateFolder(newFolderName.trim(), selectedFolderId ?? undefined, newFolderColor);
                  setAddFolderOpen(false);
                  setAddingFolder(false);
                  setToast("폴더 추가됨 ✓");
                }
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm"
            />
            <div className="flex gap-2 flex-wrap">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewFolderColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${newFolderColor === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAddFolderOpen(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5">취소</button>
              <button
                disabled={!newFolderName.trim() || addingFolder}
                onClick={async () => {
                  setAddingFolder(true);
                  await handleCreateFolder(newFolderName.trim(), selectedFolderId ?? undefined, newFolderColor);
                  setAddFolderOpen(false);
                  setAddingFolder(false);
                  setToast("폴더 추가됨 ✓");
                }}
                className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-50"
              >
                {addingFolder ? "추가 중..." : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 플로팅 추가 버튼 */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-8 right-6 z-20 w-14 h-14 rounded-full bg-white text-black shadow-lg hover:bg-white/90 flex items-center justify-center transition-transform active:scale-95"
        aria-label="링크 추가"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* 링크 선택 모드 플로팅 액션바 */}
      {linkSelectionMode && selectedLinkIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-[#1e1e1e] border border-white/10 rounded-full px-2 py-2 shadow-xl">
          <button
            onClick={() => setMoveFolderOpen(true)}
            className="p-3 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors"
          >
            <FolderInput className="w-5 h-5" />
          </button>
          <button
            onClick={async () => {
              await Promise.all([...selectedLinkIds].map((id) => fetch(`/api/links/${id}`, { method: "DELETE" })));
              setLinks((prev) => prev.filter((l) => !selectedLinkIds.has(l.id)));
              setSelectedLinkIds(new Set());
              setLinkSelectionMode(false);
            }}
            className="p-3 rounded-xl hover:bg-white/5 text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 폴더 이동 모달 */}
      {moveFolderOpen && (() => {
        const MoveFolderModal = () => {
          const [collapsed, setCollapsed] = useState<Set<string>>(new Set(
            folders.filter((f) => f.parent_id !== null).map((f) => f.parent_id!)
          ));
          const [pendingMove, setPendingMove] = useState<{ folderId: string | null; folderName: string } | null>(null);
          const childOf = (parentId: string | null) => folders.filter((f) => f.parent_id === parentId);

          async function moveLinks(folderId: string | null) {
            await Promise.all([...selectedLinkIds].map((id) =>
              fetch(`/api/links/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder_id: folderId }) })
            ));
            await fetchLinks();
            setMoveFolderOpen(false);
            setSelectedLinkIds(new Set());
            setLinkSelectionMode(false);
            setToast("이동됨 ✓");
          }

          function renderRow(folder: Folder, depth: number, indent: number) {
            const hasChildren = childOf(folder.id).length > 0;
            const isOpen = !collapsed.has(folder.id);
            const Icon = hasChildren && isOpen ? FolderOpen : FolderIcon;
            return (
              <div key={folder.id} className="flex items-center gap-2 px-1 py-3 border-b border-white/10 hover:bg-white/5 cursor-pointer" onClick={() => setPendingMove({ folderId: folder.id, folderName: folder.name })}>
                <div className="flex items-center gap-2 flex-1 min-w-0" style={{ paddingLeft: indent }}>
                  <button className={`p-1 shrink-0 ${hasChildren ? "text-white/20 hover:text-white/50" : "text-transparent cursor-default"}`}
                    onClick={(e) => { e.stopPropagation(); if (hasChildren) setCollapsed((prev) => { const next = new Set(prev); next.has(folder.id) ? next.delete(folder.id) : next.add(folder.id); return next; }); }}>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isOpen && hasChildren ? "rotate-90" : ""}`} />
                  </button>
                  <Icon className="w-5 h-5 shrink-0" style={{ color: folder.color ?? "#9ca3af" }} />
                  <span className={`flex-1 text-sm truncate ${depth === 0 ? "text-white" : depth === 1 ? "text-white/70" : "text-white/50"}`}>{folder.name}</span>
                  <span className="text-xs text-white/30">{folder.links?.[0]?.count ?? 0}</span>
                </div>
              </div>
            );
          }

          function renderTree(folder: Folder, depth: number, indent: number = 0): React.ReactNode {
            const isOpen = !collapsed.has(folder.id);
            const childIndent = depth < 3 ? indent + 24 : indent;
            return (
              <div key={folder.id}>
                {renderRow(folder, depth, indent)}
                {isOpen && childOf(folder.id).map((child) => renderTree(child, depth + 1, childIndent))}
              </div>
            );
          }

          return (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={(e) => e.target === e.currentTarget && setMoveFolderOpen(false)}>
              <div className="w-full max-w-md bg-[#1a1a1a] rounded-t-2xl flex flex-col max-h-dvh">
                <div className="px-4 pt-5 pb-3 shrink-0 border-b border-white/5">
                  <h2 className="text-base font-semibold text-white">폴더로 이동</h2>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-4">
                  {/* 전체 */}
                  <div className="flex items-center gap-2 px-1 py-3 border-b border-white/10 hover:bg-white/5 cursor-pointer" onClick={() => setPendingMove({ folderId: null, folderName: "전체" })}>
                    <Folders className="w-5 h-5 shrink-0 text-white" />
                    <span className="flex-1 text-sm text-white">전체</span>
                  </div>
                  {/* 미분류 */}
                  <div className="flex items-center gap-2 px-1 py-3 border-b border-white/10 hover:bg-white/5 cursor-pointer" onClick={() => setPendingMove({ folderId: null, folderName: "미분류" })}>
                    <div className="flex items-center gap-2 flex-1 min-w-0" style={{ paddingLeft: 0 }}>
                      <span className="w-6 h-6 shrink-0" />
                      <FolderIcon className="w-5 h-5 shrink-0 text-white/40" />
                      <span className="flex-1 text-sm text-white/60">미분류</span>
                    </div>
                  </div>
                  {/* 폴더 트리 */}
                  {folders.filter((f) => f.parent_id === null).map((f) => renderTree(f, 0, 0))}
                </div>
                <div className="shrink-0 h-6" />
              </div>

              {/* 이동 확인 바텀시트 */}
              {pendingMove && (
                <div className="absolute inset-0 flex items-end justify-center bg-black/40" onClick={(e) => e.target === e.currentTarget && setPendingMove(null)}>
                  <div className="w-full max-w-md bg-[#1a1a1a] rounded-t-2xl p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm text-white/60">
                      <span className="text-white font-medium">{pendingMove.folderName}</span>으로 {selectedLinkIds.size}개 이동하시겠습니까?
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setPendingMove(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5">취소</button>
                      <button onClick={() => moveLinks(pendingMove.folderId)} className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90">이동</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        };
        return <MoveFolderModal />;
      })()}

      {/* 토스트 */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
