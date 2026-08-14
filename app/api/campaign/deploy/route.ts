import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { data: connection } = await supabase
    .from("meta_connections")
    .select("access_token, ad_account_id, page_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection?.access_token || !connection?.ad_account_id || !connection?.page_id) {
    return NextResponse.json(
      { error: "meta_not_fully_configured" },
      { status: 400 }
    );
  }

  const { data: campaignConfig } = await supabase
    .from("campaign_configs")
    .select("daily_budget, objective, strategy")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!campaignConfig?.strategy) {
    return NextResponse.json(
      { error: "strategy_missing", message: "Gere a estrategia primeiro." },
      { status: 400 }
    );
  }

  const accessToken = decryptToken(connection.access_token);
  const adAccountId = connection.ad_account_id;
  const pageId = connection.page_id;
  const strategy = campaignConfig.strategy as any;

  try {
    const campaignRes = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/campaigns`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `AdAI - Campanha ${new Date().toLocaleDateString("pt-BR")}`,
          objective: campaignConfig.objective,
          status: "PAUSED",
          special_ad_categories: [],
          is_adset_budget_sharing_enabled: false,
          access_token: accessToken,
        }),
      }
    );
    const campaignData = await campaignRes.json();
    if (campaignData.error) throw { step: "campaign", details: campaignData.error };

    const campaignId = campaignData.id;

    const adSetRes = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/adsets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "AdAI - Conjunto principal",
          campaign_id: campaignId,
          daily_budget: Math.round(Number(campaignConfig.daily_budget) * 100),
          billing_event: "IMPRESSIONS",
          optimization_goal: "REACH",
          bid_strategy: "LOWEST_COST_WITHOUT_CAP",
          targeting: {
            age_min: strategy.publico?.idade_min ?? 18,
            age_max: strategy.publico?.idade_max ?? 65,
            genders:
              strategy.publico?.genero === "male"
                ? [1]
                : strategy.publico?.genero === "female"
                ? [2]
                : [1, 2],
            geo_locations: { countries: ["BR"] },
            targeting_automation: {
              advantage_audience: 0,
            },
          },
          status: "PAUSED",
          access_token: accessToken,
        }),
      }
    );
    const adSetData = await adSetRes.json();
    if (adSetData.error) throw { step: "adset", details: adSetData.error };

    const adSetId = adSetData.id;

    const criativo = strategy.criativos?.[0] ?? {
      titulo: "Conheca nosso trabalho",
      texto_principal: "Entre em contato para saber mais.",
      cta: "SAIBA_MAIS",
    };

    const creativeRes = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/adcreatives`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "AdAI - Criativo 1",
          object_story_spec: {
            page_id: pageId,
            link_data: {
              message: criativo.texto_principal,
              link: "https://adai-saas.vercel.app",
              name: criativo.titulo,
              call_to_action: { type: criativo.cta },
            },
          },
          access_token: accessToken,
        }),
      }
    );
    const creativeData = await creativeRes.json();
    if (creativeData.error) throw { step: "creative", details: creativeData.error };

    const creativeId = creativeData.id;

    const adRes = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/ads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "AdAI - Anuncio 1",
          adset_id: adSetId,
          creative: { creative_id: creativeId },
          status: "PAUSED",
          access_token: accessToken,
        }),
      }
    );
    const adData = await adRes.json();
    if (adData.error) throw { step: "ad", details: adData.error };

    await supabase.from("campaigns").insert({
      user_id: user.id,
      meta_campaign_id: campaignId,
      status: "PAUSED",
      objective: campaignConfig.objective,
    });

    await supabase
      .from("campaign_configs")
      .update({ status: "created" })
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      campaignId,
      adSetId,
      creativeId,
      adId: adData.id,
      message: "Campanha criada com sucesso em modo PAUSADO. Revise no Business Suite antes de ativar.",
    });
  } catch (err: any) {
    console.error("Erro ao criar campanha:", err);
    return NextResponse.json(
      { error: "campaign_creation_failed", step: err.step, details: err.details },
      { status: 500 }
    );
  }
}
