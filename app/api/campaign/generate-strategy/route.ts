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
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY_not_configured" }, { status: 500 });
  }
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
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  let geminiRes: Response | null = null;
  let geminiData: any = null;

  // 503/429 são transitórios no Gemini. Faz retry exponencial com jitter
  // para o usuário não precisar apertar Iniciar várias vezes.
  for (let attempt = 0; attempt < 4; attempt++) {
    geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      cache: "no-store",
    });
    geminiData = await geminiRes.json().catch(() => ({}));

    if (geminiRes.ok) break;

    const transient = geminiRes.status === 408 || geminiRes.status === 429 || geminiRes.status >= 500;
    if (!transient || attempt === 3) break;

    const delayMs = 1000 * 2 ** attempt + Math.floor(Math.random() * 500);
    console.warn(`Gemini indisponível (tentativa ${attempt + 1}/4, status ${geminiRes.status}). Novo retry em ${delayMs}ms.`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  if (!geminiRes?.ok) {
    console.error("Erro na Gemini API após retries:", JSON.stringify(geminiData));
    return NextResponse.json(
      {
        error: "gemini_api_failed",
        message: "A IA do Google está temporariamente sobrecarregada. Tente novamente em alguns segundos.",
        details: geminiData,
      },
      { status: 503 }
    );
  }
  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  let strategy;
  try {
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    strategy = JSON.parse(cleaned);
  } catch (e) {
    console.error("Erro ao interpretar resposta do Gemini:", rawText);
    return NextResponse.json({ error: "invalid_gemini_response", raw: rawText }, { status: 500 });
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
