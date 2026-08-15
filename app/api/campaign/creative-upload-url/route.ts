import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "ad-creatives";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as { fileName?: string; mimeType?: string; size?: number } | null;
  if (!body?.fileName || !body.mimeType || !ALLOWED.has(body.mimeType)) {
    return NextResponse.json({ error: "Formato de arquivo não suportado." }, { status: 400 });
  }
  if (typeof body.size === "number" && body.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "O arquivo deve ter no máximo 50 MB." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error: bucketError } = await admin.storage.createBucket(BUCKET, {
      public: false,
      allowedMimeTypes: Array.from(ALLOWED),
    });
    if (bucketError && !/already exists/i.test(bucketError.message)) {
      console.error("Erro ao criar bucket de criativos:", bucketError);
      return NextResponse.json({ error: "Não foi possível preparar o upload." }, { status: 500 });
    }
  }

  const safeName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("Erro ao gerar upload assinado:", error);
    return NextResponse.json({ error: "Não foi possível preparar o upload." }, { status: 500 });
  }

  return NextResponse.json({ bucket: BUCKET, path, token: data.token });
}
