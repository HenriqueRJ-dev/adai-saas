import Link from "next/link";
import { ArrowRight, BarChart3, BrainCircuit, Megaphone, ShieldCheck, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-2xl font-semibold tracking-tight">AdAI</Link>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="rounded-lg px-4 py-2 text-sm text-neutral-300 hover:bg-white/10">Entrar</Link>
          <Link href="/signup" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-950">Criar conta</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-20 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-300">
            <Sparkles className="h-3.5 w-3.5" /> Meta Ads com inteligência artificial
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Campanhas melhores sem precisar virar especialista em tráfego.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
            Conecte sua conta Meta, analise sua marca e deixe o AdAI montar a estrutura da campanha para você.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950">
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="rounded-xl border border-white/15 px-5 py-3 font-medium text-white">Já tenho conta</Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30">
          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Painel AdAI</p>
                <p className="mt-1 text-xl font-semibold">Sua operação em um só lugar</p>
              </div>
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [BrainCircuit, "Análise de marca", "IA entende posicionamento e público"],
                [Megaphone, "Campanhas", "Estrutura guiada para Meta Ads"],
                [BarChart3, "Resultados", "Visão simples do que está rodando"],
                [ShieldCheck, "Controle", "Campanhas nascem pausadas para revisão"],
              ].map(([Icon, title, description]) => {
                const CardIcon = Icon as typeof BrainCircuit;
                return (
                  <div key={String(title)} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <CardIcon className="mb-3 h-5 w-5 text-neutral-200" />
                    <p className="font-medium">{String(title)}</p>
                    <p className="mt-1 text-sm leading-5 text-neutral-500">{String(description)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
