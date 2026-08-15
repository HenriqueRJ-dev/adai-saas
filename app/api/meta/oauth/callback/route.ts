import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";
import { META_GRAPH_BASE } from "@/lib/meta";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { origin, searchParams } = url;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/dashboard?meta_error=${encodeURIComponent(oauthError)}`
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const stateCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("meta_oauth_state="))
    ?.slice("meta_oauth_state=".length);

  if (!state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(`${origin}/dashboard?meta_error=invalid_state`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard?meta_error=no_code`);
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.redirect(`${origin}/dashboard?meta_error=missing_meta_config`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const redirectUri = `${origin}/api/meta/oauth/callback`;
  const shortTokenUrl = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
  shortTokenUrl.searchParams.set("client_id", appId);
  shortTokenUrl.searchParams.set("client_secret", appSecret);
  shortTokenUrl.searchParams.set("redirect_uri", redirectUri);
  shortTokenUrl.searchParams.set("code", code);

  const shortTokenRes = await fetch(shortTokenUrl.toString(), { cache: "no-store" });
  const shortTokenData = await shortTokenRes.json();

  if (!shortTokenRes.ok || !shortTokenData.access_token) {
    console.error("Erro ao trocar code por token Meta:", shortTokenData);
    return NextResponse.redirect(`${origin}/dashboard?meta_error=token_exchange_failed`);
  }

  const longTokenUrl = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
  longTokenUrl.searchParams.set("grant_type", "fb_exchange_token");
  longTokenUrl.searchParams.set("client_id", appId);
  longTokenUrl.searchParams.set("client_secret", appSecret);
  longTokenUrl.searchParams.set("fb_exchange_token", shortTokenData.access_token);

  const longTokenRes = await fetch(longTokenUrl.toString(), { cache: "no-store" });
  const longTokenData = await longTokenRes.json();
  const accessToken =
    longTokenRes.ok && longTokenData.access_token
      ? longTokenData.access_token
      : shortTokenData.access_token;

  if (!longTokenRes.ok) {
    console.warn("Nao foi possivel estender token Meta; usando token inicial:", longTokenData);
  }

  const { error: dbError } = await supabase.from("meta_connections").upsert(
    {
      user_id: user.id,
      access_token: encryptToken(accessToken),
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (dbError) {
    console.error("Erro ao salvar conexao Meta:", dbError);
    return NextResponse.redirect(`${origin}/dashboard?meta_error=save_failed`);
  }

  const response = NextResponse.redirect(`${origin}/dashboard?meta_connected=true`);
  response.cookies.set("meta_oauth_state", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return response;
}
