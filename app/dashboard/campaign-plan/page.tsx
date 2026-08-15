import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, ClipboardList, Megaphone, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CopyButton from "./copy-button";

export default async function CampaignPlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: config } = await supabase.from("campaign_configs").select("daily_budget,objective,status,strategy").eq("user_id", user.id).maybeSingle();
  const s: any = config?.strategy;

  if (!s) return <main className="min-h-screen bg-neutral-50"><div className="mx-auto max-w-4xl px-5 py-8"><Link href="/dashboard" className="text-sm text-neutral-500">← Voltar</Link><div className="mt-8 rounded-3xl border bg-white p-8"><h1 className="text-2xl font-semibold">Nenhum plano criado ainda</h1><p className="mt-2 text-neutral-500">Monte sua primeira campanha para o AdAI preparar a configuração.</p><Link href="/dashboard/campaign-setup" className="mt-5 inline-flex rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Montar campanha</Link></div></div></main>;

  const configText = Object.entries(s.configuracao_meta ?? {}).map(([k,v]) => `${labelize(k)}: ${String(v)}`).join("\n");

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-500"><ArrowLeft className="h-4 w-4" /> Voltar ao dashboard</Link>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4"><div><div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Plano pronto · publicação manual</div><h1 className="mt-3 text-3xl font-semibold tracking-tight">Sua campanha está montada</h1><p className="mt-2 text-neutral-500">Copie as configurações abaixo para o Gerenciador de Anúncios.</p></div><CopyButton text={configText} label="Copiar configuração" /></div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <div className="space-y-6">
            <Card title="Resumo" icon={Megaphone}>{Object.entries(s.resumo ?? {}).map(([k,v]) => <Row key={k} label={labelize(k)} value={String(v)} />)}</Card>
            <Card title="Público sugerido" icon={Target}>{Object.entries(s.publico ?? {}).filter(([,v]) => !Array.isArray(v)).map(([k,v]) => <Row key={k} label={labelize(k)} value={String(v)} />)}{Array.isArray(s.publico?.interesses) && s.publico.interesses.length > 0 && <Row label="Interesses" value={s.publico.interesses.join(", ")} />}</Card>
          </div>

          <div className="space-y-6">
            <Card title="Configuração no Meta Ads" icon={ClipboardList}><div className="divide-y">{Object.entries(s.configuracao_meta ?? {}).map(([k,v]) => <div key={k} className="flex items-start justify-between gap-4 py-3"><div><p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{labelize(k)}</p><p className="mt-1 text-sm leading-6 text-neutral-700">{String(v)}</p></div></div>)}</div></Card>

            <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-semibold">Copies sugeridas</h2></div><div className="mt-4 space-y-4">{(s.criativos ?? []).map((c: any, i: number) => { const text = `${c.titulo}\n\n${c.texto_principal}\n\nCTA: ${c.cta}`; return <div key={i} className="rounded-xl border bg-neutral-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-neutral-400">Opção {i + 1}</p><p className="mt-1 font-semibold">{c.titulo}</p></div><CopyButton text={text} /></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{c.texto_principal}</p><p className="mt-3 text-xs font-medium">Botão: {c.cta}</p></div>; })}</div></section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">Como publicar</h2><div className="mt-4 space-y-3">{(s.passos_publicacao ?? []).map((step: string, i: number) => <div key={i} className="flex gap-3"><div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white">{i+1}</div><p className="text-sm leading-6 text-neutral-700">{step}</p></div>)}</div></section>

            {Array.isArray(s.testes) && <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5"><h2 className="font-semibold text-amber-950">Depois de publicar</h2><div className="mt-3 space-y-2">{s.testes.map((t: string, i: number) => <p key={i} className="flex gap-2 text-sm leading-6 text-amber-900"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />{t}</p>)}</div></section>}
          </div>
        </div>
      </div>
    </main>
  );
}

function labelize(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function Card({ title, icon: Icon, children }: { title: string; icon: typeof Megaphone; children: React.ReactNode }) { return <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-neutral-400" /><h2 className="font-semibold">{title}</h2></div><div className="mt-4 space-y-4">{children}</div></section>; }
function Row({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-1 text-sm leading-6 text-neutral-700">{value}</p></div>; }
