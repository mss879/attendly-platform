"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

// Runs after hydration but before the browser paints, so skipping never
// flashes the overlay. (Plain useEffect on the server build.)
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Gate: plays the boarding-pass intro on every refresh/load of the frontend.
 * Repeat mounts via client-side routing are skipped using a window flag.
 * Disabled entirely on the admin console pages.
 */
export function Preloader({ onComplete }: { onComplete?: () => void }) {
  const [visible, setVisible] = useState(true);

  useIsomorphicLayoutEffect(() => {
    const w = window as Window & { __preloaderShown?: boolean };
    const isAdminPath = w.location.pathname.startsWith("/admin");
    const isShownThisLoad = w.__preloaderShown === true;
    const skip =
      isAdminPath ||
      isShownThisLoad ||
      w.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (skip) {
      setVisible(false);
      onComplete?.();
      return;
    }
    w.__preloaderShown = true;
  }, []);

  if (!visible) return null;
  return (
    <PreloaderOverlay
      onDone={() => {
        setVisible(false);
        onComplete?.();
      }}
    />
  );
}

function PreloaderOverlay({ onDone }: { onDone: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing Scanner...");

  // Failsafe: if anything interrupts the outro (throttled tab, GSAP kill),
  // force-dismiss so the page can never stay locked behind the overlay.
  useEffect(() => {
    const failsafe = setTimeout(onDone, 7000);
    return () => clearTimeout(failsafe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Progress and status simulation
  useEffect(() => {
    let start = 0;
    const interval = setInterval(() => {
      start += Math.floor(Math.random() * 8) + 4;
      if (start >= 100) {
        start = 100;
        clearInterval(interval);
        setStatusText("Ticket Validated! Access Granted.");
      } else if (start > 75) {
        setStatusText("Confirming Seats...");
      } else if (start > 45) {
        setStatusText("Verifying Signature...");
      } else if (start > 15) {
        setStatusText("Decrypting QR Data...");
      } else {
        setStatusText("Reading Ticket...");
      }
      setProgress(start);
    }, 80);

    return () => clearInterval(interval);
  }, []);

  // Lock body scroll during load
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  // GSAP Entrance & Gentle Floating Loop (Runs once on mount)
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Float the ticket in
      gsap.fromTo(
        ".ticket-wrapper",
        { y: 50, opacity: 0, scale: 0.9, rotationX: -15 },
        { y: 0, opacity: 1, scale: 1, rotationX: 0, duration: 1.0, ease: "power3.out" }
      );

      // Swing ticket gently
      gsap.to(".ticket-wrapper", {
        yoyo: true,
        repeat: -1,
        y: -6,
        rotation: 0.8,
        duration: 2.0,
        ease: "sine.inOut",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // GSAP Outro Transition Timeline (Triggers only when progress hits 100%)
  useEffect(() => {
    if (progress < 100) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          // Explicitly unlock scrolling once doors are open
          document.documentElement.style.overflow = "";
          document.body.style.overflow = "";

          onDone();
        },
      });

      // Turn off scanner overlay
      tl.to(".scanner-overlay", {
        opacity: 0,
        duration: 0.3,
      });

      // Flash green validated ticket screen
      tl.to(".validated-overlay", {
        opacity: 1,
        scale: 1.05,
        duration: 0.4,
        ease: "back.out(1.8)",
      });

      // Fly ticket away
      tl.to(".ticket-wrapper", {
        scale: 0.7,
        rotationY: 180,
        z: -200,
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut",
        delay: 0.5,
      });

      // Swing doors open
      tl.to(
        ".left-panel",
        {
          rotateY: -110,
          opacity: 0,
          duration: 1.2,
          ease: "power3.inOut",
        },
        "-=0.4"
      );

      tl.to(
        ".right-panel",
        {
          rotateY: 110,
          opacity: 0,
          duration: 1.2,
          ease: "power3.inOut",
        },
        "<"
      );

      // Fade the laser background
      tl.to(
        ".preloader-bg",
        {
          opacity: 0,
          duration: 0.8,
          ease: "power2.inOut",
        },
        "<"
      );
    }, containerRef);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#f7f4f0]"
      style={{ perspective: "1500px" }}
    >
      <style>{`
        @keyframes sweep {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(380px); opacity: 0; }
        }
        .scanner-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #f97316, #ea580c, #f97316, transparent);
          box-shadow: 0 0 10px #f97316, 0 0 20px #ea580c;
          will-change: transform, opacity;
          animation: sweep 3.5s linear infinite;
        }
        @keyframes laser-drift {
          from { transform: translateY(-12svh); }
          to { transform: translateY(78svh); }
        }
        .preloader-laser {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 34svh;
          will-change: transform;
          animation: laser-drift 1.43s ease-in-out -0.715s infinite alternate;
          transition: opacity 0.25s;
        }
      `}</style>

      {/* Laser scanner background — a transform-animated CSS glow band in
          place of the old full-screen WebGL shader: same cream field and
          sweeping laser at a fraction of the GPU cost on phones. */}
      <div
        aria-hidden
        className="preloader-bg pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-300"
      >
        <div
          className={`preloader-laser ${progress === 100 ? "opacity-0" : "opacity-100"}`}
          style={{
            background:
              "linear-gradient(180deg, rgba(250,89,13,0) 0%, rgba(250,89,13,0.10) 38%, rgba(250,89,13,0.55) 50%, rgba(250,89,13,0.10) 62%, rgba(250,89,13,0) 100%)",
          }}
        />
        <div
          className={`preloader-laser ${progress === 100 ? "opacity-100" : "opacity-0"}`}
          style={{
            background:
              "linear-gradient(180deg, rgba(13,209,56,0) 0%, rgba(13,209,56,0.10) 38%, rgba(13,209,56,0.55) 50%, rgba(13,209,56,0.10) 62%, rgba(13,209,56,0) 100%)",
          }}
        />
      </div>

      {/* Double Glass Doors — plain translucent panes; backdrop-blur here
          cost two full-screen blur passes per frame on phones for a barely
          visible effect over the soft laser background */}
      <div className="absolute inset-0 flex pointer-events-none">
        <div className="left-panel w-1/2 h-full bg-[#f7f4f0]/30 border-r border-orange-950/5 origin-left shadow-[inset_-10px_0_30px_rgba(234,88,12,0.03)]" />
        <div className="right-panel w-1/2 h-full bg-[#f7f4f0]/30 border-l border-orange-950/5 origin-right shadow-[inset_10px_0_30px_rgba(234,88,12,0.03)]" />
      </div>

      {/* High-tech admitting ticket */}
      <div className="ticket-wrapper relative z-10 w-72 sm:w-80 h-[380px] bg-white/55 border border-white/60 shadow-2xl rounded-3xl p-6 flex flex-col justify-between overflow-hidden">
        {/* Neon Orange Scan line (Sweeps the QR code area) */}
        <div className="scanner-overlay absolute inset-0 pointer-events-none z-20">
          <div className="scanner-line" />
        </div>

        {/* Access Granted green holographic flash */}
        <div className="validated-overlay absolute inset-0 bg-emerald-500/95 z-30 opacity-0 flex flex-col items-center justify-center text-white p-6 scale-90 transition-all duration-300">
          <span className="text-5xl font-black">✓</span>
          <h3 className="text-xl font-black uppercase tracking-wider mt-4">
            Access Granted
          </h3>
          <p className="text-[10px] font-bold tracking-widest text-emerald-100 uppercase mt-2">
            Welcome to the Event
          </p>
        </div>

        {/* Ticket Header */}
        <div className="flex justify-between items-start border-b border-orange-950/10 pb-4">
          <div className="text-left">
            <span className="text-[9px] font-bold uppercase tracking-widest text-black">
              Event Ticket
            </span>
            <h2 className="text-xl font-black tracking-tighter text-black leading-none mt-1">
              ATTENDLY
            </h2>
          </div>
          <span className="rounded-full bg-black px-2.5 py-1 text-[7px] font-extrabold uppercase tracking-wider text-white">
            Admit One
          </span>
        </div>

        {/* QR Code Container with neon corner brackets */}
        <div className="relative mx-auto my-3 flex h-32 w-32 items-center justify-center rounded-xl bg-white p-3.5 shadow-md border border-orange-100">
          {/* Brackets */}
          <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-orange-500 rounded-tl" />
          <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-orange-500 rounded-tr" />
          <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-orange-500 rounded-bl" />
          <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-orange-500 rounded-br" />

          {/* Styled vector QR code */}
          <svg className="h-full w-full text-slate-800" viewBox="0 0 100 100">
            <path d="M0 0h30v30H0zm10 10h10v10H10zm60-10h30v30H70zm10 10h10v10H80zM0 70h30v30H0zm10 10h10v10H10zm35-70h10v10H45zm10 15h10v10H55zm-10 15h15v10H45zm15-30h10v15H60zm-15 45h10v10H45zm15 10h10v20H60zm15-20h10v10H75zm15 10h10v10H90zm-15 10h15v10H75z" fill="currentColor"/>
          </svg>
        </div>

        {/* Event details */}
        <div className="text-center py-2">
          <p className="text-[10px] font-bold text-black uppercase tracking-widest leading-none">
            Ticket Verification
          </p>
          <p className="text-xs font-black text-black uppercase tracking-tight mt-1">
            Attendly Portal Entry
          </p>
        </div>

        {/* Digital verification scan feedback */}
        <div className="border-t border-orange-950/10 pt-4 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest text-black">
            <span className="flex items-center gap-1.5">
              <span className="flex h-1.5 w-1.5 rounded-full bg-black" />
              {statusText}
            </span>
            <span className="font-mono text-black">{progress}%</span>
          </div>
          <div className="h-0.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 rounded-full ${
                progress === 100 ? "bg-emerald-500" : "bg-orange-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
