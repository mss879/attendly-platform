"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { runWhenPageVisible } from "@/lib/motion";

const CHIPS_DATA = [
  { id: 1, left: "8%", top: "20%", size: 90, clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)", depth: 0.6 },
  { id: 2, left: "22%", top: "68%", size: 70, clipPath: "polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)", depth: 1.2 },
  { id: 3, left: "38%", top: "15%", size: 80, clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)", depth: 0.5 },
  { id: 4, left: "58%", top: "78%", size: 100, clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)", depth: 1.4 },
  { id: 5, left: "78%", top: "16%", size: 75, clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)", depth: 0.8 },
  { id: 6, left: "88%", top: "58%", size: 85, clipPath: "polygon(0% 15%, 100% 40%, 80% 100%, 20% 100%)", depth: 1.0 },
];

export function AudienceSplit() {
  const [hovered, setHovered] = useState<"left" | "right" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Slanted seam dividing position state
  const [splitState, setSplitState] = useState({ x1: 56, x2: 44 });

  // GSAP split-seam animation
  useEffect(() => {
    const target = {
      x1: hovered === "left" ? 70 : hovered === "right" ? 42 : 56,
      x2: hovered === "left" ? 58 : hovered === "right" ? 30 : 44,
    };

    gsap.to(splitState, {
      x1: target.x1,
      x2: target.x2,
      duration: 0.8,
      ease: "power3.out",
      overwrite: "auto",
      onUpdate: () => {
        setSplitState({ x1: splitState.x1, x2: splitState.x2 });
      },
    });
  }, [hovered]);

  // Magnetic button effects and initial setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    return runWhenPageVisible(() => {
      const listeners: { el: HTMLElement; move: (e: PointerEvent) => void; leave: () => void }[] = [];

      // Magnetic CTA buttons
      gsap.utils.toArray<HTMLElement>(".split-btn").forEach((el) => {
        const toX = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
        const toY = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
        
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          toX(((e.clientX - r.left) / r.width - 0.5) * 12);
          toY(((e.clientY - r.top) / r.height - 0.5) * 8);
        };
        
        const onLeave = () => {
          toX(0);
          toY(0);
        };

        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        listeners.push({ el, move: onMove, leave: onLeave });
      });

      return () => {
        listeners.forEach(({ el, move, leave }) => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        });
      };
    });
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    // Parallax on glass chips
    const pctX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    const pctY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);

    CHIPS_DATA.forEach((chip, index) => {
      const el = chipsRef.current[index];
      if (!el) return;
      gsap.to(el, {
        x: pctX * -40 * chip.depth,
        y: pctY * -40 * chip.depth,
        rotation: pctX * 25 * chip.depth,
        duration: 0.65,
        ease: "power2.out",
        overwrite: "auto",
      });
    });
  };

  const handlePointerLeave = () => {
    setHovered(null);
    CHIPS_DATA.forEach((_, index) => {
      const el = chipsRef.current[index];
      if (!el) return;
      gsap.to(el, {
        x: 0,
        y: 0,
        rotation: 0,
        duration: 0.8,
        ease: "power3.out",
        overwrite: "auto",
      });
    });
  };

  // Determine split clip-paths
  const leftClip = `polygon(0 0, ${splitState.x1}% 0, ${splitState.x2}% 100%, 0 100%)`;
  const rightClip = `polygon(${splitState.x1}% 0, 100% 0, 100% 100%, ${splitState.x2}% 100%)`;

  return (
    <section
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative h-[70svh] min-h-[500px] w-full overflow-hidden select-none bg-neutral-900 border-y border-white/10"
    >
      {/* Background Panes at z-0 */}
      <div
        className="absolute inset-0 w-full h-full z-0"
        style={{
          clipPath: leftClip,
          background: `radial-gradient(circle at 30% 30%, #fffbf8, #f7f4f0)`,
        }}
      />
      <div
        className="absolute inset-0 w-full h-full z-0"
        style={{
          clipPath: rightClip,
          background: `radial-gradient(circle at 70% 70%, #0c1524, #030712)`,
        }}
      />

      {/* Parallax Floating Glass Chips at z-10 (Between background and content) */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {CHIPS_DATA.map((chip, index) => (
          <div
            key={chip.id}
            ref={(el) => {
              chipsRef.current[index] = el;
            }}
            className="absolute bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 backdrop-blur-[6px] shadow-[0_8px_32px_0_rgba(234,88,12,0.15)]"
            style={{
              left: chip.left,
              top: chip.top,
              width: `${chip.size}px`,
              height: `${chip.size}px`,
              clipPath: chip.clipPath,
              transformStyle: "preserve-3d",
            }}
          />
        ))}
      </div>

      {/* Content Panes at z-20 (Clipped, Transparent backgrounds, Content on top of chips) */}
      <div
        onPointerOver={() => setHovered("left")}
        className="absolute inset-0 w-full h-full z-20"
        style={{
          clipPath: leftClip,
        }}
      >
        <div className="absolute inset-y-0 left-0 w-full md:w-[50%] flex flex-col justify-center items-center text-center px-6 md:px-12">
          <span className="inline-flex rounded-full bg-orange-100/80 px-3 py-1 text-[11px] font-bold text-orange-700 tracking-wider uppercase">
            Going to an event
          </span>
          <h2 className="mt-4 text-[clamp(2.5rem,8vw,6.5rem)] font-black tracking-tighter uppercase leading-none bg-gradient-to-br from-orange-600 via-orange-500 to-red-500 bg-clip-text text-transparent select-none">
            Attend.
          </h2>
          <p className="mt-4 max-w-sm text-sm md:text-base leading-relaxed text-black/80 font-medium">
            Find events, reserve your seat on a live grandstand map, and get a verified QR ticket in your inbox.
          </p>
          <div className="mt-8">
            <Link
              href="/events"
              className="split-btn inline-block rounded-full bg-orange-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition hover:bg-orange-700"
            >
              Browse events →
            </Link>
          </div>
        </div>
      </div>

      <div
        onPointerOver={() => setHovered("right")}
        className="absolute inset-0 w-full h-full z-20"
        style={{
          clipPath: rightClip,
        }}
      >
        <div className="absolute inset-y-0 right-0 w-full md:w-[50%] flex flex-col justify-center items-center text-center px-6 md:px-12">
          <span className="inline-flex rounded-full bg-red-950/80 px-3 py-1 text-[11px] font-bold text-orange-400 tracking-wider uppercase border border-orange-500/20">
            Organizing an event
          </span>
          <h2 className="mt-4 text-[clamp(2.5rem,8vw,6.5rem)] font-black tracking-tighter uppercase leading-none bg-gradient-to-br from-amber-300 via-orange-400 to-red-500 bg-clip-text text-transparent select-none">
            Host.
          </h2>
          <p className="mt-4 max-w-sm text-sm md:text-base leading-relaxed text-white/80 font-medium">
            Create numbered seating maps, automate payment-slip checks, and scan tickets at the gate live.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/host"
              className="split-btn inline-block rounded-full bg-white px-8 py-3.5 text-sm font-bold text-black shadow-lg shadow-white/5 transition hover:bg-neutral-100"
            >
              Host your event →
            </Link>
            <Link
              href="/admin/login"
              className="text-xs font-bold text-white/60 tracking-wide uppercase hover:text-white transition duration-200"
            >
              Already hosting? Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Slanted Seam Glowing Line Overlay at z-30 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" preserveAspectRatio="none">
        <defs>
          <linearGradient id="seam-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        {/* Glow behind */}
        <line
          x1={`${splitState.x1}%`}
          y1="0"
          x2={`${splitState.x2}%`}
          y2="100%"
          stroke="url(#seam-grad)"
          strokeWidth="10"
          className="opacity-30 blur-[6px]"
        />
        {/* Core line */}
        <line
          x1={`${splitState.x1}%`}
          y1="0"
          x2={`${splitState.x2}%`}
          y2="100%"
          stroke="url(#seam-grad)"
          strokeWidth="3.5"
          className="opacity-90"
        />
      </svg>
    </section>
  );
}
