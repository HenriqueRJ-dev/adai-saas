import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rota de teste do Módulo 0.2.
 *
 * Acesse /api/test-supabase no navegador depois do deploy.
 * Se a conexão estiver certa, você verá: {"connected":true}
 *
 * Depois que confirmarmos que funciona, podemos apagar esta rota —
 * ela existe só para diagnóstico deste módulo.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.listUsers();

    if (error) {
      return NextResponse.json(
        { connected: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ connected: true });
  } catch (err) {
    return NextResponse.json(
      {
        connected: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
