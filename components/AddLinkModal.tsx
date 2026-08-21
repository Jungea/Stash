"use client";

import { useState, FormEvent } from "react";
import { Folder as FolderIcon, ChevronRight } from "lucide-react";
import { Folder } from "@/types";
import FolderPickerModal from "./FolderPickerModal";

type Props = {
  folders: Folder[];
  onAdd: (data: {
    url: string;
    title?: string;
    description?: string;
    folderId?: string;
  }) => Promise<void>;
  onClose: () => void;
  initialUrl?: string;
  initialFolderId?: string | null;
};

export default function AddLinkModal({ folders, onAdd, onClose, initialUrl = "", initialFolderId }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState(initialFolderId ?? "");
  const [folderName, setFolderName] = useState<string | null>(
    initialFolderId ? (folders.find((f) => f.id === initialFolderId)?.name ?? null) : null
  );
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lockedFolder = initialFolderId ? folders.find((f) => f.id === initialFolderId) : null;
  const selectedFolder = folderId ? folders.find((f) => f.id === folderId) : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError("");
    setLoading(true);
    try {
      await onAdd({
        url: url.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        folderId: folderId || undefined,
      });
      onClose();
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <form onSubmit={handleSubmit} className="w-full sm:max-w-md bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl flex flex-col max-h-dvh">
          <div className="flex-1 overflow-y-auto p-6 pb-3 flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-white mb-1">링크 추가</h2>
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
              required
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm"
            />
            <input
              type="text"
              placeholder="이름"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm"
            />
            <textarea
              placeholder="설명"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/30 text-sm resize-none"
            />
            {lockedFolder ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                <FolderIcon className="w-4 h-4 shrink-0" style={{ color: lockedFolder.color ?? "#9ca3af" }} />
                <span className="text-white/60">{lockedFolder.name}</span>
              </div>
            ) : folders.length > 0 && (
              <button
                type="button"
                onClick={() => setFolderPickerOpen(true)}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-left hover:border-white/20"
              >
                <span className="flex items-center gap-2 min-w-0">
                  {selectedFolder && (
                    <FolderIcon className="w-4 h-4 shrink-0" style={{ color: selectedFolder.color ?? "#9ca3af" }} />
                  )}
                  <span className={selectedFolder ? "text-white truncate" : "text-white/30"}>
                    {selectedFolder ? selectedFolder.name : "폴더 선택 (선택사항)"}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
              </button>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
          <div className="shrink-0 px-6 py-4 border-t border-white/5 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5">취소</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-50">
              {loading ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>

      {folderPickerOpen && (
        <FolderPickerModal
          folders={folders}
          currentFolderId={folderId || null}
          onSelect={(id) => { setFolderId(id ?? ""); setFolderPickerOpen(false); }}
          onClose={() => setFolderPickerOpen(false)}
        />
      )}
    </>
  );
}
