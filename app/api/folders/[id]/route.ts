import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { name, parentId, color } = await req.json();

  const updates: Record<string, unknown> = {};
  if (name && typeof name === "string") updates.name = name.trim();
  if (parentId !== undefined) updates.parent_id = parentId ?? null;
  if (color !== undefined) updates.color = color ?? null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("folders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const { error } = await supabase.from("folders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
