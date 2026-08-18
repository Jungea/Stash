import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchMetadata, extractUrl } from "@/lib/metadata";

/** Android Web Share Target — GET /api/share?url=...&text=...&title=... */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const url =
    params.get("url") ||
    extractUrl(params.get("text") ?? "") ||
    extractUrl(params.get("title") ?? "");

  if (!url) {
    return NextResponse.redirect(new URL("/?error=no_url", req.nextUrl.origin));
  }

  const supabase = await createClient();
  await saveLink(supabase, url);

  const redirectUrl = new URL("/", req.nextUrl.origin);
  redirectUrl.searchParams.set("saved", "1");
  return NextResponse.redirect(redirectUrl);
}

/** 앱 내 수동 URL 추가 — POST /api/share { url, folderId? } */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const url: string = body.url;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url이 필요합니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const link = await saveLink(supabase, url, body.folderId ?? null);

  if (!link) {
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }

  return NextResponse.json(link, { status: 201 });
}

async function saveLink(
  supabase: Awaited<ReturnType<typeof createClient>>,
  url: string,
  folderId: string | null = null
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = await fetchMetadata(url);

  const { data, error } = await supabase
    .from("links")
    .insert({
      user_id: user.id,
      url,
      title: meta.title,
      description: meta.description,
      image: meta.image,
      favicon: meta.favicon,
      folder_id: folderId,
    })
    .select()
    .single();

  if (error) {
    console.error("[share] DB insert error:", error.message);
    return null;
  }

  return data;
}
