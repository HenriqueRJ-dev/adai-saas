import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { data: brandAnalysis } = await supabase
    .from("ai_brand_analysis")
    .select("analysis")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!brandAnalysis?.analysis) {
    return NextResponse.json(
      { error: "brand_analysis_missing", message: "Rode a analise de marca primeiro." },
      { status: 400 }
    );
  }

  const { data: campaignConfig } = await supabase
    .from("campaign_configs")
    .select("daily_budget, objective")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!campaignConfig) {
    return NextResponse.json(
      { error: "campaign_config_missing", message: "Configure orcamento e objetivo primeiro." },
      { status: 400 }
    );
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const prompt = `Voce e um especialista em Meta Ads (Facebook e Instagram Ads).
Com base na analise de marca e na configuracao abaixo, monte uma estrategia de campanha.

Analise de marca:
${JSON.stringify(brandAnalysis.analysis, null, 2)}

Configuracao do usuario:
Orcamento diario: R$ ${campaignConfig.daily_budget}
Objetivo: ${campaignConfig.objective}

Devolva APENAS um JSON valido, sem texto antes ou depois, no formato exato:

{
  "publico": {
    "idade_min": numero,
    "idade_max": numero,
    "genero": "all" ou "male" ou "female",
    "interesses": ["interesse1", "interesse2", "interesse3"]
  },
  "posicionamentos": ["facebook_feed", "instagram_feed", "instagram_stories"],
  "criativos": [
    {
      "titulo": "headline curta e chamativa",
      "texto_principal": "texto principal do anuncio, 2-3 frases",
      "cta": "call to action, ex: SAIBA_MAIS, COMPRAR_AGORA, CADASTRAR"
    }
  ]
}

Gere exatamente 2 variacoes de criativos dentro do array "criativos".`;

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const claudeData = await claudeRes.json();

  if (!claudeRes.ok) {
    console.error("Erro na Claude API:", claudeData);
    return NextResponse.json({ error: "claude_api_failed", details: claudeData }, { status: 500 });
  }

  const rawText = claudeData.content?.[0]?.text ?? "";

  let strategy;
  try {
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    strategy = JSON.parse(cleaned);
  } catch (e) {
    console.error("Erro ao interpretar resposta da Claude:", rawText);
    return NextResponse.json({ error: "invalid_claude_response", raw: rawText }, { status: 500 });
  }

  const { error: dbError } = await supabase
    .from("campaign_configs")
    .update({ strategy })
    .eq("user_id", user.id);

  if (dbError) {
    console.error("Erro ao salvar estrategia:", dbError);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, strategy });
}
