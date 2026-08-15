import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_OBJECTIVES = ["INSTAGRAM_MESSAGES", "INSTAGRAM_PROFILE", "WEBSITE_VISITS"];
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGES = 3;
const MAX_BASE64_CHARS_PER_IMAGE = 620_000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as any;
  const dailyBudget = Number(body?.dailyBudget);
  const durationDays = Number(body?.durationDays);
  const objective = String(body?.objective ?? "");
  const serviceRegion = String(body?.serviceRegion ?? "").trim();
  const websiteUrl = String(body?.websiteUrl ?? "").trim();
  const creativeImages = Array.isArray(body?.creativeImages) ? body.creativeImages.slice(0, MAX_IMAGES) : [];

  if (!Number.isFinite(dailyBudget) || dailyBudget < 5) return NextResponse.json({ error: "Informe um orçamento diário de pelo menos R$ 5,00." }, { status: 400 });
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 30) return NextResponse.json({ error: "Escolha uma duração entre 1 e 30 dias." }, { status: 400 });
  if (!VALID_OBJECTIVES.includes(objective)) return NextResponse.json({ error: "Objetivo inválido." }, { status: 400 });
  if (objective === "WEBSITE_VISITS" && !/^https?:\/\//i.test(websiteUrl)) return NextResponse.json({ error: "Informe a URL completa do site." }, { status: 400 });
  if (creativeImages.length === 0) return NextResponse.json({ error: "Envie pelo menos um criativo para analisar." }, { status: 400 });

  for (const image of creativeImages) {
    const mimeType = String(image?.mimeType ?? "");
    const data = String(image?.data ?? "");
    if (!ACCEPTED_IMAGE_TYPES.has(mimeType) || !data || data.length > MAX_BASE64_CHARS_PER_IMAGE) {
      return NextResponse.json({ error: "Um dos criativos enviados é inválido ou grande demais." }, { status: 400 });
    }
  }

  const { error } = await supabase.from("campaign_configs").upsert(
    { user_id: user.id, daily_budget: dailyBudget, objective, status: "pending" },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("Erro ao salvar campaign_config:", error);
    return NextResponse.json({ error: "Erro ao salvar a configuração." }, { status: 500 });
  }

  const strategyRes = await fetch(new URL("/api/campaign/generate-strategy", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: request.headers.get("cookie") ?? "" },
    body: JSON.stringify({ durationDays, serviceRegion, websiteUrl, creativeImages }),
    cache: "no-store",
  });
  const strategyData = await strategyRes.json().catch(() => ({}));
  if (!strategyRes.ok) return NextResponse.json({ error: strategyData?.message ?? strategyData?.error ?? "Não foi possível gerar a recomendação." }, { status: strategyRes.status });

  return NextResponse.json({ success: true, strategy: strategyData.strategy, fallback: strategyData.fallback });
}
