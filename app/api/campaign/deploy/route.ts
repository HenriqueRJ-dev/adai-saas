import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";

export async function POST(request: Request) {
  const { instagramPostUrl } = await request.json();

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
      `https://graph.facebook.com/v26.0/${adAccountId}/campaigns`,
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
      `https://graph.facebook.com/v26.0/${adAccountId}/adsets`,
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

    const ctaMap: Record<string, string> = {
      SAIBA_MAIS: "LEARN_MORE",
      LEARN_MORE: "LEARN_MORE",
      CADASTRE_SE: "SIGN_UP",
      SIGN_UP: "SIGN_UP",
      COMPRE_AGORA: "SHOP_NOW",
      SHOP_NOW: "SHOP_NOW",
      ENTRE_EM_CONTATO: "CONTACT_US",
      CONTACT_US: "CONTACT_US",
      LIGUE_AGORA: "CALL_NOW",
      CALL_NOW: "CALL_NOW",
      ENVIAR_MENSAGEM: "MESSAGE_PAGE",
      MESSAGE_PAGE: "MESSAGE_PAGE",
      WHATSAPP: "WHATSAPP_MESSAGE",
      WHATSAPP_MESSAGE: "WHATSAPP_MESSAGE",
      ENVIAR_WHATSAPP: "WHATSAPP_MESSAGE",
      SOLICITAR_ORCAMENTO: "GET_QUOTE",
      GET_QUOTE: "GET_QUOTE",
      INSCREVA_SE: "SIGN_UP",
      COMPRAR: "SHOP_NOW",
      BAIXAR: "DOWNLOAD",
      DOWNLOAD: "DOWNLOAD",
    };

    const ctaType = ctaMap[String(criativo.cta ?? "").toUpperCase()] ?? "LEARN_MORE";

    let igBusinessId: string | null = null;

    const pageIgRes = await fetch(
      `https://graph.facebook.com/v26.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
    );
    const pageIgData = await pageIgRes.json();
    console.log("DEBUG page instagram_business_account:", JSON.stringify(pageIgData));

    if (pageIgData.instagram_business_account?.id) {
      igBusinessId = pageIgData.instagram_business_account.id;
    }

    let normalizedInstagramPostUrl: string | null = null;

    if (instagramPostUrl && !igBusinessId) {
      return NextResponse.json(
        {
          error: "instagram_not_linked",
          message: "A Página do Facebook selecionada não tem uma conta profissional do Instagram vinculada, ou o token não possui permissão para acessá-la.",
        },
        { status: 400 }
      );
    }

    if (instagramPostUrl) {
      let parsedPostUrl: URL;
      try {
        parsedPostUrl = new URL(instagramPostUrl);
      } catch {
        return NextResponse.json(
          { error: "invalid_instagram_url", message: "O link do Instagram é inválido." },
          { status: 400 }
        );
      }

      if (!["instagram.com", "www.instagram.com"].includes(parsedPostUrl.hostname.toLowerCase())) {
        return NextResponse.json(
          { error: "invalid_instagram_url", message: "Informe um link de publicação do Instagram." },
          { status: 400 }
        );
      }

      // A Marketing API aceita diretamente o permalink da publicação do Instagram.
      // Isso evita depender do /media (que exige permissões extras e estava falhando
      // antes mesmo da criação do criativo).
      normalizedInstagramPostUrl = parsedPostUrl.toString().split("?")[0];
      if (!normalizedInstagramPostUrl.endsWith("/")) normalizedInstagramPostUrl += "/";
    }

    const creativeRes = await fetch(
      `https://graph.facebook.com/v26.0/${adAccountId}/adcreatives`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          normalizedInstagramPostUrl
            ? {
                name: "AdAI - Criativo Instagram",
                object_story_spec: {
                  page_id: pageId,
                  instagram_user_id: igBusinessId,
                },
                instagram_permalink_url: normalizedInstagramPostUrl,
                access_token: accessToken,
              }
            : {
                name: "AdAI - Criativo 1",
                object_story_spec: {
                  page_id: pageId,
                  ...(igBusinessId ? { instagram_user_id: igBusinessId } : {}),
                  link_data: {
                    message: criativo.texto_principal,
                    link: process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin,
                    name: criativo.titulo,
                    call_to_action: { type: ctaType },
                  },
                },
                access_token: accessToken,
              }
        ),
      }
    );
    const creativeData = await creativeRes.json();
    if (!creativeRes.ok || creativeData.error) {
      throw { step: "creative", details: creativeData.error ?? creativeData };
    }

    const creativeId = creativeData.id;

    const adRes = await fetch(
      `https://graph.facebook.com/v26.0/${adAccountId}/ads`,
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
    if (!adRes.ok || adData.error) {
      throw { step: "ad", details: adData.error ?? adData };
    }

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
    const step = err?.step ?? "unknown";
    const details = err?.details ?? err;
    const metaMessage =
      details?.error_user_msg ??
      details?.error_user_title ??
      details?.message ??
      "A Meta rejeitou uma etapa da criação da campanha.";

    console.error(
      "META_DEPLOY_ERROR",
      JSON.stringify({ step, details }, null, 2)
    );

    return NextResponse.json(
      {
        error: "campaign_creation_failed",
        step,
        details,
        message: `Erro da Meta na etapa ${step}: ${metaMessage}`,
      },
      { status: 500 }
    );
  }
}
