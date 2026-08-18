"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Star, Hash, Plus, Folder as FolderIcon } from "lucide-react";
import { Folder, FolderNode, Tag } from "@/types";

const FOLDER_COLORS = [
  "#9ca3af", "#f87171", "#fb923c", "#facc15",
  "#4ade80", "#60a5fa", "#a78bfa", "#f472b6",
];

type Props = {
  folders: Folder[];
  tags: Tag[];
  selectedFolderId: string | null;
  selectedTagId: string | null;
  favoriteOnly: boolean;
  onSelectFolder: (id: string | null) => void;
  onSelectTag: (id: string | null) => void;
  onToggleFavorite: () => void;
  onCreateFolder: (name: string, parentId?: string) => Promise<void>;
  onRenameFolder: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  onChangeColor: (id: string, color: string | null) => Promise<void>;
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
  onRename,
  onDelete,
  onCreateFolder,
  onChangeColor,
}: {
  node: FolderNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateFolder: (name: string, parentId?: string) => Promise<void>;
  onChangeColor: (id: string, color: string | null) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [creatingChild, setCreatingChild] = useState(false);
  const [childName, setChildName] = useState("");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const hasChildren = node.children.length > 0 || creatingChild;

  function handlePointerDown(e: React.PointerEvent) {
    longPressTriggered.current = false;
    const { clientX, clientY } = e;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setMenuPos({ top: clientY, left: clientX });
      setMenuOpen(true);
    }, 500);
  }

  function handlePointerUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleClick(e: React.MouseEvent) {
    if (longPressTriggered.current) {
      e.stopPropagation();
      e.preventDefault();
      longPressTriggered.current = false;
    }
  }

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside() { setMenuOpen(false); }
    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handleOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handleOutside);
    };
  }, [menuOpen]);

async function handleCreateChild() {
    if (childName.trim()) {
      setOpen(true);
      await onCreateFolder(childName.trim(), node.id);
    }
    setChildName("");
    setCreatingChild(false);
  }

  async function handleRename() {
    if (editName.trim() && editName.trim() !== node.name) {
      await onRename(node.id, editName.trim());
    }
    setEditing(false);
  }

  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors select-none ${
          selectedId === node.id
            ? "bg-white/10 text-white"
            : "text-white/60 hover:text-white hover:bg-white/5"
        }`}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        onContextMenu={(e) => e.preventDefault()}
      >
        {hasChildren && (
          <span
            className="text-xs select-none shrink-0 cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}

        <FolderIcon
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: node.color ?? "#9ca3af" }}
        />

        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") { setEditName(node.name); setEditing(false); }
            }}
            className="flex-1 bg-transparent text-sm text-white outline-none border-b border-white/30"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 truncate text-sm cursor-pointer"
            onClick={() => { if (!longPressTriggered.current) onSelect(node.id); }}
          >
            {node.name}
          </span>
        )}

        {/* 수정/삭제 메뉴 */}
        {menuOpen && createPortal(
            <div
              style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
              className="w-36 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl overflow-hidden text-sm"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setCreatingChild(true); setOpen(true); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-white/70 hover:bg-white/5"
              >
                하위 폴더 추가
              </button>
              <button
                onClick={() => { setEditing(true); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-white/70 hover:bg-white/5"
              >
                이름 변경
              </button>
              <button
                onClick={() => { onDelete(node.id); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-red-400 hover:bg-white/5"
              >
                삭제
              </button>
              <div className="border-t border-white/5 px-3 py-2">
                <div className="flex gap-1.5 flex-wrap">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { onChangeColor(node.id, node.color === c ? null : c); setMenuOpen(false); }}
                      style={{ backgroundColor: c }}
                      className={`w-5 h-5 rounded-full hover:scale-110 transition-transform ${
                        node.color === c ? "ring-2 ring-white ring-offset-1 ring-offset-[#1a1a1a]" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>,
            document.body
          )}
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
              onRename={onRename}
              onDelete={onDelete}
              onCreateFolder={onCreateFolder}
              onChangeColor={onChangeColor}
            />
          ))}
          {creatingChild && (
            <li style={{ paddingLeft: `${(depth + 2) * 12}px` }} className="pr-2 py-1">
              <input
                autoFocus
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                onBlur={handleCreateChild}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateChild();
                  if (e.key === "Escape") { setChildName(""); setCreatingChild(false); }
                }}
                placeholder="폴더 이름"
                className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none"
              />
            </li>
          )}
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
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onChangeColor,
  onClose,
}: Props) {
  const tree = useMemo(() => buildTree(folders), [folders]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  async function handleCreate() {
    if (!newName.trim()) { setCreating(false); return; }
    await onCreateFolder(newName.trim());
    setNewName("");
    setCreating(false);
  }

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

      <button
        onClick={() => { onToggleFavorite(); onClose?.(); }}
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-left transition-colors ${
          favoriteOnly
            ? "bg-white/10 text-white"
            : "text-white/60 hover:text-white hover:bg-white/5"
        }`}
      >
        <Star className="w-4 h-4" /> 즐겨찾기
      </button>

      {/* 폴더 */}
      <div className="mt-3 mb-1 px-3 flex items-center justify-between">
        <p className="text-xs text-white/30 uppercase tracking-wider">폴더</p>
        <button
          onClick={() => setCreating(true)}
          className="text-xs text-white/30 hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {creating && (
        <div className="px-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setNewName(""); setCreating(false); }
            }}
            placeholder="폴더 이름"
            className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none"
          />
        </div>
      )}

      {tree.length > 0 && (
        <ul>
          {tree.map((node) => (
            <FolderItem
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedFolderId}
              onSelect={handleSelectFolder}
              onRename={onRenameFolder}
              onDelete={onDeleteFolder}
              onCreateFolder={onCreateFolder}
              onChangeColor={onChangeColor}
            />
          ))}
        </ul>
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
                  <Hash className="w-3 h-3 shrink-0" /> {tag.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </nav>
  );
}
