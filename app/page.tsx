import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
        Módulo 0.1 — Setup do projeto
      </span>
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight">
        AdAI está com a base pronta.
      </h1>
      <p className="max-w-md text-muted-foreground">
        Se você está vendo esta página com o botão estilizado abaixo,
        Next.js, TypeScript, Tailwind CSS e shadcn/ui estão configurados
        corretamente.
      </p>
      <Button>Continuar para o próximo módulo</Button>
    </main>
  );
}
