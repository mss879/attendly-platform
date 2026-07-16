"use client";

import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { runWhenPageVisible } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

// The feature act's WebGL layer: one cloud of ~4800 particles that morphs
// through four formations — seat map, payment slip, QR code, gate — as the
// visitor scrubs through the 400svh section. Loaded lazily (next/dynamic,
// ssr:false) from FeatureShowcase and never mounted for reduced-motion
// visitors; the CSS wash behind it is the fallback.
//
// Same performance contract as HeroScene:
//   * device pixel ratio capped at 1.75
//   * render loop stops when off screen or the tab is hidden
//   * all morph math lives in the vertex shader — per frame the CPU only
//     writes three uniforms

const COUNT = 16000;

const MORPH_VERT = /* glsl */ `
attribute vec3 aP1;
attribute vec3 aP2;
attribute vec3 aP3;
attribute float aRand;
attribute vec3 aColor;
attribute float aSize;
uniform float uProgress;
uniform float uTime;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float seg = clamp(uProgress, 0.0, 3.0);
  float base = min(floor(seg), 2.0);
  float f = seg - base;

  // Per-particle stagger: each dot leaves up to 25% into the transition.
  float t = smoothstep(0.0, 1.0, clamp((f - aRand * 0.25) / 0.75, 0.0, 1.0));

  vec3 from = position;
  vec3 to = aP1;
  if (base > 0.5) { from = aP1; to = aP2; }
  if (base > 1.5) { from = aP2; to = aP3; }
  vec3 p = mix(from, to, t);

  // Crisscross: in transit every dot arcs through depth on its own path.
  float transit = sin(t * 3.14159265);
  p.z += transit * (aRand - 0.5) * 2.4;
  p.x += transit * sin(aRand * 6.2832 + base * 2.1) * 0.4;

  // Idle breathing so a settled formation never freezes.
  float w = uTime * (0.5 + aRand * 0.9) + aRand * 43.0;
  p.x += sin(w) * 0.035;
  p.y += cos(w * 0.8) * 0.035;
  p.z += sin(w * 0.6) * 0.05;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float twinkle = 0.75 + 0.25 * sin(uTime * (1.2 + aRand * 2.0) + aRand * 31.0);
  gl_PointSize = aSize * uPixelRatio * twinkle * (6.4 / -mv.z);
  vColor = aColor;
  vAlpha = (0.75 + 0.25 * twinkle) * (1.0 - transit * 0.25);
}
`;

