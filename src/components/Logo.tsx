import Link from "next/link";

const sizes = {
  sm: { word: "text-xl", tag: "text-[7px]", mark: "h-7 w-7" },
  md: { word: "text-3xl", tag: "text-[8px]", mark: "h-10 w-10" },
  lg: { word: "text-5xl", tag: "text-[10px]", mark: "h-14 w-14" },
} as const;

const accents = {
  indigo: "text-indigo-600",
  orange: "text-orange-600",
} as const;

function Mark({ className }: { className: string }) {
  return (
    <span className={`${className} relative inline-block`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-icon.png"
        alt="Logo Icon"
        className="logo-spin-slow h-full w-full object-contain"
      />
    </span>
  );
}

export function Logo({
  size = "md",
  href,
  accent = "indigo",
  withMark = false,
}: {
  size?: keyof typeof sizes;
  href?: string;
  accent?: keyof typeof accents;
  withMark?: boolean;
}) {
  const s = sizes[size];
  const mark = (
    <span className="inline-flex items-center gap-2">
      {withMark && <Mark className={s.mark} />}
      <span className="inline-flex flex-col items-end leading-none">
        <span className={`${s.word} font-bold tracking-tight text-slate-900`}>
          Attend<span className={accents[accent]}>ly</span>
        </span>
        <span className={`${s.tag} font-medium uppercase tracking-wide text-slate-400`}>
          Powered by ARC AI
        </span>
      </span>
    </span>
  );
  return href ? <Link href={href}>{mark}</Link> : mark;
}
