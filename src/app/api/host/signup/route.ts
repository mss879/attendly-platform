import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hostSignupSchema } from "@/lib/validation";

// Organizer self-signup (apply-to-host flow). Creates the auth user with a
// confirmed email plus their organizer profile; the client then signs in
// with the same credentials.

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = hostSignupSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { fullName, email, password } = parsed.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    if (error?.code === "email_exists") {
      return NextResponse.json(
        { error: "This email already has an account — sign in instead." },
        { status: 409 }
      );
    }
    console.error("[host/signup] createUser failed:", error);
    return NextResponse.json(
      { error: "Could not create your account — please try again." },
      { status: 500 }
    );
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    role: "organizer",
    full_name: fullName,
  });
  if (profileError) {
    console.error("[host/signup] profile insert failed:", profileError);
    // Roll the auth user back so a retry starts clean.
    await supabase.auth.admin.deleteUser(data.user.id);
    return NextResponse.json(
      { error: "Could not create your account — please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
