import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente administrativo do Supabase.
 *
 * Usa a SECRET KEY, que ignora todas as regras de Row Level Security
 * (RLS) e tem acesso total ao banco de dados.
 *
 * REGRA DE OURO: nunca importe este arquivo em um Client Component
 * (arquivo com "use client" no topo) nem em qualquer código que rode
 * no navegador. Use apenas em:
 *   - Route Handlers (arquivos app/api/**\/route.ts)
 *   - Server Actions
 *   - Workflows do n8n (fora do Next.js)
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
