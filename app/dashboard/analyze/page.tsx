"use client";

import { useState } from "react";

export default function AnalyzePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/instagram/analyze-brand", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(JSON.stringify(data, null, 2));
      } else {
        setResult(data);
      }
    } catch (e) {
      setError("Erro de conexao ao chamar a analise.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Analise de marca com IA</h1>

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 w-fit"
      >
        {loading ? "Analisando..." : "Analisar minha marca com IA"}
      </button>

      {result && (
        <pre className="rounded-md bg-neutral-100 p-4 text-xs overflow-auto whitespace-pre-wrap">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      {error && (
        <pre className="rounded-md bg-red-50 p-4 text-xs text-red-700 overflow-auto whitespace-pre-wrap">
          {error}
        </pre>
      )}

      <a href="/dashboard" className="text-sm underline">
        Voltar ao dashboard
      </a>
    </main>
  );
}
