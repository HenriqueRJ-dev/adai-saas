import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Rota de diagnóstico do Módulo 3.1.
 *
 * Busca os dados brutos do Instagram (bio, seguidores, posts recentes
 * com legendas) usando o Instagram Graph API. Ainda não envia nada
 * para a Claude API — isso é o próximo módulo (3.2).
 *
 * Acesse /api/instagram/analyze-data (logado) para ver o JSON retornado.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { data: connection } = await supabase
    .from("meta_connections")
