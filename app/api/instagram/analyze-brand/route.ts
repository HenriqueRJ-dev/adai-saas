import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";

export async function POST() {
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

  const mediaUrl = `https://graph.instagram.com/v21.0/${igUserId}/media?fields=caption,media_type,timestamp&limit=15&access_token=${accessToken}`;
  const mediaRes = await fetch(mediaUrl);
  const mediaData = await mediaRes.json();

  if (profileData.error || mediaData.error) {
    return NextResponse.json({ error: "instagram_fetch_failed" }, { status: 500 });
  }

  const captions = (mediaData.data ?? [])
    .map((post: any) => post.caption)
    .filter(Boolean)
    .join("\n---\n");

  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const prompt = `Voce e um especialista em marketing digital e Meta Ads.
Analise o perfil do Instagram abaixo e devolva APENAS um JSON valido, sem nenhum texto antes ou depois, no seguinte formato exato:

{
  "nicho": "string curta descrevendo o nicho/segmento do negocio",
  "publico_alvo": "string descrevendo o publico ideal (idade, interesses, dor)",
  "tom_de_voz": "string descrevendo o tom de comunicacao (ex: formal, descontraido, urgente)",
  "regiao": "string com a regiao de atuacao, se identificavel, ou 'nao identificado'"
}

Dados do perfil:
Nome: ${profileData.name}
Bio: ${profileData.biography}
Seguidores: ${profileData.followers_count}

Legendas dos posts recentes:
${captions}`;

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const claudeData = await claudeRes.json();

  if (!claudeRes.ok) {
    console.error("Erro na Claude API:", claudeData);
    return NextResponse.json({ error: "claude_api_failed", details: claudeData }, { status: 500 });
  }

  const rawText = claudeData.content?.[0]?.text ?? "";

  let analysis;
  try {
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    analysis = JSON.parse(cleaned);
  } catch (e) {
    console.error("Erro ao interpretar resposta da Claude:", rawText);
    return NextResponse.json({ error: "invalid_claude_response", raw: rawText }, { status: 500 });
  }

  const { error: dbError } = await supabase.from("ai_brand_analysis").upsert(
    {
      user_id: user.id,
      analysis,
    },
    { onConflict: "user_id" }
  );

  if (dbError) {
    console.error("Erro ao salvar analise:", dbError);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, analysis });
}
