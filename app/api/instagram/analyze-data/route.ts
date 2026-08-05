import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Rota de diagnóstico do Módulo 3.1.
 *
 * Busca os dados brutos do Instagram (bio, seguidores, posts recentes
 * com legendas) usando o Instagram Graph API. Ainda não envia nada
 * para a Claude API — isso é o próximo módulo (3.2).
 *
 * Acesse /api/instagram/analyze-data (logado) para ver o JSON retornado.
 */
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
    .select("access_token, ig_user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection?.access_token) {
    return NextResponse.json(
      { error: "meta_not_connected" },
      { status: 400 }
    );
  }

  if (!connection.ig_user_id) {
    return NextResponse.json(
      {
        error: "instagram_not_linked",
        message:
          "Nenhuma conta do Instagram vinculada à Página selecionada.",
      },
      { status: 400 }
    );
  }

  const { access_token: accessToken, ig_user_id: igUserId } = connection;

  // Passo 1: buscar os dados do perfil (bio, nome, seguidores, site)
  const profileUrl = `https://graph.facebook.com/v21.0/${igUserId}?fields=biography,name,username,followers_count,website,profile_picture_url&access_token=${accessToken}`;
  const profileRes = await fetch(profileUrl);
  const profileData = await profileRes.json();

  if (profileData.error) {
    console.error("Erro ao buscar perfil do Instagram:", profileData.error);
    return NextResponse.json(
      { error: "instagram_profile_fetch_failed", details: profileData.error },
      { status: 500 }
    );
  }

  // Passo 2: buscar os posts recentes (até 15) com legenda e métricas básicas
  const mediaUrl = `https://graph.facebook.com/v21.0/${igUserId}/media?fields=caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=15&access_token=${accessToken}`;
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
      likeCount: post.like_count ?? 0,
      commentsCount: post.comments_count ?? 0,
    })),
  });
}
