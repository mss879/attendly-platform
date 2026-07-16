"use client";

import gsap from "gsap";
import Link from "next/link";
import { Fragment, useEffect, useRef } from "react";

// Platform hero: a pointer-reactive WebGL "flowing silk" shader in the brand
// orange/cream palette, under a GSAP-choreographed headline. Falls back to a
// static CSS gradient when WebGL is unavailable or motion is reduced.

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.3, 9.1);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv;
  float aspect = u_res.x / u_res.y;
  p.x *= aspect;
  float t = u_time * 0.09;

  // Pointer swell: the silk brightens and bulges around the cursor.
  vec2 m = u_mouse;
  m.x *= aspect;
  float md = distance(p, m);
  float push = exp(-md * 3.2) * 0.55;

  // Domain-warped fbm = flowing silk.
  vec2 q = vec2(
    fbm(p * 1.6 + vec2(t, -t * 0.7)),
    fbm(p * 1.6 - vec2(t * 0.6, t))
  );
  float v = fbm(p * 2.1 + q * 1.5 + push);
  float band = 0.5 + 0.5 * sin((p.y + q.y * 0.9 + v) * 7.5 - t * 2.2);
  float glow = smoothstep(0.30, 0.95, v) * 0.85 + band * 0.28 + push * 0.9;

  vec3 cream  = vec3(0.969, 0.957, 0.941);
  vec3 peach  = vec3(0.992, 0.855, 0.706);
  vec3 orange = vec3(0.976, 0.451, 0.086);
  vec3 ember  = vec3(0.761, 0.255, 0.047);

  vec3 col = cream;
  col = mix(col, peach, smoothstep(0.15, 0.80, glow));
  col = mix(col, orange, smoothstep(0.58, 1.10, glow) * 0.85);
  col = mix(col, ember, smoothstep(0.90, 1.35, glow) * 0.35);

  // Keep the headline zone readable: settle back to cream toward the top.
  col = mix(col, cream, smoothstep(0.45, 0.95, uv.y) * 0.88);

  // Fine grain so the gradients never band.
  col += (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Masked-rise word: the outer span clips, the inner `.hero-word` slides up. */
function Word({ children, accent = false }: { children: string; accent?: boolean }) {
  return (
    <span className="inline-block overflow-hidden pb-1 align-bottom">
      <span
        className={`hero-word inline-block ${
          accent
            ? "bg-gradient-to-r from-orange-600 via-orange-500 to-red-500 bg-clip-text text-transparent"
            : ""
        }`}
      >
        {children}
      </span>
    </span>
  );
}

const MARQUEE_ITEMS = [
  "Interactive seat maps",
  "Bank-transfer payments",
  "Slip verification",
  "QR tickets by email",
  "Gate scanning",
  "Live organizer dashboard",
];

function MarqueeRow({ hidden = false }: { hidden?: boolean }) {
  return (
    <span aria-hidden={hidden} className="flex shrink-0 items-center">
      {MARQUEE_ITEMS.map((item) => (
        <Fragment key={item}>
          <span className="whitespace-nowrap px-4 text-[11px] font-bold uppercase tracking-[0.25em] text-orange-800/60 sm:px-6">
            {item}
          </span>
          <span aria-hidden className="text-orange-500/70">
            ✦
          </span>
        </Fragment>
      ))}
    </span>
  );
}

export function ShaderHero() {
  const ref = useRef<HTMLElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  // WebGL silk shader (skipped entirely with reduced motion — the CSS
  // gradient fallback stays visible).
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    const section = ref.current;
    if (!wrap || !section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Fresh canvas per effect run (StrictMode re-runs effects; a canvas with
    // a lost context can never render again).
    const canvas = document.createElement("canvas");
    canvas.className = "h-full w-full";
    wrap.appendChild(canvas);
    const gl = canvas.getContext("webgl", { antialias: false });
    if (!gl) {
      canvas.remove();
      return;
    }

    function compile(type: number, src: string) {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, src);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        console.error("[hero] shader compile failed:", gl!.getShaderInfoLog(shader));
      }
      return shader;
    }
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("[hero] program link failed:", gl.getProgramInfoLog(program));
      canvas.remove();
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uMouse = gl.getUniformLocation(program, "u_mouse");

    // Pointer position in shader uv space (y up), eased every frame.
    const target = { x: 0.5, y: 0.35 };
    const eased = { x: 0.5, y: 0.35 };
    function onPointerMove(e: PointerEvent) {
      const rect = wrap!.getBoundingClientRect();
      target.x = (e.clientX - rect.left) / rect.width;
      target.y = 1 - (e.clientY - rect.top) / rect.height;
    }
    section.addEventListener("pointermove", onPointerMove);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(wrap!.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(wrap!.clientHeight * dpr));
      gl!.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    let raf = 0;
    function frame(now: number) {
      eased.x += (target.x - eased.x) * 0.045;
      eased.y += (target.y - eased.y) * 0.045;
      gl!.uniform2f(uRes, canvas.width, canvas.height);
      gl!.uniform1f(uTime, (now - start) / 1000);
      gl!.uniform2f(uMouse, eased.x, eased.y);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      section.removeEventListener("pointermove", onPointerMove);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, []);

  // GSAP choreography: entrance, floating chips, marquee loop.
  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-badge", { y: 16, autoAlpha: 0, duration: 0.5, clearProps: "all" })
        .from(
          ".hero-word",
          { yPercent: 120, duration: 0.85, stagger: 0.07, clearProps: "all" },
          "-=0.25"
        )
        .from(".hero-sub", { y: 18, autoAlpha: 0, duration: 0.6, clearProps: "all" }, "-=0.45")
        .from(
          ".hero-cta",
          { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.08, clearProps: "all" },
          "-=0.35"
        )
        .fromTo(
          ".hero-chip",
          { y: 26, autoAlpha: 0, scale: 0.9 },
          { y: 0, autoAlpha: 1, scale: 1, duration: 0.7, stagger: 0.12, clearProps: "transform,opacity" },
          "-=0.3"
        )
        .from(".hero-marquee", { autoAlpha: 0, duration: 0.6 }, "-=0.4");

      // Gentle perpetual float on the decorative chips.
      gsap.utils.toArray<HTMLElement>(".hero-chip").forEach((chip, i) => {
        gsap.to(chip, {
          yPercent: i % 2 ? 8 : -8,
          rotation: i % 2 ? 2.5 : -2.5,
          duration: 3 + i,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      });

      // Seamless marquee: the track holds two copies, loop by half.
      gsap.to(".hero-marquee-track", {
        xPercent: -50,
        ease: "none",
        duration: 26,
        repeat: -1,
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden rounded-t-2xl pb-0 pt-14 text-center sm:rounded-t-[28px] sm:pt-20"
    >
      {/* Shader canvas + CSS fallback */}
      <div
        ref={canvasWrapRef}
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(90% 70% at 50% 115%, #ee6a29 0%, #f9974f 32%, #fcd9b3 62%, #f7f4f0 100%)",
        }}
      />
      {/* Soft veil so text always sits on readable cream */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-2/3"
        style={{
          background:
            "linear-gradient(180deg, rgba(247,244,240,0.92) 0%, rgba(247,244,240,0.55) 55%, rgba(247,244,240,0) 100%)",
        }}
      />

      {/* Decorative floating chips */}
      <div
        aria-hidden
        className="hero-chip absolute left-6 top-28 hidden -rotate-6 rounded-2xl bg-white/50 p-4 text-left shadow-xl shadow-orange-950/10 ring-1 ring-white/60 backdrop-blur-md xl:left-16 xl:block"
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-black">Seat</p>
        <p className="mt-0.5 font-mono text-lg font-bold tracking-tight text-black">D12</p>
        <span className="mt-2 inline-flex rounded-full bg-emerald-100/80 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
          Payment verified
        </span>
      </div>
      <div
        aria-hidden
        className="hero-chip absolute right-6 top-36 hidden rotate-6 rounded-2xl bg-white/50 p-4 shadow-xl shadow-orange-950/10 ring-1 ring-white/60 backdrop-blur-md xl:right-16 xl:block"
      >
        <svg viewBox="0 0 44 44" className="h-16 w-16 text-black">
          <g fill="currentColor">
            <path d="M4 4h12v12H4zM8 8h4v4H8z" fillRule="evenodd" />
            <path d="M28 4h12v12H28zM32 8h4v4H32z" fillRule="evenodd" />
            <path d="M4 28h12v12H4zM8 32h4v4H8z" fillRule="evenodd" />
            <rect x="22" y="6" width="4" height="4" />
            <rect x="22" y="14" width="4" height="4" />
            <rect x="6" y="22" width="4" height="4" />
            <rect x="14" y="22" width="4" height="4" />
            <rect x="22" y="22" width="4" height="4" />
            <rect x="30" y="22" width="4" height="4" />
            <rect x="36" y="28" width="4" height="4" />
            <rect x="22" y="30" width="4" height="4" />
            <rect x="28" y="34" width="4" height="4" />
            <rect x="36" y="36" width="4" height="4" />
            <rect x="22" y="38" width="4" height="4" />
          </g>
        </svg>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-orange-600">
          One scan. You&apos;re in.
        </p>
      </div>

      <div className="relative px-4">
        <span className="hero-badge inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-orange-700 shadow-sm ring-1 ring-orange-200/70">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
          </span>
          The event ticketing platform
        </span>

        <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-bold tracking-tight text-black sm:text-6xl md:text-7xl">
          <Word>Every</Word> <Word>event.</Word> <Word accent>One</Word>{" "}
          <Word accent>ticket.</Word> <Word accent>One</Word> <Word accent>scan.</Word>
        </h1>

        <p className="hero-sub mx-auto mt-5 max-w-xl text-base text-black sm:text-lg">
          Attendly turns any event into a seamless experience — attendees pick
          numbered seats on a live map, pay by bank transfer, and walk in with a
          personal QR ticket. Organizers watch it all happen from one dashboard.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <span className="hero-cta inline-block">
            <Link
              href="/events"
              className="group inline-block rounded-full bg-orange-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-xl hover:shadow-orange-600/30"
            >
              Explore events
              <span className="ml-1.5 inline-block transition group-hover:translate-x-0.5">→</span>
            </Link>
          </span>
          <span className="hero-cta inline-block">
            <Link
              href="/host"
              className="inline-block rounded-full bg-white/80 px-8 py-3.5 text-sm font-bold text-black shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:bg-white"
            >
              Host your event
            </Link>
          </span>
        </div>

        <p className="hero-cta mt-6 text-xs font-bold text-black/80">
          No apps to install · No printouts · Verified payments before every ticket
        </p>
      </div>

      {/* Feature marquee riding the silk */}
      <div className="hero-marquee relative mt-14 overflow-hidden border-t border-white/40 bg-white/25 py-3 backdrop-blur-sm sm:mt-20">
        <div className="hero-marquee-track flex w-max items-center">
          <MarqueeRow />
          <MarqueeRow hidden />
        </div>
      </div>
    </section>
  );
}
