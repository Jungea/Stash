"use client";

import { useState } from "react";

const OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "title", label: "이름순" },
] as const;

type SortValue = (typeof OPTIONS)[number]["value"];

type Props = {
  current: SortValue;
  pinFavorites: boolean;
  onConfirm: (value: SortValue, pinFavorites: boolean) => void;
  onClose: () => void;
};

export default function SortModal({ current, pinFavorites, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState<SortValue>(current);
  const [pin, setPin] = useState(pinFavorites);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#1a1a1a] rounded-t-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs text-white/40 uppercase tracking-wider mb-4">정렬방식</p>
        <div className="flex flex-col gap-1 mb-4">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              <span className={selected === opt.value ? "text-white" : "text-white/60"}>
                {opt.label}
              </span>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selected === opt.value ? "border-white" : "border-white/20"}`}>
                {selected === opt.value && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-white/5 pt-4 mb-6">
          <button
            onClick={() => setPin((v) => !v)}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            <span className={pin ? "text-white" : "text-white/60"}>즐겨찾기 항상 위에</span>
            <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${pin ? "border-white bg-white" : "border-white/20"}`}>
              {pin && (
                <svg className="w-3 h-3 text-black" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 6l3 3 5-5" />
                </svg>
              )}
            </span>
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(selected, pin)}
            className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
