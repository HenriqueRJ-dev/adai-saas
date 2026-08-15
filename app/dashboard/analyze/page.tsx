"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BrainCircuit, CheckCircle2, Loader2, Sparkles } from "lucide-react";

const ANALYSIS_MESSAGES = [
  "Organizando as informações da sua marca...",
  "Identificando o perfil de público mais compatível...",
  "Avaliando os melhores ângulos de comunicação...",
  "Cruzando sua oferta com a região informada...",
  "Estruturando sugestões de segmentação...",
  "Refinando proposta de valor e tom de voz...",
  "Preparando recomendações para suas campanhas...",
  "Finalizando sua análise estratégica...",
];

export default function AnalyzePage() {
  const [form, setForm] = useState({ brandName: "", niche: "", offer: "", audience: "", region: "", tone: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    if (!loading) return;

    setMessageIndex(0);
    setProgress(8);

    const messageTimer = window.setInterval(() => {
      setMessageIndex((current) => Math.min(current + 1, ANALYSIS_MESSAGES.length - 1));
    }, 1700);

    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current;
        if (current < 42) return Math.min(92, current + 7);
        if (current < 72) return Math.min(92, current + 4);
        return Math.min(92, current + 2);
      });
    }, 520);

    return () => {
      window.clearInterval(messageTimer);
      window.clearInterval(progressTimer);
    };
  }, [loading]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/brand/manual-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível analisar a marca.");

      setProgress(100);
      setMessageIndex(ANALYSIS_MESSAGES.length - 1);
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao analisar a marca.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-950"><ArrowLeft className="h-4 w-4" /> Voltar ao dashboard</Link>
        <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white"><BrainCircuit className="h-6 w-6" /></div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Análise de marca com IA</h1>
          <p className="mt-2 max-w-2xl text-neutral-500">Sem depender da Meta. Conte o básico sobre o negócio e o AdAI transforma isso em direcionamento para suas campanhas.</p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Field label="Nome da marca *"><input disabled={loading} value={form.brandName} onChange={(e) => update("brandName", e.target.value)} placeholder="Ex: BrasileHair" className="w-full rounded-xl border px-4 py-3 text-sm disabled:bg-neutral-50 disabled:text-neutral-500" /></Field>
            <Field label="Segmento / nicho *"><input disabled={loading} value={form.niche} onChange={(e) => update("niche", e.target.value)} placeholder="Ex: megahair para profissionais" className="w-full rounded-xl border px-4 py-3 text-sm disabled:bg-neutral-50 disabled:text-neutral-500" /></Field>
            <div className="sm:col-span-2"><Field label="Principal produto, serviço ou oferta *"><textarea disabled={loading} value={form.offer} onChange={(e) => update("offer", e.target.value)} placeholder="Ex: kit profissional com treinamento online incluso" rows={3} className="w-full rounded-xl border px-4 py-3 text-sm disabled:bg-neutral-50 disabled:text-neutral-500" /></Field></div>
            <Field label="Público que você quer atingir" hint="Opcional"><input disabled={loading} value={form.audience} onChange={(e) => update("audience", e.target.value)} placeholder="Ex: cabeleireiras de 25 a 55 anos" className="w-full rounded-xl border px-4 py-3 text-sm disabled:bg-neutral-50 disabled:text-neutral-500" /></Field>
            <Field label="Cidade / região de atuação" hint="Opcional"><input disabled={loading} value={form.region} onChange={(e) => update("region", e.target.value)} placeholder="Ex: Rio de Janeiro ou Brasil" className="w-full rounded-xl border px-4 py-3 text-sm disabled:bg-neutral-50 disabled:text-neutral-500" /></Field>
            <div className="sm:col-span-2"><Field label="Tom da comunicação" hint="Opcional"><input disabled={loading} value={form.tone} onChange={(e) => update("tone", e.target.value)} placeholder="Ex: profissional, simples e direto" className="w-full rounded-xl border px-4 py-3 text-sm disabled:bg-neutral-50 disabled:text-neutral-500" /></Field></div>
          </div>

          <button onClick={handleAnalyze} disabled={loading} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? "Analisando..." : "Criar análise da marca"}</button>
          {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {result?.analysis && <div className="mt-8 rounded-2xl border bg-neutral-50 p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Análise pronta</h2>{result.fallback && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-800">Modo automático de reserva</span>}</div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Info label="Nicho" value={result.analysis.nicho} /><Info label="Público" value={result.analysis.publico_alvo} /><Info label="Região" value={result.analysis.regiao} /><Info label="Tom" value={result.analysis.tom_de_voz} /><div className="sm:col-span-2"><Info label="Proposta de valor" value={result.analysis.proposta_de_valor} /></div></div><Link href="/dashboard/campaign-setup" className="mt-6 inline-flex rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Montar campanha agora</Link></div>}
        </section>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 px-5 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
            <div className="p-7 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white">
                  <BrainCircuit className="h-6 w-6 animate-pulse" />
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  IA analisando
                </div>
              </div>

              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-950">Analisando sua marca</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-neutral-500">{ANALYSIS_MESSAGES[messageIndex]}</p>

              <div className="mt-6 h-2 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-neutral-950 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
              </div>

              <div className="mt-6 space-y-3">
                {ANALYSIS_MESSAGES.slice(0, 4).map((message, index) => {
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

              <p className="mt-6 text-center text-xs text-neutral-400">Isso pode levar alguns segundos.</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <div><div className="flex items-center gap-2"><label className="text-sm font-semibold">{label}</label>{hint && <span className="text-xs text-neutral-400">{hint}</span>}</div><div className="mt-2">{children}</div></div>; }
function Info({ label, value }: { label: string; value?: string }) { return <div><p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-1 text-sm leading-6 text-neutral-700">{value || "—"}</p></div>; }
