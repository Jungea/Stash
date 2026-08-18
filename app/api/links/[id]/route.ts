import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { tagIds, ...fields } = body;

  const supabase = await createClient();

  const allowedFields = [
    "title", "memo", "folder_id", "is_favorite", "is_read", "description", "image",
  ];
  const updates = Object.fromEntries(
    Object.entries(fields).filter(([k]) => allowedFields.includes(k))
  );

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("links").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Array.isArray(tagIds)) {
    await supabase.from("link_tags").delete().eq("link_id", id);

    if (tagIds.length > 0) {
      const rows = tagIds.map((tag_id: string) => ({ link_id: id, tag_id }));
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
