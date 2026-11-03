import { NextResponse } from "next/server";
import { createClient as createSupabase } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  const supabase = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 각 테이블의 정확한 행 수를 조회해 단순 연결 확인보다 실제 DB 작업을 수행한다.
  // head 옵션을 사용하므로 행 데이터 자체는 전송하지 않는다.
  const results = await Promise.all([
    supabase.from("folders").select("id", { count: "exact", head: true }),
    supabase.from("links").select("id", { count: "exact", head: true }),
    supabase.from("tags").select("id", { count: "exact", head: true }),
    supabase.from("link_tags").select("link_id", { count: "exact", head: true }),
  ]);

  const error = results.find((result) => result.error)?.error;
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, elapsedMs: Date.now() - startedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const [folders, links, tags, linkTags] = results;

  return NextResponse.json(
    {
      ok: true,
      database: {
        folders: folders.count ?? 0,
        links: links.count ?? 0,
        tags: tags.count ?? 0,
        linkTags: linkTags.count ?? 0,
      },
      elapsedMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
