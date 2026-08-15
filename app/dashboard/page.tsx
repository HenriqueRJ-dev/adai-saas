import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, BarChart3, BrainCircuit, CircleCheck, CircleDashed, Facebook, Megaphone, Plus, Settings2 } from "lucide-react";
import LogoutButton from "./logout-button";

function objectiveLabel(value?: string | null) {
  const labels: Record<string, string> = {
    OUTCOME_SALES: "Vendas",
    OUTCOME_LEADS: "Leads",
    OUTCOME_TRAFFIC: "Tráfego",
    OUTCOME_AWARENESS: "Reconhecimento",
    OUTCOME_ENGAGEMENT: "Engajamento",
    OUTCOME_APP_PROMOTION: "App",
  };
  return value ? labels[value] ?? value : "—";
}

export default async function DashboardPage({ searchParams }: { searchParams: { meta_connected?: string; meta_error?: string; instagram_connected?: string; instagram_error?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: metaConnection }, { data: campaigns }, { data: campaignConfig }] = await Promise.all([
    supabase.from("meta_connections").select("access_token, connected_at, page_id, ad_account_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("campaigns").select("meta_campaign_id,status,objective").eq("user_id", user.id).limit(6),
    supabase.from("campaign_configs").select("daily_budget,objective,status,strategy").eq("user_id", user.id).maybeSingle(),
  ]);

  const metaConnected = Boolean(metaConnection?.access_token);
  const metaConfigured = Boolean(metaConnection?.page_id && metaConnection?.ad_account_id);
  const hasAnalysis = Boolean(campaignConfig?.strategy);
  const campaignCount = campaigns?.length ?? 0;
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
              <Link href="/dashboard/campaign-setup" className="hover:text-neutral-950">Campanhas</Link>
            </nav>
          </div>
          <LogoutButton />
        </header>

        <section className="py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-500">Painel do cliente</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Olá, {name}</h1>
              <p className="mt-2 text-neutral-500">Acompanhe sua configuração e crie campanhas sem lidar com a parte técnica.</p>
            </div>
            <Link href="/dashboard/campaign-setup" className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" /> Nova campanha
            </Link>
          </div>

          {(searchParams.meta_connected || searchParams.instagram_connected) && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Conexão atualizada com sucesso.</div>
          )}
          {(searchParams.meta_error || searchParams.instagram_error) && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não foi possível concluir a conexão. Tente novamente ou revise as permissões da Meta.</div>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatusCard title="Meta Ads" value={metaConfigured ? "Configurada" : metaConnected ? "Falta selecionar contas" : "Não conectada"} ready={metaConfigured} icon={Facebook} />
            <StatusCard title="Análise da marca" value={hasAnalysis ? "Concluída" : "Pendente"} ready={hasAnalysis} icon={BrainCircuit} />
            <StatusCard title="Campanhas" value={String(campaignCount)} subtitle="registradas no AdAI" ready={campaignCount > 0} icon={Megaphone} />
            <StatusCard title="Orçamento atual" value={campaignConfig?.daily_budget ? `R$ ${Number(campaignConfig.daily_budget).toFixed(2).replace(".", ",")}` : "—"} subtitle="por dia" ready={Boolean(campaignConfig?.daily_budget)} icon={BarChart3} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Primeiros passos</h2>
                  <p className="mt-1 text-sm text-neutral-500">Complete o essencial para o AdAI poder trabalhar.</p>
                </div>
                <Settings2 className="h-5 w-5 text-neutral-400" />
              </div>
              <div className="mt-5 divide-y">
                <Step done={metaConnected} title="Conectar conta Meta" description="Autorize o AdAI a acessar sua conta de anúncios." href={metaConnected ? "/dashboard/meta-setup" : "/api/meta/oauth/start"} action={metaConnected ? "Gerenciar" : "Conectar"} />
                <Step done={metaConfigured} title="Selecionar Página e conta de anúncio" description="Escolha quais ativos o AdAI deve utilizar." href="/dashboard/meta-setup" action="Configurar" />
                <Step done={hasAnalysis} title="Analisar sua marca com IA" description="A IA usa sua presença digital para orientar a estratégia." href="/dashboard/analyze" action={hasAnalysis ? "Ver novamente" : "Analisar"} />
                <Step done={campaignCount > 0} title="Criar a primeira campanha" description="Defina objetivo, orçamento e criativo." href="/dashboard/campaign-setup" action="Criar campanha" />
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Campanhas recentes</h2>
              <p className="mt-1 text-sm text-neutral-500">Últimas campanhas registradas no seu painel.</p>
              <div className="mt-5 space-y-3">
                {campaigns && campaigns.length > 0 ? campaigns.map((campaign) => (
                  <div key={campaign.meta_campaign_id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{objectiveLabel(campaign.objective)}</p>
                        <p className="mt-1 max-w-[220px] truncate text-xs text-neutral-400">ID {campaign.meta_campaign_id}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${campaign.status === "PAUSED" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{campaign.status ?? "—"}</span>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed p-6 text-center">
                    <Megaphone className="mx-auto h-6 w-6 text-neutral-300" />
                    <p className="mt-3 text-sm font-medium">Nenhuma campanha ainda</p>
                    <p className="mt-1 text-xs text-neutral-500">Sua primeira campanha aparecerá aqui.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusCard({ title, value, subtitle, ready, icon: Icon }: { title: string; value: string; subtitle?: string; ready: boolean; icon: typeof Facebook }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-neutral-500">{title}</p><Icon className="h-4 w-4 text-neutral-400" /></div><p className="mt-4 text-xl font-semibold">{value}</p>{subtitle && <p className="mt-1 text-xs text-neutral-400">{subtitle}</p>}<div className={`mt-4 inline-flex items-center gap-1.5 text-xs ${ready ? "text-emerald-700" : "text-neutral-500"}`}>{ready ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}{ready ? "Pronto" : "A configurar"}</div></div>;
}

function Step({ done, title, description, href, action }: { done: boolean; title: string; description: string; href: string; action: string }) {
  return <div className="flex items-center gap-4 py-4"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-400"}`}>{done ? <CircleCheck className="h-5 w-5" /> : <CircleDashed className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><p className="font-medium">{title}</p><p className="mt-1 text-sm text-neutral-500">{description}</p></div><Link href={href} className="inline-flex items-center gap-1 text-sm font-medium">{action}<ArrowRight className="h-3.5 w-3.5" /></Link></div>;
}
