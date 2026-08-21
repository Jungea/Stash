import { NextResponse } from "next/server";
import { createClient as createSupabase } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  await supabase.from("folders").select("id").limit(1);
  return NextResponse.json({ ok: true });
}
