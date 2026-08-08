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
    .select("instagram_access_token, instagram_user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection?.instagram_access_token) {
    return NextResponse.json({ error: "instagram_not_connected" }, { status: 400 });
  }

  const accessToken = decryptToken(connection.instagram_access_token);
  const igUserId = connection.instagram_user_id;

  const profileUrl = `https://graph.instagram.com/v21.0/${igUserId}?fields=biography,name,username,followers_count,website&access_token=${accessToken}`;
  const profileRes = await fetch(profileUrl);
  const profileData = await profileRes.json();

  if (profileData.error) {
    console.error("Erro ao buscar perfil do Instagram:", profileData.error);
    return NextResponse.json(
      { error: "instagram_profile_fetch_failed", details: profileData.error },
      { status: 500 }
    );
  }

  const mediaUrl = `https://graph.instagram.com/v21.0/${igUserId}/media?fields=caption,media_type,media_url,permalink,timestamp&limit=15&access_token=${accessToken}`;
  const mediaRes = await fetch(mediaUrl);
  const mediaData = await mediaRes.json();

  if (mediaData.error) {
    console.error("Erro ao buscar posts do Instagram:", mediaData.error);
    return NextResponse.json(
      { error: "instagram_media_fetch_failed", details: mediaData.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    profile: {
      name: profileData.name ?? null,
      username: profileData.username ?? null,
      biography: profileData.biography ?? null,
      website: profileData.website ?? null,
      followersCount: profileData.followers_count ?? null,
    },
    posts: (mediaData.data ?? []).map((post: any) => ({
      caption: post.caption ?? null,
      mediaType: post.media_type,
      timestamp: post.timestamp,
    })),
  });
}
