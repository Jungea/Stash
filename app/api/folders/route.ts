import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: folders, error: foldersError } = await supabase
    .from("folders")
    .select("*")
    .order("order", { ascending: true })
    .order("created_at", { ascending: true });

  if (foldersError) {
    return NextResponse.json({ error: foldersError.message }, { status: 500 });
  }

  // 중첩 관계 집계(links(count))는 RLS가 켜진 환경에서 0으로 반환될 수 있어
  // 링크의 folder_id를 별도로 조회해 서버에서 폴더별 개수를 계산한다.
  const { data: links, error: linksError } = await supabase
    .from("links")
    .select("folder_id")
    .not("folder_id", "is", null);

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  const linkCounts = new Map<string, number>();
  for (const link of links ?? []) {
    if (link.folder_id) {
      linkCounts.set(link.folder_id, (linkCounts.get(link.folder_id) ?? 0) + 1);
    }
  }

  // 부모 폴더에는 하위 폴더에 들어 있는 링크도 포함한다.
  const childrenByParent = new Map<string, string[]>();
  for (const folder of folders ?? []) {
    if (!folder.parent_id) continue;
    const children = childrenByParent.get(folder.parent_id) ?? [];
    children.push(folder.id);
    childrenByParent.set(folder.parent_id, children);
  }

  const totalCounts = new Map<string, number>();
  function countFolder(folderId: string, visiting = new Set<string>()): number {
    const cached = totalCounts.get(folderId);
    if (cached !== undefined) return cached;
    if (visiting.has(folderId)) return linkCounts.get(folderId) ?? 0;

    const nextVisiting = new Set(visiting);
    nextVisiting.add(folderId);
    const childCount = (childrenByParent.get(folderId) ?? []).reduce(
      (total, childId) => total + countFolder(childId, nextVisiting),
      0
    );
    const total = (linkCounts.get(folderId) ?? 0) + childCount;
    totalCounts.set(folderId, total);
    return total;
  }

  return NextResponse.json(
    (folders ?? []).map((folder) => ({
      ...folder,
      links: [{ count: countFolder(folder.id) }],
    }))
  );
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
