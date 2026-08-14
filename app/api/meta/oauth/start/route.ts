import { NextResponse } from "next/server";

const META_SCOPES = [
  "ads_management",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
  "instagram_basic",
  "pages_manage_posts",
].join(",");

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const appId = process.env.META_APP_ID;

  if (!appId) {
    return NextResponse.json(
      { error: "META_APP_ID nao configurado" },
      { status: 500 }
    );
  }

  const redirectUri = `${origin}/api/meta/oauth/callback`;

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", META_SCOPES);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}
