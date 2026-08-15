import { promises as dns } from "node:dns";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateGeminiJson, type GeminiPart } from "@/lib/gemini";

type SourceType = "instagram" | "site" | "screenshots" | "manual";

type ImageInput = {
  name?: string;
  mimeType?: string;
  data?: string;
};

type Input = {
  sourceType?: SourceType;
  sourceValue?: string;
  notes?: string;
  images?: ImageInput[];
  manual?: {
    brandName?: string;
    niche?: string;
    offer?: string;
    audience?: string;
    region?: string;
  };
};

type WebsiteContext = {
  url: string;
  title: string;
  description: string;
  text: string;
};

const VALID_SOURCE_TYPES: SourceType[] = ["instagram", "site", "screenshots", "manual"];
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGES = 4;
const MAX_BASE64_CHARS_PER_IMAGE = 760_000;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function instagramHandle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("@")) return trimmed.replace(/[^@a-zA-Z0-9._]/g, "");
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.hostname.includes("instagram.com")) {
      const first = url.pathname.split("/").filter(Boolean)[0];
      return first ? `@${first}` : trimmed;
    }
  } catch {}
  return trimmed;
}

function isPrivateIp(address: string) {
  if (address === "::1" || address === "0:0:0:0:0:0:0:1") return true;
  const normalized = address.toLowerCase();
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) return true;
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(address)) return false;
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

async function assertPublicUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("invalid_protocol");
  if (url.username || url.password) throw new Error("credentials_not_allowed");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) throw new Error("private_host");
  if (isIP(hostname) && isPrivateIp(hostname)) throw new Error("private_ip");

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) throw new Error("private_ip");
  return url;
}

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractMeta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1].trim());
  }
  return "";
}

function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  ).slice(0, 9000);
}

async function fetchWebsiteContext(rawUrl: string): Promise<WebsiteContext | null> {
  let current = await assertPublicUrl(rawUrl);

  for (let redirectCount = 0; redirectCount < 4; redirectCount++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(current, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AdAIBrandAnalyzer/1.0)",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.1",
        },
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) return null;
        current = await assertPublicUrl(new URL(location, current).toString());
        continue;
      }

      if (!response.ok) return null;
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain") && !contentType.includes("application/xhtml+xml")) return null;
      const declaredLength = Number(response.headers.get("content-length") ?? 0);
      if (declaredLength > 2_000_000) return null;

      const html = (await response.text()).slice(0, 1_500_000);
      const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "");
      const description = extractMeta(html, "description") || extractMeta(html, "og:description");
      return { url: current.toString(), title, description, text: htmlToText(html) };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

function fallbackAnalysis(input: Input, website: WebsiteContext | null, imageCount: number) {
  const sourceType = input.sourceType ?? "manual";
  const sourceValue = clean(input.sourceValue);
  const manual = input.manual ?? {};
  let brandName = clean(manual.brandName);

  if (!brandName && sourceType === "instagram") brandName = instagramHandle(sourceValue).replace(/^@/, "");
  if (!brandName && website?.title) brandName = website.title.split(/[|–—-]/)[0]?.trim();
  if (!brandName && sourceType === "site") {
    try { brandName = new URL(sourceValue).hostname.replace(/^www\./, "").split(".")[0]; } catch {}
  }
  if (!brandName) brandName = "Sua marca";

  const siteDescription = website?.description || "";
  const niche = clean(manual.niche) || (siteDescription ? siteDescription.slice(0, 140) : "Segmento a refinar com os materiais da marca");
  const offer = clean(manual.offer) || siteDescription || "Oferta principal a destacar na comunicação";
  const audience = clean(manual.audience) || `Pessoas com maior afinidade com a oferta da ${brandName}`;
  const region = clean(manual.region) || "Definir conforme a área de atendimento da empresa";

  return {
    nome_marca: brandName,
    nicho: niche,
    oferta_principal: offer,
    publico_alvo: audience,
    regiao: region,
    tom_de_voz: "Claro, direto, confiável e orientado a benefício",
    resumo_executivo: `${brandName} deve comunicar a oferta com clareza, destacar benefícios concretos e reduzir dúvidas antes do contato ou compra.`,
    dores_principais: [
      "Dúvidas antes de comprar ou contratar",
      "Busca por confiança e prova de valor",
      "Necessidade de entender rapidamente o principal benefício da oferta",
    ],
    proposta_de_valor: offer,
    diferenciais: ["Comunicação clara da oferta", "Atendimento direto", "Foco no benefício principal"],
    oportunidades: [
      "Transformar benefícios da oferta em mensagens curtas para anúncios",
      "Criar variações de criativo com diferentes ângulos de comunicação",
      "Usar uma chamada para ação coerente com o objetivo da campanha",
    ],
    angulos_anuncio: ["Benefício principal", "Problema e solução", "Confiança e diferenciação"],
    identidade_visual: imageCount > 0 ? "Material visual recebido para análise; recomendações avançadas dependem da leitura multimodal da IA." : "Envie prints ou imagens para aprofundar a leitura visual da marca.",
    _meta: {
      source_type: sourceType,
      source_value: sourceValue,
      images_count: imageCount,
      website_fetched: Boolean(website),
      analysis_level: "basic_fallback",
    },
  };
}

