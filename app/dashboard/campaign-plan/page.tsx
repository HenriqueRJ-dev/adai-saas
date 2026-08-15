import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Instagram,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function CampaignPlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: config } = await supabase
    .from("campaign_configs")
    .select("daily_budget,objective,status,strategy")
    .eq("user_id", user.id)
    .maybeSingle();
  const s: any = config?.strategy;

  if (!s) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-4xl px-5 py-8">
          <Link href="/dashboard" className="text-sm text-neutral-500">← Voltar</Link>
          <div className="mt-8 rounded-3xl border bg-white p-8">
            <h1 className="text-2xl font-semibold">Nenhuma recomendação criada ainda</h1>
            <p className="mt-2 text-neutral-500">Envie alguns posts ou capas de Reels para o AdAI comparar.</p>
            <Link href="/dashboard/campaign-setup" className="mt-5 inline-flex rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Analisar criativos</Link>
          </div>
        </div>
      </main>
    );
  }

  const winner = s.recomendacao_principal ?? {};
  const ranking = Array.isArray(s.ranking_criativos) ? s.ranking_criativos : [];
  const score = typeof winner.nota === "number" ? winner.nota : null;

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-950">
          <ArrowLeft className="h-4 w-4" /> Voltar ao dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700"><Instagram className="h-3.5 w-3.5" /> Recomendação para Instagram</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Aqui é onde eu colocaria seu dinheiro</h1>
            <p className="mt-2 max-w-2xl text-neutral-500">O AdAI comparou o material enviado com sua marca e objetivo. Use isso como ponto de partida para um teste, não como garantia de resultado.</p>
          </div>
          <Link href="/dashboard/campaign-setup" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Comparar outros criativos</Link>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl bg-neutral-950 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm text-neutral-400"><Trophy className="h-4 w-4" /> Melhor opção para o primeiro teste</div>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">{String(winner.criativo || "Criativo recomendado")}</h2>
              <p className="mt-3 leading-7 text-neutral-300">{String(winner.motivo || "Use esta peça como primeira opção e acompanhe os dados reais antes de aumentar o investimento.")}</p>
              <div className="mt-5 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-neutral-100">{String(winner.veredito || "Recomendado para teste")}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Nota da peça</p>
              <p className="mt-2 text-5xl font-semibold">{score ?? "—"}</p>
              <p className="mt-1 text-xs text-neutral-500">{score !== null ? "/ 100" : "IA visual indisponível"}</p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.9fr]">
          <div className="space-y-6">
            <Card title="Ranking dos criativos" icon={BarChart3}>
              <div className="space-y-3">
                {ranking.length ? ranking.map((item: any, index: number) => (
                  <div key={`${item.nome}-${index}`} className={`rounded-2xl border p-4 ${index === 0 && item.nome === winner.criativo ? "border-emerald-200 bg-emerald-50" : "bg-neutral-50"}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div><p className="text-xs text-neutral-400">Opção {index + 1}</p><p className="mt-1 font-semibold">{String(item.nome || `Criativo ${index + 1}`)}</p></div>
                      <div className="text-right"><p className="text-2xl font-semibold">{typeof item.nota === "number" ? item.nota : "—"}</p><p className="text-[11px] text-neutral-400">{String(item.veredito || "Sem nota")}</p></div>
                    </div>
                    {item.motivo && <p className="mt-3 text-sm leading-6 text-neutral-600">{String(item.motivo)}</p>}
                    {Array.isArray(item.pontos_fortes) && item.pontos_fortes.length > 0 && <MiniList title="O que funciona" items={item.pontos_fortes} />}
                    {Array.isArray(item.pontos_a_melhorar) && item.pontos_a_melhorar.length > 0 && <MiniList title="O que eu melhoraria" items={item.pontos_a_melhorar} />}
                  </div>
                )) : <p className="text-sm text-neutral-500">Nenhum ranking disponível.</p>}
              </div>
            </Card>

            <Card title="Público inicial" icon={Target}>
              <Row label="Quem" value={String(s.publico?.descricao || "Público compatível com a análise da marca")} />
              <Row label="Região" value={String(s.publico?.localizacao || s.resumo?.regiao || "Sua região de atendimento")} />
              <Row label="Faixa" value={String(s.publico?.idade || "Comece amplo")} />
              <div className="rounded-xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">{String(s.publico?.recomendacao || "Comece com um público simples e evite muitas restrições no primeiro teste.")}</div>
            </Card>

            {Array.isArray(s.antes_de_impulsionar) && (
              <Card title="Antes de colocar dinheiro" icon={Sparkles}>
                <div className="space-y-3">{s.antes_de_impulsionar.map((item: string, index: number) => <CheckItem key={index}>{item}</CheckItem>)}</div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card title="Seu teste" icon={TrendingUp}>
              <Row label="Objetivo" value={String(s.configuracao_instagram?.objetivo || s.resumo?.objetivo || "—")} />
              <Row label="Orçamento por dia" value={String(s.configuracao_instagram?.orcamento_diario || "—")} />
              <Row label="Duração" value={String(s.configuracao_instagram?.duracao || "—")} />
              <Row label="Investimento total" value={String(s.configuracao_instagram?.investimento_total || "—")} />
              <Row label="Destino" value={String(s.configuracao_instagram?.destino || "Instagram")} />
            </Card>

            <Card title="Como colocar no ar" icon={Instagram}>
              <div className="space-y-3">
                {(s.passos_instagram ?? []).map((step: string, index: number) => (
                  <div key={index} className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white">{index + 1}</div>
                    <p className="text-sm leading-6 text-neutral-700">{step}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-xl bg-neutral-50 p-3 text-xs leading-5 text-neutral-500">Os nomes dos botões podem variar um pouco conforme a versão do Instagram e a conta.</p>
            </Card>

            {s.proximo_conteudo && (
              <Card title="Se você quiser criar uma peça melhor" icon={Sparkles}>
                <Row label="Gancho" value={String(s.proximo_conteudo.gancho || "—")} />
                <Row label="Legenda sugerida" value={String(s.proximo_conteudo.legenda || "—")} />
                <Row label="CTA" value={String(s.proximo_conteudo.cta || "—")} />
              </Card>
            )}

            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-500">Depois do teste</p>
              <h2 className="mt-2 text-lg font-semibold text-blue-950">Não fique tentando adivinhar o que fazer.</h2>
              <p className="mt-2 text-sm leading-6 text-blue-900">Quando tiver resultados, envie um print do Insights. O AdAI vai ler os números e recomendar se você deve manter, aumentar, pausar ou trocar o criativo.</p>
              <Link href="/dashboard/optimize" className="mt-4 inline-flex rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white">Analisar meus resultados</Link>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof BarChart3; children: React.ReactNode }) {
  return <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-neutral-400" /><h2 className="font-semibold">{title}</h2></div><div className="mt-4 space-y-4">{children}</div></section>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-1 text-sm leading-6 text-neutral-700">{value}</p></div>;
}

function MiniList({ title, items }: { title: string; items: unknown[] }) {
  return <div className="mt-3"><p className="text-xs font-semibold text-neutral-500">{title}</p><div className="mt-2 space-y-1.5">{items.map((item, index) => <p key={index} className="flex gap-2 text-xs leading-5 text-neutral-600"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />{String(item)}</p>)}</div></div>;
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><p className="text-sm leading-6 text-neutral-700">{children}</p></div>;
}
