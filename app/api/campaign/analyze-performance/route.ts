import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateGeminiJson, type GeminiPart } from "@/lib/gemini";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGES = 3;
const MAX_BASE64_CHARS_PER_IMAGE = 620_000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as any;
  const images = Array.isArray(body?.images) ? body.images.slice(0, MAX_IMAGES) : [];
  const notes = String(body?.notes ?? "").trim().slice(0, 1200);
  if (images.length === 0) return NextResponse.json({ error: "Envie pelo menos um print dos resultados." }, { status: 400 });

  for (const image of images) {
    const mimeType = String(image?.mimeType ?? "");
    const data = String(image?.data ?? "");
    if (!ACCEPTED_IMAGE_TYPES.has(mimeType) || !data || data.length > MAX_BASE64_CHARS_PER_IMAGE) {
      return NextResponse.json({ error: "Um dos prints é inválido ou grande demais." }, { status: 400 });
    }
  }

  const { data: config } = await supabase
    .from("campaign_configs")
    .select("daily_budget, objective, strategy")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!config?.strategy) return NextResponse.json({ error: "Crie uma recomendação de campanha antes de analisar resultados." }, { status: 400 });

  const fallback = {
    acao: "AGUARDAR MAIS DADOS",
    titulo: "Não consegui ler os resultados automaticamente agora",
    diagnostico: "O print foi recebido, mas a análise visual não ficou disponível nesta tentativa. Não faça mudanças grandes só por causa disso; tente novamente mais tarde ou envie um print mais nítido.",
    confianca: "Baixa",
    metricas: [],
    sinais_positivos: [],
    sinais_de_atencao: ["Sem leitura confiável dos números nesta tentativa."],
    proximos_passos: [
      "Mantenha o teste estável se ele ainda estiver no início.",
      "Tente novamente com um print que mostre gasto, alcance e o resultado principal do objetivo.",
    ],
    criterio: "A decisão deve usar os números reais visíveis no Insights; sem dados legíveis, o AdAI não inventa uma recomendação de performance.",
  };

  const prompt = `Você é um analista de performance especializado em promoções feitas diretamente pelo Instagram para pequenos negócios.
Leia os prints de Insights/resultados enviados e compare com o plano atual. Não invente números. Se uma métrica não estiver claramente visível, não a inclua.

PLANO ATUAL:
${JSON.stringify(config.strategy, null, 2)}

OBSERVAÇÃO DO USUÁRIO:
${notes || "Nenhuma"}

Retorne APENAS JSON válido com esta estrutura:
${JSON.stringify(fallback, null, 2)}

Regras:
- acao deve ser EXATAMENTE uma destas: MANTER, AUMENTAR, PAUSAR, TROCAR CRIATIVO, AGUARDAR MAIS DADOS.
- metricas deve ser um array de objetos {nome, valor, leitura}. Inclua apenas métricas visíveis nos prints.
- não use benchmarks externos ou médias de mercado que não foram fornecidas.
- se houver gasto e quantidade de resultados claramente visíveis, você pode calcular custo por resultado e dizer que é uma conta derivada dos dados do print.
- AUMENTAR só deve ser recomendado de forma gradual e quando os dados visíveis justificarem continuidade; não recomende dobrar orçamento.
- se os dados forem insuficientes, escolha AGUARDAR MAIS DADOS.
- explique em linguagem simples para alguém que não entende tráfego pago.`;

  const parts: GeminiPart[] = [{ text: prompt }];
  for (const [index, image] of images.entries()) {
    parts.push({ text: `Print de resultados ${index + 1}: ${String(image?.name ?? "imagem")}` });
    parts.push({ inlineData: { mimeType: String(image.mimeType), data: String(image.data) } });
  }

  const generated = await generateGeminiJson(parts);
  const raw = generated?.data;
  const allowedActions = new Set(["MANTER", "AUMENTAR", "PAUSAR", "TROCAR CRIATIVO", "AGUARDAR MAIS DADOS"]);
  const analysis = raw && typeof raw === "object" ? {
    ...fallback,
    ...raw,
    acao: allowedActions.has(String(raw.acao)) ? String(raw.acao) : fallback.acao,
    metricas: Array.isArray(raw.metricas) ? raw.metricas.slice(0, 10).map((item: any) => ({ nome: String(item?.nome ?? "Métrica"), valor: String(item?.valor ?? "—"), leitura: String(item?.leitura ?? "") })) : [],
    sinais_positivos: Array.isArray(raw.sinais_positivos) ? raw.sinais_positivos.map(String).slice(0, 5) : [],
    sinais_de_atencao: Array.isArray(raw.sinais_de_atencao) ? raw.sinais_de_atencao.map(String).slice(0, 5) : [],
    proximos_passos: Array.isArray(raw.proximos_passos) ? raw.proximos_passos.map(String).slice(0, 5) : fallback.proximos_passos,
  } : fallback;

  const newStrategy = { ...(config.strategy as any), performance_analysis: analysis, performance_updated_at: new Date().toISOString() };
  const { error } = await supabase.from("campaign_configs").update({ strategy: newStrategy }).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Não foi possível salvar a análise dos resultados." }, { status: 500 });

  return NextResponse.json({ success: true, analysis, fallback: !generated?.data, model: generated?.model ?? null });
}
