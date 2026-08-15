import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OptimizeClient from "./optimize-client";

export default async function OptimizePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: config } = await supabase
    .from("campaign_configs")
    .select("strategy")
    .eq("user_id", user.id)
    .maybeSingle();

  return <OptimizeClient hasPlan={Boolean(config?.strategy)} existingAnalysis={(config?.strategy as any)?.performance_analysis ?? null} />;
}
