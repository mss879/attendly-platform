import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Footer } from "@/components/Footer";
import { PublicHeader } from "@/components/PublicHeader";
import { FadeIn } from "@/components/FadeIn";
import { HostSignupForm } from "@/components/host/HostSignupForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Apply to host",
  description: "Create your Attendly organizer account and submit your event.",
  robots: { index: false, follow: false },
};

export default async function HostSignupPage() {
  // Already signed in? Straight to the console.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/admin");

  return (
    <main className="flex flex-1 flex-col p-2 sm:p-4 lg:p-6">
      <AuroraBackground />

      <div className="flex flex-1 flex-col rounded-2xl bg-[#f7f4f0]/90 shadow-2xl shadow-orange-950/20 ring-1 ring-white/50 backdrop-blur-xl sm:rounded-[28px]">
        <PublicHeader active="host" />

        <FadeIn stagger className="mx-auto w-full max-w-md flex-1 px-4 pb-16 pt-10 sm:pt-14">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
              Step 1 of 2
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">
              Create your organizer account
            </h1>
            <p className="mt-2 text-sm text-black/70">
              Next you&apos;ll set up your event — it goes live once the
              Attendly team approves it.
            </p>
          </div>

          <div className="mt-7">
            <HostSignupForm />
          </div>
        </FadeIn>
      </div>

      <Footer />
    </main>
  );
}
