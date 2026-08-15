"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, MessageCircle, MonitorUp, Upload, Video } from "lucide-react";

const OBJECTIVES = [
  { value: "OUTCOME_LEADS", label: "Gerar contatos (leads)" },
  { value: "OUTCOME_TRAFFIC", label: "Levar pessoas para um site" },
  { value: "OUTCOME_ENGAGEMENT", label: "Mensagens e engajamento" },
  { value: "OUTCOME_SALES", label: "Vendas" },
  { value: "OUTCOME_AWARENESS", label: "Reconhecimento da marca" },
];

const DESTINATIONS = [
  { value: "WHATSAPP", label: "WhatsApp", description: "Receber conversas pelo WhatsApp" },
  { value: "INSTAGRAM_DIRECT", label: "Instagram Direct", description: "Receber mensagens no Instagram" },
  { value: "MESSENGER", label: "Messenger", description: "Receber mensagens no Facebook" },
  { value: "WEBSITE", label: "Site", description: "Enviar pessoas para uma página" },
];

const MIN_DAILY_BUDGET = 5;
const MAX_CREATIVE_SIZE = 50 * 1024 * 1024;

export default function CampaignSetupPage() {
  const [dailyBudget, setDailyBudget] = useState("");
  const [objective, setObjective] = useState("OUTCOME_LEADS");
  const [destination, setDestination] = useState("WHATSAPP");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [serviceRegion, setServiceRegion] = useState("");
  const [creativeFile, setCreativeFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [brandAnalysis, setBrandAnalysis] = useState<any>(null);

  useEffect(() => {
    fetch("/api/brand/manual-analysis", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.analysis) {
          setBrandAnalysis(data.analysis);
          if (!serviceRegion && data.analysis.regiao && !String(data.analysis.regiao).toLowerCase().includes("definir")) {
            setServiceRegion(String(data.analysis.regiao));
          }
        }
      })
      .catch(() => {});
  // carregamos uma vez para reaproveitar automaticamente o diagnóstico salvo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!creativeFile) { setError("Selecione a imagem ou vídeo que pretende usar no anúncio."); return; }
    if (creativeFile.size > MAX_CREATIVE_SIZE) { setError("O arquivo deve ter no máximo 50 MB."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/campaign/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyBudget: budgetNumber,
          objective,
          destination,
          destinationUrl,
          serviceRegion,
          creativeName: creativeFile.name,
          creativeType: creativeFile.type,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível montar o plano da campanha.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado ao montar a campanha.");
    } finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-950"><ArrowLeft className="h-4 w-4" /> Voltar ao dashboard</Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.72fr]">
          <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
            <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Modo manual assistido</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Montar campanha</h1>
            <p className="mt-2 text-neutral-500">Você informa o essencial. O AdAI monta estratégia, copy e configuração para você publicar no Gerenciador de Anúncios.</p>

            <div className="mt-8 space-y-7">
              {brandAnalysis ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">Análise da marca aplicada automaticamente</p>
                      <p className="mt-1 text-xs leading-5 text-emerald-800">{brandAnalysis.nome_marca || "Sua marca"} · {brandAnalysis.nicho || "segmento identificado"}. Público, oferta, tom e região salvos entram como contexto para montar este plano.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                  Você ainda não tem uma análise de marca salva. <Link href="/dashboard/analyze" className="font-semibold underline underline-offset-2">Analisar primeiro</Link> melhora o plano da campanha.
                </div>
              )}
              <Field label="Orçamento diário (R$)" hint="Esse valor entra no plano. O AdAI não publica nem inicia cobranças automaticamente.">
                <input type="number" min={MIN_DAILY_BUDGET} step="0.01" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} placeholder="Ex: 30" className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200" />
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

              <Field label="Cidade / região de anúncio" hint="Opcional. Se deixar vazio, o AdAI usa a região informada na análise da marca."><input value={serviceRegion} onChange={(e) => setServiceRegion(e.target.value)} placeholder="Ex: Rio de Janeiro, RJ" className="w-full rounded-xl border px-4 py-3 text-sm" /></Field>

              <Field label="Criativo do anúncio" hint="O arquivo fica no seu computador. O AdAI usa o nome/tipo para organizar o plano; nesta versão ele não envia nada para a Meta.">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center hover:bg-neutral-50">
                  <Upload className="h-6 w-6 text-neutral-400" /><p className="mt-3 text-sm font-medium">Selecionar imagem ou vídeo</p><p className="mt-1 text-xs text-neutral-500">JPG, PNG, WEBP, MP4 ou MOV · até 50 MB</p>
                  <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" className="hidden" onChange={(e) => { const file = e.target.files?.[0] ?? null; if (file && file.size > MAX_CREATIVE_SIZE) { setCreativeFile(null); setError("O arquivo deve ter no máximo 50 MB."); e.currentTarget.value = ""; return; } setError(null); setCreativeFile(file); }} />
                </label>
                {creativeFile && <div className="mt-3 flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="truncate">{creativeFile.name}</span></div>}
              </Field>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
              {result && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><p className="font-semibold">Plano da campanha pronto.</p><p className="mt-1 text-xs">Nenhum anúncio foi publicado e nenhum valor será gasto automaticamente.</p><Link href="/dashboard/campaign-plan" className="mt-3 inline-flex rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Abrir plano completo</Link></div>}

              <button onClick={handleStart} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Montando estratégia..." : "Montar minha campanha"}</button>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm font-semibold">Resumo</p><div className="mt-4 space-y-3 text-sm"><Summary icon={MessageCircle} label="Destino" value={DESTINATIONS.find((d) => d.value === destination)?.label ?? "—"} /><Summary icon={isVideo ? Video : ImagePlus} label="Criativo" value={creativeFile?.name ?? "Aguardando arquivo"} /><Summary icon={MonitorUp} label="Publicação" value="Manual, guiada pelo AdAI" /></div></div>
            {previewUrl && <div className="overflow-hidden rounded-2xl border bg-black shadow-sm">{isVideo ? <video src={previewUrl} controls className="max-h-[420px] w-full" /> : <img src={previewUrl} alt="Prévia do criativo" className="max-h-[420px] w-full object-contain" />}</div>}
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><strong>Sem aprovação da Meta:</strong> nesta fase o AdAI prepara tudo para você. O último passo — publicar — é feito no Gerenciador de Anúncios.</div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <div><label className="text-sm font-semibold">{label}</label><div className="mt-2">{children}</div>{hint && <p className="mt-2 text-xs leading-5 text-neutral-400">{hint}</p>}</div>; }
function Summary({ icon: Icon, label, value }: { icon: typeof MessageCircle; label: string; value: string }) { return <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100"><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="text-xs text-neutral-400">{label}</p><p className="truncate font-medium">{value}</p></div></div>; }
