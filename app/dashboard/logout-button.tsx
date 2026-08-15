"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button onClick={logout} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
      <LogOut className="h-4 w-4" /> {loading ? "Saindo..." : "Sair"}
    </button>
  );
}
