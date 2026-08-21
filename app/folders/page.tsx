"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Folder as FolderIcon, FolderOpen, Folders, ChevronsUpDown, Check, Plus, Palette, Pencil, Trash2 } from "lucide-react";
import { Folder } from "@/types";

type DragInfo = { id: string; parentId: string | null; name: string };
type DropPos = { targetId: string; position: "before" | "after" | "into" };

export default function FoldersPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const dragInfo = useRef<DragInfo | null>(null);
  const rowRectsRef = useRef<{ id: string; rect: DOMRect; isRoot: boolean }[]>([]);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [dropPos, setDropPos] = useState<DropPos | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addRootOpen, setAddRootOpen] = useState(false);
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#9ca3af");
  const [adding, setAdding] = useState(false);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#9ca3af");
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [totalLinks, setTotalLinks] = useState<number | null>(null);
  const [unclassifiedCount, setUnclassifiedCount] = useState<number | null>(null);

  const FOLDER_COLORS = [
    "#9ca3af", "#f87171", "#fb923c", "#facc15",
    "#4ade80", "#34d399", "#60a5fa", "#818cf8",
    "#a78bfa", "#f472b6", "#e879f9", "#fb7185",
  ];

  useEffect(() => {
    Promise.all([
      fetch("/api/folders").then((r) => r.json()),
      fetch("/api/links?count=1").then((r) => r.json()),
      fetch("/api/links?count=1&folderId=none").then((r) => r.json()),
    ]).then(([folderData, countData, unclassifiedData]) => {
      const data: Folder[] = Array.isArray(folderData) ? folderData : [];
      setFolders(data);
      setTotalLinks(countData?.count ?? null);
      setUnclassifiedCount(unclassifiedData?.count ?? null);
      // 하위폴더를 가진 폴더들을 기본적으로 접힌 상태로
      const hasChildren = new Set(data.filter((f) => f.parent_id !== null).map((f) => f.parent_id!));
      setCollapsed(hasChildren);
    }).finally(() => setLoading(false));
  }, []);

  const ROW_HEIGHT = 44;

  const rootFolders = folders.filter((f) => f.parent_id === null);
  const childFolders = (parentId: string) => folders.filter((f) => f.parent_id === parentId);

  const visibleOrder = useMemo(() => {
    const result: string[] = [];
    function traverse(folder: Folder) {
      result.push(folder.id);
      if (!collapsed.has(folder.id)) {
        folders.filter((f) => f.parent_id === folder.id).forEach(traverse);
      }
    }
    folders.filter((f) => f.parent_id === null).forEach(traverse);
    return result;
  }, [folders, collapsed]);

  function handlePointerDown(e: React.PointerEvent, folder: Folder) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragInfo.current = { id: folder.id, parentId: folder.parent_id, name: folder.name };
    setGhostPos({ x: e.clientX, y: e.clientY });

    // 드래그 시작 시 모든 행의 원본 위치 스냅샷
    const rows = document.querySelectorAll("[data-folder-id]");
    rowRectsRef.current = Array.from(rows).map((el) => ({
      id: (el as HTMLElement).dataset.folderId!,
      isRoot: (el as HTMLElement).dataset.isRoot === "true",
      rect: el.getBoundingClientRect(),
    }));
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragInfo.current) return;
    setGhostPos({ x: e.clientX, y: e.clientY });

    const others = rowRectsRef.current.filter((r) => r.id !== dragInfo.current!.id);
    if (others.length === 0) { setDropPos(null); return; }

    // "into" 판정: 포인터가 루트 행의 중간 40% 안에 있을 때
    const intoCandidate = others.find((r) => {
      if (!r.isRoot) return false;
      const ratio = (e.clientY - r.rect.top) / r.rect.height;
      return e.clientY >= r.rect.top && e.clientY <= r.rect.bottom && ratio > 0.3 && ratio < 0.7;
    });
    if (intoCandidate) {
      setDropPos({ targetId: intoCandidate.id, position: "into" });
      return;
    }

    // before/after: 각 행의 중점 기준으로 판단 → 절반만 이동해도 스왑
    const firstBelowMid = others.find((r) => (r.rect.top + r.rect.height / 2) > e.clientY);
    if (!firstBelowMid) {
      setDropPos({ targetId: others[others.length - 1].id, position: "after" });
    } else {
      setDropPos({ targetId: firstBelowMid.id, position: "before" });
    }
  }

  async function handlePointerUp() {
    const info = dragInfo.current;
    const drop = dropPos;

    setGhostPos(null);
    setDropPos(null);
    dragInfo.current = null;

    if (!info || !drop || info.id === drop.targetId) return;

    const draggedFolder = folders.find((f) => f.id === info.id)!;
    const targetFolder = folders.find((f) => f.id === drop.targetId)!;
    const newParentId: string | null = drop.position === "into" ? drop.targetId : targetFolder.parent_id;

    const withoutDragged = folders.filter((f) => f.id !== info.id);
    const newGroup = withoutDragged.filter((f) =>
      newParentId === null ? f.parent_id === null : f.parent_id === newParentId
    );

    if (drop.position === "into") {
      newGroup.push({ ...draggedFolder, parent_id: newParentId });
    } else {
      const idx = newGroup.findIndex((f) => f.id === drop.targetId);
      newGroup.splice(drop.position === "after" ? idx + 1 : idx, 0, { ...draggedFolder, parent_id: newParentId });
    }

    const others = withoutDragged.filter((f) =>
      newParentId === null ? f.parent_id !== null : f.parent_id !== newParentId
    );
    setFolders([...others, ...newGroup]);

    const saves: Promise<unknown>[] = [];
    if (draggedFolder.parent_id !== newParentId) {
      saves.push(fetch(`/api/folders/${info.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: newParentId }),
      }));
    }
    saves.push(fetch("/api/folders/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: newGroup.map((f) => f.id) }),
    }));
    await Promise.all(saves);
  }

  function dropClass(folder: Folder) {
    if (!dropPos || dropPos.targetId !== folder.id) return "";
    if (dropPos.position === "into") return "bg-white/10 ring-1 ring-white/30 rounded-xl";
    if (dropPos.position === "before") return "border-t-2 border-white/50";
    return "border-b-2 border-white/50";
  }

  function handleRowClick(folder: Folder) {
    if (!selectionMode) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const ids = [folder.id, ...getAllDescendantIds(folder.id)];
      if (next.has(folder.id)) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleAddRootFolder() {
    if (!newName.trim()) return;
    setAdding(true);
    const maxOrder = Math.max(-1, ...folders.filter((f) => f.parent_id === null).map((f) => f.order));
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), parentId: null, color: newColor, order: maxOrder + 1 }),
    });
    const d = await fetch("/api/folders").then((r) => r.json());
    setFolders(Array.isArray(d) ? d : []);
    setAddRootOpen(false);
    setNewName("");
    setNewColor("#9ca3af");
    setAdding(false);
  }

  async function handleAddSubfolder() {
    if (!newName.trim()) return;
    const parentId = [...selectedIds].find((id) => {
      const f = folders.find((f) => f.id === id);
      return !f?.parent_id || !selectedIds.has(f.parent_id);
    });
    if (!parentId) return;
    setAdding(true);
    const maxOrder = Math.max(-1, ...folders.filter((f) => f.parent_id === parentId).map((f) => f.order));
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), parentId, color: newColor, order: maxOrder + 1 }),
    });
    const d = await fetch("/api/folders").then((r) => r.json());
    setFolders(Array.isArray(d) ? d : []);
    setAddSubOpen(false);
    setNewName("");
    setNewColor("#9ca3af");
    setAdding(false);
    exitSelectionMode();
  }

  async function handleColorChange() {
    setActionLoading(true);
    await Promise.all([...selectedIds].map((id) =>
      fetch(`/api/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: selectedColor }),
      })
    ));
    const d = await fetch("/api/folders").then((r) => r.json());
    setFolders(Array.isArray(d) ? d : []);
    setColorModalOpen(false);
    setActionLoading(false);
    exitSelectionMode();
  }

  function openRenameModal() {
    const rootId = [...selectedIds].find((id) => {
      const f = folders.find((f) => f.id === id);
      return !f?.parent_id || !selectedIds.has(f.parent_id);
    });
    const f = folders.find((f) => f.id === rootId);
    setRenameName(f?.name ?? "");
    setRenameModalOpen(true);
  }

  async function handleRename() {
    if (!renameName.trim()) return;
    const rootId = [...selectedIds].find((id) => {
      const f = folders.find((f) => f.id === id);
      return !f?.parent_id || !selectedIds.has(f.parent_id);
    });
    if (!rootId) return;
    setActionLoading(true);
    await fetch(`/api/folders/${rootId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameName.trim() }),
    });
    const d = await fetch("/api/folders").then((r) => r.json());
    setFolders(Array.isArray(d) ? d : []);
    setRenameModalOpen(false);
    setActionLoading(false);
    exitSelectionMode();
  }

  async function handleDelete() {
    setActionLoading(true);
    // 깊은 것부터 삭제 (부모 cascade 충돌 방지)
    const sorted = [...selectedIds].sort((a, b) => {
      const depthA = getDepth(a);
      const depthB = getDepth(b);
      return depthB - depthA;
    });
    await Promise.all(sorted.map((id) =>
      fetch(`/api/folders/${id}`, { method: "DELETE" })
    ));
    const d = await fetch("/api/folders").then((r) => r.json());
    setFolders(Array.isArray(d) ? d : []);
    setDeleteConfirmOpen(false);
    setSelectedIds(new Set());
    setSelectionMode(false);
    setActionLoading(false);
  }

  function getDepth(id: string): number {
    const f = folders.find((f) => f.id === id);
    if (!f || !f.parent_id) return 0;
    return 1 + getDepth(f.parent_id);
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function getAllDescendantIds(id: string): string[] {
    const children = folders.filter((f) => f.parent_id === id);
    return children.flatMap((c) => [c.id, ...getAllDescendantIds(c.id)]);
  }

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        getAllDescendantIds(id).forEach((did) => next.add(did));
      }
      return next;
    });
  }

  function renderRow(folder: Folder, depth: number, indent: number) {
    const isRoot = depth === 0;
    const isDragging = dragInfo.current?.id === folder.id && ghostPos !== null;
    const hasChildren = childFolders(folder.id).length > 0;
    const isOpen = !collapsed.has(folder.id);
    const Icon = hasChildren && isOpen ? FolderOpen : FolderIcon;
    const isSelected = selectedIds.has(folder.id);

    // 드래그 중 다른 항목 shift 계산
    let shiftY = 0;
    if (!isDragging && dragInfo.current && dropPos && dropPos.position !== "into" && ghostPos) {
      const srcIdx = visibleOrder.indexOf(dragInfo.current.id);
      const tgtIdx = visibleOrder.indexOf(dropPos.targetId);
      const itemIdx = visibleOrder.indexOf(folder.id);
      if (srcIdx !== -1 && tgtIdx !== -1 && itemIdx !== -1) {
        const destIdx = dropPos.position === "after" ? tgtIdx + 1 : tgtIdx;
        if (srcIdx < destIdx && itemIdx > srcIdx && itemIdx < destIdx) shiftY = -ROW_HEIGHT;
        else if (srcIdx > destIdx && itemIdx >= destIdx && itemIdx < srcIdx) shiftY = ROW_HEIGHT;
      }
    }

    return (
      <div
        key={folder.id}
        data-folder-id={folder.id}
        data-is-root={String(isRoot)}
        style={{ transform: shiftY ? `translateY(${shiftY}px)` : undefined, transition: "transform 150ms ease" }}
        className={`flex items-center gap-2 px-1 py-3 hover:bg-white/5 border-b border-white/10 ${dropClass(folder)} ${isDragging ? "opacity-0" : ""} ${isSelected ? "bg-white/5" : ""}`}
        onClick={() => handleRowClick(folder)}
      >
        {/* 체크박스: 항상 왼쪽 벽 */}
        {selectionMode && (
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-white border-white" : "border-white/30"}`}>
            {isSelected && <Check className="w-3 h-3 text-black" />}
          </div>
        )}

        {/* 들여쓰기 + 내용 */}
        <div className="flex items-center gap-2 flex-1 min-w-0" style={{ paddingLeft: indent }}>
          <button
            onClick={(e) => { e.stopPropagation(); hasChildren && toggleCollapse(folder.id); }}
            className={`p-1 shrink-0 ${hasChildren ? "text-white/20 hover:text-white/50" : "text-transparent cursor-default"}`}
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${isOpen && hasChildren ? "rotate-90" : ""}`} />
          </button>
          <Icon className="w-5 h-5 shrink-0" style={{ color: folder.color ?? "#9ca3af" }} />
          <span className={`flex-1 text-sm truncate ${depth === 0 ? "text-white" : depth === 1 ? "text-white/70" : "text-white/50"}`}>{folder.name}</span>
          <span className="text-xs text-white/30">{folder.links?.[0]?.count ?? 0}</span>
          <div
            className="p-1 touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, folder); }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => { setGhostPos(null); setDropPos(null); dragInfo.current = null; }}
          >
            <ChevronsUpDown className="w-4 h-4 text-white/20" />
          </div>
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
        {isOpen && childFolders(folder.id).map((child) =>
          renderTree(child, depth + 1, childIndent)
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="flex items-center gap-2 px-3 py-3 shrink-0">
        {selectionMode ? (
          <>
            <div className="p-2"><span className="w-5 h-5 block" /></div>
            <span className="text-sm text-white/60 flex-1">{selectedIds.size}개 선택됨</span>
            <button onClick={exitSelectionMode} className="text-sm text-white/60 hover:text-white p-2">취소</button>
          </>
        ) : (
          <>
            <button onClick={() => router.back()} className="p-2 text-white/60 hover:text-white" aria-label="뒤로가기">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold flex-1">폴더 관리</h1>
            <button onClick={() => setSelectionMode(true)} className="text-sm text-white/60 hover:text-white p-2">선택</button>
          </>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8">
        {loading ? (
          <p className="text-center text-white/30 text-sm mt-12">불러오는 중...</p>
        ) : rootFolders.length === 0 ? (
          <p className="text-center text-white/30 text-sm mt-12">폴더가 없습니다.</p>
        ) : (
          <ul className="flex flex-col max-w-lg mx-auto mt-2">
            {/* 전체 행 */}
            <li>
              <div className="flex items-center gap-2 px-1 py-3 border-b border-white/10">
                <div className="flex items-center gap-2 flex-1 min-w-0" style={{ paddingLeft: 0 }}>
                  <Folders className="w-5 h-5 shrink-0 text-white" />
                  <span className="flex-1 text-sm text-white">전체</span>
                  <span className="text-xs text-white/30">{totalLinks ?? "-"}</span>
                  <span className="w-6 shrink-0" />
                </div>
              </div>
            </li>
            {/* 미분류 행 */}
            <li>
              <div className="flex items-center gap-2 px-1 py-3 border-b border-white/10">
                <div className="flex items-center gap-2 flex-1 min-w-0" style={{ paddingLeft: 0 }}>
                  <span className="w-6 h-6 shrink-0" />
                  <FolderIcon className="w-5 h-5 shrink-0 text-white/40" />
                  <span className="flex-1 text-sm text-white/60">미분류</span>
                  <span className="text-xs text-white/30">{unclassifiedCount ?? "-"}</span>
                  <span className="w-6 shrink-0" />
                </div>
              </div>
            </li>
            {rootFolders.map((folder) => (
              <li key={folder.id}>
                {renderTree(folder, 0, 0)}
              </li>
            ))}
            {/* 폴더 추가하기 */}
            <li>
              <button
                onClick={() => { setNewName(""); setNewColor("#9ca3af"); setAddRootOpen(true); }}
                className="w-full flex items-center gap-2 px-1 py-3 border-b border-white/10 text-white/30 hover:text-white/60 transition-colors"
              >
                <Plus className="w-5 h-5 shrink-0" />
                <span className="text-sm">폴더 추가하기</span>
              </button>
            </li>
          </ul>
        )}
      </main>

      {/* 선택 모드 플로팅 액션바 */}
      {selectionMode && selectedIds.size > 0 && (() => {
        // 선택된 폴더 중 부모가 선택되지 않은 폴더 = 선택 최상위
        const selectedRootCount = [...selectedIds].filter((id) => {
          const f = folders.find((f) => f.id === id);
          return !f?.parent_id || !selectedIds.has(f.parent_id);
        }).length;
        const singleRoot = selectedRootCount === 1;
        return (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-[#1e1e1e] border border-white/10 rounded-full px-2 py-2 shadow-xl">
            {singleRoot && (
              <button onClick={() => setAddSubOpen(true)} className="p-3 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors">
                <Plus className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => { setSelectedColor("#9ca3af"); setColorModalOpen(true); }} className="p-3 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors">
              <Palette className="w-5 h-5" />
            </button>
            {singleRoot && (
              <button onClick={openRenameModal} className="p-3 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors">
                <Pencil className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => setDeleteConfirmOpen(true)} className="p-3 rounded-xl hover:bg-white/5 text-red-400 hover:text-red-300 transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        );
      })()}

      {/* 루트 폴더 추가 모달 */}
      {addRootOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={(e) => e.target === e.currentTarget && setAddRootOpen(false)}>
          <div className="w-full max-w-md bg-[#1a1a1a] rounded-t-2xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-white">폴더 추가</h2>
            <input
              autoFocus
              type="text"
              placeholder="폴더 이름"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddRootFolder()}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm"
            />
            <div className="grid grid-cols-6 gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${newColor === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAddRootOpen(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5">취소</button>
              <button onClick={handleAddRootFolder} disabled={!newName.trim() || adding} className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-50">
                {adding ? "추가 중..." : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하위폴더 추가 모달 */}
      {addSubOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={(e) => e.target === e.currentTarget && setAddSubOpen(false)}>
          <div className="w-full max-w-md bg-[#1a1a1a] rounded-t-2xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-white">하위폴더 추가</h2>
            <input
              autoFocus
              type="text"
              placeholder="폴더 이름"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubfolder()}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm"
            />
            <div className="grid grid-cols-6 gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${newColor === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAddSubOpen(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5">취소</button>
              <button onClick={handleAddSubfolder} disabled={!newName.trim() || adding} className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-50">
                {adding ? "추가 중..." : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 색상 변경 모달 */}
      {colorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={(e) => e.target === e.currentTarget && setColorModalOpen(false)}>
          <div className="w-full max-w-md bg-[#1a1a1a] rounded-t-2xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-white">색상 변경</h2>
            <div className="grid grid-cols-6 gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setColorModalOpen(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5">취소</button>
              <button onClick={handleColorChange} disabled={actionLoading} className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-50">
                {actionLoading ? "변경 중..." : "변경"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이름 변경 모달 */}
      {renameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={(e) => e.target === e.currentTarget && setRenameModalOpen(false)}>
          <div className="w-full max-w-md bg-[#1a1a1a] rounded-t-2xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-white">이름 변경</h2>
            <input
              autoFocus
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm"
            />
            <div className="flex gap-2">
              <button onClick={() => setRenameModalOpen(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5">취소</button>
              <button onClick={handleRename} disabled={!renameName.trim() || actionLoading} className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-50">
                {actionLoading ? "변경 중..." : "변경"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={(e) => e.target === e.currentTarget && setDeleteConfirmOpen(false)}>
          <div className="w-full max-w-md bg-[#1a1a1a] rounded-t-2xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-white">폴더 삭제</h2>
            <p className="text-sm text-white/60">{selectedIds.size}개의 폴더를 삭제할까요? 이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirmOpen(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5">취소</button>
              <button onClick={handleDelete} disabled={actionLoading} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-400 disabled:opacity-50">
                {actionLoading ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 드래그 고스트 - 전체 행 */}
      {ghostPos && dragInfo.current && typeof window !== "undefined" && (() => {
        const dragFolder = folders.find((f) => f.id === dragInfo.current?.id);
        if (!dragFolder) return null;
        const hasChildren = childFolders(dragFolder.id).length > 0;
        const isOpen = !collapsed.has(dragFolder.id);
        const Icon = hasChildren && isOpen ? FolderOpen : FolderIcon;
        return createPortal(
          <div
            className="fixed pointer-events-none z-50 w-full"
            style={{ top: ghostPos.y - 22, left: 0 }}
          >
            <div className="max-w-lg mx-auto px-4">
              <div className="flex items-center gap-2 px-1 py-3 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="p-1 shrink-0 text-transparent"><ChevronRight className="w-4 h-4" /></span>
                  <Icon className="w-5 h-5 shrink-0" style={{ color: dragFolder.color ?? "#9ca3af" }} />
                  <span className="flex-1 text-sm text-white truncate">{dragFolder.name}</span>
                  <span className="text-xs text-white/30">{dragFolder.links?.[0]?.count ?? 0}</span>
                  <span className="p-1"><ChevronsUpDown className="w-4 h-4 text-white/20" /></span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
