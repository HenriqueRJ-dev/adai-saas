import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CircleCheck,
  CircleDashed,
  Instagram,
  LineChart,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import LogoutButton from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: brandAnalysis }, { data: campaignConfig }] = await Promise.all([
    supabase.from("ai_brand_analysis").select("analysis").eq("user_id", user.id).maybeSingle(),
    supabase.from("campaign_configs").select("daily_budget,objective,status,strategy").eq("user_id", user.id).maybeSingle(),
  ]);

  const hasAnalysis = Boolean(brandAnalysis?.analysis);
  const hasPlan = Boolean(campaignConfig?.strategy);
  const strategy: any = campaignConfig?.strategy;
  const hasPerformance = Boolean(strategy?.performance_analysis);
  const winner = strategy?.recomendacao_principal;
  const name = String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Cliente");

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold tracking-tight">AdAI</Link>
            <nav className="hidden gap-5 text-sm text-neutral-500 md:flex">
              <Link href="/dashboard" className="font-medium text-neutral-950">Visão geral</Link>
              <Link href="/dashboard/analyze" className="hover:text-neutral-950">Minha marca</Link>
              <Link href="/dashboard/campaign-setup" className="hover:text-neutral-950">Recomendar campanha</Link>
              <Link href="/dashboard/optimize" className="hover:text-neutral-950">Resultados</Link>
            </nav>
          </div>
          <LogoutButton />
        </header>

        <section className="py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700"><Instagram className="h-3.5 w-3.5" /> Copiloto de performance para Instagram</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">Olá, {name}</h1>
              <p className="mt-2 max-w-2xl text-neutral-500">O AdAI ajuda você a decidir o que vale impulsionar, como começar o teste e o que fazer depois que os resultados aparecerem.</p>
            </div>
            <Link href="/dashboard/campaign-setup" className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white"><Sparkles className="h-4 w-4" /> Descobrir o que impulsionar</Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatusCard title="Análise da marca" value={hasAnalysis ? "Pronta" : "Pendente"} ready={hasAnalysis} icon={BrainCircuit} />
            <StatusCard title="Recomendação" value={hasPlan ? "Pronta" : "Ainda não criada"} ready={hasPlan} icon={Target} />
            <StatusCard title="Melhor criativo" value={winner?.criativo ? String(winner.criativo) : "—"} subtitle={typeof winner?.nota === "number" ? `Nota ${winner.nota}/100` : undefined} ready={Boolean(winner?.criativo)} icon={Trophy} />
            <StatusCard title="Última decisão" value={hasPerformance ? String(strategy.performance_analysis.acao || "Analisada") : "Sem resultados"} ready={hasPerformance} icon={LineChart} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Seu ciclo no AdAI</h2>
              <p className="mt-1 text-sm text-neutral-500">Não é só “turbinar”. O AdAI acompanha a decisão antes e depois do investimento.</p>
              <div className="mt-5 divide-y">
                <Step done={hasAnalysis} title="1. Analisar a marca" description="Mostre seu Instagram, site ou prints. O AdAI entende oferta, público e posicionamento." href="/dashboard/analyze" action={hasAnalysis ? "Atualizar" : "Analisar"} />
                <Step done={hasPlan} title="2. Escolher onde vale investir" description="Envie até 3 posts ou capas de Reels. O AdAI compara e aponta o melhor primeiro teste." href="/dashboard/campaign-setup" action={hasPlan ? "Comparar de novo" : "Comparar"} />
                <Step done={hasPlan} title="3. Impulsionar com um plano simples" description="Objetivo, público, orçamento, duração e o criativo recomendado ficam organizados em uma única tela." href={hasPlan ? "/dashboard/campaign-plan" : "/dashboard/campaign-setup"} action={hasPlan ? "Abrir plano" : "Aguardando"} />
                <Step done={hasPerformance} title="4. Voltar com os resultados" description="Envie um print dos Insights e receba uma decisão: manter, aumentar, pausar ou trocar o criativo." href="/dashboard/optimize" action={hasPerformance ? "Ver decisão" : "Analisar resultados"} />
              </div>
            </section>

            <div className="space-y-6">
              <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Recomendação atual</h2>
                {hasPlan ? (
                  <div className="mt-5">
                    <div className="rounded-2xl bg-neutral-950 p-5 text-white">
                      <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Eu começaria por</p>
                      <p className="mt-2 text-lg font-semibold">{String(winner?.criativo || "Criativo recomendado")}</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">{String(winner?.veredito || "Plano pronto para teste")}</p>
                      {typeof winner?.nota === "number" && <p className="mt-4 text-3xl font-semibold">{winner.nota}<span className="text-sm font-normal text-neutral-500">/100</span></p>}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Metric label="Por dia" value={strategy?.configuracao_instagram?.orcamento_diario || "—"} />
                      <Metric label="Duração" value={strategy?.configuracao_instagram?.duracao || "—"} />
                    </div>
                    <Link href="/dashboard/campaign-plan" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">Ver recomendação completa <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed p-6 text-center"><BarChart3 className="mx-auto h-6 w-6 text-neutral-300" /><p className="mt-3 text-sm font-medium">Ainda sem recomendação</p><p className="mt-1 text-xs text-neutral-500">Envie seus criativos e deixe o AdAI comparar.</p></div>
                )}
              </section>

              <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-500">Acompanhamento</p>
                <h2 className="mt-2 font-semibold text-blue-950">Já impulsionou?</h2>
                <p className="mt-2 text-sm leading-6 text-blue-900">Não tente interpretar os Insights sozinho. Envie o print e receba uma próxima ação simples.</p>
                <Link href="/dashboard/optimize" className="mt-4 inline-flex rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white">Analisar resultados</Link>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusCard({ title, value, subtitle, ready, icon: Icon }: { title: string; value: string; subtitle?: string; ready: boolean; icon: typeof BrainCircuit }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-neutral-500">{title}</p><Icon className="h-4 w-4 text-neutral-400" /></div><p className="mt-4 truncate text-xl font-semibold">{value}</p>{subtitle && <p className="mt-1 text-xs text-neutral-400">{subtitle}</p>}<div className={`mt-4 inline-flex items-center gap-1.5 text-xs ${ready ? "text-emerald-700" : "text-neutral-500"}`}>{ready ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}{ready ? "Pronto" : "A configurar"}</div></div>;
}

function Step({ done, title, description, href, action }: { done: boolean; title: string; description: string; href: string; action: string }) {
  return <div className="flex items-center gap-4 py-4"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-400"}`}>{done ? <CircleCheck className="h-5 w-5" /> : <CircleDashed className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><p className="font-medium">{title}</p><p className="mt-1 text-sm text-neutral-500">{description}</p></div><Link href={href} className="hidden items-center gap-1 text-sm font-medium sm:inline-flex">{action}<ArrowRight className="h-3.5 w-3.5" /></Link></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}
