/* Fundo atmosférico: um campo de "quarks" agrupados em trios (como bárions),
   ligados por "glúons". As partículas fazem morph entre formações conforme a
   rolagem — nuvem → barras → ondas → circuito → anel → cristal → esfera —
   e reagem ao cursor. Uma única malha de pontos + uma de linhas: leve e fluida. */

import * as THREE from '../vendor/three.module.min.js';
import { reducedMotion, isTouch } from './core.js';

const PALETTE = [new THREE.Color('#f2a65a'), new THREE.Color('#3fa58c'), new THREE.Color('#7fe7f2')];

/* ---------- Geradores de formação (centros de trios) ---------- */
const rand = mulberry32(7);
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r = (a, b) => a + (b - a) * rand();

const FORMATIONS = [
  // 0 · nuvem de bárions
  { spread: 0.22, fn: (i, n) => { const u = r(0, 1), th = r(0, Math.PI * 2), ph = Math.acos(r(-1, 1)), R = 7.5 * Math.cbrt(u); return [R * Math.sin(ph) * Math.cos(th) * 1.5, R * Math.sin(ph) * Math.sin(th) * 0.75, R * Math.cos(ph) * 0.6 - 1]; } },
  // 1 · barras (IDEB: Sergipe × Brasil)
  { spread: 0.12, fn: (i, n) => {
    const vals = [5.4, 6.0, 4.4, 5.0, 4.0, 4.3];
    const b = i % 6, h = vals[b] * 1.05;
    const x = 2.2 + (Math.floor(b / 2) * 2.0) + (b % 2) * 0.75;
    return [x + r(-0.25, 0.25), -3.6 + r(0, h), r(-0.3, 0.3)];
  } },
  // 2 · linhas de campo (ondas)
  { spread: 0.1, fn: (i, n) => { const k = i % 9, x = r(-11, 11); return [x, (k - 4) * 0.85 + Math.sin(x * 0.45 + k * 0.7) * 0.9, -1.5 + Math.cos(x * 0.3 + k) * 1.2]; } },
  // 3 · circuito: grade em perspectiva com trilhas
  { spread: 0.08, fn: (i, n) => {
    const g = 0.9, cols = 22;
    const onX = rand() > 0.5;
    const lane = Math.floor(r(-8, 8)) * g;
    const t = r(-cols / 2, cols / 2) * g;
    const x = onX ? t : lane, z = onX ? lane : t;
    return [x, -2.8 + z * 0.08, z - 2];
  } },
  // 4 · anel orbital (toro inclinado)
  { spread: 0.14, fn: (i, n) => { const u = r(0, Math.PI * 2), v = r(0, Math.PI * 2), R = 5.2, rr = 0.7 * Math.sqrt(rand()); const x = (R + rr * Math.cos(v)) * Math.cos(u), y = (R + rr * Math.cos(v)) * Math.sin(u), z = rr * Math.sin(v); return [x * 1.1, y * 0.42 + z * 0.3, z - y * 0.5 - 1.5]; } },
  // 5 · rede cristalina (cúbica)
  { spread: 0.16, fn: (i, n) => { const s = 1.35, nx = 11, ny = 7, nz = 5; const a = i % (nx * ny * nz); const x = (a % nx) - (nx - 1) / 2, y = (Math.floor(a / nx) % ny) - (ny - 1) / 2, z = Math.floor(a / (nx * ny)) - (nz - 1) / 2; return [x * s - 1.5, y * s * 0.85, z * s - 2]; } },
  // 6 · esfera (núcleo / planeta)
  { spread: 0.18, fn: (i, n) => { const k = i + 0.5, ph = Math.acos(1 - (2 * k) / n), th = Math.PI * (1 + Math.sqrt(5)) * k, R = 4.2; return [R * Math.cos(th) * Math.sin(ph) + 3.5, R * Math.sin(th) * Math.sin(ph), R * Math.cos(ph) - 2]; } },
];

const VERT = /* glsl */`
  attribute vec3 color;
  attribute float aSeed;
  uniform float uTime;
  uniform vec3 uMouse;
  uniform float uMouseOn;
  uniform float uSize;
  uniform float uPixel;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vec3 p = position;
    float s = aSeed * 6.2831;
    p += vec3(sin(uTime * 0.55 + s), cos(uTime * 0.47 + s * 1.3), sin(uTime * 0.39 + s * 0.7)) * 0.07;
    vec2 d = p.xy - uMouse.xy;
    float dist = length(d);
    float f = smoothstep(2.4, 0.0, dist) * uMouseOn;
    p.xy += normalize(d + 1e-4) * f * 0.85;
    p.z += f * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixel * (0.7 + aSeed * 0.6) * (10.0 / -mv.z);
    vColor = color + f * 0.35;
    vFade = smoothstep(26.0, 6.0, -mv.z);
  }
`;
const FRAG_POINTS = /* glsl */`
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    float a = pow(core, 1.8) + smoothstep(0.12, 0.0, d) * 0.6;
    gl_FragColor = vec4(vColor, a * uOpacity * vFade);
  }
`;
const FRAG_LINES = /* glsl */`
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vFade;
  void main() { gl_FragColor = vec4(vColor, uOpacity * vFade); }
`;

