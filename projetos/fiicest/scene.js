/* Cena do capítulo "FIICEST": as bolhas da marca do evento ganham vida.
   Gotas verde-limão com a sombra vermelha deslocada (a assinatura visual da FIICEST)
   se fundem e se separam como líquido e, a cada trecho da rolagem, viram uma entrega da Quarks:
   gotas soltas → marca → paleta → alcance nas redes → telão de LED ao vivo →
   Ideathon (indústria + ciência) → prêmios → cinco kits científicos → anais → marca de novo.
   O cursor também é uma gota: ao passar perto, ela "gruda" nas formas.

   Técnica: um único plano em tela cheia com um shader de campos de distância (SDF).
   Cada forma é uma lista de até 39 cápsulas (segmentos com raios nas pontas, que também
   fazem círculos); as cápsulas se unem com mínimo suave, o que dá o aspecto de gota.

   Contrato: mount(container, { THREE }) → { update(p), resize(), destroy() } */

const N = 40; // cápsulas no shader (a última é a gota do cursor)

const VERT = /* glsl */`
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */`
  precision highp float;
  #define N ${N}
  uniform vec4 uA[N];      // pontas a e b de cada cápsula
  uniform vec2 uR[N];      // raios nas pontas (negativo = escondida)
  uniform vec3 uC[N];      // cor de cada cápsula
  uniform vec2 uCenter;    // centro da cena, em pixels do canvas
  uniform float uScale;    // pixels por unidade
  uniform float uK;        // suavidade da fusão entre as gotas
  uniform vec2 uShadow;    // deslocamento da sombra vermelha
  uniform float uLed;      // 0 → 1: modo telão de LED
  uniform float uCell;     // tamanho do pixel de LED, em pixels do canvas
  uniform float uBound;    // raio que contém toda a forma (corte rápido)

  const vec3 RED = vec3(0.78, 0.165, 0.035);

  float cro(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }
  // cápsula de raios diferentes nas pontas (Inigo Quilez, "uneven capsule")
  float sdCap(vec2 p, vec2 pa, vec2 pb, float ra, float rb) {
    p -= pa; pb -= pa;
    float h = dot(pb, pb);
    if (h < 1e-6) return length(p) - max(ra, rb);
    float b = ra - rb;
    if (b * b >= h) return min(length(p) - ra, length(p - pb) - rb);
    vec2 q = vec2(dot(p, vec2(pb.y, -pb.x)), dot(p, pb)) / h;
    q.x = abs(q.x);
    vec2 c = vec2(sqrt(h - b * b), b);
    float k = cro(c, q), m = dot(c, q), n = dot(q, q);
    if (k < 0.0) return sqrt(h * n) - ra;
    if (k > c.x) return sqrt(h * (n + 1.0 - 2.0 * q.y)) - rb;
    return m - ra;
  }
  float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }

  // distância da forma (d), da sombra (s) e a cor misturada pela proximidade
  void field(vec2 p, out float d, out float s, out vec3 col) {
    d = 1e3; s = 1e3; col = vec3(0.0);
    float ws = 0.0;
    for (int i = 0; i < N; i++) {
      vec2 r = uR[i];
      if (max(r.x, r.y) < -0.02) continue;
      vec4 g = uA[i];
      float di = sdCap(p, g.xy, g.zw, r.x, r.y);
      d = smin(d, di, uK);
      s = smin(s, sdCap(p - uShadow, g.xy, g.zw, r.x, r.y), uK);
      float w = exp(-max(di, 0.0) * 26.0) + 1e-5;
      col += uC[i] * w; ws += w;
    }
    col /= ws;
  }

  vec4 shade(vec2 p, float aa) {
    float d, s; vec3 col;
    field(p, d, s, col);
    float fill = 1.0 - smoothstep(-aa, aa, d);
    float shadow = (1.0 - smoothstep(-aa, aa, s)) * (1.0 - fill);
    float glow = exp(-max(d, 0.0) * 9.0) * 0.12 * (1.0 - fill) * (1.0 - shadow);
    vec3 rgb = col * fill + RED * shadow + col * glow;
    return vec4(rgb, max(max(fill, shadow), glow));
  }

  void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - uCenter) / uScale;
    if (length(p) > uBound) { gl_FragColor = vec4(0.0); return; }
    float aa = 1.25 / uScale;
    vec4 o = vec4(0.0);
    if (uLed < 0.999) o = shade(p, aa);
    if (uLed > 0.001) {
      // telão: a mesma imagem amostrada no centro de cada LED, com os LEDs apagados ao fundo
      vec2 cell = (floor(frag / uCell) + 0.5) * uCell;
      vec4 l = shade((cell - uCenter) / uScale, aa * 2.0);
      float dotm = 1.0 - smoothstep(uCell * 0.3, uCell * 0.44, length(frag - cell));
      vec2 sp = abs((cell - uCenter) / uScale);
      float screen = step(sp.x, 1.12) * step(sp.y, 0.74);
      vec3 ledCol = l.rgb * 1.25 + vec3(0.03, 0.05, 0.12) * (1.0 - l.a);
      float ledA = dotm * max(l.a, 0.16 * screen);
      vec4 led = vec4(ledCol * dotm, ledA);
      o = mix(o, led, uLed);
    }
    gl_FragColor = vec4(o.rgb, o.a);
  }
