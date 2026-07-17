"use client";

import * as THREE from "three";
import { useEffect, useRef } from "react";

// Stadium-night WebGL layer for the host CTA panel: a full-frame shader
// plane — near-black navy with three sweeping amber/orange spotlight cones
// softened by drifting fbm haze — plus a layer of rising ember particles.
// Loaded lazily (next/dynamic, ssr:false) and never mounted for reduced
// motion; the panel's radial-glow CSS background is the fallback.
//
// Same performance contract as HeroScene:
//   * device pixel ratio capped at 1.75
//   * the render loop fully stops when the panel scrolls off screen or the
//     tab is hidden (IntersectionObserver + visibilitychange)
//   * embers animate entirely in the vertex shader — no per-frame buffer
//     writes or allocations

const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const NIGHT_FRAG = /* glsl */ `
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
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(13.7, 7.1);
    a *= 0.5;
  }
  return v;
}

// Soft-edged light cone from origin o aimed at angle (radians): angular
// falloff makes the wedge, exponential distance falloff fades the throw.
float beam(vec2 p, vec2 o, float angle, float halfWidth) {
  vec2 d = p - o;
  float len = length(d);
  float a = atan(d.y, d.x);
  float off = abs(atan(sin(a - angle), cos(a - angle)));
  float cone = smoothstep(halfWidth, halfWidth * 0.15, off);
  return cone * exp(-len * 0.72);
}

void main() {
  vec2 uv = vUv;
  vec2 p = vec2(uv.x * uAspect, uv.y);
  float t = uTime;

  // The rig hangs above the frame; origins sway toward the pointer.
  vec2 sway = (uMouse - 0.5) * vec2(0.24, 0.10);
  vec2 o1 = vec2(uAspect * 0.20, 1.22) + sway;
  vec2 o2 = vec2(uAspect * 0.52, 1.34) + sway * 0.6;
  vec2 o3 = vec2(uAspect * 0.84, 1.20) + sway;

  const float DOWN = -1.5708;
  float b1 = beam(p, o1, DOWN + 0.20 + sin(t * 0.21) * 0.42, 0.15);
  float b2 = beam(p, o2, DOWN + sin(t * 0.15 + 2.1) * 0.50, 0.19);
  float b3 = beam(p, o3, DOWN - 0.20 + sin(t * 0.26 + 4.2) * 0.38, 0.13);

  // Drifting fbm haze makes the cones read as volumetric light.
  float haze = fbm(p * 2.3 + vec2(t * 0.035, -t * 0.02));
  float warm = (b1 + b3) * (0.5 + 0.8 * haze);
  float hot = b2 * (0.5 + 0.8 * haze);

  // Keep the copy zone readable: dim the light toward the panel center.
  float center = distance(vec2(p.x, uv.y), vec2(uAspect * 0.5, 0.52));
  float shade = 1.0 - 0.45 * (1.0 - smoothstep(0.25, 0.75, center));
  warm *= shade;
  hot *= shade;

  vec3 navy   = vec3(0.008, 0.024, 0.090);
  vec3 amber  = vec3(0.984, 0.749, 0.141);
  vec3 orange = vec3(0.976, 0.451, 0.086);
  vec3 emberR = vec3(0.863, 0.149, 0.149);

  vec3 col = navy;
  // Faint stage-floor bounce along the bottom edge.
  col += emberR * 0.06 * smoothstep(0.35, 0.0, uv.y) * (0.5 + 0.5 * haze);
  col += orange * warm * 0.62;
  col += amber * hot * 0.58;
  col += amber * (warm + hot) * (warm + hot) * 0.10;

  // Fine grain so the dark gradients never band.
  col += (hash(gl_FragCoord.xy + t) - 0.5) * 0.014;

  gl_FragColor = vec4(col, 1.0);
}
`;

