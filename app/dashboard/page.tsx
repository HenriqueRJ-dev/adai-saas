import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Bem-vindo ao AdAI 🎉</h1>
      <p className="text-neutral-500">
        Você está logado como <strong>{user.email}</strong>.
      </p>
      <p className="text-sm text-neutral-400">
        Esta é uma página provisória do Módulo 0.4. Nos próximos módulos,
        aqui vai entrar a conexão com sua conta Meta e a configuração das
        campanhas.
      </p>
    </main>
  );
}
