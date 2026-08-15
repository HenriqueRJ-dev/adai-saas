import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";

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
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { data: connection } = await supabase
    .from("meta_connections")
    .select("access_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection?.access_token) {
    return NextResponse.json(
      { error: "meta_not_connected" },
      { status: 400 }
    );
  }

  let igUserId: string | null = null;
  const accessToken = decryptToken(connection.access_token);

  const igUrl = `https://graph.facebook.com/v26.0/${pageId}?fields=instagram_business_account&access_token=${encodeURIComponent(accessToken)}`;
  const igRes = await fetch(igUrl);
  const igData = await igRes.json();

  if (!igData.error && igData.instagram_business_account) {
    igUserId = igData.instagram_business_account.id;
  }

  const { error } = await supabase
    .from("meta_connections")
    .update({
      page_id: pageId,
      ad_account_id: adAccountId,
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("Erro ao salvar escolha de Pagina/conta:", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, igConnected: !!igUserId });
}
