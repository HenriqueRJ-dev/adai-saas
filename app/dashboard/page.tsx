import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ meta_connected?: string; meta_error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;

  const { data: metaConnection } = await supabase
    .from("meta_connections")
    .select("connected_at, page_id, ad_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Bem-vindo ao AdAI</h1>
      <p className="text-neutral-500">
        Voce esta logado como <strong>{user.email}</strong>.
      </p>

      {params.meta_connected && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Conta Meta conectada com sucesso!
        </p>
      )}

      {params.meta_error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Erro ao conectar com a Meta: {params.meta_error}
        </p>
      )}

      <div className="rounded-md border p-4 flex flex-col gap-3">
        {metaConnection ? (
          <>
            <p className="text-sm text-neutral-600">
              Conta Meta conectada desde{" "}
              {new Date(metaConnection.connected_at).toLocaleDateString("pt-BR")}
            </p>

            {metaConnection.page_id && metaConnection.ad_account_id ? (
              <p className="text-sm text-green-700">Pagina e conta de anuncio configuradas.</p>
            ) : (
              <a href="/dashboard/meta-setup" className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white w-fit">Escolher Pagina e conta de anuncio</a>
            )}
          </>
        ) : (
          <a href="/api/meta/oauth/start" className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white w-fit">Conectar com Facebook</a>
        )}
      </div>
    </main>
  );
}
