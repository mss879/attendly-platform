"use client";

import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { runWhenPageVisible } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

// The hero's WebGL layer, in a single three.js canvas: the flowing silk
// shader as a full-frame backdrop, two floating 3D boarding-pass tickets,
// and a drifting ember particle field. Loaded lazily (next/dynamic,
// ssr:false) and never mounted when the visitor prefers reduced motion —
// the CSS gradient behind it is the fallback.
//
// Performance rules baked in:
//   * device pixel ratio capped at 1.75
//   * the render loop fully stops when the hero scrolls off screen or the
//     tab is hidden (IntersectionObserver + visibilitychange)
//   * one shared clock drives shader time, floats and parallax — no
//     per-frame allocations

const SILK_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SILK_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uMouse;
uniform float uAspect;

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
  vec2 uv = vUv;
  vec2 p = uv;
  p.x *= uAspect;
  float t = uTime * 0.09;

  // Pointer swell: the silk brightens and bulges around the cursor.
  vec2 m = uMouse;
  m.x *= uAspect;
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
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Deterministic QR-ish block pattern (1 = filled cell on a 12x12 grid). */
const QR_CELLS = [
  [4, 1], [6, 1], [8, 1], [5, 2], [9, 2], [4, 3], [7, 3],
  [1, 4], [3, 4], [6, 4], [9, 4], [11, 4], [2, 5], [5, 5], [8, 5],
  [1, 6], [4, 6], [7, 6], [10, 6], [3, 7], [6, 7], [9, 7],
  [4, 8], [8, 8], [11, 8], [5, 9], [7, 9], [10, 9],
  [4, 10], [6, 10], [9, 10], [11, 11], [5, 11], [8, 11],
];

/** Draws the ticket face onto a 2D canvas — no image assets needed. */
function drawTicketTexture(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 768;
  const ctx = c.getContext("2d")!;

  // Card base
  ctx.fillStyle = "#fdfbf8";
  ctx.fillRect(0, 0, 512, 768);
  const edge = ctx.createLinearGradient(0, 0, 512, 768);
  edge.addColorStop(0, "rgba(249,115,22,0.10)");
  edge.addColorStop(0.5, "rgba(249,115,22,0)");
  edge.addColorStop(1, "rgba(220,38,38,0.08)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, 512, 768);

  // Header
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "700 22px Arial";
  ctx.fillText("EVENT TICKET", 48, 84);
  ctx.font = "900 52px Arial";
  ctx.fillText("ATTENDLY", 46, 142);
  // "Admit one" pill
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.roundRect(336, 58, 130, 40, 20);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 17px Arial";
  ctx.fillText("ADMIT ONE", 352, 84);

  // Divider
  ctx.strokeStyle = "rgba(10,10,10,0.14)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(40, 180);
  ctx.lineTo(472, 180);
  ctx.stroke();
  ctx.setLineDash([]);

  // QR panel with orange corner brackets
  const qx = 116, qy = 232, qs = 280;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qx - 24, qy - 24, qs + 48, qs + 48, 24);
  ctx.fill();
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 8;
  const b = 34;
  for (const [cx, cy, dx, dy] of [
    [qx - 24, qy - 24, 1, 1],
    [qx + qs + 24, qy - 24, -1, 1],
    [qx - 24, qy + qs + 24, 1, -1],
    [qx + qs + 24, qy + qs + 24, -1, -1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * b, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * b);
    ctx.stroke();
  }
  // Finder squares + data cells
  const cell = qs / 12;
  ctx.fillStyle = "#1e293b";
  for (const [fx, fy] of [
    [0, 0],
    [9, 0],
    [0, 9],
  ]) {
    ctx.fillRect(qx + fx * cell, qy + fy * cell, cell * 3, cell * 3);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qx + (fx + 1) * cell - 2, qy + (fy + 1) * cell - 2, cell + 4, cell + 4);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(qx + (fx + 1) * cell + 4, qy + (fy + 1) * cell + 4, cell - 8, cell - 8);
  }
  for (const [gx, gy] of QR_CELLS) {
    ctx.fillRect(qx + gx * cell + 1, qy + gy * cell + 1, cell - 2, cell - 2);
  }

  // Caption: seat details, like a real event ticket
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "700 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("ROW D · SEAT 12 · GATE 1", 256, 596);
  ctx.fillStyle = "#c2410c";
  ctx.font = "800 24px Arial";
  ctx.fillText("ONE SCAN. YOU'RE IN.", 256, 630);
  ctx.textAlign = "left";

  // Barcode strip
  let bx = 56;
  ctx.fillStyle = "#1e293b";
  const widths = [3, 8, 4, 10, 3, 6, 9, 3, 5, 8, 3, 10, 4, 6, 3, 9, 5, 3, 8, 4, 6, 10, 3, 5, 9, 4, 3, 8, 6, 3];
  for (const w of widths) {
    ctx.fillRect(bx, 668, w, 56);
    bx += w + 7;
  }
  return c;
}