`;

export function mount(container, { THREE }) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, premultipliedAlpha: false });
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);
  container.append(renderer.domElement);

  const uA = Array.from({ length: N }, () => new THREE.Vector4());
  const uR = Array.from({ length: N }, () => new THREE.Vector2(-1, -1));
  const uC = Array.from({ length: N }, () => new THREE.Vector3(1, 1, 1));
  const U = {
    uA: { value: uA }, uR: { value: uR }, uC: { value: uC },
    uCenter: { value: new THREE.Vector2() }, uScale: { value: 300 }, uK: { value: 0.06 },
    uShadow: { value: new THREE.Vector2(0.045, -0.05) }, uLed: { value: 0 }, uCell: { value: 7 }, uBound: { value: 2 },
  };
  // sem mistura: o shader já entrega cor e alfa finais (canvas com alfa não pré-multiplicado)
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: U, depthTest: false, depthWrite: false });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  /* ---------- utilidades ---------- */
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const sm = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const fract = (x) => x - Math.floor(x);
  const rand = (i) => fract(Math.sin(i * 127.1 + 311.7) * 43758.5453);
  const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
  // paleta da marca (o roxo e o azul-marinho clareados para aparecer sobre o fundo escuro)
  const LIME = hex(0xc2f51a), WHITE = hex(0xf4f3f2), PURPLE = hex(0x6a4fd6), RED = hex(0xe0451f),
    NAVY = hex(0x3d6fd1), WATER = hex(0x8fd6f2), WARM = hex(0xfff3c4), GREY = hex(0xbfc6d4);
  const mixc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

  // cápsula de a até b (raios ra e rb) e círculo
  const S = (ax, ay, bx, by, ra, rb = ra, c = LIME) => ({ a: [ax, ay], b: [bx, by], ra, rb, c });
  const C = (x, y, r, c = LIME) => S(x, y, x, y, r, r, c);
  const rot = (x, y, ang) => [x * Math.cos(ang) - y * Math.sin(ang), x * Math.sin(ang) + y * Math.cos(ang)];
  // anel de segmentos (rodas, engrenagens, bacias)
  const ring = (cx, cy, R, n, r, c, a0 = 0, a1 = Math.PI * 2) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = a0 + (a1 - a0) * (i / n), q = a0 + (a1 - a0) * ((i + 1) / n);
      out.push(S(cx + Math.cos(p) * R, cy + Math.sin(p) * R, cx + Math.cos(q) * R, cy + Math.sin(q) * R, r, r, c));
    }
    return out;
  };
  // lâmpada de LED dos kits: bulbo + copo vermelho
  const bulb = (x, y, on) => [C(x, y + 0.1, 0.16, mixc(GREY, WARM, on)), S(x - 0.07, y - 0.04, x + 0.07, y - 0.04, 0.085, 0.085, RED)];

  /* ---------- a marca FIICEST, redesenhada em cápsulas (coordenadas tiradas do símbolo oficial) ---------- */
  const LOGO = (() => {
    const k = 1 / 880, X = (px) => (px - 960) * k, Y = (py) => -(py - 980) * k;
    const c = (px, py, r) => C(X(px), Y(py), r * k);
    const s = (x1, y1, x2, y2, r1, r2 = r1) => S(X(x1), Y(y1), X(x2), Y(y2), r1 * k, r2 * k);
    return [
      c(380, 560, 128), c(830, 215, 104), s(420, 470, 790, 240, 40, 30),        // par superior esquerdo
      c(890, 585, 118), c(1150, 330, 102), s(900, 560, 1130, 350, 42, 34),       // par superior direito
      c(1445, 480, 80), c(605, 735, 84),
      c(140, 880, 102), c(470, 880, 92), c(300, 1545, 84),                       // o "Y" da esquerda
      s(160, 890, 330, 1010, 40, 46), s(455, 890, 330, 1010, 38, 46), s(330, 1010, 300, 1520, 52, 58),
      c(880, 965, 112), c(615, 1460, 138), c(1440, 1350, 138),                   // a grande junção central
      s(880, 990, 940, 1215, 70, 96), s(630, 1430, 940, 1215, 80, 96), s(1400, 1330, 940, 1215, 80, 96),
      c(1010, 1572, 88), c(1695, 1532, 94), c(490, 1682, 62),
      s(1100, 96, 1240, 88, 22), s(560, 212, 690, 168, 22), s(1480, 160, 1590, 208, 20),   // salpicos
      s(196, 520, 268, 420, 20), s(78, 1170, 108, 1310, 20), s(262, 1730, 348, 1850, 22),
    ];
  })();
  const logo = (t, scale = 0.8) => LOGO.map((q, i) => {
    const br = 1 + 0.035 * Math.sin(t * 1.6 + i * 0.7);   // respiração sutil das gotas
    const dx = 0.012 * Math.sin(t * 0.9 + i), dy = 0.012 * Math.cos(t * 0.8 + i * 1.3);
    return { a: [(q.a[0] + dx) * scale, (q.a[1] + dy) * scale], b: [(q.b[0] + dx) * scale, (q.b[1] + dy) * scale], ra: q.ra * br * scale, rb: q.rb * br * scale, c: q.c };
  });

  /* ---------- as formas de cada trecho (t: tempo, u: progresso dentro do trecho) ---------- */
  const FRAMES = [
    // 0 · gotas soltas que se atraem
    (t, u) => Array.from({ length: 26 }, (_, i) => {
      const th = i * 2.399 + t * 0.06 * (i % 2 ? 1 : -1), rr = (0.3 + rand(i) * 0.7) * (1 - 0.3 * sm(0, 0.6, u));
      return C(Math.cos(th) * rr * 1.15 + 0.06 * Math.sin(t * 0.7 + i), Math.sin(th) * rr * 0.85 + 0.06 * Math.cos(t * 0.6 + i * 2), 0.03 + rand(i + 9) * 0.07);
    }),
    // 1 · a marca
    (t) => logo(t),
    // 2 · paleta: cinco gotas, uma por cor
    (t) => {
      const cols = [WHITE, LIME, PURPLE, RED, NAVY], out = [];
      cols.forEach((c, i) => {
        const x = -0.88 + i * 0.44, y = 0.07 * Math.sin(t * 1.3 + i * 0.9);
        out.push(C(x, y, 0.185, c));
        const a = t * 0.8 + i * 1.3;   // uma gotinha da mesma cor orbita cada uma
        out.push(C(x + Math.cos(a) * 0.3, y + Math.sin(a) * 0.3, 0.035, c));
      });
      return out;
    },
    // 3 · alcance: 3 de 24 gotas (12,5%) ficam perto do perfil; as outras 21 (87,5%) vão longe
    (t) => {
      const out = [C(0, 0, 0.19, LIME)];
      for (let i = 0; i < 24; i++) {
        const follower = i % 8 === 0;
        const f = fract(t * (follower ? 0.12 : 0.16) + rand(i) * 1.7);
        const th = i * 2.399, R = follower ? 0.24 + f * 0.22 : 0.24 + f * 1.0;
        const r = (follower ? 0.06 : 0.055) * (1 - f * 0.55) * sm(0, 0.08, f) * (1 - sm(0.9, 1, f));
        out.push(C(Math.cos(th) * R * 1.15, Math.sin(th) * R * 0.85, r > 0.004 ? r : -0.05, follower ? WHITE : LIME));
      }
      return out;
    },
    // 4 · ao vivo: telão de LED com o "REC" piscando e um equalizador
    (t) => {
      const out = [C(-0.82, 0.48, 0.07 * (0.75 + 0.25 * Math.sin(t * 5)), RED)];
      for (let i = 0; i < 11; i++) {
        const x = -0.75 + i * 0.15;
        const hgt = 0.1 + 0.62 * Math.abs(Math.sin(t * 2.7 + i * 1.7) * Math.sin(t * 1.1 + i * 0.6));
        out.push(S(x, -0.42, x, -0.42 + hgt, 0.05, 0.05, i % 4 === 3 ? WHITE : LIME));
      }
      // botão de play
      out.push(S(0.66, 0.44, 0.66, 0.08, 0.035), S(0.66, 0.44, 0.95, 0.26, 0.035), S(0.66, 0.08, 0.95, 0.26, 0.035));
      return out;
    },
    // 5 · Ideathon: a engrenagem da indústria encontra o átomo da ciência
    (t, u) => {
      const f = ease(sm(0.05, 0.55, u)), gx = -0.62 * (1 - f), ax = 0.62 * (1 - f), out = [];
      const spin = t * 0.5;
      out.push(...ring(gx, 0, 0.36, 8, 0.045, PURPLE, spin, spin + Math.PI * 2));
      for (let i = 0; i < 8; i++) {
        const a = spin + (i + 0.5) * (Math.PI / 4);
        out.push(S(gx + Math.cos(a) * 0.38, Math.sin(a) * 0.38, gx + Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.06, 0.045, PURPLE));
      }
      out.push(C(ax, 0, 0.13, LIME));
      for (let i = 0; i < 4; i++) {
        const a = t * (1.2 + i * 0.25) + i * 1.6, e = [0.24, 0.12, -0.12, 0.3][i];
        const [ex, ey] = rot(Math.cos(a) * 0.27, Math.sin(a) * 0.1, e * 4);
        out.push(C(ax + ex, ey, 0.04, i % 2 ? WHITE : LIME));
      }
      return out;
    },
    // 6 · prêmios: o cheque e as moedas que saltam dele
    (t) => {
      const out = [S(-0.62, -0.32, 0.62, -0.32, 0.2, 0.2, LIME), S(-0.3, -0.3, 0.42, -0.36, 0.025, 0.025, PURPLE)];
      for (let i = 0; i < 8; i++) {
        const f = fract(t * 0.3 + i / 8), tx = -0.85 + (i / 7) * 1.7;
        const x = lerp(0, tx, f), y = -0.1 + 4 * 0.85 * f * (1 - f);
        const r = 0.075 * sm(0, 0.12, f) * (1 - sm(0.85, 1, f));
        out.push(C(x, y, r > 0.004 ? r : -0.05, i < 4 ? WHITE : LIME));
      }
      return out;
    },
    // 7 · gerador de manivela: a roda gira e a lâmpada acende
    (t) => {
      const w = t * 2.6, W = [0.35, 0.08], R = 0.38, glow = 0.6 + 0.4 * Math.sin(t * 7) ** 2;
      const out = [S(-0.85, -0.55, 0.85, -0.55, 0.05), S(0.15, -0.5, W[0], W[1], 0.04, 0.035), S(0.55, -0.5, W[0], W[1], 0.04, 0.035)];
      out.push(...ring(W[0], W[1], R, 10, 0.034, LIME, w, w + Math.PI * 2));
      for (let i = 0; i < 4; i++) { const a = w + i * (Math.PI / 2); out.push(S(W[0], W[1], W[0] + Math.cos(a) * R, W[1] + Math.sin(a) * R, 0.022, 0.018)); }
      out.push(C(W[0], W[1], 0.06, WHITE));
      const h = [W[0] + Math.cos(w) * R, W[1] + Math.sin(w) * R];
      out.push(S(h[0], h[1], h[0] + 0.02, h[1] + 0.16, 0.03, 0.03, RED));                 // manivela
      out.push(S(-0.55, -0.5, -0.55, -0.14, 0.05), ...bulb(-0.55, -0.02, glow));
      out.push(S(-0.5, -0.42, 0.15, -0.46, 0.012, 0.012, GREY));
      return out;
    },
    // 8 · lâmpada de água salgada: bolhas nas plaquinhas e a luz chegando
    (t) => {
      const on = sm(0.2, 0.9, fract(t * 0.18)) * 0.85 + 0.15, B = [0.32, -0.06];
      const out = [S(-0.85, -0.55, 0.85, -0.55, 0.05)];
      out.push(...ring(B[0], B[1], 0.4, 6, 0.028, WHITE, Math.PI * 1.05, Math.PI * 1.95));
      out.push(S(B[0] - 0.3, B[1] - 0.17, B[0] + 0.3, B[1] - 0.17, 0.13, 0.13, WATER));
      out.push(S(0.08, -0.5, 0.1, -0.38, 0.035), S(0.56, -0.5, 0.54, -0.38, 0.035));
      out.push(S(0.2, 0.28, 0.2, -0.22, 0.02, 0.02, GREY), S(0.44, 0.28, 0.44, -0.22, 0.02, 0.02, GREY));
      out.push(S(0.2, 0.28, -0.42, 0.14, 0.011, 0.011, RED), S(0.44, 0.28, -0.4, 0.06, 0.011, 0.011, GREY));
      out.push(S(-0.55, -0.5, -0.55, -0.1, 0.05), ...bulb(-0.55, 0.04, on));
      for (let i = 0; i < 3; i++) {
        const f = fract(t * 0.6 + i / 3), x = (i % 2 ? 0.44 : 0.2) + 0.03 * Math.sin(t * 4 + i);
        out.push(C(x, -0.24 + f * 0.18, 0.025 * (1 - f) + 0.004, WHITE));
      }
      return out;
    },
    // 9 · laboratório magnético: anéis que flutuam na haste e um ímã em U
    (t) => {
      const out = [S(-0.85, -0.55, 0.85, -0.55, 0.05), S(-0.3, -0.5, -0.3, 0.68, 0.028, 0.022, WHITE)];
      for (let k = 0; k < 4; k++) {
        const y = -0.43 + k * 0.27 + (k ? 0.035 * Math.sin(t * 2.2 + k * 1.3) : 0);
        out.push(S(-0.48, y, -0.12, y, 0.055, 0.055, k % 2 ? PURPLE : RED));
      }
      // ímã em U: braço vermelho (N) e roxo (S)
      out.push(S(0.32, 0.36, 0.32, -0.06, 0.07, 0.07, RED), S(0.72, 0.36, 0.72, -0.06, 0.07, 0.07, PURPLE));
      out.push(...ring(0.52, -0.06, 0.2, 3, 0.07, GREY, Math.PI, Math.PI * 2));
      // limalha alinhada às linhas de campo entre os polos
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (0.15 + i * 0.175), j = 0.012 * Math.sin(t * 6 + i);
        out.push(C(0.52 + Math.cos(a) * 0.2 + j, 0.4 + Math.sin(a) * 0.12, 0.018, WHITE));
      }
      return out;
    },
    // 10 · carrinho de água salgada: anda para lá e para cá, rodas girando
    (t) => {
      const x = 0.18 * Math.sin(t * 0.9), roll = -x / 0.15;
      const out = [S(x - 0.6, -0.18, x + 0.6, -0.18, 0.1, 0.1, NAVY)];
      [-0.4, 0.42].forEach((wx) => {
        out.push(C(x + wx, -0.4, 0.15, WHITE), C(x + wx, -0.4, 0.05, RED));
        const [dx, dy] = rot(0.12, 0, roll);
        out.push(S(x + wx - dx, -0.4 - dy, x + wx + dx, -0.4 + dy, 0.022, 0.022, GREY));
      });
      out.push(S(x - 0.24, -0.06, x - 0.3, 0.24, 0.03, 0.03, WHITE), S(x + 0.16, -0.06, x + 0.22, 0.24, 0.03, 0.03, WHITE));
      out.push(S(x - 0.24, -0.06, x + 0.16, -0.06, 0.03, 0.03, WHITE), S(x - 0.17, 0.05, x + 0.11, 0.05, 0.09, 0.09, WATER));
      out.push(C(x + 0.42, -0.04, 0.085, LIME), S(x + 0.42, -0.04, x + 0.42, -0.4, 0.014, 0.014, RED));
      out.push(S(x - 0.12, 0.3, x - 0.12, 0.02, 0.014, 0.014, RED), S(x + 0.04, 0.3, x + 0.04, 0.02, 0.014, 0.014, GREY));
      for (let i = 0; i < 4; i++) {                                                     // faixas da pista passando
        const px = fract(i / 4 + t * 0.25) * 2.2 - 1.1;
        out.push(S(px, -0.64, px + 0.16, -0.64, 0.016, 0.016, GREY));
      }
      return out;
    },
    // 11 · eletroscópio: o bastão eletrizado se aproxima e as folhas se abrem
    (t) => {
      const ph = 0.5 - 0.5 * Math.cos(t * 1.1), charge = sm(0.35, 1, ph);
      const out = [];
      // caixa de acrílico
      out.push(S(-0.45, -0.55, 0.45, -0.55, 0.02, 0.02, WHITE), S(-0.45, -0.55, -0.45, 0.32, 0.02, 0.02, WHITE),
        S(0.45, -0.55, 0.45, 0.32, 0.02, 0.02, WHITE), S(-0.45, 0.32, 0.45, 0.32, 0.02, 0.02, WHITE));
      out.push(C(0, 0.55, 0.08, GREY), S(0, 0.5, 0, -0.08, 0.025, 0.025, GREY));
      const a = 0.06 + 0.5 * charge;
      [-1, 1].forEach((sgn) => {
        const ex = Math.sin(a) * 0.36 * sgn, ey = -0.08 - Math.cos(a) * 0.36;
        out.push(S(0, -0.08, ex, ey, 0.03, 0.012, LIME));
        out.push(C(ex * 0.6, -0.08 + (ey + 0.08) * 0.6, 0.018 * charge + (charge > 0.05 ? 0 : -0.05), RED));
      });
      // bastão de acrílico chegando pela direita
      const bx = lerp(0.85, 0.16, ph), by = lerp(0.72, 0.6, ph);
      out.push(S(bx, by, bx + 0.5, by + 0.18, 0.04, 0.04, WHITE));
      return out;
    },
    // 12 · anais: um livro aberto, páginas folheando e ideias subindo
    (t) => {
      const sp = [0, -0.42], L = 0.82, out = [];
      out.push(S(sp[0], sp[1], sp[0] - L, sp[1] + 0.05, 0.03, 0.03, PURPLE), S(sp[0], sp[1], sp[0] + L, sp[1] + 0.05, 0.03, 0.03, PURPLE));
      for (let i = 0; i < 5; i++) {
        const al = Math.PI - 0.12 - i * 0.07, ar = 0.12 + i * 0.07;
        out.push(S(sp[0], sp[1], sp[0] + Math.cos(al) * L, sp[1] + Math.sin(al) * L * 0.55, 0.016, 0.016, WHITE));
        out.push(S(sp[0], sp[1], sp[0] + Math.cos(ar) * L, sp[1] + Math.sin(ar) * L * 0.55, 0.016, 0.016, WHITE));
      }
      const fl = ease(fract(t * 0.35)), af = lerp(0.45, Math.PI - 0.45, fl);
      out.push(S(sp[0], sp[1], sp[0] + Math.cos(af) * L, sp[1] + Math.sin(af) * L * 0.75, 0.02, 0.02, LIME));
      for (let i = 0; i < 5; i++) {
        const f = fract(t * 0.22 + i / 5), x = (i - 2) * 0.2 + 0.06 * Math.sin(t + i);
        const r = 0.055 * sm(0, 0.15, f) * (1 - sm(0.8, 1, f));
        out.push(C(x, -0.05 + f * 0.85, r > 0.004 ? r : -0.05, LIME));
      }
      return out;
    },
    // 13 · de volta à marca, com as entregas orbitando
    (t) => {
      const out = logo(t, 0.84);
      const cols = [LIME, WHITE, PURPLE, RED, NAVY, LIME, WHITE, WATER];
      cols.forEach((c, i) => {
        const a = t * 0.35 + i * (Math.PI / 4);
        out.push(C(Math.cos(a) * 1.18, Math.sin(a) * 0.98, 0.045, c));
      });
      return out;
    },
  ];
  const K = FRAMES.length;
  // suavidade da fusão em cada trecho: a marca é bem "líquida", os kits ficam mais nítidos
  const SOFT = [0.07, 0.06, 0.05, 0.06, 0.05, 0.06, 0.05, 0.025, 0.025, 0.025, 0.025, 0.02, 0.03, 0.06];

  /* ---------- enquadramento ---------- */
  let small = false, w = 1, h = 1;
  const resize = () => {
    w = container.clientWidth; h = container.clientHeight;
    renderer.setSize(w, h, false);
    small = w < 760;
    const cx = small ? w * 0.5 : w * (w > 1100 ? 0.66 : 0.6), cy = small ? h * 0.62 : h * 0.56;   // y do shader cresce para cima
    const sc = small ? Math.min(w * 0.38, h * 0.26) : Math.min(w * 0.24, h * 0.34);
    U.uCenter.value.set(cx * DPR, cy * DPR);
    U.uScale.value = sc * DPR;
    U.uCell.value = Math.max(5, Math.round(sc / 34)) * DPR;
  };
  resize();

  /* ---------- a gota do cursor ---------- */
  const mouse = { x: 0, y: 0, r: -0.05, tx: 0, ty: 0, on: false };
  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return;
    const b = container.getBoundingClientRect();
    const inside = e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
    mouse.on = inside;
    if (!inside) return;
    const sc = U.uScale.value / DPR;
    mouse.tx = (e.clientX - b.left - U.uCenter.value.x / DPR) / sc;
    mouse.ty = (b.bottom - e.clientY - U.uCenter.value.y / DPR) / sc;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  /* ---------- só desenha quando o palco está na tela ---------- */
  let visible = true;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 });
  io.observe(container);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hidden = (F, i) => {
    if (!F.length) return { a: [0, 0], b: [0, 0], ra: -0.08, rb: -0.08, c: LIME };
    const q = F[i % F.length];
    const m = [(q.a[0] + q.b[0]) / 2, (q.a[1] + q.b[1]) / 2];
    return { a: m, b: m, ra: -0.08, rb: -0.08, c: q.c };
  };

  let progress = 0, shown = 0, raf = 0, t = 0, last = performance.now();
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible) return;
    if (!still) t += dt;
    shown += (progress - shown) * Math.min(1, still ? 1 : dt * 3.5);   // rolagem amortecida
    const x = Math.min(0.9999, clamp(shown) || 0) * K;
    const seg = Math.floor(x), u = x - seg;
    const m = seg < K - 1 ? ease(sm(0.62, 1, u)) : 0;
    const A = FRAMES[seg](t, u), B = m > 0 ? FRAMES[seg + 1](t, 0) : null;

    let bound = 0;
    for (let i = 0; i < N - 1; i++) {
      const p = A[i] || hidden(A, i), q = B ? (B[i] || hidden(B, i)) : p;
      const ax = lerp(p.a[0], q.a[0], m), ay = lerp(p.a[1], q.a[1], m), bx = lerp(p.b[0], q.b[0], m), by = lerp(p.b[1], q.b[1], m);
      const ra = lerp(p.ra, q.ra, m), rb = lerp(p.rb, q.rb, m);
      uA[i].set(ax, ay, bx, by); uR[i].set(ra, rb);
      uC[i].set(lerp(p.c[0], q.c[0], m), lerp(p.c[1], q.c[1], m), lerp(p.c[2], q.c[2], m));
      if (Math.max(ra, rb) > 0) bound = Math.max(bound, Math.hypot(ax, ay) + ra, Math.hypot(bx, by) + rb);
    }
    // cursor: a gota segue o mouse com atraso e cresce ao entrar no palco
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 8);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 8);
    mouse.r += ((mouse.on && !still ? 0.06 : -0.05) - mouse.r) * Math.min(1, dt * 6);
    uA[N - 1].set(mouse.x, mouse.y, mouse.x, mouse.y); uR[N - 1].set(mouse.r, mouse.r); uC[N - 1].set(...LIME);
    if (mouse.r > 0) bound = Math.max(bound, Math.hypot(mouse.x, mouse.y) + mouse.r);

    const led = seg === 4 ? 1 - m : seg === 3 ? m : 0;
    U.uLed.value = led;
    U.uK.value = lerp(SOFT[seg], SOFT[Math.min(K - 1, seg + 1)], m);
    U.uBound.value = Math.max(bound + 0.25, led > 0 ? 1.4 : 0);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  return {
    update(p) { progress = Number.isFinite(p) ? p : 0; },
    resize,
    destroy() {
      cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('pointermove', onMove);
      mat.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
