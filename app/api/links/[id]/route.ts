import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertHttpUrl } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { tagIds, ...fields } = body;

  const supabase = await createClient();

  const allowedFields = [
    "url", "title", "memo", "folder_id", "is_favorite", "is_read", "description", "image",
  ];
  const updates = Object.fromEntries(
    Object.entries(fields).filter(([k]) => allowedFields.includes(k))
  );

  if (typeof updates.url === "string") {
    try {
      assertHttpUrl(updates.url);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "올바른 URL이 아닙니다." }, { status: 400 });
    }
  }

  if (updates.folder_id !== undefined && updates.folder_id !== null) {
    const { data: folder } = await supabase
      .from("folders")
      .select("id")
      .eq("id", updates.folder_id)
      .maybeSingle();
    if (!folder) return NextResponse.json({ error: "접근할 수 없는 폴더입니다." }, { status: 400 });
  }

  if (tagIds !== undefined) {
    if (!Array.isArray(tagIds) || tagIds.some((tagId) => typeof tagId !== "string")) {
      return NextResponse.json({ error: "tagIds 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const uniqueTagIds = [...new Set(tagIds)];
    const { data: ownedTags } = await supabase.from("tags").select("id").in("id", uniqueTagIds);
    if ((ownedTags ?? []).length !== uniqueTagIds.length) {
      return NextResponse.json({ error: "접근할 수 없는 태그가 포함되어 있습니다." }, { status: 400 });
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("links").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Array.isArray(tagIds)) {
    const { error: deleteTagsError } = await supabase.from("link_tags").delete().eq("link_id", id);
    if (deleteTagsError) return NextResponse.json({ error: deleteTagsError.message }, { status: 500 });

    if (tagIds.length > 0) {
      const rows = [...new Set(tagIds)].map((tag_id: string) => ({ link_id: id, tag_id }));
      const { error } = await supabase.from("link_tags").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data, error } = await supabase
    .from("links")
    .select("*, tags:link_tags(tag:tags(id, name))")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const { error } = await supabase.from("links").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
