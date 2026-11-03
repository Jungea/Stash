import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearchQuery } from "@/lib/security";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = sanitizeSearchQuery(params.get("q"));
  const folderId = params.get("folderId");
  const tagId = params.get("tagId");
  const favorite = params.get("favorite");
  const sort = params.get("sort") ?? "latest";
  const pinFavorites = params.get("pinFavorites") === "1";
  const countOnly = params.get("count") === "1";
  const page = parseInt(params.get("page") ?? "0");
  const limit = parseInt(params.get("limit") ?? "0");

  const supabase = await createClient();

  if (countOnly) {
    let countQuery = supabase.from("links").select("*", { count: "exact", head: true });
    if (folderId === "none") countQuery = countQuery.is("folder_id", null);
    else if (folderId) countQuery = countQuery.eq("folder_id", folderId);
    const { count, error } = await countQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: count ?? 0 });
  }

  let query = supabase
    .from("links")
    .select("*, tags:link_tags(tag:tags(id, name)), folder:folders(id, name, color)");

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

  if (pinFavorites) {
    query = query.order("is_favorite", { ascending: false });
  }
  if (sort === "title") {
    query = query.order("title", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (limit > 0) {
    query = query.range(page * limit, page * limit + limit - 1);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
