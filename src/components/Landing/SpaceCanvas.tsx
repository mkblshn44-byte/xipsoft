"use client";

/**
 * SpaceCanvas — WebGL2 uzay sahnesi: yıldız alanı ve nebula.
 *
 * Hero arka planında render edilir: yoğun yıldız alanı + mor/cyan nebula
 * bulutu. Tüm ağır iş GPU'da (fragment shader) yapılır.
 *
 * UYARLAMA NOTLARI:
 * - `bg-background` (Tailwind v4 shadcn token) → `bg-neon-bg` (XipSoft paleti).
 * - Ay/gezegen/deniz katmanı KALDIRILDI; yalnızca yıldız alanı ve nebula.
 *
 * FAIL-SAFE: WebGL2 desteklenmezse düz koyu zemin gösterilir (hero boş kalmaz).
 */

import { useEffect, useRef, useState } from "react";

const VERTEX_SHADER = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform float uTravel;
uniform vec2 uMouse;
out vec4 fragColor;

const vec3 VIOLET = vec3(0.56, 0.32, 1.0);
const vec3 CYAN = vec3(0.15, 0.9, 1.0);

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hash31(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i), hash31(i + vec3(1, 0, 0)), f.x),
        mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), f.x),
        mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise3(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

vec3 starfield(vec2 uv, float travel) {
  vec3 col = vec3(0.0);
  for (float i = 0.0; i < 1.0; i += 0.3334) {
    float depth = fract(i + travel);
    float scale = mix(14.0, 0.8, depth);
    float fade = depth * smoothstep(1.0, 0.85, depth);
    vec2 p = uv * scale + i * 453.2;
    vec2 gv = fract(p) - 0.5;
    float n = hash21(floor(p));
    if (fract(n * 713.7) > 0.12) continue;
    vec2 offset = vec2(n, fract(n * 34.0)) - 0.5;
    float d = length(gv - offset * 0.8);
    float size = fract(n * 345.32) * 0.022 + 0.005;
    float s = size / d;
    s = s * s * smoothstep(0.5, 0.15, d);
    vec3 tint = mix(vec3(0.9, 0.92, 1.0), mix(VIOLET, CYAN, fract(n * 91.0)), 0.25);
    col += s * tint * fade;
  }
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 parallax = uMouse * 0.025;

  vec3 col = vec3(0.012, 0.01, 0.022);

  float neb = fbm3(vec3(uv * 1.4 + parallax * 0.5, uTime * 0.015));
  vec3 nebTint = mix(VIOLET, CYAN, smoothstep(-0.6, 0.6, uv.x + neb * 0.4));
  col += nebTint * pow(neb, 3.0) * 0.16;

  col += starfield(uv + parallax, uTravel);

  float vignette = smoothstep(1.3, 0.3, length(uv * vec2(0.8, 1.0)));
  col *= mix(0.55, 1.0, vignette);

  col = col / (1.0 + col * 0.35);
  fragColor = vec4(pow(col, vec3(0.92)), 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Space shader error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// RENDER_SCALE: modül düzeyinde window.innerWidth okumak layout reflow'u
// tetikler (Lighthouse: forced reflow). Her zaman 0.75 ile başla,
// canvas mount sonrası ResizeObserver zaten doğru boyutu verir.
const RENDER_SCALE = 0.75;

export default function SpaceCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // matchMedia: layout reflow tetiklemez (window.innerWidth aksine)
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isMobile) return;
    // Mobilde canvas hiç kurulmasın: `isMobile` state'i hydration sonrası
    // döndüğü için bu effect ilk commit'te bir kez ÇALIŞIYOR ve gereksiz yere
    // WebGL2 context + shader compile yapıyordu (emüle telefon testinde
    // ölçülen israf). Sync matchMedia bu denemeyi tamamen engeller.
    if (window.matchMedia("(max-width: 768px)").matches) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) {
      setUnsupported(true);
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vs || !fs || !program) {
      setUnsupported(true);
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setUnsupported(true);
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
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uTravel = gl.getUniformLocation(program, "uTravel");
    const uMouse = gl.getUniformLocation(program, "uMouse");

    let sized = false;
    const scale = Math.min(window.devicePixelRatio || 1, 2) * RENDER_SCALE;
    const applySize = (cssWidth: number, cssHeight: number) => {
      canvas.width = Math.max(1, Math.floor(cssWidth * scale));
      canvas.height = Math.max(1, Math.floor(cssHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      sized = true;
    };
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      applySize(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(canvas);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointerMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointerMove);

    let visible = true;
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
    });
    intersection.observe(canvas);

    let frame = 0;
    let travel = 0;
    let last = performance.now();
    const startedAt = last;
    let skipCount = 0;

    const draw = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      travel += dt * 0.015;

      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uTravel, travel);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      if (sized && visible && !document.hidden) {
        skipCount = (skipCount + 1) % 2;
        if (skipCount === 0) {
          draw(now);
        } else {
          last = now;
        }
      } else {
        last = now;
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [isMobile]);

  if (isMobile) return <div className={className} aria-hidden="true"><div className="size-full bg-neon-bg" /></div>;

  return (
    <div className={className} aria-hidden="true">
      {unsupported ? (
        <div className="size-full bg-neon-bg" />
      ) : (
        <canvas ref={canvasRef} className="block size-full" style={{ willChange: "transform" }} />
      )}
    </div>
  );
}