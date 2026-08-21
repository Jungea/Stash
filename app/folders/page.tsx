"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Folder as FolderIcon, FolderOpen, ChevronsUpDown } from "lucide-react";
import { Folder } from "@/types";

type DragInfo = { id: string; parentId: string | null; name: string };
type DropPos = { targetId: string; position: "before" | "after" | "into" };

export default function FoldersPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const dragInfo = useRef<DragInfo | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [dropPos, setDropPos] = useState<DropPos | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/folders")
      .then((r) => r.json())
      .then((d) => setFolders(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const rootFolders = folders.filter((f) => f.parent_id === null);
  const childFolders = (parentId: string) => folders.filter((f) => f.parent_id === parentId);

  function handlePointerDown(e: React.PointerEvent, folder: Folder) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragInfo.current = { id: folder.id, parentId: folder.parent_id, name: folder.name };
    setGhostPos({ x: e.clientX, y: e.clientY });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragInfo.current) return;
    setGhostPos({ x: e.clientX, y: e.clientY });

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest("[data-folder-id]") as HTMLElement | null;
    if (!row) { setDropPos(null); return; }

    const targetId = row.dataset.folderId!;
    if (targetId === dragInfo.current.id) { setDropPos(null); return; }

    const isRoot = row.dataset.isRoot === "true";
    const rect = row.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;

    let position: "before" | "after" | "into";
    if (isRoot && ratio > 0.3 && ratio < 0.7) {
      position = "into";
    } else {
      position = ratio < 0.5 ? "before" : "after";
    }
    setDropPos({ targetId, position });
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

  function renderRow(folder: Folder, depth: number) {
    const isRoot = depth === 0;
    const isDragging = dragInfo.current?.id === folder.id && ghostPos !== null;
    const hasChildren = childFolders(folder.id).length > 0;
    const isOpen = !collapsed.has(folder.id);
    const Icon = hasChildren && isOpen ? FolderOpen : FolderIcon;

    return (
      <div
        key={folder.id}
        data-folder-id={folder.id}
        data-is-root={String(isRoot)}
        className={`flex items-center gap-2 px-1 py-3 hover:bg-white/5 ${dropClass(folder)} ${isDragging ? "opacity-30" : ""}`}
      >
        <button
          onClick={() => hasChildren && toggleCollapse(folder.id)}
          className={`p-1 shrink-0 ${hasChildren ? "text-white/20 hover:text-white/50" : "text-transparent cursor-default"}`}
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${isOpen && hasChildren ? "rotate-90" : ""}`} />
        </button>
        <Icon
          className="w-5 h-5 shrink-0"
          style={{ color: folder.color ?? "#9ca3af" }}
        />
        <span className={`flex-1 text-sm truncate ${depth === 0 ? "text-white" : depth === 1 ? "text-white/70" : "text-white/50"}`}>{folder.name}</span>
        <span className="text-xs text-white/30">{folder.links?.[0]?.count ?? 0}</span>
        <div
          className="p-1 touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => handlePointerDown(e, folder)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => { setGhostPos(null); setDropPos(null); dragInfo.current = null; }}
        >
          <ChevronsUpDown className="w-4 h-4 text-white/20" />
        </div>
      </div>
    );
  }

  function renderTree(folder: Folder, depth: number): React.ReactNode {
    const isOpen = !collapsed.has(folder.id);
    return (
      <div key={folder.id}>
        {renderRow(folder, depth)}
        {isOpen && childFolders(folder.id).map((child) => (
          <div key={child.id} className={depth < 3 ? "ml-6" : ""}>
            {renderTree(child, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="flex items-center gap-2 px-3 py-3 shrink-0">
        <button onClick={() => router.back()} className="p-2 text-white/60 hover:text-white" aria-label="뒤로가기">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">폴더 관리</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8">
        {loading ? (
          <p className="text-center text-white/30 text-sm mt-12">불러오는 중...</p>
        ) : rootFolders.length === 0 ? (
          <p className="text-center text-white/30 text-sm mt-12">폴더가 없습니다.</p>
        ) : (
          <ul className="flex flex-col max-w-lg mx-auto mt-2">
            {rootFolders.map((folder, i) => (
              <li key={folder.id} className={i !== 0 ? "border-t border-white/5" : ""}>
                {renderTree(folder, 0)}
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* 드래그 고스트 */}
      {ghostPos && dragInfo.current && typeof window !== "undefined" && createPortal(
        <div
          className="fixed pointer-events-none z-50 bg-[#2a2a2a] border border-white/20 rounded-xl px-3 py-2 flex items-center gap-2 shadow-xl text-sm text-white/80"
          style={{ left: ghostPos.x + 12, top: ghostPos.y - 16 }}
        >
          <FolderIcon className="w-4 h-4" style={{ color: folders.find(f => f.id === dragInfo.current?.id)?.color ?? "#9ca3af" }} fill="currentColor" />
          {dragInfo.current.name}
        </div>,
        document.body
      )}
    </div>
  );
}
