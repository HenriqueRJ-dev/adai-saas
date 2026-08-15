import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateGeminiJson, type GeminiPart } from "@/lib/gemini";

const objectiveLabels: Record<string, string> = {
  INSTAGRAM_MESSAGES: "Mais mensagens",
  INSTAGRAM_PROFILE: "Mais visitas ao perfil",
  WEBSITE_VISITS: "Mais visitas ao site",
};

type CreativeImage = { name?: string; mimeType?: string; data?: string };

function money(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function fallbackStrategy(analysisRaw: unknown, config: any, extra: any) {
  const a = analysisRaw && typeof analysisRaw === "object" ? analysisRaw as Record<string, any> : {};
  const brand = a.nome_marca || a.brand_name || "Sua marca";
  const niche = a.nicho || "seu segmento";
  const audience = a.publico_alvo || `Pessoas com potencial interesse em ${niche}`;
  const region = extra.serviceRegion || a.regiao || "Sua região de atendimento";
  const objective = objectiveLabels[config.objective] || "Mais mensagens";
  const durationDays = Number(extra.durationDays || 5);
  const dailyBudget = Number(config.daily_budget || 0);
  const total = dailyBudget * durationDays;
  const images: CreativeImage[] = Array.isArray(extra.creativeImages) ? extra.creativeImages : [];

  return {
    resumo: {
      marca: brand,
      objetivo: objective,
      regiao: region,
      orcamento_diario: dailyBudget,
      duracao_dias: durationDays,
      investimento_total: total,
      modo: "Instagram",
    },
    recomendacao_principal: {
      criativo: images[0]?.name || "Criativo 1",
      nota: null,
      veredito: "Análise visual aguardando IA",
      motivo: "A estratégia foi montada, mas a análise visual automática ficou indisponível nesta tentativa. Você ainda pode usar o plano e reenviar os criativos depois para comparar.",
    },
    ranking_criativos: images.map((image, index) => ({
      nome: image.name || `Criativo ${index + 1}`,
      nota: null,
      veredito: "Aguardando análise visual",
      pontos_fortes: [],
      pontos_a_melhorar: ["Reenvie quando a análise visual estiver disponível para receber uma avaliação específica desta peça."],
      motivo: "Sem avaliação visual automática nesta tentativa.",
    })),
    publico: {
      descricao: audience,
      idade: "Comece amplo dentro da faixa compatível com seu cliente real",
      localizacao: region,
      recomendacao: "Evite restringir demais no primeiro teste. Use a região atendida e deixe o Instagram aprender com os resultados.",
    },
    configuracao_instagram: {
      objetivo: objective,
      publico: `Público sugerido pelo AdAI para ${region}`,
      orcamento_diario: money(dailyBudget),
      duracao: `${durationDays} dias`,
      investimento_total: money(total),
      destino: config.objective === "WEBSITE_VISITS" ? extra.websiteUrl : config.objective === "INSTAGRAM_PROFILE" ? "Perfil do Instagram" : "Mensagens no Instagram",
    },
    antes_de_impulsionar: [
      "Use uma peça que deixe claro o que está sendo oferecido nos primeiros segundos ou no primeiro olhar.",
      "Confira se o perfil tem bio, prova social e uma forma clara de entrar em contato.",
      "Evite alterar várias coisas durante o teste; deixe orçamento e duração estáveis para conseguir comparar.",
    ],
    proximo_conteudo: {
      gancho: `Uma forma direta de apresentar ${brand} para quem ainda não conhece a marca.`,
      legenda: `${brand}: conheça nossa proposta e veja se ela faz sentido para você.`,
      cta: config.objective === "INSTAGRAM_MESSAGES" ? "Envie uma mensagem" : config.objective === "INSTAGRAM_PROFILE" ? "Visite o perfil" : "Saiba mais",
    },
    passos_instagram: [
      "Abra no Instagram o post ou Reel que o AdAI recomendou.",
      "Toque em Impulsionar publicação ou Turbinar.",
      `Quando o Instagram pedir o objetivo, escolha a opção equivalente a “${objective}”.`,
      `Use o público sugerido para ${region}, orçamento de ${money(dailyBudget)} por dia e duração de ${durationDays} dias.`,
      "Revise a prévia e envie para análise do Instagram. Depois, volte ao AdAI com um print dos resultados para decidir o próximo passo.",
    ],
    acompanhamento: {
      quando_revisar: "Faça a primeira leitura depois de acumular dados suficientes; como referência operacional, volte após cerca de 3 dias sem mudanças grandes.",
      enviar_print_de: "Insights/resultados da promoção mostrando gasto, alcance e o resultado principal do objetivo.",
      objetivo: "Decidir entre manter, aumentar, pausar ou trocar o criativo com base nos dados reais do teste.",
    },
  };
}

function sanitizeStrategy(candidate: any, fallback: any, imageNames: string[]) {
  if (!candidate || typeof candidate !== "object") return fallback;
  const ranking = Array.isArray(candidate.ranking_criativos) ? candidate.ranking_criativos.slice(0, imageNames.length).map((item: any, index: number) => ({
    nome: String(item?.nome || imageNames[index] || `Criativo ${index + 1}`),
    nota: Number.isFinite(Number(item?.nota)) ? Math.max(0, Math.min(100, Math.round(Number(item.nota)))) : null,
    veredito: String(item?.veredito || "Avaliado"),
    pontos_fortes: Array.isArray(item?.pontos_fortes) ? item.pontos_fortes.map(String).slice(0, 4) : [],
    pontos_a_melhorar: Array.isArray(item?.pontos_a_melhorar) ? item.pontos_a_melhorar.map(String).slice(0, 4) : [],
    motivo: String(item?.motivo || ""),
  })).sort((a: any, b: any) => (typeof b.nota === "number" ? b.nota : -1) - (typeof a.nota === "number" ? a.nota : -1)) : fallback.ranking_criativos;

  const best = ranking.find((item: any) => typeof item.nota === "number");
  const recommendation = { ...fallback.recomendacao_principal, ...(candidate.recomendacao_principal ?? {}) };
  if (best) {
    recommendation.criativo = best.nome;
    recommendation.nota = best.nota;
    recommendation.veredito = best.veredito || recommendation.veredito;
    recommendation.motivo = best.motivo || recommendation.motivo;
  }

  return {
    ...fallback,
    ...candidate,
    resumo: { ...fallback.resumo, ...(candidate.resumo ?? {}) },
    recomendacao_principal: recommendation,
    ranking_criativos: ranking,
    publico: { ...fallback.publico, ...(candidate.publico ?? {}) },
    configuracao_instagram: { ...fallback.configuracao_instagram, ...(candidate.configuracao_instagram ?? {}) },
    antes_de_impulsionar: Array.isArray(candidate.antes_de_impulsionar) ? candidate.antes_de_impulsionar.map(String).slice(0, 5) : fallback.antes_de_impulsionar,
    proximo_conteudo: { ...fallback.proximo_conteudo, ...(candidate.proximo_conteudo ?? {}) },
    passos_instagram: Array.isArray(candidate.passos_instagram) ? candidate.passos_instagram.map(String).slice(0, 6) : fallback.passos_instagram,
    acompanhamento: { ...fallback.acompanhamento, ...(candidate.acompanhamento ?? {}) },
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const extra = await request.json().catch(() => ({})) as any;
  const images: CreativeImage[] = Array.isArray(extra.creativeImages) ? extra.creativeImages.slice(0, 3) : [];
  const { data: brandAnalysis } = await supabase.from("ai_brand_analysis").select("analysis").eq("user_id", user.id).maybeSingle();
  const { data: campaignConfig } = await supabase.from("campaign_configs").select("daily_budget, objective, strategy").eq("user_id", user.id).maybeSingle();
  if (!campaignConfig) return NextResponse.json({ error: "campaign_config_missing", message: "Configure a recomendação primeiro." }, { status: 400 });

  const fallback = fallbackStrategy(brandAnalysis?.analysis, campaignConfig, extra);
  let strategy: any = fallback;
  let usedFallback = true;

  const prompt = `Você é um especialista em performance para pequenos negócios que anunciam diretamente pelo Instagram usando o botão Impulsionar/Turbinar.
Sua função NÃO é prometer resultados e NÃO é inventar dados de mercado. Você deve comparar visualmente os criativos enviados, usando apenas o material da marca, o objetivo e as imagens.

Análise da marca:
${JSON.stringify(brandAnalysis?.analysis ?? {}, null, 2)}

Configuração do teste:
${JSON.stringify({
  objetivo: objectiveLabels[campaignConfig.objective] || campaignConfig.objective,
  orcamento_diario: campaignConfig.daily_budget,
  duracao_dias: extra.durationDays,
  regiao: extra.serviceRegion,
  website: extra.websiteUrl,
  criativos: images.map((image, index) => ({ indice: index + 1, nome: image.name })),
}, null, 2)}

Avalie cada criativo de 0 a 100 como uma NOTA INTERNA DE ADEQUAÇÃO AO TESTE, considerando clareza da oferta, legibilidade, hierarquia visual, força do gancho, coerência com o objetivo, confiança e potencial de chamar atenção. Essa nota NÃO representa CTR, conversão nem previsão garantida.
Escolha a melhor peça entre as enviadas. Explique de forma simples, para um usuário leigo.

Retorne APENAS JSON válido usando EXATAMENTE esta estrutura de campos:
${JSON.stringify(fallback, null, 2)}

Regras:
- ranking_criativos deve ter exatamente ${images.length} itens e respeitar os nomes enviados.
- recomendacao_principal.criativo deve ser um desses nomes.
- recomendacao_principal.nota deve repetir a nota da peça vencedora.
- antes_de_impulsionar deve conter no máximo 4 ações curtas.
- passos_instagram deve conter 5 passos simples, voltados ao botão Impulsionar/Turbinar do Instagram, não ao Gerenciador de Anúncios.
- não invente benchmarks externos, tendências regionais, cliques, alcance ou taxa de conversão.
- se algo não puder ser inferido visualmente, diga isso claramente.`;

  const parts: GeminiPart[] = [{ text: prompt }];
  for (const [index, image] of images.entries()) {
    if (!image.data || !image.mimeType) continue;
    parts.push({ text: `Criativo ${index + 1}: ${image.name || `opcao-${index + 1}`}` });
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  }

  const generated = await generateGeminiJson(parts);
  if (generated?.data?.resumo && Array.isArray(generated?.data?.ranking_criativos)) {
    strategy = sanitizeStrategy(generated.data, fallback, images.map((image, index) => image.name || `Criativo ${index + 1}`));
    usedFallback = false;
  }

  const { error } = await supabase.from("campaign_configs").update({ strategy, status: "pending" }).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  return NextResponse.json({ success: true, strategy, fallback: usedFallback, model: generated?.model ?? null });
}
