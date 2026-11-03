import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFoldersWithCounts } from "@/lib/folder-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const folderId = params.get("folderId");
  const tagId = params.get("tagId");
  const favorite = params.get("favorite");
  const page = Math.max(0, parseInt(params.get("page") ?? "0", 10) || 0);
  const limit = Math.min(50, Math.max(1, parseInt(params.get("limit") ?? "20", 10) || 20));

  const { data: settingsData } = await supabase
    .from("user_settings")
    .select("preferences")
    .eq("user_id", user.id)
    .maybeSingle();
  const preferences = settingsData?.preferences ?? {};
  const sort = params.get("sort") ?? preferences.sort ?? "latest";
  const pinFavorites = params.has("pinFavorites")
    ? params.get("pinFavorites") === "1"
    : preferences.pinFavorites === true;

  let linksQuery = supabase
    .from("links")
    .select("*, tags:link_tags(tag:tags(id, name)), folder:folders(id, name, color)");

  if (q) {
    linksQuery = linksQuery.or(
      `title.ilike.%${q}%,url.ilike.%${q}%,memo.ilike.%${q}%,description.ilike.%${q}%`
    );
  }
  if (folderId === "none") linksQuery = linksQuery.is("folder_id", null);
  else if (folderId) linksQuery = linksQuery.eq("folder_id", folderId);
  if (favorite === "1") linksQuery = linksQuery.eq("is_favorite", true);

  if (tagId) {
    const { data: linkIds } = await supabase
      .from("link_tags")
      .select("link_id")
      .eq("tag_id", tagId);
    const ids = (linkIds ?? []).map((row) => row.link_id);
    if (ids.length === 0) linksQuery = linksQuery.in("id", ["00000000-0000-0000-0000-000000000000"]);
    else linksQuery = linksQuery.in("id", ids);
  }

  if (pinFavorites) linksQuery = linksQuery.order("is_favorite", { ascending: false });
  if (sort === "title") linksQuery = linksQuery.order("title", { ascending: true });
  else linksQuery = linksQuery.order("created_at", { ascending: false });
  linksQuery = linksQuery.range(page * limit, page * limit + limit - 1);

  const countQuery = supabase.from("links").select("*", { count: "exact", head: true });
  const unclassifiedQuery = countQuery.is("folder_id", null);

  const [linksResult, foldersResult, tagsResult, unclassifiedResult] = await Promise.all([
    linksQuery,
    getFoldersWithCounts(supabase),
    supabase.from("tags").select("*, count:link_tags(count)").order("name", { ascending: true }),
    unclassifiedQuery,
  ]);

  if (linksResult.error) return NextResponse.json({ error: linksResult.error.message }, { status: 500 });
  if (tagsResult.error) return NextResponse.json({ error: tagsResult.error.message }, { status: 500 });
  if (unclassifiedResult.error) return NextResponse.json({ error: unclassifiedResult.error.message }, { status: 500 });

  return NextResponse.json({
    links: linksResult.data ?? [],
    folders: foldersResult,
    tags: tagsResult.data ?? [],
    unclassifiedCount: unclassifiedResult.count ?? 0,
    settings: preferences,
    hasMore: (linksResult.data ?? []).length === limit,
  });
}
