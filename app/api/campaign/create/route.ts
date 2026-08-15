import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_OBJECTIVES = ["OUTCOME_SALES", "OUTCOME_LEADS", "OUTCOME_TRAFFIC", "OUTCOME_AWARENESS", "OUTCOME_ENGAGEMENT"];
const VALID_DESTINATIONS = ["WHATSAPP", "INSTAGRAM_DIRECT", "MESSENGER", "WEBSITE"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as any;
  const dailyBudget = Number(body?.dailyBudget);
  const objective = String(body?.objective ?? "");
  const destination = String(body?.destination ?? "");
  const destinationUrl = String(body?.destinationUrl ?? "").trim();
  const serviceRegion = String(body?.serviceRegion ?? "").trim();
  const creativeName = String(body?.creativeName ?? "").trim();
  const creativeType = String(body?.creativeType ?? "").trim();

  if (!Number.isFinite(dailyBudget) || dailyBudget < 1) return NextResponse.json({ error: "Orçamento diário inválido." }, { status: 400 });
  if (!VALID_OBJECTIVES.includes(objective)) return NextResponse.json({ error: "Objetivo inválido." }, { status: 400 });
  if (!VALID_DESTINATIONS.includes(destination)) return NextResponse.json({ error: "Destino inválido." }, { status: 400 });
  if (destination === "WEBSITE" && !/^https?:\/\//i.test(destinationUrl)) return NextResponse.json({ error: "Informe a URL completa do site." }, { status: 400 });
  if (!creativeName) return NextResponse.json({ error: "Selecione uma imagem ou vídeo para o plano." }, { status: 400 });

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
    body: JSON.stringify({ destination, destinationUrl, serviceRegion, creativeName, creativeType }),
    cache: "no-store",
  });
  const strategyData = await strategyRes.json().catch(() => ({}));
  if (!strategyRes.ok) return NextResponse.json({ error: strategyData?.message ?? strategyData?.error ?? "Não foi possível gerar o plano." }, { status: strategyRes.status });

  return NextResponse.json({ success: true, strategy: strategyData.strategy, fallback: strategyData.fallback });
}
