import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const folderId = params.get("folderId");
  const tagId = params.get("tagId");
  const favorite = params.get("favorite");
  const sort = params.get("sort") ?? "latest";

  const supabase = await createClient();

  let query = supabase
    .from("links")
    .select("*, tags:link_tags(tag:tags(id, name))");

  if (q) {
    query = query.or(
      `title.ilike.%${q}%,url.ilike.%${q}%,memo.ilike.%${q}%,description.ilike.%${q}%`
    );
  }

  if (folderId === "none") {
    query = query.is("folder_id", null);
  } else if (folderId) {
    query = query.eq("folder_id", folderId);
  }

  if (favorite === "1") {
    query = query.eq("is_favorite", true);
  }

  if (tagId) {
    const { data: linkIds } = await supabase
      .from("link_tags")
      .select("link_id")
      .eq("tag_id", tagId);
    const ids = (linkIds ?? []).map((r: { link_id: string }) => r.link_id);
    if (ids.length === 0) return NextResponse.json([]);
    query = query.in("id", ids);
  }

  if (sort === "title") {
    query = query.order("title", { ascending: true });
  } else if (sort === "favorite") {
    query = query.order("is_favorite", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
