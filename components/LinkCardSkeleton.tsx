export default function LinkCardSkeleton() {
  return (
    <div className="flex gap-3 p-3 rounded-xl border border-white/10 bg-white/5 animate-pulse">
      {/* 썸네일 */}
      <div className="w-14 h-14 rounded-lg bg-white/10 shrink-0 mt-0.5" />

      {/* 본문 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 타이틀 */}
        <div className="h-3.5 bg-white/10 rounded-full w-4/5" />
        <div className="h-3.5 bg-white/10 rounded-full w-3/5 mt-1.5" />
        {/* 설명 — 카드 높이 맞춤 */}
        <div className="mt-0.5 min-h-[calc(2*1.375*0.75rem)] flex flex-col gap-1 justify-center">
          <div className="h-3 bg-white/[0.07] rounded-full w-full" />
          <div className="h-3 bg-white/[0.07] rounded-full w-4/5" />
        </div>
        {/* url */}
        <div className="h-3 bg-white/[0.07] rounded-full w-2/5 mt-0.5" />
      </div>

      {/* 우측 버튼 자리 */}
      <div className="flex flex-col items-center gap-3 shrink-0">
        <div className="w-5 h-5 rounded-full bg-white/10" />
        <div className="w-5 h-5 rounded-full bg-white/10" />
      </div>
    </div>
  );
}
