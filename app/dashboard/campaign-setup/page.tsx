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
  const [instagramPostUrl, setInstagramPostUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  async function handleStart() {
    setError(null);
    setResult(null);
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

    if (!res.ok) {
      setSaving(false);
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao salvar a configuração.");
      return;
    }

    const deployRes = await fetch("/api/campaign/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instagramPostUrl }),
    });

    setSaving(false);

    if (!deployRes.ok) {
      const deployData = await deployRes.json().catch(() => ({}));
      setError(
        deployData.message ??
          "Estratégia gerada, mas houve um problema ao criar a campanha no Meta Ads."
      );
      return;
    }

    const deployData = await deployRes.json();
    setResult(deployData);
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
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="instagramPostUrl">
          Link da publicação do Instagram
        </label>
        <input
          id="instagramPostUrl"
          type="url"
          value={instagramPostUrl}
          onChange={(e) => setInstagramPostUrl(e.target.value)}
          placeholder="https://www.instagram.com/p/XXXXXXXXXXX/"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <p className="text-xs text-neutral-400">
          Cole o link da publicação que você quer usar como anúncio.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          <p className="font-medium">Campanha criada com sucesso!</p>
          <p className="mt-1 text-xs">
            Está em modo PAUSADO no Meta Ads. Revise no Business Suite antes
            de ativar.
          </p>
        </div>
      )}
      <button
        onClick={handleStart}
        disabled={saving}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Criando campanha..." : "Iniciar"}
      </button>
    </main>
  );
}
