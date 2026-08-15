"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ImagePlus,
  Instagram,
  Loader2,
  MapPin,
  Sparkles,
  Target,
  Upload,
  X,
} from "lucide-react";

type Goal = "INSTAGRAM_MESSAGES" | "INSTAGRAM_PROFILE" | "WEBSITE_VISITS";
type PreparedCreative = { name: string; mimeType: string; data: string; preview: string };

const GOALS: Array<{ value: Goal; label: string; description: string }> = [
  { value: "INSTAGRAM_MESSAGES", label: "Receber mais mensagens", description: "Para transformar interesse em conversa no Direct." },
  { value: "INSTAGRAM_PROFILE", label: "Levar pessoas ao perfil", description: "Para ganhar visitas e apresentar melhor sua marca." },
  { value: "WEBSITE_VISITS", label: "Levar pessoas para um site", description: "Para mandar o público para uma página externa." },
];

const ANALYSIS_MESSAGES = [
  "Lendo os criativos enviados...",
  "Comparando clareza da oferta e força visual...",
  "Avaliando qual peça combina melhor com seu objetivo...",
  "Identificando o criativo com melhor potencial para teste...",
  "Montando público, orçamento e duração inicial...",
  "Preparando sua recomendação de impulsionamento...",
];

const MAX_CREATIVES = 3;
const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024;
const MAX_COMPRESSED_BASE64 = 520_000;
const MIN_DAILY_BUDGET = 5;

