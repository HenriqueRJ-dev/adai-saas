"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ImagePlus,
  Loader2,
  PauseCircle,
  Sparkles,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";

type PreparedImage = { name: string; mimeType: string; data: string; preview: string };

const MAX_IMAGES = 3;
const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024;
const MAX_COMPRESSED_BASE64 = 520_000;

const MESSAGES = [
  "Lendo os números visíveis nos Insights...",
  "Comparando gasto com o resultado principal...",
  "Procurando sinais de continuidade ou desperdício...",
  "Avaliando se o criativo merece mais tempo...",
  "Preparando a próxima ação recomendada...",
];

export default function OptimizeClient({ hasPlan, existingAnalysis }: { hasPlan: boolean; existingAnalysis: any }) {
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [notes, setNotes] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(existingAnalysis);
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    if (!loading) return;
    setMessageIndex(0);
    setProgress(15);
    const m = window.setInterval(() => setMessageIndex((current) => Math.min(current + 1, MESSAGES.length - 1)), 1450);
    const p = window.setInterval(() => setProgress((current) => current >= 92 ? current : current + (current < 60 ? 6 : 3)), 480);
    return () => { window.clearInterval(m); window.clearInterval(p); };
  }, [loading]);

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    const available = MAX_IMAGES - images.length;
    if (available <= 0) { setError(`Envie no máximo ${MAX_IMAGES} prints.`); return; }
    const selected = Array.from(files).slice(0, available);
    for (const file of selected) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Envie prints em JPG, PNG ou WEBP."); return; }
      if (file.size > MAX_ORIGINAL_SIZE) { setError("Cada print deve ter no máximo 10 MB."); return; }
    }
    setPreparing(true); setError(null);
    try {
      const prepared = await Promise.all(selected.map(compressImage));
      setImages((current) => [...current, ...prepared].slice(0, MAX_IMAGES));
    } catch {
      setError("Não foi possível preparar um dos prints.");
    } finally { setPreparing(false); }
  }

  async function handleAnalyze() {
    if (!hasPlan) { setError("Monte primeiro uma recomendação de campanha."); return; }
    if (!images.length) { setError("Envie pelo menos um print dos resultados."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/campaign/analyze-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, images: images.map(({ name, mimeType, data }) => ({ name, mimeType, data })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível analisar os resultados.");
      setProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      setAnalysis(data.analysis);
      setImages([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao analisar resultados.");
    } finally { setLoading(false); }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-5"><section className="w-full max-w-xl rounded-3xl border bg-white p-8 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-950 text-white"><BarChart3 className="h-6 w-6 animate-pulse" /></div><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Analisando performance</p><h1 className="mt-2 text-2xl font-semibold">Decidindo o próximo passo</h1><p className="mt-3 text-sm leading-6 text-neutral-500">{MESSAGES[messageIndex]}</p><div className="mt-7 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-950 transition-all duration-500" style={{ width: `${progress}%` }} /></div></section></main>;
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-500"><ArrowLeft className="h-4 w-4" /> Voltar ao dashboard</Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"><TrendingUp className="h-3.5 w-3.5" /> Acompanhar e otimizar</div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Mande o print. O AdAI diz o que fazer.</h1>
            <p className="mt-2 text-neutral-500">Abra os resultados da promoção no Instagram, tire um print e envie aqui. O AdAI lê apenas o que estiver visível e transforma isso em uma próxima ação simples.</p>

            {!hasPlan && <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">Você ainda não tem um plano salvo. <Link href="/dashboard/campaign-setup" className="font-semibold underline">Criar recomendação primeiro</Link>.</div>}

            <div className="mt-7 space-y-6">
              <div>
                <label className="text-sm font-semibold">Print dos resultados</label>
                <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center hover:bg-neutral-50">
                  {preparing ? <Loader2 className="h-6 w-6 animate-spin text-neutral-400" /> : <Upload className="h-6 w-6 text-neutral-400" />}
                  <p className="mt-3 text-sm font-medium">Enviar print do Insights</p>
                  <p className="mt-1 text-xs text-neutral-500">Mostre gasto, alcance e o resultado principal quando possível</p>
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" disabled={preparing} onChange={(e) => { void addImages(e.target.files); e.currentTarget.value = ""; }} />
                </label>
                {images.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{images.map((image, index) => <div key={`${image.name}-${index}`} className="relative overflow-hidden rounded-xl border"><img src={image.preview} alt={`Print ${index + 1}`} className="aspect-[4/5] w-full object-cover" /><button onClick={() => setImages((current) => current.filter((_, i) => i !== index))} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white"><X className="h-3.5 w-3.5" /></button></div>)}</div>}
              </div>

              <div><label className="text-sm font-semibold">Quer contar algo? <span className="font-normal text-neutral-400">Opcional</span></label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Ex: comecei há 3 dias e quero saber se aumento o orçamento" className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200" /></div>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
              <button onClick={handleAnalyze} disabled={!hasPlan || preparing || !images.length} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-40"><Sparkles className="h-4 w-4" /> Analisar resultados</button>
            </div>
          </section>

          <section className="space-y-5">
            {analysis ? <PerformanceResult analysis={analysis} /> : <div className="rounded-3xl border bg-white p-8 text-center shadow-sm"><ImagePlus className="mx-auto h-8 w-8 text-neutral-300" /><h2 className="mt-4 text-lg font-semibold">A recomendação aparece aqui</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">O AdAI não precisa de acesso à sua conta. Um print legível dos resultados já é suficiente para fazer a leitura.</p></div>}
          </section>
        </div>
      </div>
    </main>
  );
}

function PerformanceResult({ analysis }: { analysis: any }) {
  const action = String(analysis?.acao || "AGUARDAR MAIS DADOS");
  const actionStyle: Record<string, string> = {
    MANTER: "border-emerald-200 bg-emerald-50 text-emerald-950",
    AUMENTAR: "border-blue-200 bg-blue-50 text-blue-950",
    PAUSAR: "border-red-200 bg-red-50 text-red-950",
    "TROCAR CRIATIVO": "border-amber-200 bg-amber-50 text-amber-950",
    "AGUARDAR MAIS DADOS": "border-neutral-200 bg-neutral-100 text-neutral-900",
  };
  return <>
    <div className={`rounded-3xl border p-6 shadow-sm sm:p-8 ${actionStyle[action] ?? actionStyle["AGUARDAR MAIS DADOS"]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-60">Próxima ação</p>
      <h2 className="mt-2 text-3xl font-semibold">{action}</h2>
      <p className="mt-3 text-lg font-medium">{String(analysis?.titulo || "Recomendação do AdAI")}</p>
      <p className="mt-3 text-sm leading-7 opacity-80">{String(analysis?.diagnostico || "")}</p>
      {analysis?.confianca && <p className="mt-4 text-xs font-medium opacity-60">Confiança da leitura: {String(analysis.confianca)}</p>}
    </div>

    {Array.isArray(analysis?.metricas) && analysis.metricas.length > 0 && <div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-semibold">Números que eu consegui ler</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{analysis.metricas.map((metric: any, index: number) => <div key={index} className="rounded-xl bg-neutral-50 p-4"><p className="text-xs text-neutral-400">{String(metric.nome)}</p><p className="mt-1 text-xl font-semibold">{String(metric.valor)}</p>{metric.leitura && <p className="mt-2 text-xs leading-5 text-neutral-500">{String(metric.leitura)}</p>}</div>)}</div></div>}

    <div className="grid gap-4 sm:grid-cols-2">
      <ResultList title="Sinais positivos" items={analysis?.sinais_positivos} icon="positive" />
      <ResultList title="Pontos de atenção" items={analysis?.sinais_de_atencao} icon="warning" />
    </div>

    {Array.isArray(analysis?.proximos_passos) && <div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-semibold">O que fazer agora</h3><div className="mt-4 space-y-3">{analysis.proximos_passos.map((item: string, index: number) => <div key={index} className="flex gap-3"><div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white">{index + 1}</div><p className="text-sm leading-6 text-neutral-700">{item}</p></div>)}</div></div>}
  </>;
}

function ResultList({ title, items, icon }: { title: string; items: unknown; icon: "positive" | "warning" }) {
  const list = Array.isArray(items) ? items : [];
  const Icon = icon === "positive" ? CheckCircle2 : AlertTriangle;
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-semibold">{title}</h3>{list.length ? <div className="mt-4 space-y-3">{list.map((item, index) => <p key={index} className="flex gap-2 text-sm leading-6 text-neutral-700"><Icon className={`mt-1 h-4 w-4 shrink-0 ${icon === "positive" ? "text-emerald-600" : "text-amber-600"}`} />{String(item)}</p>)}</div> : <p className="mt-3 text-sm text-neutral-400">Nenhum item identificado.</p>}</div>;
}

async function compressImage(file: File): Promise<PreparedImage> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const render = (maxDimension: number, quality: number) => {
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("canvas_unavailable");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height); ctx.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", quality);
    };
    let dataUrl = render(1450, 0.78); let base64 = dataUrl.split(",")[1] ?? "";
    if (base64.length > MAX_COMPRESSED_BASE64) { dataUrl = render(1150, 0.68); base64 = dataUrl.split(",")[1] ?? ""; }
    if (base64.length > MAX_COMPRESSED_BASE64) { dataUrl = render(900, 0.6); base64 = dataUrl.split(",")[1] ?? ""; }
    if (!base64 || base64.length > 620_000) throw new Error("image_too_large_after_compression");
    return { name: file.name, mimeType: "image/jpeg", data: base64, preview: dataUrl };
  } finally { URL.revokeObjectURL(url); }
}

function loadImage(src: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; }); }
