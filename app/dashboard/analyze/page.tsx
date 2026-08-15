"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BrainCircuit, Loader2, Sparkles } from "lucide-react";

export default function AnalyzePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/instagram/analyze-brand", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data?.message ?? data?.error ?? "Não foi possível analisar a marca.");
      else setResult(data);
    } catch { setError("Erro de conexão ao chamar a análise."); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-950"><ArrowLeft className="h-4 w-4" /> Voltar ao dashboard</Link>
        <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white"><BrainCircuit className="h-6 w-6" /></div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Análise de marca com IA</h1>
          <p className="mt-2 max-w-2xl text-neutral-500">O AdAI analisa os dados disponíveis da sua presença conectada e transforma isso em direcionamento para suas campanhas.</p>
          <button onClick={handleAnalyze} disabled={loading} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? "Analisando..." : "Analisar minha marca"}</button>
          {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {result && <div className="mt-8 rounded-2xl border bg-neutral-50 p-5"><h2 className="font-semibold">Resultado da análise</h2><pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm leading-6 text-neutral-700">{JSON.stringify(result, null, 2)}</pre></div>}
        </section>
      </div>
    </main>
  );
}
