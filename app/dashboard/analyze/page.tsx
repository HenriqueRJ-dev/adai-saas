"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  FileImage,
  Globe2,
  Images,
  Instagram,
  Loader2,
  PencilLine,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

type SourceType = "instagram" | "site" | "screenshots" | "manual";

type PreparedImage = {
  name: string;
  mimeType: string;
  data: string;
  preview: string;
};

const SOURCE_OPTIONS: Array<{
  value: SourceType;
  label: string;
  description: string;
  icon: typeof Instagram;
}> = [
  { value: "instagram", label: "Instagram", description: "Envie o @ + prints do perfil", icon: Instagram },
  { value: "site", label: "Site", description: "Cole a URL do seu negócio", icon: Globe2 },
  { value: "screenshots", label: "Prints", description: "Envie telas da sua marca", icon: Images },
  { value: "manual", label: "Manual", description: "Conte o básico você mesmo", icon: PencilLine },
];

const ANALYSIS_MESSAGES = [
  "Organizando o material enviado...",
  "Identificando sua principal oferta...",
  "Avaliando o posicionamento da marca...",
  "Identificando possíveis perfis de público...",
  "Analisando argumentos e benefícios percebidos...",
  "Estruturando oportunidades de campanha...",
  "Preparando ângulos de comunicação...",
  "Finalizando seu diagnóstico estratégico...",
];

const MAX_IMAGES = 4;
const MAX_ORIGINAL_SIZE = 8 * 1024 * 1024;
const MAX_COMPRESSED_BASE64 = 700_000;

