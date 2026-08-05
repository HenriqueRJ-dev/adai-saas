"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Page = { id: string; name: string };
type AdAccount = {
  id: string;
  name: string;
  account_status: number;
  currency: string;
};

export default function MetaSetupPage() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [selectedAdAccount, setSelectedAdAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch("/api/meta/accounts");
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Erro ao carregar contas");
          return;
        }

        setPages(data.pages);
        setAdAccounts(data.adAccounts);

        if (data.pages.length === 1) setSelectedPage(data.pages[0].id);
        if (data.adAccounts.length === 1)
          setSelectedAdAccount(data.adAccounts[0].id);
      } catch {
        setError("Erro de conexão ao carregar contas");
      } finally {
        setLoading(false);
      }
    }

    loadAccounts();
  }, []);

  async function handleSave() {
    if (!selectedPage || !selectedAdAccount) return;

    setSaving(true);
    setError(null);

    const res = await fetch("/api/meta/accounts/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId: selectedPage,
        adAccountId: selectedAdAccount,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      setError("Erro ao salvar seleção");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
        <p className="text-neutral-500">Carregando suas Paginas e contas de anuncio...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
        <p className="text-sm text-red-600">Erro: {error}</p>
        <a href="/dashboard" className="text-sm underline">
          Voltar ao dashboard
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Configurar Meta</h1>
      <p className="text-sm text-neutral-500">
        Escolha qual Pagina e qual conta de anuncio o AdAI vai usar.
      </p>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Pagina do Facebook</label>
        {pages.length === 0 ? (
          <p className="text-sm text-red-600">
            Nenhuma Pagina encontrada. Verifique se voce administra alguma
            Pagina no Facebook.
          </p>
        ) : (
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Selecione uma Pagina</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Conta de anuncio</label>
        {adAccounts.length === 0 ? (
          <p className="text-sm text-red-600">
            Nenhuma conta de anuncio encontrada.
          </p>
        ) : (
          <select
            value={selectedAdAccount}
            onChange={(e) => setSelectedAdAccount(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Selecione uma conta de anuncio</option>
            {adAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={!selectedPage || !selectedAdAccount || saving}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar e continuar"}
      </button>
    </main>
  );
}
