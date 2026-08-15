import Link from "next/link";
import { ArrowRight, BarChart3, BrainCircuit, Instagram, LineChart, Sparkles, Target } from "lucide-react";

export default function HomePage() {
  const steps = [
    [BrainCircuit, "1. Mostre sua marca", "Envie Instagram, site ou prints para o AdAI entender seu negócio."],
    [Target, "2. Compare seus criativos", "Mande até 3 posts ou capas de Reels e descubra qual merece o primeiro teste."],
    [Instagram, "3. Impulsione com um plano", "Receba objetivo, público, orçamento e duração em linguagem simples."],
    [LineChart, "4. Volte com os resultados", "Envie o print dos Insights e descubra se deve manter, aumentar, pausar ou trocar."],
  ];

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-2xl font-semibold tracking-tight">AdAI</Link>
        <nav className="flex items-center gap-3"><Link href="/login" className="rounded-lg px-4 py-2 text-sm text-neutral-300 hover:bg-white/10">Entrar</Link><Link href="/signup" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-950">Criar conta</Link></nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-20 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-pink-400/20 bg-pink-400/10 px-3 py-1.5 text-xs text-pink-200"><Instagram className="h-3.5 w-3.5" /> Copiloto de performance para Instagram</div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Você coloca o dinheiro. O AdAI ajuda a decidir onde vale investir.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">Analise sua marca, compare posts e Reels, monte um teste e volte com os resultados. O AdAI transforma tudo em próximas ações simples.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950">Começar agora <ArrowRight className="h-4 w-4" /></Link><Link href="/login" className="rounded-xl border border-white/15 px-5 py-3 font-medium text-white">Já tenho conta</Link></div>
          <p className="mt-5 text-sm text-neutral-500">O AdAI não promete resultado nem publica sozinho nesta fase. Ele ajuda você a tomar decisões melhores antes e depois de impulsionar.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30">
          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-5">
            <div className="mb-6"><p className="text-sm text-neutral-400">Como funciona</p><p className="mt-1 text-xl font-semibold">Um ciclo de decisão, não um tutorial</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {steps.map(([Icon, title, description]) => { const CardIcon = Icon as typeof Sparkles; return <div key={String(title)} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><CardIcon className="mb-3 h-5 w-5 text-neutral-200" /><p className="font-medium">{String(title)}</p><p className="mt-1 text-sm leading-5 text-neutral-500">{String(description)}</p></div>; })}
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /><p className="font-medium">Exemplo de decisão</p></div><p className="mt-2 text-sm leading-6 text-neutral-400">“MANTER por mais alguns dias”, “AUMENTAR gradualmente”, “PAUSAR” ou “TROCAR CRIATIVO” — sempre explicando o motivo.</p></div>
          </div>
        </div>
      </section>
    </main>
  );
}
