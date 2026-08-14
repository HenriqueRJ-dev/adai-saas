import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
const VALID_OBJECTIVES = [
  "OUTCOME_SALES",
  "OUTCOME_LEADS",
  "OUTCOME_TRAFFIC",
  "OUTCOME_AWARENESS",
  "OUTCOME_ENGAGEMENT",
  "OUTCOME_APP_PROMOTION",
];
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const body = await request.json();
  const { dailyBudget, objective } = body;
  if (typeof dailyBudget !== "number" || dailyBudget <= 0) {
    return NextResponse.json(
      { error: "Orçamento diário inválido." },
      { status: 400 }
    );
  }
  if (!VALID_OBJECTIVES.includes(objective)) {
    return NextResponse.json(
      { error: "Objetivo de campanha inválido." },
      { status: 400 }
    );
  }
  // Confirma que a conta Meta já foi conectada e configurada
  // (Página + conta de anúncio) antes de aceitar uma campanha.
  const { data: connection } = await supabase
    .from("meta_connections")
    .select("page_id, ad_account_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!connection?.page_id || !connection?.ad_account_id) {
    return NextResponse.json(
      { error: "Conecte sua conta Meta e escolha a Página antes de continuar." },
      { status: 400 }
    );
  }
  const { error } = await supabase.from("campaign_configs").upsert(
    {
      user_id: user.id,
      daily_budget: dailyBudget,
      objective,
      status: "pending",
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("Erro ao salvar campaign_config:", error);
    return NextResponse.json(
      { error: "Erro ao salvar a configuração." },
      { status: 500 }
    );
  }

  // Dispara automaticamente a geração da estratégia com IA,
  // para o fluxo ficar 100% automático (sem passo manual extra).
  const strategyRes = await fetch(
    `${request.headers.get("origin")}/api/campaign/generate-strategy`,
    {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    }
  );

  if (!strategyRes.ok) {
    const strategyError = await strategyRes.json().catch(() => ({}));
    console.error("Erro ao gerar estrategia automaticamente:", strategyError);
    return NextResponse.json(
      {
        success: true,
        warning: "Configuração salva, mas a IA ainda não conseguiu gerar a estratégia automaticamente.",
        strategyError,
      },
      { status: 200 }
    );
  }

  const strategyData = await strategyRes.json();

  return NextResponse.json({ success: true, strategy: strategyData.strategy });
}
