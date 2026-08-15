import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Input = {
  brandName?: string;
  niche?: string;
  offer?: string;
  audience?: string;
  region?: string;
  tone?: string;
};

function fallbackAnalysis(input: Required<Input>) {
  return {
    nome_marca: input.brandName,
    nicho: input.niche,
    oferta_principal: input.offer,
    publico_alvo: input.audience || `Pessoas com interesse em ${input.niche}`,
    regiao: input.region || "Definir conforme a área de atendimento da empresa",
    tom_de_voz: input.tone || "Claro, direto e confiável",
    dores_principais: [
      `Necessidade relacionada a ${input.niche}`,
      "Dúvida antes da compra ou contratação",
      "Busca por confiança, praticidade e bom custo-benefício",
    ],
    proposta_de_valor: input.offer || `Solução de ${input.niche} com atendimento direto`,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Input | null;
  if (!body?.brandName?.trim() || !body?.niche?.trim() || !body?.offer?.trim()) {
    return NextResponse.json({ error: "Informe nome da marca, segmento e oferta principal." }, { status: 400 });
  }

  const input: Required<Input> = {
    brandName: body.brandName.trim(),
    niche: body.niche.trim(),
    offer: body.offer.trim(),
    audience: body.audience?.trim() || "",
    region: body.region?.trim() || "",
    tone: body.tone?.trim() || "",
  };

  let analysis: any = fallbackAnalysis(input);
  let fallback = true;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    const prompt = `Você é estrategista de marketing para pequenos negócios brasileiros.\nTransforme os dados abaixo em uma análise prática para criação de anúncios.\nRetorne APENAS JSON válido, sem markdown, no formato:\n{\n  "nome_marca": "",\n  "nicho": "",\n  "oferta_principal": "",\n  "publico_alvo": "",\n  "regiao": "",\n  "tom_de_voz": "",\n  "dores_principais": ["", "", ""],\n  "proposta_de_valor": ""\n}\nDados:\n${JSON.stringify(input, null, 2)}`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        if (parsed?.nicho && parsed?.publico_alvo) {
          analysis = { ...analysis, ...parsed };
          fallback = false;
        }
      } else {
        console.warn("Gemini indisponível na análise manual; usando fallback.", JSON.stringify(data));
      }
    } catch (error) {
      console.warn("Falha ao interpretar análise do Gemini; usando fallback.", error);
    }
  }

  const { error } = await supabase.from("ai_brand_analysis").upsert(
    { user_id: user.id, analysis },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("Erro ao salvar análise manual:", error);
    return NextResponse.json({ error: "Não foi possível salvar a análise." }, { status: 500 });
  }

  return NextResponse.json({ success: true, analysis, fallback });
}
