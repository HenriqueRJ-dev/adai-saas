import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function fallbackStrategy(brandAnalysis: unknown) {
  const analysis = brandAnalysis && typeof brandAnalysis === "object" ? brandAnalysis as Record<string, any> : {};
  const brandName = analysis.nome_marca || analysis.brand_name || analysis.nome || "sua empresa";
  return {
    publico: { idade_min: 18, idade_max: 65, genero: "all", interesses: [] },
    posicionamentos: ["facebook_feed", "instagram_feed", "instagram_stories"],
    criativos: [
      {
        titulo: `Conheça ${brandName}`,
        texto_principal: `Conheça ${brandName} e fale com nossa equipe para saber mais.`,
        cta: "SAIBA_MAIS",
      },
      {
        titulo: "Fale com nossa equipe",
        texto_principal: "Quer saber mais? Entre em contato e receba todas as informações.",
        cta: "ENTRAR_EM_CONTATO",
      },
    ],
  };
}

async function saveStrategy(supabase: any, userId: string, strategy: unknown) {
  return supabase.from("campaign_configs").update({ strategy }).eq("user_id", userId);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { data: brandAnalysis } = await supabase
    .from("ai_brand_analysis").select("analysis").eq("user_id", user.id).maybeSingle();

  const { data: campaignConfig } = await supabase
    .from("campaign_configs").select("daily_budget, objective").eq("user_id", user.id).maybeSingle();
  if (!campaignConfig) {
    return NextResponse.json({ error: "campaign_config_missing", message: "Configure orçamento e objetivo primeiro." }, { status: 400 });
  }

  const fallback = fallbackStrategy(brandAnalysis?.analysis);
  const geminiKey = process.env.GEMINI_API_KEY;

  // A campanha não deve ficar bloqueada porque a IA externa está fora do ar
  // ou porque a análise de marca ainda não foi concluída.
  if (!geminiKey || !brandAnalysis?.analysis) {
    const { error } = await saveStrategy(supabase, user.id, fallback);
    if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
    return NextResponse.json({ success: true, strategy: fallback, fallback: true });
  }

  const prompt = `Voce e um especialista em Meta Ads (Facebook e Instagram Ads).\nCom base na analise de marca e na configuracao abaixo, monte uma estrategia de campanha.\nAnalise de marca:\n${JSON.stringify(brandAnalysis.analysis, null, 2)}\nConfiguracao do usuario:\nOrcamento diario: R$ ${campaignConfig.daily_budget}\nObjetivo: ${campaignConfig.objective}\nDevolva APENAS um JSON valido no formato:\n{\n  "publico": {"idade_min": 18, "idade_max": 65, "genero": "all", "interesses": []},\n  "posicionamentos": ["facebook_feed", "instagram_feed", "instagram_stories"],\n  "criativos": [\n    {"titulo": "headline", "texto_principal": "texto", "cta": "SAIBA_MAIS"},\n    {"titulo": "headline 2", "texto_principal": "texto 2", "cta": "SAIBA_MAIS"}\n  ]\n}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
  let geminiRes: Response | null = null;
  let geminiData: any = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    geminiRes = await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
      cache: "no-store",
    });
    geminiData = await geminiRes.json().catch(() => ({}));
    if (geminiRes.ok) break;
    const transient = geminiRes.status === 408 || geminiRes.status === 429 || geminiRes.status >= 500;
    if (!transient || attempt === 3) break;
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt + Math.floor(Math.random() * 500)));
  }

  let strategy: any = fallback;
  let usedFallback = true;
  if (geminiRes?.ok) {
    try {
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
      if (parsed?.publico && Array.isArray(parsed?.criativos) && parsed.criativos.length) {
        strategy = parsed;
        usedFallback = false;
      }
    } catch (error) {
      console.warn("Gemini retornou JSON inválido; usando estratégia fallback.", error);
    }
  } else {
    console.warn("Gemini indisponível após retries; usando estratégia fallback.", JSON.stringify(geminiData));
  }

  const { error: dbError } = await saveStrategy(supabase, user.id, strategy);
  if (dbError) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ success: true, strategy, fallback: usedFallback });
}
