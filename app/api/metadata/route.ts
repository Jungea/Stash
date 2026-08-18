import { NextRequest, NextResponse } from "next/server";
import { fetchMetadata } from "@/lib/metadata";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url이 필요합니다." }, { status: 400 });

  const meta = await fetchMetadata(url);
  return NextResponse.json(meta);
}