export default function CampaignSetupPage() {
  const [dailyBudget, setDailyBudget] = useState("20");
  const [durationDays, setDurationDays] = useState("5");
  const [goal, setGoal] = useState<Goal>("INSTAGRAM_MESSAGES");
  const [serviceRegion, setServiceRegion] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [creatives, setCreatives] = useState<PreparedCreative[]>([]);
  const [brandAnalysis, setBrandAnalysis] = useState<any>(null);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    fetch("/api/brand/manual-analysis", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.analysis) return;
        setBrandAnalysis(data.analysis);
        const region = String(data.analysis.regiao ?? "");
        if (region && !region.toLowerCase().includes("definir")) setServiceRegion(region);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!saving) return;
    setMessageIndex(0);
    setProgress(12);
    const messageTimer = window.setInterval(() => {
      setMessageIndex((current) => Math.min(current + 1, ANALYSIS_MESSAGES.length - 1));
    }, 1500);
    const progressTimer = window.setInterval(() => {
      setProgress((current) => (current >= 92 ? current : current < 60 ? current + 6 : current + 3));
    }, 480);
    return () => {
      window.clearInterval(messageTimer);
      window.clearInterval(progressTimer);
    };
  }, [saving]);

  async function addCreatives(files: FileList | null) {
    if (!files?.length) return;
    const available = MAX_CREATIVES - creatives.length;
    if (available <= 0) {
      setError(`Envie no máximo ${MAX_CREATIVES} criativos para comparar.`);
      return;
    }

    const selected = Array.from(files).slice(0, available);
    for (const file of selected) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Nesta análise, envie JPG, PNG ou WEBP. Para Reel, envie a capa ou um frame representativo.");
        return;
      }
      if (file.size > MAX_ORIGINAL_SIZE) {
        setError("Cada imagem deve ter no máximo 10 MB antes da otimização.");
        return;
      }
    }

    setPreparing(true);
    setError(null);
    try {
      const prepared = await Promise.all(selected.map(compressImage));
      setCreatives((current) => [...current, ...prepared].slice(0, MAX_CREATIVES));
    } catch {
      setError("Não foi possível preparar uma das imagens. Tente outro arquivo.");
    } finally {
      setPreparing(false);
    }
  }

  function removeCreative(index: number) {
    setCreatives((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleAnalyze() {
    setError(null);
    const budget = Number(dailyBudget);
    const days = Number(durationDays);

    if (!Number.isFinite(budget) || budget < MIN_DAILY_BUDGET) {
      setError(`Use pelo menos R$ ${MIN_DAILY_BUDGET},00 por dia para montar o teste.`);
      return;
    }
    if (!Number.isInteger(days) || days < 1 || days > 30) {
      setError("Escolha uma duração entre 1 e 30 dias.");
      return;
    }
    if (goal === "WEBSITE_VISITS" && !/^https?:\/\//i.test(websiteUrl.trim())) {
      setError("Informe a URL completa do site, começando com https://.");
      return;
    }
    if (creatives.length === 0) {
      setError("Envie pelo menos 1 print, capa ou imagem de um post que você pensa em impulsionar.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/campaign/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyBudget: budget,
          durationDays: days,
          objective: goal,
          serviceRegion: serviceRegion.trim(),
          websiteUrl: websiteUrl.trim(),
          creativeImages: creatives.map(({ name, mimeType, data }) => ({ name, mimeType, data })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível analisar os criativos.");
      setProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      window.location.href = "/dashboard/campaign-plan";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado ao montar a recomendação.");
      setSaving(false);
    }
  }

  if (saving) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-5">
        <section className="w-full max-w-xl rounded-3xl border bg-white p-7 shadow-sm sm:p-9">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-950 text-white">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <p className="mt-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">AdAI analisando</p>
          <h1 className="mt-2 text-center text-2xl font-semibold">Escolhendo onde vale investir</h1>
          <p className="mt-3 text-center text-sm leading-6 text-neutral-500">{ANALYSIS_MESSAGES[messageIndex]}</p>
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-neutral-950 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-neutral-400">
            <span className={progress >= 25 ? "text-emerald-700" : ""}>Criativo</span>
            <span className={progress >= 55 ? "text-emerald-700" : ""}>Estratégia</span>
            <span className={progress >= 85 ? "text-emerald-700" : ""}>Recomendação</span>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-950">
          <ArrowLeft className="h-4 w-4" /> Voltar ao dashboard
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_.7fr]">
          <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700">
              <Instagram className="h-3.5 w-3.5" /> Performance para Instagram
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">O que vale a pena impulsionar?</h1>
            <p className="mt-2 max-w-2xl text-neutral-500">Envie até 3 posts ou capas de Reels. O AdAI compara as opções e monta um teste simples para você investir com mais critério.</p>

            <div className="mt-8 space-y-7">
              {brandAnalysis ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">Sua análise de marca já está sendo usada</p>
                      <p className="mt-1 text-xs leading-5 text-emerald-800">{brandAnalysis.nome_marca || "Sua marca"} · {brandAnalysis.nicho || "segmento identificado"}. O AdAI cruza esses dados com os criativos enviados.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">Faça primeiro a <Link href="/dashboard/analyze" className="font-semibold underline underline-offset-2">análise da marca</Link> para melhorar a recomendação.</div>
              )}

              <Field label="Qual resultado você quer?">
                <div className="grid gap-2 sm:grid-cols-3">
                  {GOALS.map((item) => (
                    <button key={item.value} type="button" onClick={() => setGoal(item.value)} className={`rounded-2xl border p-4 text-left transition ${goal === item.value ? "border-neutral-950 bg-neutral-950 text-white" : "bg-white hover:bg-neutral-50"}`}>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className={`mt-1 text-xs leading-5 ${goal === item.value ? "text-neutral-300" : "text-neutral-500"}`}>{item.description}</p>
                    </button>
                  ))}
                </div>
              </Field>

              {goal === "WEBSITE_VISITS" && (
                <Field label="Site para onde as pessoas devem ir">
                  <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://seusite.com.br" className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200" />
                </Field>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Quanto quer investir por dia?" hint="O AdAI usa esse valor apenas para montar o teste; ele não cobra nem publica automaticamente.">
                  <div className="relative"><span className="absolute left-4 top-3 text-sm text-neutral-400">R$</span><input type="number" min={MIN_DAILY_BUDGET} step="1" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} className="w-full rounded-xl border py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-neutral-200" /></div>
                </Field>
                <Field label="Por quantos dias?">
                  <select value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200">
                    {[3, 5, 7, 10, 14].map((days) => <option key={days} value={days}>{days} dias</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Região onde você atende" hint="Opcional. Se sua análise já identificou a região, ela aparece preenchida.">
                <div className="relative"><MapPin className="absolute left-4 top-3.5 h-4 w-4 text-neutral-400" /><input value={serviceRegion} onChange={(e) => setServiceRegion(e.target.value)} placeholder="Ex: Rio de Janeiro, RJ" className="w-full rounded-xl border py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-neutral-200" /></div>
              </Field>

              <Field label="Posts ou Reels para comparar" hint="Envie prints dos posts ou capas/frames dos Reels. Com 2 ou 3 opções, o AdAI consegue comparar qual parece mais forte para o objetivo escolhido.">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center hover:bg-neutral-50">
                  {preparing ? <Loader2 className="h-6 w-6 animate-spin text-neutral-400" /> : <Upload className="h-6 w-6 text-neutral-400" />}
                  <p className="mt-3 text-sm font-medium">Enviar prints ou capas</p>
                  <p className="mt-1 text-xs text-neutral-500">JPG, PNG ou WEBP · até {MAX_CREATIVES} opções</p>
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" disabled={preparing} onChange={(e) => { void addCreatives(e.target.files); e.currentTarget.value = ""; }} />
                </label>

                {creatives.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {creatives.map((creative, index) => (
                      <div key={`${creative.name}-${index}`} className="relative overflow-hidden rounded-2xl border bg-neutral-50">
                        <img src={creative.preview} alt={`Criativo ${index + 1}`} className="aspect-[4/5] w-full object-cover" />
                        <button type="button" onClick={() => removeCreative(index)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-white" aria-label="Remover criativo"><X className="h-4 w-4" /></button>
                        <div className="p-3"><p className="truncate text-xs font-medium">Opção {index + 1}</p><p className="mt-0.5 truncate text-[11px] text-neutral-400">{creative.name}</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </Field>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

              <button onClick={handleAnalyze} disabled={preparing || creatives.length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                <Sparkles className="h-4 w-4" /> Analisar e recomendar
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">O AdAI vai decidir</p>
              <div className="mt-4 space-y-4">
                <Mini icon={ImagePlus} title="Qual criativo testar" text="Compara as peças enviadas e aponta a mais promissora." />
                <Mini icon={Target} title="Para quem mostrar" text="Transforma sua análise de marca em uma sugestão simples de público." />
                <Mini icon={BarChart3} title="Quanto e por quanto tempo" text="Monta um teste inicial com orçamento e duração controlados." />
              </div>
            </div>
            <div className="rounded-2xl border border-pink-100 bg-pink-50 p-5 text-sm leading-6 text-pink-950">
              <strong>Sem promessas mágicas:</strong> a nota do criativo é uma avaliação da peça e do contexto enviado, não uma garantia de resultado. Depois do teste, mande o print dos resultados para o AdAI decidir o próximo passo.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div><label className="text-sm font-semibold">{label}</label><div className="mt-2">{children}</div>{hint && <p className="mt-2 text-xs leading-5 text-neutral-400">{hint}</p>}</div>;
}

function Mini({ icon: Icon, title, text }: { icon: typeof ImagePlus; title: string; text: string }) {
  return <div className="flex gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100"><Icon className="h-4 w-4" /></div><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-neutral-500">{text}</p></div></div>;
}

async function compressImage(file: File): Promise<PreparedCreative> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const render = (maxDimension: number, quality: number) => {
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas_unavailable");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", quality);
    };

    let dataUrl = render(1450, 0.78);
    let base64 = dataUrl.split(",")[1] ?? "";
    if (base64.length > MAX_COMPRESSED_BASE64) {
      dataUrl = render(1150, 0.68);
      base64 = dataUrl.split(",")[1] ?? "";
    }
    if (base64.length > MAX_COMPRESSED_BASE64) {
      dataUrl = render(900, 0.6);
      base64 = dataUrl.split(",")[1] ?? "";
    }
    if (!base64 || base64.length > 620_000) throw new Error("image_too_large_after_compression");
    return { name: file.name, mimeType: "image/jpeg", data: base64, preview: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
