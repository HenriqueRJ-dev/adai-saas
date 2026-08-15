import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
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

  const token = decryptToken(connection.access_token);

  const pagesUrl = `https://graph.facebook.com/v26.0/me/accounts?fields=id,name&access_token=${token}`;
  const adAccountsUrl = `https://graph.facebook.com/v26.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${token}`;

  const [pagesRes, adAccountsRes] = await Promise.all([
    fetch(pagesUrl),
    fetch(adAccountsUrl),
  ]);

  const pagesData = await pagesRes.json();
  const adAccountsData = await adAccountsRes.json();

  if (pagesData.error || adAccountsData.error) {
    console.error("Erro ao buscar contas Meta:", {
      pagesError: pagesData.error,
      adAccountsError: adAccountsData.error,
    });
    return NextResponse.json(
      { error: "fetch_failed", details: pagesData.error || adAccountsData.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    pages: pagesData.data ?? [],
    adAccounts: adAccountsData.data ?? [],
  });
}
