"use client";

import { useState, useRef, useEffect } from "react";

type Option = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
};

export default function CustomSelect({ value, onChange, options, placeholder = "선택", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-left transition-colors hover:border-white/20 focus:outline-none"
      >
        <span className={selected ? "text-white" : "text-white/30"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-white/30 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-[#1e1e1e] shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${
              value === "" ? "text-white" : "text-white/40"
            }`}
          >
            {placeholder}
          </button>
          <div className="border-t border-white/5" />
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${
                value === opt.value ? "text-white bg-white/5" : "text-white/70"
              }`}
            >
              {opt.value === value && <span className="mr-2 text-white/50">✓</span>}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
