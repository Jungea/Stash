"use client";

import { useMemo, useState } from "react";
import { Folder, FolderNode, Tag } from "@/types";

type Props = {
  folders: Folder[];
  tags: Tag[];
  selectedFolderId: string | null;
  selectedTagId: string | null;
  favoriteOnly: boolean;
  onSelectFolder: (id: string | null) => void;
  onSelectTag: (id: string | null) => void;
  onToggleFavorite: () => void;
  onClose?: () => void;
};

function buildTree(folders: Folder[], parentId: string | null = null): FolderNode[] {
  return folders
    .filter((f) => f.parent_id === parentId)
    .map((f) => ({ ...f, children: buildTree(folders, f.id) }));
}

function FolderItem({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: FolderNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className={`flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer text-sm transition-colors ${
          selectedId === node.id
            ? "bg-white/10 text-white"
            : "text-white/60 hover:text-white hover:bg-white/5"
        }`}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren && (
          <span
            className="text-xs mr-1 select-none"
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          >
            {open ? "▾" : "▸"}
          </span>
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {hasChildren && open && (
        <ul>
          {node.children.map((child) => (
            <FolderItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function FolderSidebar({
  folders,
  tags,
  selectedFolderId,
  selectedTagId,
  favoriteOnly,
  onSelectFolder,
  onSelectTag,
  onToggleFavorite,
  onClose,
}: Props) {
  const tree = useMemo(() => buildTree(folders), [folders]);

  function handleSelectFolder(id: string | null) {
    onSelectFolder(id);
    onClose?.();
  }

  function handleSelectTag(id: string | null) {
    onSelectTag(id);
    onClose?.();
  }

  return (
    <nav className="flex flex-col gap-1 py-2 select-none">
      {/* 전체 */}
      <button
        onClick={() => handleSelectFolder(null)}
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-left transition-colors ${
          selectedFolderId === null && selectedTagId === null && !favoriteOnly
            ? "bg-white/10 text-white"
            : "text-white/60 hover:text-white hover:bg-white/5"
        }`}
      >
        전체
      </button>

      {/* 즐겨찾기 */}
      <button
        onClick={() => { onToggleFavorite(); onClose?.(); }}
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-left transition-colors ${
          favoriteOnly
            ? "bg-white/10 text-white"
            : "text-white/60 hover:text-white hover:bg-white/5"
        }`}
      >
        ★ 즐겨찾기
      </button>

      {/* 폴더 */}
      {tree.length > 0 && (
        <>
          <p className="mt-3 mb-1 px-3 text-xs text-white/30 uppercase tracking-wider">폴더</p>
          <ul>
            {tree.map((node) => (
              <FolderItem
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedFolderId}
                onSelect={handleSelectFolder}
              />
            ))}
          </ul>
        </>
      )}

      {/* 태그 */}
      {tags.length > 0 && (
        <>
          <p className="mt-3 mb-1 px-3 text-xs text-white/30 uppercase tracking-wider">태그</p>
          <ul className="flex flex-col gap-0.5">
            {tags.map((tag) => (
              <li key={tag.id}>
                <button
                  onClick={() => handleSelectTag(selectedTagId === tag.id ? null : tag.id)}
                  className={`w-full text-left rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    selectedTagId === tag.id
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  # {tag.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </nav>
  );
}