export function createField(canvas, { sections = [] } = {}) {
  if (!canvas) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    canvas.remove();
    return null;
  }
  if (reducedMotion) { canvas.remove(); return null; }

  const small = window.innerWidth < 760 || isTouch;
  const TRIOS = small ? 420 : 900;
  const N = TRIOS * 3;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 14);
  const group = new THREE.Group();
  scene.add(group);

  /* formações pré-calculadas (mesmo índice de partícula em todas → morph contínuo) */
  const forms = FORMATIONS.map(({ fn, spread }) => {
    const arr = new Float32Array(N * 3);
    for (let t = 0; t < TRIOS; t++) {
      const [cx, cy, cz] = fn(t, TRIOS);
      const rot = r(0, Math.PI * 2);
      for (let k = 0; k < 3; k++) {
        const a = rot + (k * Math.PI * 2) / 3;
        const j = (t * 3 + k) * 3;
        arr[j] = cx + Math.cos(a) * spread;
        arr[j + 1] = cy + Math.sin(a) * spread;
        arr[j + 2] = cz + r(-0.5, 0.5) * spread;
      }
    }
    return arr;
  });

  const positions = new Float32Array(forms[0]);
  const colors = new Float32Array(N * 3);
  const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const c = PALETTE[i % 3];
    const dim = 0.75 + rand() * 0.25;
    colors[i * 3] = c.r * dim; colors[i * 3 + 1] = c.g * dim; colors[i * 3 + 2] = c.b * dim;
    seeds[i] = rand();
  }

  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.BufferAttribute(colors, 3);
  const seedAttr = new THREE.BufferAttribute(seeds, 1);

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uMouseOn: { value: 0 },
    uSize: { value: small ? 5.5 : 6.5 },
    uPixel: { value: dpr },
  };

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', posAttr);
  pGeo.setAttribute('color', colAttr);
  pGeo.setAttribute('aSeed', seedAttr);
  const pMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG_POINTS,
    uniforms: { ...uniforms, uOpacity: { value: 0.95 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  group.add(points);

  /* glúons: cada trio forma um triângulo */
  const idx = new Uint16Array(TRIOS * 6);
  for (let t = 0; t < TRIOS; t++) {
    const b = t * 3;
    idx.set([b, b + 1, b + 1, b + 2, b + 2, b], t * 6);
  }
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', posAttr);
  lGeo.setAttribute('color', colAttr);
  lGeo.setAttribute('aSeed', seedAttr);
  lGeo.setIndex(new THREE.BufferAttribute(idx, 1));
  const lMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG_LINES,
    uniforms: { ...uniforms, uOpacity: { value: 0.13 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(lGeo, lMat);
  lines.frustumCulled = false;
  group.add(lines);

  /* ---------- formação alvo a partir da rolagem ---------- */
  let marks = [];
  const measure = () => {
    marks = sections.map((el) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      return { top, bottom: top + rect.height, f: parseFloat(el.dataset.formation) || 0 };
    }).sort((a, b) => a.top - b.top);
  };
  const targetFormation = () => {
    if (!marks.length) return 0;
    const y = window.scrollY + window.innerHeight * 0.5;
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i];
      if (y < m.bottom || i === marks.length - 1) {
        if (y < m.top) return m.f;
        const p = (y - m.top) / Math.max(1, m.bottom - m.top);
        const next = marks[i + 1];
        if (next && p > 0.72) return m.f + (next.f - m.f) * ((p - 0.72) / 0.28);
        return m.f;
      }
    }
    return 0;
  };

  /* ---------- interação ---------- */
  const ndc = new THREE.Vector2(9, 9);
  let mouseOn = 0, mouseTarget = 0;
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  if (!isTouch) {
    window.addEventListener('pointermove', (e) => {
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      mouseTarget = 1;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { mouseTarget = 0; });
  }

  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 760 ? 19 : 14;
    camera.updateProjectionMatrix();
    measure();
  };
  window.addEventListener('resize', resize);
  resize();
  // as seções crescem quando os dados JSON chegam: re-medir
  const ro = new ResizeObserver(() => measure());
  ro.observe(document.body);

  /* ---------- loop ---------- */
  let f = targetFormation();
  let lastScroll = window.scrollY, vel = 0;
  let running = true;
  const clock = new THREE.Clock();
  const ease = (t) => t * t * (3 - 2 * t);

  const frame = () => {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    const tf = targetFormation();
    f += (tf - f) * Math.min(1, dt * 2.6);
    const i0 = Math.max(0, Math.min(FORMATIONS.length - 1, Math.floor(f)));
    const i1 = Math.min(FORMATIONS.length - 1, i0 + 1);
    const tt = f - i0;
    const A = forms[i0], B = forms[i1];
    for (let i = 0; i < N; i++) {
      // atraso por partícula: o morph se propaga como uma onda
      const local = ease(Math.min(1, Math.max(0, tt * 1.6 - seeds[i] * 0.6)));
      const j = i * 3;
      positions[j] = A[j] + (B[j] - A[j]) * local;
      positions[j + 1] = A[j + 1] + (B[j + 1] - A[j + 1]) * local;
      positions[j + 2] = A[j + 2] + (B[j + 2] - A[j + 2]) * local;
    }
    posAttr.needsUpdate = true;

    // velocidade de rolagem → leve torção do grupo
    const sy = window.scrollY;
    vel += ((sy - lastScroll) - vel) * 0.1;
    lastScroll = sy;
    group.rotation.y += ((ndc.x * 0.12 * mouseTarget + time * 0.02 + vel * 0.0015) - group.rotation.y) * 0.04;
    group.rotation.x += ((-ndc.y * 0.06 * mouseTarget + vel * 0.0008) - group.rotation.x) * 0.04;

    mouseOn += (mouseTarget - mouseOn) * 0.05;
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) group.worldToLocal(hit);
    for (const m of [pMat, lMat]) {
      m.uniforms.uTime.value = time;
      m.uniforms.uMouse.value.copy(hit);
      m.uniforms.uMouseOn.value = mouseOn;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };

  document.addEventListener('visibilitychange', () => {
    const vis = !document.hidden;
    if (vis && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame); }
    else if (!vis) running = false;
  });

  requestAnimationFrame(frame);
  document.documentElement.classList.add('has-field');
  return { measure };
}
