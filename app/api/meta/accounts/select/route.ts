import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { pageId, adAccountId } = body;

  if (!pageId || !adAccountId) {
    return NextResponse.json(
      { error: "missing_fields" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("meta_connections")
    .update({
      page_id: pageId,
      ad_account_id: adAccountId,
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("Erro ao salvar escolha de Página/conta:", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
