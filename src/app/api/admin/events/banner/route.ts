import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/auth";
import { BANNER_ALLOWED_TYPES, BANNER_MAX_BYTES } from "@/lib/validation";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let ext = BANNER_ALLOWED_TYPES[file.type];
  if (!ext && file.name) {
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (fileExt && ["jpg", "jpeg", "png", "webp"].includes(fileExt)) {
      ext = fileExt === "jpeg" ? "jpg" : fileExt;
    }
  }
  if (!ext) {
    return NextResponse.json(
      { error: "Only JPG, PNG, or WebP images are accepted for the event banner." },
      { status: 400 }
    );
  }
  if (file.size === 0 || file.size > BANNER_MAX_BYTES) {
    return NextResponse.json(
      { error: "The banner image must be between 1 byte and 5 MB." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const storagePath = `${ctx.user.id}/${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("event-banners")
    .upload(storagePath, bytes, { contentType: file.type });

  if (uploadError) {
    console.error("[banner] storage upload failed:", uploadError);
    return NextResponse.json(
      { error: "Upload failed — please try again." },
      { status: 500 }
    );
  }

  // Since event-banners is a public bucket, getPublicUrl yields the correct URL
  const { data } = supabase.storage
    .from("event-banners")
    .getPublicUrl(storagePath);

  return NextResponse.json({ bannerUrl: data.publicUrl });
}
