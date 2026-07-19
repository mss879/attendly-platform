import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SLIP_MAX_BYTES } from "@/lib/validation";
import { validateUpload } from "@/lib/upload";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { Registration } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Re-uploads are fine (e.g. after a rejection), but bounded per booking. */
const MAX_SLIPS_PER_REGISTRATION = 10;

export async function POST(request: Request) {
  const limited = rateLimit(`slip:${clientIp(request)}`, {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many uploads — please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

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

  const upload = await validateUpload(file, {
    allowedExts: ["jpg", "png", "webp", "pdf"],
    maxBytes: SLIP_MAX_BYTES,
    typeError: "Only JPG, PNG, WebP or PDF files are accepted.",
    sizeError: "The file must be between 1 byte and 5 MB.",
  });
  if (!upload.ok) {
    return NextResponse.json({ error: upload.error }, { status: 400 });
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

  const { count: slipCount, error: countError } = await supabase
    .from("payment_slips")
    .select("id", { count: "exact", head: true })
    .eq("registration_id", registration.id);
  if (countError) {
    console.error("[slip] count failed:", countError);
    return NextResponse.json(
      { error: "Upload failed — please try again." },
      { status: 500 }
    );
  }
  if ((slipCount ?? 0) >= MAX_SLIPS_PER_REGISTRATION) {
    return NextResponse.json(
      { error: "Upload limit reached for this booking — please contact the organizers." },
      { status: 409 }
    );
  }

  const storagePath = `${registration.id}/${Date.now()}.${upload.ext}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-slips")
    .upload(storagePath, upload.bytes, { contentType: upload.contentType });

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