function normalizeAnalysis(candidate: any, fallback: any, meta: any) {
  const arrays = ["dores_principais", "diferenciais", "oportunidades", "angulos_anuncio"];
  const merged = { ...fallback, ...(candidate && typeof candidate === "object" ? candidate : {}) } as any;
  for (const key of arrays) {
    if (!Array.isArray(merged[key])) merged[key] = fallback[key];
    merged[key] = merged[key].filter((item: unknown) => typeof item === "string" && item.trim()).slice(0, 6);
  }
  merged._meta = { ...fallback._meta, ...meta };
  return merged;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { data, error } = await supabase.from("ai_brand_analysis").select("analysis").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Não foi possível carregar a análise atual." }, { status: 500 });
  return NextResponse.json({ analysis: data?.analysis ?? null });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Input | null;
  const sourceType = body?.sourceType;
  if (!sourceType || !VALID_SOURCE_TYPES.includes(sourceType)) {
    return NextResponse.json({ error: "Escolha como o AdAI deve analisar sua marca." }, { status: 400 });
  }

  const sourceValue = clean(body?.sourceValue);
  const notes = clean(body?.notes).slice(0, 2000);
  const manual = body?.manual ?? {};
  const images = Array.isArray(body?.images) ? body!.images!.slice(0, MAX_IMAGES) : [];

  for (const image of images) {
    if (!ACCEPTED_IMAGE_TYPES.has(clean(image.mimeType)) || !clean(image.data) || clean(image.data).length > MAX_BASE64_CHARS_PER_IMAGE) {
      return NextResponse.json({ error: "Um dos prints enviados é inválido ou grande demais." }, { status: 400 });
    }
  }

  if (sourceType === "instagram") {
    if (!sourceValue) return NextResponse.json({ error: "Informe o @ ou link do Instagram." }, { status: 400 });
    if (images.length === 0) return NextResponse.json({ error: "Envie pelo menos 1 print do Instagram para a análise visual." }, { status: 400 });
  }
  if (sourceType === "site") {
    try {
      const url = new URL(sourceValue);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      return NextResponse.json({ error: "Informe a URL completa do site, começando com https://." }, { status: 400 });
    }
  }
  if (sourceType === "screenshots" && images.length === 0) {
    return NextResponse.json({ error: "Envie pelo menos 1 print para analisar a marca." }, { status: 400 });
  }
  if (sourceType === "manual" && (!clean(manual.brandName) || !clean(manual.niche) || !clean(manual.offer))) {
    return NextResponse.json({ error: "No modo manual, informe nome da marca, segmento e oferta principal." }, { status: 400 });
  }

  let websiteContext: WebsiteContext | null = null;
  if (sourceType === "site") {
    try {
      websiteContext = await fetchWebsiteContext(sourceValue);
    } catch {
      websiteContext = null;
    }
  }

  const input: Input = {
    sourceType,
    sourceValue,
    notes,
    images,
    manual: {
      brandName: clean(manual.brandName),
      niche: clean(manual.niche),
      offer: clean(manual.offer),
      audience: clean(manual.audience),
      region: clean(manual.region),
    },
  };
  const fallback = fallbackAnalysis(input, websiteContext, images.length);

  const sourceContext = {
    tipo: sourceType,
    instagram_ou_url: sourceValue || undefined,
    contexto_extra: notes || undefined,
    dados_manuais: sourceType === "manual" ? input.manual : undefined,
    site: websiteContext ? {
      url: websiteContext.url,
      titulo: websiteContext.title,
      descricao: websiteContext.description,
      texto_visivel: websiteContext.text,
    } : undefined,
    quantidade_de_prints: images.length,
  };

  const prompt = `Você é um estrategista de marca e performance para pequenos negócios brasileiros.\nAnalise SOMENTE o material fornecido (site, prints, Instagram informado, notas ou dados manuais).\nDiferencie fatos observados de inferências. Não invente métricas, alcance, faturamento, tendências de busca, concorrentes ou dados regionais que não foram fornecidos.\nA análise será usada depois para montar campanhas de Meta Ads manualmente.\n\nRetorne APENAS JSON válido neste formato:\n{\n  "nome_marca": "",\n  "nicho": "",\n  "oferta_principal": "",\n  "publico_alvo": "",\n  "regiao": "",\n  "tom_de_voz": "",\n  "resumo_executivo": "",\n  "dores_principais": ["", "", ""],\n  "proposta_de_valor": "",\n  "diferenciais": ["", "", ""],\n  "oportunidades": ["", "", ""],\n  "angulos_anuncio": ["", "", ""],\n  "identidade_visual": ""\n}\n\nMaterial textual disponível:\n${JSON.stringify(sourceContext, null, 2)}`;

  const parts: GeminiPart[] = [{ text: prompt }];
  for (const image of images) {
    parts.push({ inlineData: { mimeType: clean(image.mimeType), data: clean(image.data) } });
  }

  let analysis = fallback;
  let fallbackUsed = true;
  let model: string | null = null;

  const generated = await generateGeminiJson(parts);
  if (generated?.data) {
    analysis = normalizeAnalysis(generated.data, fallback, {
      source_type: sourceType,
      source_value: sourceValue,
      images_count: images.length,
      website_fetched: Boolean(websiteContext),
      analysis_level: "ai_multimodal",
      model: generated.model,
    });
    fallbackUsed = false;
    model = generated.model;
  }

  const { error } = await supabase.from("ai_brand_analysis").upsert(
    { user_id: user.id, analysis },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("Erro ao salvar análise de marca:", error);
    return NextResponse.json({ error: "Não foi possível salvar a análise." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    analysis,
    fallback: fallbackUsed,
    model,
    source: {
      type: sourceType,
      screenshots: images.length,
      websiteFetched: Boolean(websiteContext),
    },
  });
}
