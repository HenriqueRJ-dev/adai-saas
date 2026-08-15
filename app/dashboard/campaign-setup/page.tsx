"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ImagePlus, Instagram, Loader2, MessageCircle, MonitorUp, Upload, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const OBJECTIVES = [
  { value: "OUTCOME_LEADS", label: "Gerar contatos (leads)" },
  { value: "OUTCOME_TRAFFIC", label: "Levar pessoas para um site" },
  { value: "OUTCOME_ENGAGEMENT", label: "Mensagens e engajamento" },
  { value: "OUTCOME_AWARENESS", label: "Reconhecimento da marca" },
];

const DESTINATIONS = [
  { value: "WHATSAPP", label: "WhatsApp", description: "Receber conversas pelo WhatsApp" },
  { value: "INSTAGRAM_DIRECT", label: "Instagram Direct", description: "Receber mensagens no Instagram" },
  { value: "MESSENGER", label: "Messenger", description: "Receber mensagens no Facebook" },
  { value: "WEBSITE", label: "Site", description: "Enviar pessoas para uma página" },
];

const MIN_DAILY_BUDGET = 20;
const MAX_CREATIVE_SIZE = 50 * 1024 * 1024;

type CreativeMode = "upload" | "post";

export default function CampaignSetupPage() {
  const [dailyBudget, setDailyBudget] = useState("");
  const [objective, setObjective] = useState("OUTCOME_LEADS");
  const [destination, setDestination] = useState("WHATSAPP");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [creativeMode, setCreativeMode] = useState<CreativeMode>("upload");
  const [creativeFile, setCreativeFile] = useState<File | null>(null);
  const [instagramPostUrl, setInstagramPostUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const previewUrl = useMemo(() => creativeFile ? URL.createObjectURL(creativeFile) : null, [creativeFile]);
  const isVideo = creativeFile?.type.startsWith("video/") ?? false;

  async function handleStart() {
    setError(null); setResult(null);
    const budgetNumber = Number(dailyBudget);
    if (!dailyBudget || Number.isNaN(budgetNumber) || budgetNumber < MIN_DAILY_BUDGET) {
      setError(`Informe um orçamento diário de pelo menos R$ ${MIN_DAILY_BUDGET},00.`); return;
    }
    if (destination === "WEBSITE" && !/^https?:\/\//i.test(destinationUrl)) {
      setError("Informe a URL completa do site, começando com http:// ou https://."); return;
    }
    if (creativeMode === "upload" && !creativeFile) { setError("Envie uma imagem ou vídeo para usar no anúncio."); return; }
    if (creativeMode === "upload" && creativeFile && creativeFile.size > MAX_CREATIVE_SIZE) { setError("O arquivo deve ter no máximo 50 MB."); return; }
    if (creativeMode === "post") { setError("Por enquanto, use Enviar arquivo. A reutilização direta de post do Instagram ainda não está liberada neste fluxo."); return; }

    setSaving(true);
    try {
      const configRes = await fetch("/api/campaign/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyBudget: budgetNumber, objective }),
      });
      const configData = await configRes.json().catch(() => ({}));
      if (!configRes.ok) throw new Error(configData.message ?? configData.error ?? "Erro ao preparar a campanha.");

      let storagePath: string | null = null;
      if (creativeMode === "upload" && creativeFile) {
        const uploadInitRes = await fetch("/api/campaign/creative-upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: creativeFile.name, mimeType: creativeFile.type, size: creativeFile.size }),
        });
        const uploadInit = await uploadInitRes.json().catch(() => ({}));
        if (!uploadInitRes.ok) throw new Error(uploadInit.error ?? "Não foi possível preparar o upload do criativo.");

        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from(uploadInit.bucket)
          .uploadToSignedUrl(uploadInit.path, uploadInit.token, creativeFile, { contentType: creativeFile.type });
        if (uploadError) throw new Error(`Falha ao enviar o criativo: ${uploadError.message}`);
        storagePath = uploadInit.path;
      }

      const deployRes = await fetch("/api/campaign/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativeMode, destination, destinationUrl, instagramPostUrl, storagePath,
          creativeMimeType: creativeFile?.type ?? null,
        }),
      });
      const deployData = await deployRes.json().catch(() => ({}));
      if (!deployRes.ok) {
        const metaCode = deployData?.details?.code ? ` (código Meta ${deployData.details.code})` : "";
        const metaSubcode = deployData?.details?.error_subcode ? ` / subcódigo ${deployData.details.error_subcode}` : "";
        throw new Error(`${deployData.message ?? "A Meta recusou uma etapa da campanha."}${metaCode}${metaSubcode}`);
      }
      setResult(deployData);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro inesperado ao criar a campanha."); }
    finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-950"><ArrowLeft className="h-4 w-4" /> Voltar ao dashboard</Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.72fr]">
          <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-3xl font-semibold tracking-tight">Criar campanha</h1>
            <p className="mt-2 text-neutral-500">Você escolhe o essencial. O AdAI prepara a estrutura técnica.</p>

            <div className="mt-8 space-y-7">
              <Field label="Orçamento diário (R$)" hint="A campanha é criada pausada para revisão antes de gastar.">
                <input type="number" min={MIN_DAILY_BUDGET} step="0.01" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} placeholder="Ex: 50" className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200" />
              </Field>

              <Field label="Objetivo da campanha">
                <select value={objective} onChange={(e) => setObjective(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200">
                  {OBJECTIVES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>

              <Field label="Onde você quer receber o cliente?">
                <div className="grid gap-2 sm:grid-cols-2">
                  {DESTINATIONS.map((item) => <button key={item.value} type="button" onClick={() => setDestination(item.value)} className={`rounded-xl border p-3 text-left transition ${destination === item.value ? "border-neutral-950 bg-neutral-950 text-white" : "bg-white hover:bg-neutral-50"}`}><p className="text-sm font-medium">{item.label}</p><p className={`mt-1 text-xs ${destination === item.value ? "text-neutral-300" : "text-neutral-500"}`}>{item.description}</p></button>)}
                </div>
              </Field>

              {destination === "WEBSITE" && <Field label="Link do site"><input type="url" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://seusite.com.br" className="w-full rounded-xl border px-4 py-3 text-sm" /></Field>}

              <Field label="Criativo do anúncio" hint="Upload é o modo recomendado. Você também pode reutilizar uma publicação do Instagram.">
                <div className="mb-3 grid grid-cols-2 rounded-xl bg-neutral-100 p-1">
                  <button type="button" onClick={() => setCreativeMode("upload")} className={`rounded-lg px-3 py-2 text-sm font-medium ${creativeMode === "upload" ? "bg-white shadow-sm" : "text-neutral-500"}`}>Enviar arquivo</button>
                  <button type="button" disabled className="cursor-not-allowed rounded-lg px-3 py-2 text-sm font-medium text-neutral-400" title="Em breve">Post existente · em breve</button>
                </div>
                {creativeMode === "upload" ? (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center hover:bg-neutral-50">
                    <Upload className="h-6 w-6 text-neutral-400" /><p className="mt-3 text-sm font-medium">Enviar imagem ou vídeo</p><p className="mt-1 text-xs text-neutral-500">JPG, PNG, WEBP, MP4 ou MOV · até 50 MB</p>
                    <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" className="hidden" onChange={(e) => { const file = e.target.files?.[0] ?? null; if (file && file.size > MAX_CREATIVE_SIZE) { setCreativeFile(null); setError("O arquivo deve ter no máximo 50 MB."); e.currentTarget.value = ""; return; } setError(null); setCreativeFile(file); }} />
                  </label>
                ) : (
                  <div className="relative"><Instagram className="absolute left-3 top-3.5 h-4 w-4 text-neutral-400" /><input type="url" value={instagramPostUrl} onChange={(e) => setInstagramPostUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." className="w-full rounded-xl border py-3 pl-10 pr-4 text-sm" /></div>
                )}
              </Field>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
              {result && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><p className="font-semibold">Campanha criada com sucesso.</p><p className="mt-1 text-xs">Ela foi criada em modo PAUSADO para você revisar antes de ativar.</p></div>}

              <button onClick={handleStart} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Preparando campanha..." : "Criar campanha"}</button>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm font-semibold">Resumo</p><div className="mt-4 space-y-3 text-sm"><Summary icon={MessageCircle} label="Destino" value={DESTINATIONS.find((d) => d.value === destination)?.label ?? "—"} /><Summary icon={creativeMode === "upload" ? (isVideo ? Video : ImagePlus) : Instagram} label="Criativo" value={creativeMode === "post" ? "Post do Instagram" : creativeFile?.name ?? "Aguardando arquivo"} /><Summary icon={MonitorUp} label="Status inicial" value="Pausado" /></div></div>
            {previewUrl && creativeMode === "upload" && <div className="overflow-hidden rounded-2xl border bg-black shadow-sm">{isVideo ? <video src={previewUrl} controls className="max-h-[420px] w-full" /> : <img src={previewUrl} alt="Prévia do criativo" className="max-h-[420px] w-full object-contain" />}</div>}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <div><label className="text-sm font-semibold">{label}</label><div className="mt-2">{children}</div>{hint && <p className="mt-2 text-xs leading-5 text-neutral-400">{hint}</p>}</div>; }
function Summary({ icon: Icon, label, value }: { icon: typeof MessageCircle; label: string; value: string }) { return <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100"><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="text-xs text-neutral-400">{label}</p><p className="truncate font-medium">{value}</p></div></div>; }
