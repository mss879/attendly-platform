import Link from "next/link";

export function Footer({ admin = false }: { admin?: boolean }) {
  return (
    <footer className="relative z-10 flex flex-col items-center justify-center gap-2 pt-6 pb-4 text-[11px] font-bold uppercase tracking-wider text-black">
      <div className="flex flex-wrap items-center justify-center gap-1">
        <span>{admin ? "Attendly Admin" : "Attendly"}</span>
        <span>·</span>
        <span>Powered by</span>
        <a
          href="https://www.arcai.agency"
          target="_blank"
          rel="noopener"
          title="ARC AI Agency - AI Automation & Event Solutions"
          className="inline-flex items-center hover:opacity-80 transition-opacity"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/arc-logo.png"
            alt="ARC AI Logo"
            className="h-5 w-auto object-contain"
          />
        </a>
      </div>
      <div>
        <Link
          href="/privacy"
          className="transition hover:text-orange-800 hover:underline underline-offset-4 text-black hover:text-black/80"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