// Embers rise, wrap and twinkle purely in the vertex shader (uTime-driven).
const EMBER_VERT = /* glsl */ `
attribute float aSeed;
attribute float aSpeed;
attribute vec3 aColor;
uniform float uTime;
uniform float uPixelRatio;
varying float vAlpha;
varying vec3 vColor;

void main() {
  vec3 pos = position;
  float span = 6.5;
  pos.y = mod(position.y + uTime * aSpeed + span * 0.5, span) - span * 0.5;
  pos.x += sin(uTime * (0.25 + aSeed * 0.35) + aSeed * 31.0) * 0.3;

  float tw = 0.55 + 0.45 * sin(uTime * (1.3 + aSeed * 2.2) + aSeed * 47.0);
  vAlpha = tw * (1.0 - smoothstep(2.3, 3.1, abs(pos.y)));
  vColor = aColor;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = uPixelRatio * (2.0 + aSeed * 3.5) * (0.35 + 0.65 * tw) * (6.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const EMBER_FRAG = /* glsl */ `
precision mediump float;
varying float vAlpha;
varying vec3 vColor;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.08, d) * vAlpha;
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColor, a * 0.85);
}
`;

const EMBER_COUNT = 200;

export default function HostScene() {
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
        // Soft glow beams don't need MSAA on high-DPI phone panels.
        antialias: window.innerWidth >= 768,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      canvas.remove();
      return; // No WebGL — the CSS radial-glow fallback stays visible.
    }
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
    camera.position.z = 6.2;

    // --- Spotlight shader plane: camera-filling backdrop ---
    const nightUniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uAspect: { value: 1 },
    };
    const night = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        vertexShader: QUAD_VERT,
        fragmentShader: NIGHT_FRAG,
        uniforms: nightUniforms,
        depthWrite: false,
      })
    );
    night.position.z = -8;
    scene.add(night);

    // --- Rising embers ---
    const positions = new Float32Array(EMBER_COUNT * 3);
    const seeds = new Float32Array(EMBER_COUNT);
    const speeds = new Float32Array(EMBER_COUNT);
    const colors = new Float32Array(EMBER_COUNT * 3);
    const palette = [
      new THREE.Color(0xfbbf24),
      new THREE.Color(0xf97316),
      new THREE.Color(0xfde8d0),
    ];
    for (let i = 0; i < EMBER_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6.5;
      positions[i * 3 + 2] = -2 + Math.random() * 3;
      seeds[i] = Math.random();
      speeds[i] = 0.12 + Math.random() * 0.28;
      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    emberGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    emberGeo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
    emberGeo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    const emberUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
    };
    const emberMat = new THREE.ShaderMaterial({
      vertexShader: EMBER_VERT,
      fragmentShader: EMBER_FRAG,
      uniforms: emberUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const embers = new THREE.Points(emberGeo, emberMat);
    scene.add(embers);

    // --- Pointer: beams sway toward the cursor (eased in the loop) ---
    const pointer = { x: 0.5, y: 0.5 };
    const eased = { x: 0.5, y: 0.5 };
    function onPointerMove(e: PointerEvent) {
      const rect = wrap!.getBoundingClientRect();
      pointer.x = (e.clientX - rect.left) / rect.width;
      pointer.y = 1 - (e.clientY - rect.top) / rect.height;
    }
    (section ?? wrap).addEventListener("pointermove", onPointerMove);

    // --- Sizing ---
    function resize() {
      const w = wrap!.clientWidth || 1;
      const h = wrap!.clientHeight || 1;
      // Lower backing-store cap on phones — the glow beams hide it.
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 1.75);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Scale the shader plane to exactly fill the frustum at its depth.
      const dist = camera.position.z - night.position.z;
      const planeH = 2 * dist * Math.tan((camera.fov * Math.PI) / 360);
      night.scale.set(planeH * camera.aspect, planeH, 1);
      nightUniforms.uAspect.value = camera.aspect;
      emberUniforms.uPixelRatio.value = dpr;
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
      nightUniforms.uTime.value = t;
      emberUniforms.uTime.value = t;

      eased.x += (pointer.x - eased.x) * 0.04;
      eased.y += (pointer.y - eased.y) * 0.04;
      nightUniforms.uMouse.value.set(eased.x, eased.y);

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

    // Fade the canvas in over the CSS glow once the first frame is up.
    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 600ms ease";
    requestAnimationFrame(() => {
      canvas.style.opacity = "1";
    });

    return () => {
      setRunning(false);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      (section ?? wrap).removeEventListener("pointermove", onPointerMove);
      night.geometry.dispose();
      (night.material as THREE.Material).dispose();
      emberGeo.dispose();
      emberMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  return <div ref={wrapRef} aria-hidden className="absolute inset-0" />;
}
