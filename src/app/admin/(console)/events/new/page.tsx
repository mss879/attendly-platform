import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { EventForm } from "@/components/admin/EventForm";

export default function NewEventPage() {
  return (
    <FadeIn className="mx-auto max-w-3xl">
      <Link
        href="/admin"
        className="inline-block text-sm font-semibold text-orange-600 transition hover:text-orange-800"
      >
        ← My events
      </Link>
      <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        Create your event
      </h1>
      <p className="mb-6 mt-0.5 text-sm text-slate-500">
        Fill in the details below — your event goes live on the platform once
        the Attendly team approves it. Everything can be edited later.
      </p>
      <EventForm mode="create" />
    </FadeIn>
  );
}
