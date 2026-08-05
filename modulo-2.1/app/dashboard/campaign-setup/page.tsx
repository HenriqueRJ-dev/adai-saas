"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OBJECTIVES = [
  { value: "OUTCOME_SALES", label: "Vender no meu site ou app" },
  { value: "OUTCOME_LEADS", label: "Gerar contatos (leads)" },
  { value: "OUTCOME_TRAFFIC", label: "Levar pessoas até meu site" },
  { value: "OUTCOME_AWARENESS", label: "Aumentar reconhecimento da marca" },
  { value: "OUTCOME_ENGAGEMENT", label: "Aumentar engajamento (curtidas, comentários)" },
  { value: "OUTCOME_APP_PROMOTION", label: "Promover instalação do meu app" },
];

const MIN_DAILY_BUDGET = 20;

export default function CampaignSetupPage() {
  const router = useRouter();
  const [dailyBudget, setDailyBudget] = useState("");
  const [objective, setObjective] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setError(null);

    const budgetNumber = Number(dailyBudget);

    if (!dailyBudget || Number.isNaN(budgetNumber) || budgetNumber <= 0) {
      setError("Informe um orçamento diário válido.");
      return;
    }

    if (budgetNumber < MIN_DAILY_BUDGET) {
      setError(
        `O orçamento diário mínimo recomendado é R$ ${MIN_DAILY_BUDGET},00. Valores menores costumam ser rejeitados pela Meta ou não geram resultado suficiente para a IA otimizar.`
      );
      return;
    }

    if (!objective) {
      setError("Selecione um objetivo para a campanha.");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/campaign/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dailyBudget: budgetNumber,
        objective,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao salvar a configuração.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurar campanha</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Você só precisa preencher isto. A partir daqui, a IA cuida do
          resto.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="dailyBudget">
          Orçamento diário (R$)
        </label>
        <input
          id="dailyBudget"
          type="number"
          min={1}
          step="0.01"
          value={dailyBudget}
          onChange={(e) => setDailyBudget(e.target.value)}
          placeholder="Ex: 50"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <p className="text-xs text-neutral-400">
          Este é o valor máximo que será gasto por dia, somando todos os
          anúncios da campanha.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="objective">
          Objetivo da campanha
        </label>
        <select
          id="objective"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Selecione um objetivo</option>
          {OBJECTIVES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleStart}
        disabled={saving}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Iniciar"}
      </button>
    </main>
  );
}