const MORPH_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float a = texture2D(uMap, gl_PointCoord).a;
  gl_FragColor = vec4(vColor, a * vAlpha);
}
`;

const jitter = (amount: number) => (Math.random() - 0.5) * amount;

/** Scene 0 — grandstand seat map: curved rows, stage at bottom, aisle gap. */
function seatFormation(): Float32Array {
  const a = new Float32Array(COUNT * 3);
  const stageCount = Math.floor(COUNT * 0.125); // 12.5% of particles for the stage
  const ROWS = 16;
  const SEATS = 40;

  for (let i = 0; i < COUNT; i++) {
    if (i < stageCount) {
      // Stage: Curved arc boundary at the bottom
      const ang = (i / stageCount) * Math.PI + jitter(0.015);
      const rx = 1.45 + jitter(0.025);
      const ry = 0.45 + jitter(0.025);
      a[i * 3] = Math.cos(ang) * rx;
      a[i * 3 + 1] = -2.15 - Math.sin(ang) * ry;
      a[i * 3 + 2] = jitter(0.03);
    } else {
      // Seating Grandstand rows
      const seatIdx = (i - stageCount) % (ROWS * SEATS);
      const r = (seatIdx / SEATS) | 0;
      const s = seatIdx % SEATS;
      const t = (s / (SEATS - 1)) * 2 - 1;
      
      // Aisle gap dividing the grandstand into left/right blocks
      const aisle = s >= 20 ? 0.18 : 0;
      a[i * 3] = t * (2.1 + r * 0.05) + aisle + jitter(0.02);
      a[i * 3 + 1] = -1.6 + r * 0.23 + t * t * 0.42 + jitter(0.02);
      a[i * 3 + 2] = -r * 0.08 + jitter(0.01);
    }
  }
  return a;
}

/** Maps u in [0,1) onto the perimeter of a rounded rectangle. */
function roundedRectPoint(u: number, w: number, h: number, r: number): [number, number] {
  const sw = w - 2 * r;
  const sh = h - 2 * r;
  const arc = (Math.PI * r) / 2;
  const L = 2 * sw + 2 * sh + 4 * arc;
  let d = u * L;
  if (d < sw) return [-sw / 2 + d, h / 2];
  d -= sw;
  if (d < arc) {
    const ang = Math.PI / 2 - d / r;
    return [sw / 2 + Math.cos(ang) * r, sh / 2 + Math.sin(ang) * r];
  }
  d -= arc;
  if (d < sh) return [w / 2, sh / 2 - d];
  d -= sh;
  if (d < arc) {
    const ang = -d / r;
    return [sw / 2 + Math.cos(ang) * r, -sh / 2 + Math.sin(ang) * r];
  }
  d -= arc;
  if (d < sw) return [sw / 2 - d, -h / 2];
  d -= sw;
  if (d < arc) {
    const ang = -Math.PI / 2 - d / r;
    return [-sw / 2 + Math.cos(ang) * r, -sh / 2 + Math.sin(ang) * r];
  }
  d -= arc;
  if (d < sh) return [-w / 2, -sh / 2 + d];
  d -= sh;
  const ang = Math.PI - d / r;
  return [-sw / 2 + Math.cos(ang) * r, sh / 2 + Math.sin(ang) * r];
}

/** Scene 1 — payment slip: rounded-rect outline, text lines, bottom barcode, verified check. */
function slipFormation(): Float32Array {
  const a = new Float32Array(COUNT * 3);
  const LINES: ReadonlyArray<readonly [number, number, number]> = [
    // [y, xStart, xEnd] — receipt text rows
    [1.35, -1.05, 0.85],
    [0.95, -1.05, 1.05],
    [0.55, -1.05, 0.55],
    [0.15, -1.05, 0.95],
    [-0.25, -1.05, 0.75], // Extra text details row
  ];
  const CHECK: ReadonlyArray<readonly [number, number, number, number]> = [
    [-0.85, -0.9, -0.2, -1.5],
    [-0.2, -1.5, 1.0, -0.4],
  ];
  const barcodeX = [-1.0, -0.85, -0.7, -0.6, -0.4, -0.2, 0.0, 0.15, 0.3, 0.5, 0.7, 0.85, 1.0];

  for (let i = 0; i < COUNT; i++) {
    const u = i / COUNT;
    let x: number;
    let y: number;
    if (u < 0.35) {
      // Slip border card
      [x, y] = roundedRectPoint((u / 0.35 + Math.random() * 0.002) % 1, 3.1, 4.1, 0.4);
      x += jitter(0.025);
      y += jitter(0.025);
    } else if (u < 0.6) {
      // Invoice rows of text
      const line = LINES[i % LINES.length];
      const t = Math.random();
      x = line[1] + (line[2] - line[1]) * t + jitter(0.015);
      y = line[0] + jitter(0.015);
    } else if (u < 0.72) {
      // Barcode strips at the bottom
      const bar = barcodeX[i % barcodeX.length];
      const t = Math.random();
      x = bar + jitter(0.008);
      y = -1.6 + t * 0.45;
    } else {
      // Verified badge checkmark
      const seg = CHECK[Math.random() < 0.42 ? 0 : 1];
      const t = Math.random();
      x = seg[0] + (seg[2] - seg[0]) * t + jitter(0.035);
      y = seg[1] + (seg[3] - seg[1]) * t + jitter(0.035);
    }
    a[i * 3] = x;
    a[i * 3 + 1] = y;
    a[i * 3 + 2] = jitter(0.05);
  }
  return a;
}

/** Scene 2 — QR code: 21x21 standard grid with 3 corner finder patterns and realistic timing. */
function qrFormation(): Float32Array {
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      // Top-Left Finder Pattern
      if (r < 7 && c < 7) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          cells.push([c, r]);
        }
      }
      // Top-Right Finder Pattern
      else if (r < 7 && c >= 14) {
        const c2 = c - 14;
        if (r === 0 || r === 6 || c2 === 0 || c2 === 6 || (r >= 2 && r <= 4 && c2 >= 2 && c2 <= 4)) {
          cells.push([c, r]);
        }
      }
      // Bottom-Left Finder Pattern
      else if (r >= 14 && c < 7) {
        const r2 = r - 14;
        if (r2 === 0 || r2 === 6 || c === 0 || c === 6 || (r2 >= 2 && r2 <= 4 && c === 2 && c <= 4)) {
          cells.push([c, r]);
        }
      }
      // Data modules & timing rows
      else {
        if (r === 6 || c === 6) {
          if ((r + c) % 2 === 0) cells.push([c, r]);
        } else {
          // Deterministic data cell patterns
          const hash = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
          if ((hash - Math.floor(hash)) < 0.46) {
            cells.push([c, r]);
          }
        }
      }
    }
  }

  const a = new Float32Array(COUNT * 3);
  const c = 0.19; // scale factor
  for (let i = 0; i < COUNT; i++) {
    const [gx, gy] = cells[i % cells.length];
    a[i * 3] = (gx - 10) * c + jitter(c * 0.38);
    a[i * 3 + 1] = (10 - gy) * c + jitter(c * 0.38);
    a[i * 3 + 2] = jitter(0.04);
  }
  return a;
}

/** Scene 3 — gate: denser circular gate ring + central success checkmark + radiating radial spoke rays. */
function gateFormation(): Float32Array {
  const a = new Float32Array(COUNT * 3);
  const RING = 1.95;
  const CHECK: ReadonlyArray<readonly [number, number, number, number]> = [
    [-0.75, -0.1, -0.22, -0.65],
    [-0.22, -0.65, 0.85, 0.5],
  ];
  for (let i = 0; i < COUNT; i++) {
    const u = i / COUNT;
    let x: number;
    let y: number;
    let z = jitter(0.05);
    if (u < 0.38) {
      // Circle scanner ring
      const ang = (u / 0.38) * Math.PI * 2 + jitter(0.008);
      const rad = RING + jitter(0.025);
      x = Math.cos(ang) * rad;
      y = Math.sin(ang) * rad;
    } else if (u < 0.65) {
      // Central success checkmark
      const seg = CHECK[Math.random() < 0.4 ? 0 : 1];
      const t = Math.random();
      x = seg[0] + (seg[2] - seg[0]) * t + jitter(0.025);
      y = seg[1] + (seg[3] - seg[1]) * t + jitter(0.025);
    } else {
      // Radiating rays spoke burst
      const spoke = i % 32;
      const ang = (spoke / 32) * Math.PI * 2 + jitter(0.008);
      const rad = 2.15 + Math.pow(Math.random(), 1.3) * 1.35;
      x = Math.cos(ang) * rad;
      y = Math.sin(ang) * rad;
      z = jitter(0.12);
    }
    a[i * 3] = x;
    a[i * 3 + 1] = y;
    a[i * 3 + 2] = z;
  }
  return a;
}

/** In-place Fisher–Yates over xyz triplets so morph paths crisscross. */
function shuffleTriplets(arr: Float32Array): Float32Array {
  const n = arr.length / 3;
  for (let i = n - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    for (let k = 0; k < 3; k++) {
      const tmp = arr[i * 3 + k];
      arr[i * 3 + k] = arr[j * 3 + k];
      arr[j * 3 + k] = tmp;
    }
  }
  return arr;
}

/** Soft round sprite drawn once on a tiny canvas — no image assets. */
function spriteTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.72, "rgba(255,255,255,0.85)"); // wider, more solid core
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export default function FeatureMorphScene() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    // The scrub range is the outer 400svh section, not the sticky viewport.
    const section = wrap.closest("section");

    // Fresh canvas per effect run (StrictMode re-runs effects; a canvas
    // with a lost context can never render again).
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 h-full w-full";
    wrap.appendChild(canvas);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      canvas.remove();
      return; // No WebGL — the CSS wash fallback stays visible.
    }
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    camera.position.z = 11.5;

    // --- Particle cloud: four formation targets baked into attributes ---
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(seatFormation(), 3));
    geometry.setAttribute("aP1", new THREE.BufferAttribute(shuffleTriplets(slipFormation()), 3));
    geometry.setAttribute("aP2", new THREE.BufferAttribute(shuffleTriplets(qrFormation()), 3));
    geometry.setAttribute("aP3", new THREE.BufferAttribute(shuffleTriplets(gateFormation()), 3));

    const rands = new Float32Array(COUNT);
    const sizes = new Float32Array(COUNT);
    const colors = new Float32Array(COUNT * 3);
    const palette = [
      new THREE.Color(0xea580c), // darker orange-600
      new THREE.Color(0xd97706), // deeper amber-600
      new THREE.Color(0xc2410c), // dark red-orange/rust (replacing cream)
    ];
    for (let i = 0; i < COUNT; i++) {
      rands[i] = Math.random();
      sizes[i] = 4.8 + Math.random() * 5.2; // larger particles to overlap and feel semi-solid
      const roll = Math.random();
      const c = palette[roll < 0.48 ? 0 : roll < 0.74 ? 1 : 2];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute("aRand", new THREE.BufferAttribute(rands, 1));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));

    const sprite = spriteTexture();
    const uniforms = {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uMap: { value: sprite },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: MORPH_VERT,
      fragmentShader: MORPH_FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
    });

    const parallax = new THREE.Group(); // pointer parallax
    const cloud = new THREE.Points(geometry, material);
    cloud.position.y = -0.7; // Shift downward to prevent overlapping headline
    parallax.add(cloud);
    scene.add(parallax);

    // --- Scroll scrub: uProgress 0..3 over the whole outer section ---
    const stopGsap = runWhenPageVisible(() => {
      const ctx = gsap.context(() => {
        if (section) {
          gsap.to(uniforms.uProgress, {
            value: 3,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.6,
            },
          });
        }
      });
      return () => ctx.revert();
    });

    // --- Pointer parallax (eased in the render loop) ---
    const pointer = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    function onPointerMove(e: PointerEvent) {
      const rect = wrap!.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    }
    (section ?? wrap).addEventListener("pointermove", onPointerMove);

    // --- Sizing: dolly the camera back on narrow screens so every
    //     formation fits the width — mobile keeps the whole picture ---
    function resize() {
      const w = wrap!.clientWidth || 1;
      const h = wrap!.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = 11.5 * Math.max(1, 1.25 / Math.max(camera.aspect, 0.01));
      camera.updateProjectionMatrix();
      uniforms.uPixelRatio.value = dpr;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // --- Render loop, gated on visibility ---
    const clock = new THREE.Clock();
    let raf = 0;
    let running = false;
    let inView = true;

    function frame() {
      const t = clock.getElapsedTime();
      uniforms.uTime.value = t;

      eased.x += (pointer.x - eased.x) * 0.05;
      eased.y += (pointer.y - eased.y) * 0.05;
      parallax.rotation.y = eased.x * 0.09;
      parallax.rotation.x = -eased.y * 0.06;

      // Slow drift so the cloud is never a static picture.
      cloud.rotation.y = Math.sin(t * 0.12) * 0.06;
      camera.position.x = Math.sin(t * 0.14) * 0.3;
      camera.position.y = Math.cos(t * 0.11) * 0.2;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    function setRunning(next: boolean) {
      if (next === running) return;
      running = next;
      if (running) {
        clock.start();
        raf = requestAnimationFrame(frame);
      } else {
        clock.stop();
        cancelAnimationFrame(raf);
      }
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        setRunning(inView && !document.hidden);
      },
      { rootMargin: "80px" }
    );
    io.observe(wrap);
    function onVisibility() {
      setRunning(inView && !document.hidden);
    }
    document.addEventListener("visibilitychange", onVisibility);
    setRunning(true);

    // Fade the canvas in over the CSS wash once the first frame is up.
    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 600ms ease";
    requestAnimationFrame(() => {
      canvas.style.opacity = "1";
    });

    return () => {
      setRunning(false);
      stopGsap();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      (section ?? wrap).removeEventListener("pointermove", onPointerMove);
      geometry.dispose();
      material.dispose();
      sprite.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  return <div ref={wrapRef} aria-hidden className="absolute inset-0" />;
}
