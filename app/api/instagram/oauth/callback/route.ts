import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(`${origin}/dashboard?instagram_error=${errorParam}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard?instagram_error=no_code`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = `${origin}/api/instagram/oauth/callback`;

  const tokenBody = new URLSearchParams();
  tokenBody.set("client_id", appId!);
  tokenBody.set("client_secret", appSecret!);
  tokenBody.set("grant_type", "authorization_code");
  tokenBody.set("redirect_uri", redirectUri);
  tokenBody.set("code", code);

  const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: tokenBody,
  });
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error_type) {
    console.error("Erro ao trocar code por token do Instagram:", tokenData);
    return NextResponse.redirect(`${origin}/dashboard?instagram_error=token_exchange_failed`);
  }

  const shortLivedToken = tokenData.access_token;
  const igUserId = tokenData.user_id;

  const longLivedUrl = new URL("https://graph.instagram.com/access_token");
  longLivedUrl.searchParams.set("grant_type", "ig_exchange_token");
  longLivedUrl.searchParams.set("client_secret", appSecret!);
  longLivedUrl.searchParams.set("access_token", shortLivedToken);

  const longLivedRes = await fetch(longLivedUrl.toString());
  const longLivedData = await longLivedRes.json();

  if (!longLivedRes.ok || longLivedData.error) {
    console.error("Erro ao gerar long-lived token do Instagram:", longLivedData);
    return NextResponse.redirect(`${origin}/dashboard?instagram_error=long_lived_token_failed`);
  }

  const longLivedToken = longLivedData.access_token;
  const encryptedToken = encryptToken(longLivedToken);

  const { error: dbError } = await supabase
    .from("meta_connections")
    .update({
      instagram_access_token: encryptedToken,
      instagram_user_id: String(igUserId),
    })
    .eq("user_id", user.id);

  if (dbError) {
    console.error("Erro ao salvar conexao Instagram:", dbError);
    return NextResponse.redirect(`${origin}/dashboard?instagram_error=save_failed`);
  }

  return NextResponse.redirect(`${origin}/dashboard?instagram_connected=true`);
}
