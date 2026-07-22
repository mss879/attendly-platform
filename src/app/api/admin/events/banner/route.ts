import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/auth";
import { BANNER_MAX_BYTES } from "@/lib/validation";
import { validateUpload } from "@/lib/upload";

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

  // Public bucket: the stored content type MUST come from the sniffed file
  // content, or a renamed HTML file becomes a hosted page on the storage URL.
  const upload = await validateUpload(file, {
    allowedExts: ["jpg", "png", "webp"],
    maxBytes: BANNER_MAX_BYTES,
    typeError: "Only JPG, PNG, or WebP images are accepted for the event banner.",
    sizeError: "The banner image must be between 1 byte and 5 MB.",
  });
  if (!upload.ok) {
    return NextResponse.json({ error: upload.error }, { status: 400 });
  }

  const supabase = createAdminClient();
  const storagePath = `${ctx.user.id}/${Date.now()}.${upload.ext}`;

  const { error: uploadError } = await supabase.storage
    .from("event-banners")
    .upload(storagePath, upload.bytes, { contentType: upload.contentType });

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
