import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// body: { ids: string[] } — 순서대로 정렬된 폴더 id 배열
export async function POST(req: NextRequest) {
  const { ids } = await req.json();
  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: "ids가 필요합니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updates = ids.map((id: string, index: number) =>
    supabase.from("folders").update({ order: index }).eq("id", id).eq("user_id", user.id)
  );

  await Promise.all(updates);
  return NextResponse.json({ ok: true });
}
