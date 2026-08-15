import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateGeminiJson } from "@/lib/gemini";

const destinationLabels: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM_DIRECT: "Instagram Direct",
  MESSENGER: "Messenger",
  WEBSITE: "Site",
};
const objectiveLabels: Record<string, string> = {
  OUTCOME_SALES: "Vendas",
  OUTCOME_LEADS: "Gerar contatos (leads)",
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_AWARENESS: "Reconhecimento da marca",
  OUTCOME_ENGAGEMENT: "Mensagens e engajamento",
};

function fallbackStrategy(analysisRaw: unknown, config: any, extra: any) {
  const a = analysisRaw && typeof analysisRaw === "object" ? analysisRaw as Record<string, any> : {};
  const brand = a.nome_marca || a.brand_name || "Sua empresa";
  const niche = a.nicho || "seu segmento";
  const audienceText = a.publico_alvo || `Pessoas interessadas em ${niche}`;
  const region = extra.serviceRegion || a.regiao || "Sua área de atendimento";
  const offer = a.oferta_principal || a.proposta_de_valor || `Conheça as soluções da ${brand}`;
  const destination = destinationLabels[extra.destination] || "WhatsApp";
  const objective = objectiveLabels[config.objective] || "Leads";
  const isMessage = ["WHATSAPP", "INSTAGRAM_DIRECT", "MESSENGER"].includes(extra.destination);
  const cta = isMessage ? "Enviar mensagem" : config.objective === "OUTCOME_SALES" ? "Comprar agora" : "Saiba mais";
  const linkInstruction = extra.destination === "WEBSITE" ? extra.destinationUrl : `Selecione ${destination} como local de conversão no Gerenciador de Anúncios`;

  return {
    resumo: {
      marca: brand,
      objetivo: objective,
      destino: destination,
      orcamento_diario: Number(config.daily_budget),
      regiao: region,
      criativo: extra.creativeName || "Criativo selecionado",
      modo_publicacao: "Manual assistido",
    },
    publico: {
      descricao: audienceText,
      idade_min: 23,
      idade_max: 55,
      genero: "Todos",
      localizacao: region,
      interesses: [],
      recomendacao: "Comece amplo dentro da região. Evite empilhar muitos interesses no primeiro teste.",
    },
    configuracao_meta: {
      objetivo: objective,
      local_conversao: destination,
      orcamento: `R$ ${Number(config.daily_budget).toFixed(2).replace(".", ",")} por dia`,
      estrategia_orcamento: "Orçamento diário",
      estrategia_lance: "Maior volume / configuração padrão recomendada pela Meta",
      posicionamentos: "Advantage+ (automáticos)",
      otimizacao: isMessage ? "Conversas / resultados de mensagens" : config.objective === "OUTCOME_TRAFFIC" ? "Visualizações da página de destino" : "Resultados compatíveis com o objetivo escolhido",
      destino_ou_link: linkInstruction,
    },
    criativos: [
      {
        titulo: offer.length > 55 ? `Conheça ${brand}` : offer,
        texto_principal: `${offer}. ${isMessage ? `Fale com a ${brand} pelo ${destination} e tire suas dúvidas.` : "Veja os detalhes e descubra se essa solução é para você."}`,
        cta,
      },
      {
        titulo: `Fale com ${brand}`,
        texto_principal: `Procurando ${niche}? Conheça a proposta da ${brand}. Atendimento direto para você entender a oferta e tomar a melhor decisão.`,
        cta,
      },
      {
        titulo: "Saiba mais",
        texto_principal: `${brand}: ${offer}. Veja como funciona e fale com nossa equipe para receber mais informações.`,
        cta,
      },
    ],
    testes: [
      "Comece com 1 conjunto de anúncios e 1 criativo para validar a oferta.",
      "Depois de obter dados, teste uma segunda copy mantendo o mesmo criativo.",
      "Evite alterar orçamento e público todos os dias; dê tempo para acumular resultados.",
    ],
    passos_publicacao: [
      `Abra o Gerenciador de Anúncios e clique em Criar.`,
      `Escolha o objetivo ${objective}.`,
      `No conjunto de anúncios, defina ${destination} como destino/local de conversão quando essa opção existir.`,
      `Use orçamento diário de R$ ${Number(config.daily_budget).toFixed(2).replace(".", ",")}.`,
      `Defina a localização como: ${region}.`,
      `Comece com público amplo compatível com: ${audienceText}.`,
      `Mantenha os posicionamentos Advantage+ (automáticos).`,
      `No anúncio, envie o arquivo “${extra.creativeName || "seu criativo"}”.`,
      `Cole uma das copies sugeridas e use o botão “${cta}”.`,
      extra.destination === "WEBSITE" ? `Use como destino: ${extra.destinationUrl}.` : `Confirme a conta correta de ${destination} conectada à Página/Instagram.`,
      "Revise a prévia, publique e acompanhe os resultados antes de fazer alterações grandes.",
    ],
  };
}

async function saveStrategy(supabase: any, userId: string, strategy: unknown) {
  return supabase.from("campaign_configs").update({ strategy, status: "pending" }).eq("user_id", userId);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const extra = await request.json().catch(() => ({})) as any;
  const { data: brandAnalysis } = await supabase.from("ai_brand_analysis").select("analysis").eq("user_id", user.id).maybeSingle();
  const { data: campaignConfig } = await supabase.from("campaign_configs").select("daily_budget, objective").eq("user_id", user.id).maybeSingle();
  if (!campaignConfig) return NextResponse.json({ error: "campaign_config_missing", message: "Configure a campanha primeiro." }, { status: 400 });

  const fallback = fallbackStrategy(brandAnalysis?.analysis, campaignConfig, extra);
  let strategy: any = fallback;
  let usedFallback = true;

  const prompt = `Você é um gestor de tráfego especialista em pequenos negócios brasileiros. Crie um PLANO MANUAL de Meta Ads, não tente publicar nada pela API.
A pessoa vai copiar essas configurações para o Gerenciador de Anúncios.
Análise da marca:
${JSON.stringify(brandAnalysis?.analysis ?? {}, null, 2)}
Configuração:
${JSON.stringify({ dailyBudget: campaignConfig.daily_budget, objective: campaignConfig.objective, ...extra }, null, 2)}
Retorne APENAS JSON válido usando EXATAMENTE esta estrutura:
${JSON.stringify(fallback, null, 2)}
Mantenha passos_publicacao como array de strings curtas. Gere 3 copies. Não invente métricas, resultados garantidos ou dados de mercado que não estejam no contexto.`;

  const generated = await generateGeminiJson([{ text: prompt }]);
  const parsed = generated?.data;
  if (parsed?.resumo && parsed?.configuracao_meta && Array.isArray(parsed?.criativos) && Array.isArray(parsed?.passos_publicacao)) {
    strategy = parsed;
    usedFallback = false;
  }

  const { error } = await saveStrategy(supabase, user.id, strategy);
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ success: true, strategy, fallback: usedFallback, model: generated?.model ?? null });
}
