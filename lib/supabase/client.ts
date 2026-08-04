import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso no navegador (Client Components, arquivos
 * marcados com "use client" no topo).
 *
 * Usa a PUBLISHABLE KEY, que é segura para o navegador porque as
 * permissões reais são controladas pelas regras de Row Level Security
 * (RLS) que vamos definir no banco no Módulo 0.3.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
