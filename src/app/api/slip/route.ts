import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SLIP_ALLOWED_TYPES, SLIP_MAX_BYTES } from "@/lib/validation";
import type { Registration } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const token = String(form.get("token") ?? "");
  const file = form.get("file");

  if (!UUID_RE.test(token) || !(file instanceof File)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let ext = SLIP_ALLOWED_TYPES[file.type];
  if (!ext && file.name) {
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (fileExt && ["jpg", "jpeg", "png", "webp", "pdf"].includes(fileExt)) {
      ext = fileExt === "jpeg" ? "jpg" : fileExt;
    }
  }
  if (!ext) {
    return NextResponse.json(
      { error: "Only JPG, PNG, WebP or PDF files are accepted." },
      { status: 400 }
    );
  }
  if (file.size === 0 || file.size > SLIP_MAX_BYTES) {
    return NextResponse.json(
      { error: "The file must be between 1 byte and 5 MB." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: registration } = await supabase
    .from("registrations")
    .select("*")
    .eq("access_token", token)
    .maybeSingle<Registration>();

  if (!registration) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }
  if (registration.payment_status === "verified") {
    return NextResponse.json(
      { error: "This payment is already verified — no upload needed." },
      { status: 409 }
    );
  }

  const storagePath = `${registration.id}/${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("payment-slips")
    .upload(storagePath, bytes, { contentType: file.type });

  if (uploadError) {
    console.error("[slip] storage upload failed:", uploadError);
    return NextResponse.json(
      { error: "Upload failed — please try again." },
      { status: 500 }
    );
  }

  const { error: insertError } = await supabase.from("payment_slips").insert({
    registration_id: registration.id,
    storage_path: storagePath,
  });
  if (insertError) {
    console.error("[slip] insert failed:", insertError);
    return NextResponse.json(
      { error: "Upload failed — please try again." },
      { status: 500 }
    );
  }

  const { error: statusError } = await supabase
    .from("registrations")
    .update({ payment_status: "slip_uploaded" })
    .eq("id", registration.id);
  if (statusError) {
    console.error("[slip] status update failed:", statusError);
    return NextResponse.json(
      { error: "Upload saved, but the status could not be updated. Please retry." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
