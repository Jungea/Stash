"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Folder as FolderIcon, ChevronRight } from "lucide-react";
import { Folder } from "@/types";
import FolderPickerModal from "@/components/FolderPickerModal";

function SaveForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") ?? "";

  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/folders")
      .then((r) => r.json())
      .then((d) => setFolders(Array.isArray(d) ? d : []));
  }, []);

  const selectedFolder = folderId ? folders.find((f) => f.id === folderId) : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          folderId: folderId || undefined,
        }),
      });
      if (!res.ok) throw new Error("저장 실패");
      router.replace("/?saved=1");
    } catch {
      setError("저장에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <div className="flex-1 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-md mx-auto flex flex-col gap-3">
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
            {folders.length > 0 && (
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
        </div>
        <div className="shrink-0 px-4 py-4 border-t border-white/5 flex gap-2 max-w-md mx-auto w-full">
          <button type="button" onClick={() => router.replace("/")} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5">취소</button>
          <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-50">
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>

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

export default function SavePage() {
  return (
    <Suspense>
      <SaveForm />
    </Suspense>
  );
}
