import type { Metadata } from "next";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Footer } from "@/components/Footer";
import { Preloader } from "@/components/Preloader";
import { AudienceSplit } from "@/components/landing/AudienceSplit";
import { EventsPreview } from "@/components/landing/EventsPreview";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { HostCta } from "@/components/landing/HostCta";
import { HowItWorksPlatform } from "@/components/landing/HowItWorksPlatform";
import { ShaderHero } from "@/components/landing/ShaderHero";
import { appConfig } from "@/lib/config";
import { getEventListings } from "@/lib/events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const SITE_URL = "https://www.attendly.buzz";

export default async function HomePage() {
  const { upcoming } = await getEventListings();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: appConfig.appName,
        url: SITE_URL,
        description:
          "Attendly is a smart event ticketing platform: interactive seat maps, bank-transfer payment verification, personal QR tickets and gate check-in scanning for every event it hosts.",
      },
      {
        "@type": "Organization",
        name: "ARC AI",
        url: "https://www.arcai.agency",
      },
    ],
  };

  return (
    <main className="flex flex-1 flex-col p-2">
      <AuroraBackground />

      {/* Floating app panel, same shell as the admin dashboard */}
      <div className="flex flex-1 flex-col rounded-2xl bg-[#f7f4f0]/90 shadow-2xl shadow-orange-950/20 ring-1 ring-white/50 backdrop-blur-xl sm:rounded-[28px]">
        {/* First screen: the hero carries its own nav and fills exactly one
            viewport (minus the 8px outer gap), so the next section begins
            right at the fold. */}
        <ShaderHero />

        <AudienceSplit />

        <EventsPreview events={upcoming.slice(0, 3)} />

        <FeatureShowcase />

        <HowItWorksPlatform />

        <HostCta />
      </div>

      <Footer />
      <Preloader />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // Escape "<" so injected content can never close the script tag.
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </main>
  );
}
