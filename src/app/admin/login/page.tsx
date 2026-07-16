import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { AuroraBackground } from "@/components/AuroraBackground";
import { FadeIn } from "@/components/FadeIn";
import { LoginForm } from "@/components/admin/LoginForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/admin");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <AuroraBackground />
      <FadeIn className="w-full max-w-sm">
        <div className="rounded-[28px] bg-[#f7f4f0]/90 p-7 shadow-2xl shadow-orange-950/20 ring-1 ring-white/50 backdrop-blur-xl">
          <div className="mb-6 text-center">
            <Logo size="lg" accent="orange" withMark />
            <p className="mt-3 text-sm text-slate-500">Organizer sign in</p>
          </div>
          <LoginForm />
          <p className="mt-4 text-center text-xs text-slate-400">
            Want to host your event on Attendly?{" "}
            <a href="/host" className="font-semibold text-orange-700 hover:underline">
              Apply here
            </a>
            .
          </p>
        </div>
      </FadeIn>
    </main>
  );
}
