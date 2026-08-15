import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";

const GRAPH = "https://graph.facebook.com/v26.0";
const CREATIVE_BUCKET = "ad-creatives";

type Destination = "WHATSAPP" | "INSTAGRAM_DIRECT" | "MESSENGER" | "WEBSITE";
type CreativeMode = "upload" | "post";

type DeployBody = {
  creativeMode?: CreativeMode;
  destination?: Destination;
  destinationUrl?: string;
  instagramPostUrl?: string;
  storagePath?: string | null;
  creativeMimeType?: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function optimizationFor(objective: string, destination: Destination) {
  if (destination === "WHATSAPP" || destination === "INSTAGRAM_DIRECT" || destination === "MESSENGER") {
    return "CONVERSATIONS";
  }
  if (objective === "OUTCOME_AWARENESS") return "REACH";
  if (objective === "OUTCOME_ENGAGEMENT") return "POST_ENGAGEMENT";
  return "LINK_CLICKS";
}

function ctaFor(destination: Destination) {
  if (destination === "WHATSAPP") {
    return { type: "WHATSAPP_MESSAGE", value: { app_destination: "WHATSAPP" } };
  }
  if (destination === "INSTAGRAM_DIRECT") {
    return { type: "MESSAGE_PAGE", value: { app_destination: "INSTAGRAM_DIRECT" } };
  }
  if (destination === "MESSENGER") {
    return { type: "MESSAGE_PAGE", value: { app_destination: "MESSENGER" } };
  }
  return { type: "LEARN_MORE" };
}

async function getInstagramBusinessId(pageId: string, accessToken: string) {
  const res = await fetch(`${GRAPH}/${pageId}?fields=instagram_business_account&access_token=${encodeURIComponent(accessToken)}`);
  const data = await res.json();
  return data.instagram_business_account?.id as string | undefined;
}

async function uploadImage(adAccountId: string, accessToken: string, blob: Blob) {
  const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
  const body = new URLSearchParams({ access_token: accessToken, bytes: base64 });
  const res = await fetch(`${GRAPH}/${adAccountId}/adimages`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok || data.error) throw { step: "image_upload", details: data.error ?? data };
  const first = data.images ? Object.values(data.images)[0] as { hash?: string } | undefined : undefined;
  if (!first?.hash) throw { step: "image_upload", details: { message: "A Meta não retornou o hash da imagem." } };
  return first.hash;
}

async function uploadVideo(adAccountId: string, accessToken: string, blob: Blob, fileName: string) {
  const form = new FormData();
  form.append("access_token", accessToken);
  form.append("title", `AdAI ${fileName}`);
  form.append("source", blob, fileName);
  const res = await fetch(`${GRAPH}/${adAccountId}/advideos`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok || data.error || !data.id) throw { step: "video_upload", details: data.error ?? data };

  let thumbnailUrl: string | undefined;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(1800);
    const statusRes = await fetch(`${GRAPH}/${data.id}?fields=status,thumbnails&access_token=${encodeURIComponent(accessToken)}`);
    const statusData = await statusRes.json();
    const thumbs = statusData?.thumbnails?.data;
    if (Array.isArray(thumbs) && thumbs[0]?.uri) thumbnailUrl = thumbs[0].uri;
    const videoStatus = statusData?.status?.video_status;
    if (videoStatus === "ready" || videoStatus === "READY" || thumbnailUrl) break;
  }
  return { videoId: data.id as string, thumbnailUrl };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as DeployBody;
  const creativeMode: CreativeMode = body.creativeMode === "post" ? "post" : "upload";
  const destination: Destination = ["WHATSAPP", "INSTAGRAM_DIRECT", "MESSENGER", "WEBSITE"].includes(String(body.destination))
    ? body.destination as Destination
    : "WHATSAPP";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { data: connection } = await supabase
    .from("meta_connections")
    .select("access_token, ad_account_id, page_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection?.access_token || !connection?.ad_account_id || !connection?.page_id) {
    return NextResponse.json({ error: "meta_not_fully_configured", message: "Conecte a Meta e selecione a Página e a conta de anúncios." }, { status: 400 });
  }

  const { data: campaignConfig } = await supabase
    .from("campaign_configs")
    .select("daily_budget, objective, strategy")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!campaignConfig?.strategy) {
    return NextResponse.json({ error: "strategy_missing", message: "Não foi possível carregar a estratégia da campanha." }, { status: 400 });
  }

  if (destination === "WEBSITE") {
    try {
      const u = new URL(body.destinationUrl ?? "");
      if (!/^https?:$/.test(u.protocol)) throw new Error();
    } catch {
      return NextResponse.json({ error: "invalid_destination_url", message: "Informe um endereço de site válido." }, { status: 400 });
    }
  }

  if (creativeMode === "upload" && !body.storagePath) {
    return NextResponse.json({ error: "creative_missing", message: "Envie uma imagem ou vídeo para continuar." }, { status: 400 });
  }

  const accessToken = decryptToken(connection.access_token);
  const adAccountId = connection.ad_account_id;
  const pageId = connection.page_id;
  const strategy = campaignConfig.strategy as any;
  const criativo = strategy.criativos?.[0] ?? {
    titulo: "Conheça nosso trabalho",
    texto_principal: "Entre em contato para saber mais.",
  };

  let cleanupPath: string | null = null;

  try {
    const igBusinessId = await getInstagramBusinessId(pageId, accessToken);
    if (destination === "INSTAGRAM_DIRECT" && !igBusinessId) {
      return NextResponse.json({ error: "instagram_not_linked", message: "A Página selecionada não possui Instagram profissional vinculado." }, { status: 400 });
    }

    const campaignRes = await fetch(`${GRAPH}/${adAccountId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `AdAI - ${new Date().toLocaleDateString("pt-BR")}`,
        objective: campaignConfig.objective,
        status: "PAUSED",
        special_ad_categories: [],
        is_adset_budget_sharing_enabled: false,
        access_token: accessToken,
      }),
    });
    const campaignData = await campaignRes.json();
    if (!campaignRes.ok || campaignData.error) throw { step: "campaign", details: campaignData.error ?? campaignData };

    const adSetPayload: Record<string, unknown> = {
      name: "AdAI - Conjunto principal",
      campaign_id: campaignData.id,
      daily_budget: Math.round(Number(campaignConfig.daily_budget) * 100),
      billing_event: "IMPRESSIONS",
      optimization_goal: optimizationFor(campaignConfig.objective, destination),
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: {
        age_min: strategy.publico?.idade_min ?? 18,
        age_max: strategy.publico?.idade_max ?? 65,
        genders: strategy.publico?.genero === "male" ? [1] : strategy.publico?.genero === "female" ? [2] : [1, 2],
        geo_locations: { countries: ["BR"] },
        targeting_automation: { advantage_audience: 0 },
      },
      status: "PAUSED",
      access_token: accessToken,
    };
    if (destination !== "WEBSITE") adSetPayload.destination_type = destination;
    else adSetPayload.destination_type = "WEBSITE";

    const adSetRes = await fetch(`${GRAPH}/${adAccountId}/adsets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adSetPayload),
    });
    const adSetData = await adSetRes.json();
    if (!adSetRes.ok || adSetData.error) throw { step: "adset", details: adSetData.error ?? adSetData };

    const link = destination === "WEBSITE"
      ? body.destinationUrl!
      : destination === "INSTAGRAM_DIRECT"
        ? "https://www.instagram.com/"
        : `https://www.facebook.com/${pageId}`;

    let mediaFields: Record<string, unknown> = {};
    let useVideo = false;

    if (creativeMode === "upload") {
      const admin = createAdminClient();
      cleanupPath = body.storagePath!;
      const { data: blob, error: downloadError } = await admin.storage.from(CREATIVE_BUCKET).download(body.storagePath!);
      if (downloadError || !blob) throw { step: "creative_download", details: downloadError ?? { message: "Arquivo não encontrado." } };

      const mime = body.creativeMimeType || blob.type;
      if (mime.startsWith("video/")) {
        useVideo = true;
        const uploaded = await uploadVideo(adAccountId, accessToken, blob, body.storagePath!.split("/").pop() ?? "creative.mp4");
        mediaFields = { video_id: uploaded.videoId, ...(uploaded.thumbnailUrl ? { image_url: uploaded.thumbnailUrl } : {}) };
      } else {
        const imageHash = await uploadImage(adAccountId, accessToken, blob);
        mediaFields = { image_hash: imageHash };
      }
    } else {
      let postUrl: URL;
      try { postUrl = new URL(body.instagramPostUrl ?? ""); }
      catch { return NextResponse.json({ error: "invalid_instagram_url", message: "Informe um link válido do Instagram." }, { status: 400 }); }
      if (!["instagram.com", "www.instagram.com"].includes(postUrl.hostname.toLowerCase())) {
        return NextResponse.json({ error: "invalid_instagram_url", message: "Informe um link de publicação do Instagram." }, { status: 400 });
      }
      mediaFields = {};
    }

    const callToAction = ctaFor(destination);
    const storySpec: Record<string, unknown> = {
      page_id: pageId,
      ...(igBusinessId ? { instagram_user_id: igBusinessId } : {}),
      ...(useVideo ? {
        video_data: {
          ...mediaFields,
          message: criativo.texto_principal,
          title: criativo.titulo,
          call_to_action: { ...callToAction, value: { ...(callToAction as any).value, link } },
        },
      } : {
        link_data: {
          ...mediaFields,
          message: criativo.texto_principal,
          name: criativo.titulo,
          link: creativeMode === "post" ? body.instagramPostUrl : link,
          call_to_action: callToAction,
        },
      }),
    };

    const creativeRes = await fetch(`${GRAPH}/${adAccountId}/adcreatives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "AdAI - Criativo", object_story_spec: storySpec, access_token: accessToken }),
    });
    const creativeData = await creativeRes.json();
    if (!creativeRes.ok || creativeData.error) throw { step: "creative", details: creativeData.error ?? creativeData };

    const adRes = await fetch(`${GRAPH}/${adAccountId}/ads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "AdAI - Anúncio 1", adset_id: adSetData.id, creative: { creative_id: creativeData.id }, status: "PAUSED", access_token: accessToken }),
    });
    const adData = await adRes.json();
    if (!adRes.ok || adData.error) throw { step: "ad", details: adData.error ?? adData };

    await supabase.from("campaigns").insert({ user_id: user.id, meta_campaign_id: campaignData.id, status: "PAUSED", objective: campaignConfig.objective });
    await supabase.from("campaign_configs").update({ status: "created" }).eq("user_id", user.id);

    if (cleanupPath) {
      const admin = createAdminClient();
      await admin.storage.from(CREATIVE_BUCKET).remove([cleanupPath]);
    }

    return NextResponse.json({ success: true, campaignId: campaignData.id, adSetId: adSetData.id, creativeId: creativeData.id, adId: adData.id, message: "Campanha criada em modo PAUSADO." });
  } catch (err: any) {
    if (cleanupPath) {
      try { await createAdminClient().storage.from(CREATIVE_BUCKET).remove([cleanupPath]); } catch {}
    }
    const step = err?.step ?? "unknown";
    const details = err?.details ?? err;
    const metaMessage = details?.error_user_msg ?? details?.error_user_title ?? details?.message ?? "A Meta rejeitou uma etapa da criação da campanha.";
    console.error("META_DEPLOY_ERROR", JSON.stringify({ step, details }, null, 2));
    return NextResponse.json({ error: "campaign_creation_failed", step, details, message: `Erro da Meta na etapa ${step}: ${metaMessage}` }, { status: 500 });
  }
}
