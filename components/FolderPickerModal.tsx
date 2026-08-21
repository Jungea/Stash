"use client";

import { useState } from "react";
import { ChevronRight, Folder as FolderIcon, FolderOpen, X, Check } from "lucide-react";
import { Folder } from "@/types";

type Props = {
  folders: Folder[];
  currentFolderId?: string | null;
  onSelect: (folderId: string | null, folderName: string | null) => void;
  onClose: () => void;
};

export default function FolderPickerModal({ folders, currentFolderId, onSelect, onClose }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(
    folders.filter((f) => f.parent_id !== null).map((f) => f.parent_id!)
  ));

  const childOf = (parentId: string | null) => folders.filter((f) => f.parent_id === parentId);

  function renderRow(folder: Folder, depth: number, indent: number) {
    const hasChildren = childOf(folder.id).length > 0;
    const isOpen = !collapsed.has(folder.id);
    const Icon = hasChildren && isOpen ? FolderOpen : FolderIcon;
    const isCurrent = currentFolderId === folder.id;
    return (
      <div key={folder.id} className={`flex items-center gap-2 px-1 py-3 border-b border-white/10 hover:bg-white/5 cursor-pointer ${isCurrent ? "bg-white/5" : ""}`} onClick={() => onSelect(folder.id, folder.name)}>
        <div className="flex items-center gap-2 flex-1 min-w-0" style={{ paddingLeft: indent }}>
          <button
            className={`p-1 shrink-0 ${hasChildren ? "text-white/20 hover:text-white/50" : "text-transparent cursor-default"}`}
            onClick={(e) => { e.stopPropagation(); if (hasChildren) setCollapsed((prev) => { const next = new Set(prev); next.has(folder.id) ? next.delete(folder.id) : next.add(folder.id); return next; }); }}
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${isOpen && hasChildren ? "rotate-90" : ""}`} />
          </button>
          <Icon className="w-5 h-5 shrink-0" style={{ color: folder.color ?? "#9ca3af" }} />
          <span className={`flex-1 text-sm truncate ${depth === 0 ? "text-white" : depth === 1 ? "text-white/70" : "text-white/50"}`}>{folder.name}</span>
          <span className="text-xs text-white/30 shrink-0">{folder.links?.[0]?.count ?? 0}</span>
          {isCurrent && <Check className="w-4 h-4 text-white/50 shrink-0" />}
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

  const isUnclassified = currentFolderId === null || currentFolderId === "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-[#1a1a1a] rounded-t-2xl flex flex-col max-h-dvh">
        <div className="px-4 pt-5 pb-3 shrink-0 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">폴더 선택</h2>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4">
          {/* 미분류 */}
          <div className={`flex items-center gap-2 px-1 py-3 border-b border-white/10 hover:bg-white/5 cursor-pointer ${isUnclassified ? "bg-white/5" : ""}`} onClick={() => onSelect(null, null)}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="w-6 h-6 shrink-0" />
              <FolderIcon className="w-5 h-5 shrink-0 text-white/40" />
              <span className="flex-1 text-sm text-white/60">미분류</span>
              {isUnclassified && <Check className="w-4 h-4 text-white/50 shrink-0" />}
            </div>
          </div>
          {folders.filter((f) => f.parent_id === null).map((f) => renderTree(f, 0, 0))}
        </div>
        <div className="shrink-0 h-6" />
      </div>
    </div>
  );
}
