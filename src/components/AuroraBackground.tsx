"use client";

import { useEffect, useRef } from "react";

// Full-screen WebGL shader: warm, slowly drifting gradient blobs behind the
// floating app panel. Falls back to a static CSS gradient when WebGL is
// unavailable or the user prefers reduced motion.

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

float blob(vec2 uv, vec2 c, float r) {
  return smoothstep(r, 0.0, distance(uv, c));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float t = u_time * 0.12;

  // warm cream base, brighter towards the bottom like the reference
  vec3 col = mix(vec3(0.99, 0.955, 0.925), vec3(0.965, 0.885, 0.815), 1.0 - uv.y);

  vec2 c1 = vec2(0.12 + 0.06 * sin(t * 0.9), 0.95 + 0.05 * cos(t * 0.7));
  vec2 c2 = vec2(0.55 + 0.10 * cos(t * 0.6), 1.05 + 0.06 * sin(t * 0.8));
  vec2 c3 = vec2(0.98 + 0.06 * sin(t * 0.5), 0.85 + 0.08 * cos(t * 1.1));
  vec2 c4 = vec2(0.85 + 0.10 * cos(t * 0.4), 0.05 + 0.06 * sin(t * 0.9));

  col = mix(col, vec3(0.93, 0.42, 0.16), blob(uv, c1, 0.55) * 0.90); // deep orange
  col = mix(col, vec3(0.98, 0.62, 0.32), blob(uv, c2, 0.50) * 0.80); // orange
  col = mix(col, vec3(0.99, 0.76, 0.50), blob(uv, c3, 0.55) * 0.85); // peach
  col = mix(col, vec3(0.99, 0.85, 0.70), blob(uv, c4, 0.60) * 0.55); // soft peach

  gl_FragColor = vec4(col, 1.0);
}
`;

export function AuroraBackground() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    // A fresh canvas per effect run: React StrictMode re-runs effects, and a
    // canvas whose context was lost on cleanup can never render again.
    const canvas = document.createElement("canvas");
    canvas.className = "h-full w-full";
    wrap.appendChild(canvas);
    const gl = canvas.getContext("webgl", { antialias: false });
    if (!gl) {
      canvas.remove();
      return; // CSS fallback stays visible
    }

    function compile(type: number, src: string) {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, src);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        console.error("[aurora] shader compile failed:", gl!.getShaderInfoLog(shader));
      }
      return shader;
    }
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("[aurora] program link failed:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    function draw(now: number) {
      gl!.uniform2f(uRes, canvas.width, canvas.height);
      gl!.uniform1f(uTime, (now - start) / 1000);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    function resize() {
      // The output is enormous soft gradient blobs (mostly behind the app
      // panel): rendering at device resolution is invisible extra work.
      const dpr = 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      gl!.viewport(0, 0, canvas.width, canvas.height);
      // With reduced motion there is no animation loop to repaint after a
      // resize clears the buffer — draw a single fresh frame here.
      if (reduceMotion) draw(performance.now());
    }
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = 0;
    function frame(now: number) {
      if (!reduceMotion) raf = requestAnimationFrame(frame);
      // The blobs drift at u_time * 0.12 — ~30fps is indistinguishable
      // from 60 and halves the GPU work on every page.
      if (now - last < 33) return;
      last = now;
      draw(now);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="fixed inset-0 -z-10"
      style={{
        background:
          "radial-gradient(120% 90% at 15% 0%, #ee6a29 0%, #f9974f 30%, #fcd9b3 60%, #faf3ea 100%)",
      }}
    />
  );
}
