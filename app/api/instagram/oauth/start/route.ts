import { NextResponse } from "next/server";

const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
].join(",");

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const appId = process.env.INSTAGRAM_APP_ID;

  if (!appId) {
    return NextResponse.json(
      { error: "INSTAGRAM_APP_ID nao configurado" },
      { status: 500 }
    );
  }

  const redirectUri = `${origin}/api/instagram/oauth/callback`;

  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", INSTAGRAM_SCOPES);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}