export default function AnalyzePage() {
  const [sourceType, setSourceType] = useState<SourceType>("instagram");
  const [sourceValue, setSourceValue] = useState("");
  const [notes, setNotes] = useState("");
  const [manual, setManual] = useState({ brandName: "", niche: "", offer: "", audience: "", region: "" });
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [preparingImages, setPreparingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    fetch("/api/brand/manual-analysis", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.analysis) setResult({ analysis: data.analysis, existing: true }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) return;
    setMessageIndex(0);
    setProgress(8);

    const messageTimer = window.setInterval(() => {
      setMessageIndex((current) => Math.min(current + 1, ANALYSIS_MESSAGES.length - 1));
    }, 1650);
    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current;
        if (current < 42) return current + 7;
        if (current < 72) return current + 4;
        return current + 2;
      });
    }, 520);

    return () => {
      window.clearInterval(messageTimer);
      window.clearInterval(progressTimer);
    };
  }, [loading]);

  function updateManual(key: keyof typeof manual, value: string) {
    setManual((current) => ({ ...current, [key]: value }));
  }

  function selectSource(value: SourceType) {
    setSourceType(value);
    setError(null);
    if (value === "screenshots" || value === "manual") setSourceValue("");
  }

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    const available = MAX_IMAGES - images.length;
    if (available <= 0) {
      setError(`Você pode enviar no máximo ${MAX_IMAGES} prints.`);
      return;
    }

    const selected = Array.from(files).slice(0, available);
    for (const file of selected) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Use imagens JPG, PNG ou WEBP.");
        return;
      }
      if (file.size > MAX_ORIGINAL_SIZE) {
        setError("Cada print deve ter no máximo 8 MB antes da otimização.");
        return;
      }
    }

    setPreparingImages(true);
    setError(null);
    try {
      const prepared = await Promise.all(selected.map(compressImage));
      setImages((current) => [...current, ...prepared].slice(0, MAX_IMAGES));
    } catch {
      setError("Não foi possível preparar um dos prints. Tente outra imagem.");
    } finally {
      setPreparingImages(false);
    }
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleAnalyze() {
    setError(null);

    if (sourceType === "instagram" && !sourceValue.trim()) {
      setError("Informe o @ ou link do Instagram.");
      return;
    }
    if (sourceType === "instagram" && images.length === 0) {
      setError("Envie pelo menos 1 print do perfil/feed para a análise visual.");
      return;
    }
    if (sourceType === "site" && !/^https?:\/\//i.test(sourceValue.trim())) {
      setError("Informe a URL completa do site, começando com https://.");
      return;
    }
    if (sourceType === "screenshots" && images.length === 0) {
      setError("Envie pelo menos 1 print da sua marca.");
      return;
    }
    if (sourceType === "manual" && (!manual.brandName.trim() || !manual.niche.trim() || !manual.offer.trim())) {
      setError("No modo manual, informe nome da marca, segmento e oferta principal.");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/brand/manual-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          sourceValue: sourceValue.trim(),
          notes: notes.trim(),
          manual,
          images: images.map(({ name, mimeType, data }) => ({ name, mimeType, data })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível analisar a marca.");

      setProgress(100);
      setMessageIndex(ANALYSIS_MESSAGES.length - 1);
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao analisar a marca.");
    } finally {
      setLoading(false);
    }
  }

  const analysis = result?.analysis;

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-950">
          <ArrowLeft className="h-4 w-4" /> Voltar ao dashboard
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="border-b p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">Analise sua marca com IA</h1>
            <p className="mt-2 max-w-2xl text-neutral-500">
              Mostre sua presença digital para o AdAI. Nós transformamos o material da sua marca em posicionamento, público e oportunidades para campanhas.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <p className="text-sm font-semibold">Como você quer mostrar sua marca?</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SOURCE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = sourceType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectSource(option.value)}
                    disabled={loading}
                    className={`rounded-2xl border p-4 text-left transition ${active ? "border-neutral-950 bg-neutral-950 text-white" : "bg-white hover:border-neutral-300 hover:bg-neutral-50"}`}
                  >
                    <Icon className="h-5 w-5" />
                    <p className="mt-4 text-sm font-semibold">{option.label}</p>
                    <p className={`mt-1 text-xs leading-5 ${active ? "text-neutral-300" : "text-neutral-500"}`}>{option.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-7 space-y-6">
              {sourceType === "instagram" && (
                <Field label="Instagram da marca *" hint="Sem depender da API da Meta: o AdAI usa o @ como referência e analisa os prints que você enviar abaixo.">
                  <div className="relative">
                    <Instagram className="absolute left-4 top-3.5 h-4 w-4 text-neutral-400" />
                    <input disabled={loading} value={sourceValue} onChange={(e) => setSourceValue(e.target.value)} placeholder="@suaempresa ou https://instagram.com/suaempresa" className="w-full rounded-xl border py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-neutral-200 disabled:bg-neutral-50" />
                  </div>
                </Field>
              )}

              {sourceType === "site" && (
                <Field label="Site da marca *" hint="O AdAI tenta ler o conteúdo público da página. Você também pode adicionar prints para aprofundar a leitura visual.">
                  <div className="relative">
                    <Globe2 className="absolute left-4 top-3.5 h-4 w-4 text-neutral-400" />
                    <input disabled={loading} value={sourceValue} onChange={(e) => setSourceValue(e.target.value)} placeholder="https://seusite.com.br" className="w-full rounded-xl border py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-neutral-200 disabled:bg-neutral-50" />
                  </div>
                </Field>
              )}

              {sourceType === "manual" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome da marca *"><input disabled={loading} value={manual.brandName} onChange={(e) => updateManual("brandName", e.target.value)} placeholder="Ex: Minha empresa" className="w-full rounded-xl border px-4 py-3 text-sm" /></Field>
                  <Field label="Segmento *"><input disabled={loading} value={manual.niche} onChange={(e) => updateManual("niche", e.target.value)} placeholder="Ex: salão de beleza" className="w-full rounded-xl border px-4 py-3 text-sm" /></Field>
                  <div className="sm:col-span-2"><Field label="Principal oferta *"><textarea disabled={loading} value={manual.offer} onChange={(e) => updateManual("offer", e.target.value)} rows={3} placeholder="O que você vende ou qual serviço oferece?" className="w-full rounded-xl border px-4 py-3 text-sm" /></Field></div>
                  <Field label="Público" hint="Opcional"><input disabled={loading} value={manual.audience} onChange={(e) => updateManual("audience", e.target.value)} placeholder="Se já souber" className="w-full rounded-xl border px-4 py-3 text-sm" /></Field>
                  <Field label="Região" hint="Opcional"><input disabled={loading} value={manual.region} onChange={(e) => updateManual("region", e.target.value)} placeholder="Cidade, estado ou Brasil" className="w-full rounded-xl border px-4 py-3 text-sm" /></Field>
                </div>
              )}

              {sourceType !== "manual" && (
                <Field
                  label={sourceType === "site" ? "Prints da marca" : sourceType === "instagram" ? "Prints do perfil / feed *" : "Prints da sua marca *"}
                  hint={sourceType === "site" ? "Opcional. Bio, home, produtos, serviços ou telas importantes ajudam a enriquecer a análise." : "Envie de 1 a 4 imagens. O AdAI otimiza os arquivos antes da análise."}
                >
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition hover:bg-neutral-50">
                    {preparingImages ? <Loader2 className="h-6 w-6 animate-spin text-neutral-400" /> : <UploadCloud className="h-6 w-6 text-neutral-400" />}
                    <p className="mt-3 text-sm font-medium">{preparingImages ? "Preparando imagens..." : "Enviar prints"}</p>
                    <p className="mt-1 text-xs text-neutral-500">JPG, PNG ou WEBP · até {MAX_IMAGES} imagens</p>
                    <input disabled={loading || preparingImages || images.length >= MAX_IMAGES} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { void addImages(e.target.files); e.currentTarget.value = ""; }} />
                  </label>

                  {images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {images.map((image, index) => (
                        <div key={`${image.name}-${index}`} className="group relative overflow-hidden rounded-xl border bg-neutral-100">
                          <img src={image.preview} alt={`Print ${index + 1}`} className="aspect-[4/5] w-full object-cover" />
                          <button type="button" onClick={() => removeImage(index)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950/80 text-white shadow" aria-label="Remover imagem">
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-7">
                            <p className="truncate text-[10px] text-white">{image.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Field>
              )}

              <Field label="Contexto extra" hint="Opcional. Use só se houver algo importante que não apareça no material enviado.">
                <textarea disabled={loading} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} placeholder="Ex: atendemos apenas no Rio de Janeiro; nosso principal serviço é..." className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200 disabled:bg-neutral-50" />
              </Field>
            </div>

            {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <button onClick={handleAnalyze} disabled={loading || preparingImages} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Analisando..." : "Analisar minha marca"}
            </button>
          </div>
        </section>

        {analysis && (
          <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Diagnóstico salvo
                </div>
                <h2 className="mt-3 text-2xl font-semibold">{analysis.nome_marca || "Sua marca"}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">{analysis.resumo_executivo || analysis.proposta_de_valor}</p>
              </div>
              <Link href="/dashboard/campaign-setup" className="inline-flex rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Criar campanha com esta análise →</Link>
            </div>

            {result?.fallback && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                A análise avançada da IA não respondeu nesta tentativa. O AdAI salvou uma análise básica para não interromper o fluxo; você pode refazer depois para aprofundar os prints.
              </div>
            )}

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Insight label="Segmento" value={analysis.nicho} />
              <Insight label="Oferta principal" value={analysis.oferta_principal} />
              <Insight label="Público" value={analysis.publico_alvo} />
              <Insight label="Região" value={analysis.regiao} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <ListCard title="Dores do público" items={analysis.dores_principais} />
              <ListCard title="Diferenciais percebidos" items={analysis.diferenciais} />
              <ListCard title="Oportunidades de campanha" items={analysis.oportunidades} />
              <ListCard title="Ângulos para anúncios" items={analysis.angulos_anuncio} />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Insight label="Proposta de valor" value={analysis.proposta_de_valor} />
              <Insight label="Leitura visual / tom" value={`${analysis.identidade_visual || "—"}${analysis.tom_de_voz ? ` · Tom: ${analysis.tom_de_voz}` : ""}`} />
            </div>
          </section>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 px-5 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
            <div className="p-7 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white"><BrainCircuit className="h-6 w-6 animate-pulse" /></div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> IA analisando</div>
              </div>

              <h2 className="mt-6 text-2xl font-semibold tracking-tight">Lendo sua marca</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-neutral-500">{ANALYSIS_MESSAGES[messageIndex]}</p>

              <div className="mt-6 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-950 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} /></div>

              <div className="mt-6 space-y-3">
                {ANALYSIS_MESSAGES.slice(0, 5).map((message, index) => {
                  const done = index < messageIndex;
                  const active = index === messageIndex;
                  return (
                    <div key={message} className={`flex items-center gap-3 text-xs transition ${done || active ? "text-neutral-700" : "text-neutral-300"}`}>
                      {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : active ? <Loader2 className="h-4 w-4 animate-spin text-neutral-700" /> : <span className="h-4 w-4 rounded-full border border-neutral-200" />}
                      <span>{message}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-center text-xs text-neutral-400">O AdAI está processando somente o material que você enviou.</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div><div className="flex flex-wrap items-baseline gap-2"><label className="text-sm font-semibold">{label}</label>{hint && <span className="text-xs leading-5 text-neutral-400">{hint}</span>}</div><div className="mt-2">{children}</div></div>;
}

function Insight({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-2xl border bg-neutral-50 p-4"><p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-2 text-sm leading-6 text-neutral-700">{value || "—"}</p></div>;
}

function ListCard({ title, items }: { title: string; items?: unknown }) {
  const safeItems = Array.isArray(items) ? items.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
  return <div className="rounded-2xl border p-5"><div className="flex items-center gap-2"><FileImage className="h-4 w-4 text-neutral-400" /><h3 className="font-semibold">{title}</h3></div><div className="mt-4 space-y-3">{safeItems.length ? safeItems.map((item, index) => <div key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-neutral-700"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></div>) : <p className="text-sm text-neutral-400">Sem dados suficientes nesta análise.</p>}</div></div>;
}

async function compressImage(file: File): Promise<PreparedImage> {
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

    let dataUrl = render(1700, 0.82);
    let base64 = dataUrl.split(",")[1] ?? "";
    if (base64.length > MAX_COMPRESSED_BASE64) {
      dataUrl = render(1350, 0.74);
      base64 = dataUrl.split(",")[1] ?? "";
    }
    if (base64.length > MAX_COMPRESSED_BASE64) {
      dataUrl = render(1050, 0.66);
      base64 = dataUrl.split(",")[1] ?? "";
    }
    if (!base64 || base64.length > 760_000) throw new Error("image_too_large_after_compression");

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
