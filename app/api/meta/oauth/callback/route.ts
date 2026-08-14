import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  if (errorParam) {
    return NextResponse.redirect(${origin}/dashboard?meta_error=${errorParam});
  }
  if (!code) {
    return NextResponse.redirect(${origin}/dashboard?meta_error=no_code);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(${origin}/login);
  }
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = ${origin}/api/meta/oauth/callback;
  const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", appId!);
  tokenUrl.searchParams.set("client_secret", appSecret!);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);
  const tokenRes = await fetch(tokenUrl.toString());
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || tokenData.error) {
    console.error("Erro ao trocar code por token:", tokenData);
    return NextResponse.redirect(${origin}/dashboard?meta_error=token_exchange_failed);
  }
  const shortLivedToken = tokenData.access_token;
  const longLivedUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", appId!);
  longLivedUrl.searchParams.set("client_secret", appSecret!);
  longLivedUrl.searchParams.set("fb_exchange_token", shortLivedToken);
  const longLivedRes = await fetch(longLivedUrl.toString());
  const longLivedData = await longLivedRes.json();
  if (!longLivedRes.ok || longLivedData.error) {
    console.error("Erro ao gerar long-lived token:", longLivedData);
    return NextResponse.redirect(${origin}/dashboard?meta_error=long_lived_token_failed);
  }
  const longLivedToken = longLivedData.access_token;
  const encryptedToken = encryptToken(longLivedToken);
  const { error: dbError } = await supabase.from("meta_connections").upsert(
    {
      user_id: user.id,
      access_token: encryptedToken,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (dbError) {
    console.error("Erro ao salvar conexao Meta:", dbError);
    return NextResponse.redirect(${origin}/dashboard?meta_error=save_failed);
  }
  return NextResponse.redirect(${origin}/dashboard?meta_connected=true);
}
