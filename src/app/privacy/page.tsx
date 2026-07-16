import type { Metadata } from "next";
import Link from "next/link";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Attendly. Learn how we handle your booking and registration data securely.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col p-2 sm:p-4 lg:p-6">
      <AuroraBackground />

      <div className="flex flex-1 flex-col rounded-2xl bg-[#f7f4f0]/90 shadow-2xl shadow-orange-950/20 ring-1 ring-white/50 backdrop-blur-xl sm:rounded-[28px]">
        <header className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-7 sm:py-4">
          <Logo href="/" accent="orange" withMark />
          <Link
            href="/"
            className="text-xs font-bold text-orange-700 hover:underline underline-offset-4"
          >
            ← Back to Home
          </Link>
        </header>

        <section className="flex-1 px-4 py-10 sm:px-10 lg:px-16 max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Last Updated: July 16, 2026
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600">
            <p>
              At Attendly, powered by <strong>ARC AI</strong>, we respect your privacy and are committed to protecting the personal data you share with us. This Privacy Policy describes how we collect, use, and store your information when you use our ticket booking service.
            </p>

            <h2 className="text-lg font-bold text-slate-900 mt-6">
              1. Information We Collect
            </h2>
            <p>
              To process your grandstand seat bookings and issue QR tickets, we collect the following information during checkout:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Personal Details:</strong> Full Name, Email Address, and Phone Number.</li>
              <li><strong>Booking Details:</strong> Batch Year and selected seat numbers.</li>
              <li><strong>Payment Verification:</strong> An uploaded image of your bank transfer receipt/slip.</li>
            </ul>

            <h2 className="text-lg font-bold text-slate-900 mt-6">
              2. How We Use Your Information
            </h2>
            <p>
              We use your personal data strictly for transaction processing and event entry verification:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>To allocate your selected seats on the seating plan.</li>
              <li>To verify your payment slip against our bank records.</li>
              <li>To email your personal QR ticket once verification is complete.</li>
              <li>To scan and validate your QR ticket at the gate on the event day.</li>
            </ul>

            <h2 className="text-lg font-bold text-slate-900 mt-6">
              3. Data Security and Retention
            </h2>
            <p>
              Your data is stored securely in our database and is only accessible by the authorized event organizing team. We implement security safeguards to protect your personal details from unauthorized access or alteration. We retain your transaction details only for the duration necessary to conduct the event and reconcile accounts, after which personal files and uploads are purged or anonymized.
            </p>

            <h2 className="text-lg font-bold text-slate-900 mt-6">
              4. Third-Party Sharing
            </h2>
            <p>
              We do not sell, rent, or trade your personal information to third parties. We only share details with trusted infrastructure providers (such as Supabase for database hosting and Resend for transactional email delivery) necessary to fulfill our booking services.
            </p>

            <h2 className="text-lg font-bold text-slate-900 mt-6">
              5. Contact Us
            </h2>
            <p>
              If you have any questions or concerns regarding your data or this policy, please contact the organizing team or reach out to us at <a href="https://www.arcai.agency" target="_blank" rel="noopener" className="text-orange-700 hover:underline">www.arcai.agency</a>.
            </p>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
