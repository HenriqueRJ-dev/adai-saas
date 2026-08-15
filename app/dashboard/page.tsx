import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, BarChart3, BrainCircuit, CircleCheck, CircleDashed, ClipboardList, Megaphone, Plus, ShieldCheck } from "lucide-react";
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
  const name = String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Cliente");

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold tracking-tight">AdAI</Link>
            <nav className="hidden gap-5 text-sm text-neutral-500 md:flex">
              <Link href="/dashboard" className="font-medium text-neutral-950">Visão geral</Link>
              <Link href="/dashboard/analyze" className="hover:text-neutral-950">Análise</Link>
              <Link href="/dashboard/campaign-setup" className="hover:text-neutral-950">Montar campanha</Link>
              {hasPlan && <Link href="/dashboard/campaign-plan" className="hover:text-neutral-950">Plano atual</Link>}
            </nav>
          </div>
          <LogoutButton />
        </header>

        <section className="py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm text-neutral-500">Painel do cliente</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Olá, {name}</h1><p className="mt-2 max-w-2xl text-neutral-500">O AdAI monta sua estratégia e mostra exatamente como publicar. Nenhuma aprovação da Meta é necessária para usar este modo.</p></div>
            <Link href="/dashboard/campaign-setup" className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Montar campanha</Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatusCard title="Modo atual" value="Manual assistido" subtitle="sem publicação automática" ready icon={ShieldCheck} />
            <StatusCard title="Análise da marca" value={hasAnalysis ? "Concluída" : "Pendente"} ready={hasAnalysis} icon={BrainCircuit} />
            <StatusCard title="Plano de campanha" value={hasPlan ? "Pronto" : "Ainda não criado"} ready={hasPlan} icon={ClipboardList} />
            <StatusCard title="Orçamento planejado" value={campaignConfig?.daily_budget ? `R$ ${Number(campaignConfig.daily_budget).toFixed(2).replace(".", ",")}` : "—"} subtitle="por dia" ready={Boolean(campaignConfig?.daily_budget)} icon={BarChart3} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div><h2 className="text-lg font-semibold">Seu fluxo no AdAI</h2><p className="mt-1 text-sm text-neutral-500">Três passos para sair da ideia e chegar a uma campanha pronta para publicar.</p></div>
              <div className="mt-5 divide-y">
                <Step done={hasAnalysis} title="1. Analisar sua marca" description="Mostre seu Instagram, site ou prints. O AdAI transforma o material em diagnóstico para campanhas." href="/dashboard/analyze" action={hasAnalysis ? "Atualizar" : "Analisar"} />
                <Step done={hasPlan} title="2. Montar a campanha" description="Escolha objetivo, destino, orçamento e o criativo que pretende usar." href="/dashboard/campaign-setup" action={hasPlan ? "Montar outra" : "Montar"} />
                <Step done={hasPlan} title="3. Publicar seguindo o plano" description="O AdAI entrega configuração, copies e passo a passo para o Gerenciador de Anúncios." href={hasPlan ? "/dashboard/campaign-plan" : "/dashboard/campaign-setup"} action={hasPlan ? "Abrir plano" : "Aguardando"} />
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Plano atual</h2>
              <p className="mt-1 text-sm text-neutral-500">Sua configuração mais recente fica salva aqui.</p>
              {hasPlan ? <div className="mt-5 rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{campaignConfig?.strategy?.resumo?.objetivo ?? "Campanha planejada"}</p><p className="mt-1 text-sm text-neutral-500">{campaignConfig?.strategy?.resumo?.destino ?? "Destino definido no plano"}</p><p className="mt-1 text-xs text-neutral-400">R$ {Number(campaignConfig?.daily_budget ?? 0).toFixed(2).replace(".", ",")} / dia</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Pronto</span></div><Link href="/dashboard/campaign-plan" className="mt-4 inline-flex items-center gap-1 text-sm font-medium">Ver configuração completa <ArrowRight className="h-3.5 w-3.5" /></Link></div> : <div className="mt-5 rounded-xl border border-dashed p-6 text-center"><Megaphone className="mx-auto h-6 w-6 text-neutral-300" /><p className="mt-3 text-sm font-medium">Nenhum plano ainda</p><p className="mt-1 text-xs text-neutral-500">Monte sua primeira campanha para ver tudo aqui.</p></div>}
              <div className="mt-5 rounded-xl bg-neutral-950 p-4 text-white"><p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Fase 2</p><p className="mt-2 font-medium">Publicação automática na Meta</p><p className="mt-1 text-sm leading-6 text-neutral-400">Quando a integração oficial estiver liberada, o mesmo plano poderá virar campanha com um clique.</p></div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusCard({ title, value, subtitle, ready, icon: Icon }: { title: string; value: string; subtitle?: string; ready: boolean; icon: typeof ShieldCheck }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-neutral-500">{title}</p><Icon className="h-4 w-4 text-neutral-400" /></div><p className="mt-4 text-xl font-semibold">{value}</p>{subtitle && <p className="mt-1 text-xs text-neutral-400">{subtitle}</p>}<div className={`mt-4 inline-flex items-center gap-1.5 text-xs ${ready ? "text-emerald-700" : "text-neutral-500"}`}>{ready ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}{ready ? "Pronto" : "A configurar"}</div></div>; }
function Step({ done, title, description, href, action }: { done: boolean; title: string; description: string; href: string; action: string }) { return <div className="flex items-center gap-4 py-4"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-400"}`}>{done ? <CircleCheck className="h-5 w-5" /> : <CircleDashed className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><p className="font-medium">{title}</p><p className="mt-1 text-sm text-neutral-500">{description}</p></div><Link href={href} className="inline-flex items-center gap-1 text-sm font-medium">{action}<ArrowRight className="h-3.5 w-3.5" /></Link></div>; }