/** Rounded-rectangle extrusion = the 3D ticket body. */
function ticketGeometry(): THREE.ExtrudeGeometry {
  const w = 1.6, h = 2.4, r = 0.14;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.center();
  return geo;
}

export default function HeroScene() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
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
        // Phones: high-DPI panels already hide edge aliasing — skip the
        // MSAA cost there. Desktop keeps it.
        antialias: window.innerWidth >= 768,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      canvas.remove();
      return; // No WebGL — the CSS gradient fallback stays visible.
    }
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
    camera.position.z = 6.2;

    // --- Silk backdrop: a camera-filling plane far behind the tickets ---
    const silkUniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.35) },
      uAspect: { value: 1 },
    };
    const silk = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        vertexShader: SILK_VERT,
        fragmentShader: SILK_FRAG,
        uniforms: silkUniforms,
        depthWrite: false,
      })
    );
    silk.position.z = -8;
    scene.add(silk);

    // --- Lights ---
    scene.add(new THREE.HemisphereLight(0xfff7ee, 0xf5dcc3, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(3, 5, 6);
    scene.add(key);
    const rim = new THREE.PointLight(0xf97316, 14, 12);
    rim.position.set(-3.5, -2, 3);
    scene.add(rim);

    // --- Tickets ---
    const faceTexture = new THREE.CanvasTexture(drawTicketTexture());
    faceTexture.colorSpace = THREE.SRGBColorSpace;
    faceTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    // Front/back UVs of an ExtrudeGeometry are the shape's xy coords —
    // normalize them into 0..1 through the texture transform.
    faceTexture.wrapS = faceTexture.wrapT = THREE.ClampToEdgeWrapping;
    faceTexture.repeat.set(1 / 1.6, 1 / 2.4);
    faceTexture.offset.set(0.5, 0.5);

    const faceMaterial = new THREE.MeshPhysicalMaterial({
      map: faceTexture,
      roughness: 0.34,
      metalness: 0,
      clearcoat: 0.65,
      clearcoatRoughness: 0.35,
    });
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: 0xf3ece2,
      roughness: 0.6,
    });

    const geometry = ticketGeometry();
    const parallax = new THREE.Group(); // pointer parallax
    const scroller = new THREE.Group(); // scroll scrub
    scroller.add(parallax);
    scene.add(scroller);

    interface TicketRig {
      float: THREE.Group;
      mesh: THREE.Mesh;
      phase: number;
      base: { x: number; y: number; z: number };
    }
    const tickets: TicketRig[] = [];
    const specs = [
      { pos: [-2.75, -0.1, -0.5], rot: [-0.1, 0.52, 0.13], scale: 0.92, phase: 0 },
      { pos: [2.75, 0.15, -0.8], rot: [-0.04, -0.58, -0.12], scale: 0.74, phase: 2.1 },
    ] as const;
    // Phones: the copy owns the center of the narrow frame, so the tickets
    // shrink and tuck into the quiet corners instead — bottom-left above
    // the marquee, top-right beside the logo band.
    const phoneSpecs = [
      { pos: [-0.64, -1.12, -0.6], scale: 0.42 },
      { pos: [0.72, 1.72, -0.8], scale: 0.28 },
    ] as const;
    for (const spec of specs) {
      const mesh = new THREE.Mesh(geometry, [faceMaterial, sideMaterial]);
      mesh.rotation.set(spec.rot[0], spec.rot[1], spec.rot[2]);
      mesh.scale.setScalar(spec.scale);
      const float = new THREE.Group();
      float.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      float.add(mesh);
      parallax.add(float);
      tickets.push({
        float,
        mesh,
        phase: spec.phase,
        base: { x: spec.pos[0], y: spec.pos[1], z: spec.pos[2] },
      });
    }

    // --- Ember particles ---
    const COUNT = 260;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const palette = [
      new THREE.Color(0xf97316),
      new THREE.Color(0xfbbf24),
      new THREE.Color(0xfde8d0),
    ];
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = -3 + Math.random() * 5;
      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    // Soft round sprite drawn once on a tiny canvas.
    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = spriteCanvas.height = 64;
    const sctx = spriteCanvas.getContext("2d")!;
    const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.6)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);
    const spriteTexture = new THREE.CanvasTexture(spriteCanvas);
    const particleMat = new THREE.PointsMaterial({
      size: 0.09,
      map: spriteTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    parallax.add(particles);

    // --- Entrance choreography + scroll scrub (GSAP owns mesh transforms
    //     it animates; the rAF loop only writes to the float/parallax
    //     groups, so they never fight). Deferred until the page is visible
    //     so the drop-in can never freeze mid-flight in a hidden tab. ---
    const scroll = { p: 0 };
    const stopGsap = runWhenPageVisible(() => {
      const ctx = gsap.context(() => {
        tickets.forEach((t, i) => {
          gsap.from(t.mesh.position, {
            y: -3.2,
            duration: 1.5,
            delay: 0.35 + i * 0.18,
            ease: "power3.out",
          });
          gsap.from(t.mesh.rotation, {
            y: t.mesh.rotation.y + (i % 2 ? -1.4 : 1.4),
            duration: 1.6,
            delay: 0.35 + i * 0.18,
            ease: "power3.out",
          });
        });
        if (section) {
          gsap.to(scroll, {
            p: 1,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "bottom top",
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
      silkUniforms.uMouse.value.set(
        (e.clientX - rect.left) / rect.width,
        1 - (e.clientY - rect.top) / rect.height
      );
    }
    (section ?? wrap).addEventListener("pointermove", onPointerMove);

    // --- Sizing ---
    function resize() {
      const w = wrap!.clientWidth || 1;
      const h = wrap!.clientHeight || 1;
      // Fill rate is the phone bottleneck: cap the backing store lower
      // there — soft shader gradients and sprites hide the difference.
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 1.75);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Scale the silk plane to exactly fill the frustum at its depth.
      const dist = camera.position.z - silk.position.z;
      const planeH = 2 * dist * Math.tan((camera.fov * Math.PI) / 360);
      silk.scale.set(planeH * camera.aspect, planeH, 1);
      silkUniforms.uAspect.value = camera.aspect;
      // Ticket layout per breakpoint. The float group's y is rewritten from
      // `base` every frame, so the base moves too — not just the group.
      const phone = window.matchMedia("(max-width: 639px)").matches;
      tickets.forEach((ticket, i) => {
        const spec = phone ? phoneSpecs[i] : specs[i];
        ticket.base = { x: spec.pos[0], y: spec.pos[1], z: spec.pos[2] };
        ticket.float.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
        ticket.mesh.scale.setScalar(spec.scale);
      });
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
      silkUniforms.uTime.value = t;

      eased.x += (pointer.x - eased.x) * 0.05;
      eased.y += (pointer.y - eased.y) * 0.05;
      parallax.rotation.y = eased.x * 0.07;
      parallax.rotation.x = -eased.y * 0.05;

      for (const ticket of tickets) {
        ticket.float.position.y =
          ticket.base.y + Math.sin(t * 0.8 + ticket.phase) * 0.09;
        ticket.float.rotation.z = Math.sin(t * 0.55 + ticket.phase) * 0.045;
        ticket.float.rotation.y = Math.sin(t * 0.4 + ticket.phase * 1.7) * 0.07;
      }

      particles.rotation.y = t * 0.016;
      particles.position.y = Math.sin(t * 0.3) * 0.12 + scroll.p * 1.4;

      // Scroll scrub: tickets tip back and sink as the hero leaves.
      scroller.position.y = -scroll.p * 1.6;
      scroller.rotation.x = -scroll.p * 0.5;

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

    // Fade the canvas in over the CSS gradient once the first frame is up.
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
      faceMaterial.dispose();
      sideMaterial.dispose();
      faceTexture.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      spriteTexture.dispose();
      silk.geometry.dispose();
      (silk.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  return <div ref={wrapRef} aria-hidden className="absolute inset-0" />;
}
