import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para uso no servidor (Server Components e Route
 * Handlers dentro de app/**).
 *
 * Também usa a PUBLISHABLE KEY (não a secret) — a diferença deste
 * arquivo para o client.ts é que ele lê/escreve a sessão do usuário
 * através dos cookies da requisição, permitindo saber "quem está
 * logado" no servidor.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // O método `setAll` foi chamado a partir de um Server
            // Component, que não pode alterar cookies diretamente.
            // Isso é seguro de ignorar aqui porque o middleware que
            // vamos criar no Módulo 0.4 cuida de manter a sessão
            // atualizada.
          }
        },
      },
    }
  );
}
