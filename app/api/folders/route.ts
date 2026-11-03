import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFoldersWithCounts } from "@/lib/folder-data";

export async function GET() {
  const supabase = await createClient();
  try {
    return NextResponse.json(await getFoldersWithCounts(supabase));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "폴더 조회 실패" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { name, parentId, color, order } = await req.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name이 필요합니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("folders")
    .insert({ user_id: user.id, name: name.trim(), parent_id: parentId ?? null, color: color ?? null, ...(order !== undefined ? { order } : {}) })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
