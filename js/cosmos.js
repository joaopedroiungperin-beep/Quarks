/* COSMOS — fundo narrativo do site: o ciclo de vida de uma estrela.
   A rolagem é o "tempo cósmico" (uPhase, contínuo de 0 a 8):

     0 Nebulosa · 1 Colapso gravitacional · 2 Ignição · 3 Supernova
     4 Magnetar · 5 Buraco negro + radiação Hawking · 6 Evaporação e rasgo
     (bolha de novo vácuo) · 7 Universo estranho (gravidade intensa, mar de
     polaritons) · 8 Rasgo tridimensional (tempo dilatado, eletricidade estática,
     forças se unificando) · 9 Grande Colapso · 10 Singularidade → Big Bang

   Ao clicar num projeto, seguimos uma partícula virtual que escapou do
   horizonte até um buraco de minhoca (transição de página); a página do
   projeto começa saindo do outro lado.

   Arquitetura (leve):
   • um shader procedural de tela cheia renderizado em resolução reduzida
     (nebulosa, lente gravitacional, campo de dipolo, onda de choque, túnel);
   • um sistema de partículas sem estado na GPU (posições calculadas no
     vertex shader a partir de sementes + fase + tempo);
   • uma partícula "seguida" com rastro, controlada em JS.
   Tudo pausa com a aba oculta; com "reduzir movimento" renderiza só um
   quadro estático por fase. */

import * as THREE from '../vendor/three.module.min.js';
import { reducedMotion, isTouch } from './core.js';
import { t } from './i18n.js';

/* ---------- legendas educativas ---------- */
const CAPTIONS = [
  ['Nebulosa', 'berçário estelar de gás e poeira, a 10–100 K'],
  ['Colapso gravitacional', 'a nuvem contrai e gira mais rápido, conservando o momento angular'],
  ['Ignição', 'fusão de hidrogênio no núcleo, a ~15 milhões de K'],
  ['Supernova', '~10⁴⁴ J liberados em poucos segundos'],
  ['Magnetar', 'estrela de nêutrons com campo de até ~10¹¹ T; uma volta a cada poucos segundos'],
  ['Buraco negro', 'radiação Hawking: pares virtuais no horizonte, T ∝ 1/M'],
  ['Evaporação e rasgo', 'o buraco negro evapora; um falso vácuo decai e uma bolha de novo vácuo se expande (hipótese)'],
  ['Universo estranho', 'gravidade mais intensa e um mar de polaritons, onde luz e matéria se acoplam; o cursor cria um vórtice quântico (especulativo)'],
  ['Rasgo tridimensional', 'gravidade extrema: o tempo quase para, a eletricidade congela e as forças forte, fraca e eletromagnética se aproximam (hipótese da Grande Unificação)'],
  ['Grande Colapso', 'toda matéria e energia se comprimem rumo a um único ponto (Big Crunch, hipotético)'],
  ['Singularidade → Big Bang', 'densidade infinita num ponto infinitesimal… e tudo recomeça'],
];
const WORMHOLE_CAPTION = ['Buraco de minhoca', 'ponte de Einstein–Rosen, ainda hipotética'];

const COMMON = /* glsl */`
  float bump(float x, float c, float w) { return clamp(1.0 - abs(x - c) / w, 0.0, 1.0); }
  float sm(float a, float b, float x) { return smoothstep(a, b, x); }
  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
`;

const BG_VERT = /* glsl */`
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const BG_FRAG = /* glsl */`
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime, uPhase, uMouseOn, uWarp, uAspect, uDim, uSide, uBang, uTunnelZ, uTunnelDim, uWarpHide;
  uniform vec2 uMouse, uCenter, uWarpC;
  uniform int uOct;
  ${COMMON}

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 6; i++) { if (i >= uOct) break; v += a * noise(p); p = m * p; a *= 0.5; }
    return v;
  }
  // versão barata (3 oitavas) para distorção de domínio e detalhes secundários
  float fbm3(vec2 p) {
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    float v = 0.5 * noise(p); p = m * p; v += 0.25 * noise(p); p = m * p; v += 0.125 * noise(p);
    return v * 1.143;
  }

  const vec3 CYAN = vec3(0.50, 0.91, 0.95);
  const vec3 ORANGE = vec3(0.95, 0.65, 0.35);
  const vec3 GREEN = vec3(0.25, 0.65, 0.55);
  const vec3 DEEP = vec3(0.10, 0.07, 0.22);
  const vec3 VIOLET = vec3(0.62, 0.50, 1.0);

  vec3 stars(vec2 p) {
    vec3 col = vec3(0.0);
    for (int k = 0; k < 2; k++) {
      float sc = k == 0 ? 42.0 : 95.0;
      vec2 g = p * sc; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
      float h = hash(id + float(k) * 17.0);
      if (h > 0.9) {
        vec2 o = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
        float d = length(f - o * 0.6);
        float tw = 0.65 + 0.35 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
        vec3 tint = mix(vec3(0.65, 0.88, 1.0), vec3(1.0, 0.82, 0.62), hash(id + 1.3));
        col += tint * smoothstep(0.22, 0.0, d) * tw * (k == 0 ? 0.9 : 0.45);
      }
    }
    return col;
  }

  void main() {
    vec2 q = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    float p = uPhase, t = uTime;
    vec2 m = uMouse, c = uCenter;

    float wNeb = bump(p, 0.0, 1.2);
    float wCol = bump(p, 1.0, 1.0);
    float wStar = bump(p, 2.0, 1.0);
    float wSN = bump(p, 3.0, 1.0);
    float eSN = sm(2.35, 3.7, p);
    float wMag = bump(p, 4.0, 1.0);
    float wBH = bump(p, 5.0, 1.0);
    float wRift = bump(p, 6.0, 1.0);
    float wOdd = bump(p, 7.0, 1.0);
    float w3D = bump(p, 8.0, 1.0);             // rasgo tridimensional / unificação
    float crunch = sm(8.4, 9.85, p);           // grande colapso
    float wSing = sm(9.3, 10.0, p);            // singularidade

    vec2 d = q - c; float r = length(d) + 1e-4;
    const float RS = 0.085;
    float evap = sm(5.15, 6.0, p);            // evaporação: o horizonte encolhe
    float RSv = RS * (1.0 - 0.92 * evap);
    float eB = sm(5.85, 6.9, p);              // bolha do novo vácuo

    /* lente gravitacional: buraco negro + cursor (mini-lente) */
    vec2 ql = q - d / r * (wBH * 0.024 * (1.0 - 0.8 * evap) + wOdd * 0.012 + w3D * 0.03) / (r + 0.03);
    vec2 dm = q - m; float rm = length(dm) + 1e-4;
    ql -= dm / rm * (uMouseOn * (0.0012 + 0.0035 * wBH + 0.006 * wOdd)) / (rm + 0.03);

    vec3 st = stars(ql + vec2(0.0, t * 0.003));
    if (crunch > 0.01) {                       // a luz das estrelas escorre para o centro
      for (int i = 1; i < 5; i++) st += stars(c + (ql - c) * (1.0 + float(i) * 0.08 * crunch)) * (1.0 - float(i) * 0.2) * crunch;
    }
    vec3 col = st * (0.55 + 0.3 * wBH) * (1.0 - 0.95 * wSing);

    /* nebulosa → colapso em disco protoestelar */
    float wNebAll = wNeb + wCol * 0.95 + wStar * 0.6 + wRift * 0.08;
    if (wNebAll > 0.01) {
      float ck = wCol + wStar * 0.8;
      vec2 dd = ql - c; float rr = length(dd);
      vec2 np = c + rot(ck * 1.4 / (rr * 5.0 + 0.35) + t * 0.03 * ck) * dd * mix(1.0, 2.6, ck);
      vec2 dmm = np - m;
      float g = uMouseOn * (wNeb + wCol * 0.6) * exp(-dot(dmm, dmm) * 18.0);
      np = m + rot(g * 2.4) * dmm * (1.0 - g * 0.25);              // vórtice no cursor
      vec2 w = vec2(fbm3(np * 1.6 + vec2(0.0, t * 0.02)), fbm3(np * 1.6 + vec2(5.2, 1.3) - t * 0.015));
      float n = fbm(np * 2.2 + w * 1.8);
      float n2 = fbm3(np * 4.0 + w * 3.0 + 3.0);
      vec3 neb = mix(DEEP, CYAN * 0.7, sm(0.35, 0.8, n));
      neb = mix(neb, ORANGE, sm(0.55, 0.95, n2) * 0.6);
      neb = mix(neb, GREEN, sm(0.6, 0.9, w.x) * 0.35);
      float dens = sm(0.3, 0.85, n);
      dens *= mix(1.0, exp(-rr * rr * 14.0) * 2.2 + 0.12, ck);
      float lit = 1.0 + wStar * 0.9 * exp(-rr * 3.0)
                + wStar * uMouseOn * 1.4 * exp(-dot(q - m, q - m) * 26.0);   // luz da estrela revela poeira
      col += neb * dens * lit * (0.72 + 0.3 * wNeb) * wNebAll;
    }

    /* protoestrela / estrela */
    float core = wCol * 0.4 + wStar * 0.85 + wSN * (1.0 - eSN) * 1.1;
    if (core > 0.01) {
      float glow = 0.0014 / (r * r + 0.0009);
      float corona = fbm3(vec2(atan(d.y, d.x) * 3.0, r * 8.0 - t * 0.6));
      col += vec3(1.0, 0.85, 0.6) * glow * core * (0.7 + 0.6 * corona);
      col += CYAN * exp(-r * 9.0) * core * 0.25 * (1.0 + 0.2 * sin(t * 2.0));
    }

    /* supernova: onda de choque com filamentos */
    if (wSN > 0.01) {
      float R = eSN * 1.25;
      float shell = exp(-pow((r - R) / (0.03 + 0.08 * eSN), 2.0));
      float fil = fbm(vec2(atan(d.y, d.x) * 6.0, r * 10.0) + t * 0.05);
      vec3 sc = mix(vec3(1.0, 0.95, 0.85), ORANGE, eSN);
      sc = mix(sc, CYAN, fil * 0.5);
      col += sc * shell * (0.4 + fil) * wSN * 1.3;
      col += vec3(1.0, 0.9, 0.8) * exp(-r * r * 60.0) * bump(eSN, 0.08, 0.12) * 1.3;
      col += ORANGE * (1.0 - sm(0.0, R + 1e-3, r)) * fil * 0.18 * wSN;
    }

    /* magnetar: linhas de campo de dipolo (r = L·sin²θ) + feixes girando */
    if (wMag > 0.01) {
      vec2 qd = q;
      vec2 tm = m - qd; qd += tm * 0.35 * uMouseOn * exp(-dot(tm, tm) * 10.0);   // o cursor curva o campo
      vec2 dv = rot(-t * 0.9) * (qd - c);
      float rr = length(dv) + 1e-4;
      float s = abs(dv.x) / rr;
      float L = rr / max(s * s, 1e-3);
      float f = fract(log(L * 9.0) * 1.7);
      float line = (1.0 - sm(0.0, 0.07, abs(f - 0.5))) * sm(0.02, 0.07, rr) * exp(-rr * 1.6) * (1.0 - sm(0.9, 1.6, L));
      col += CYAN * line * 0.75 * wMag;
      float ang = abs(dv.x) / (abs(dv.y) + 0.02);
      col += mix(vec3(1.0), ORANGE, 0.4) * exp(-ang * ang * 40.0) * exp(-rr * 0.9) * 0.55 * wMag;
      col += vec3(0.9, 0.97, 1.0) * 0.0007 / (rr * rr + 0.0002) * wMag;
    }

    /* buraco negro: anel de fótons, disco de acreção com Doppler, horizonte */
    if (wBH > 0.01) {
      float tex = fbm3(vec2(atan(d.y, d.x) * 4.0 - t * 1.2, r * 30.0));
      col += mix(ORANGE, vec3(1.0, 0.92, 0.8), tex) * exp(-pow((r - RSv * 1.5) / (RSv * 0.13), 2.0)) * (0.6 + 0.6 * tex) * wBH;
      col += ORANGE * exp(-pow((r - RSv * 2.0) / (RSv * 0.35), 2.0)) * sm(-0.01, RSv * 0.8, d.y) * 0.55 * wBH;   // face oculta do disco, lenteada
      col += CYAN * exp(-pow((r - RS) / (RSv * 0.09), 2.0)) * (0.25 + 1.4 * evap) * wBH;                       // brilho Hawking (T ∝ 1/M)
      col = mix(col, col * sm(RSv * 0.92, RSv * 1.02, r), wBH);                                                // horizonte
      vec2 de = vec2(d.x, d.y / 0.27); float re = length(de);
      float disk = sm(RSv * 1.6, RSv * 2.2, re) * (1.0 - sm(RSv * 3.2, RSv * 5.5, re));
      float dtex = fbm(vec2(atan(de.y, de.x) * 4.0 - t * 1.4, re * 28.0));
      float dop = 0.45 + 0.55 * clamp(-de.x / (re + 1e-4), -1.0, 1.0) * 0.5 + 0.275;
      float front = d.y < 0.0 ? 1.0 : sm(RSv * 1.0, RSv * 1.12, r);
      col += mix(ORANGE, vec3(1.0, 0.9, 0.75), dtex) * disk * (0.45 + dtex) * dop * front * 0.95 * wBH * (1.0 - evap);
    }
    col += vec3(0.9, 0.95, 1.0) * exp(-r * r * 260.0) * bump(p, 5.95, 0.12) * 3.0;   // flash final da evaporação


    /* rasgo no espaço-tempo e bolha de novo vácuo (decaimento do falso vácuo) */
    if (wRift > 0.01 || (eB > 0.01 && eB < 0.999)) {
      float span = sm(5.5, 6.2, p) * 0.75 * (1.0 - sm(6.6, 7.2, p));
      float xr = c.x + (fbm3(vec2(q.y * 4.0, 3.1)) - 0.5) * 0.12 + (noise(vec2(q.y * 22.0, t * 0.6)) - 0.5) * 0.015;
      float dx = abs(q.x - xr);
      float along = 1.0 - sm(span * 0.6, span + 1e-3, abs(q.y - c.y));
      float open = sm(5.6, 6.3, p);
      float crack = exp(-dx / (0.002 + 0.012 * open)) * along;
      col += mix(VIOLET, vec3(1.0), 0.5) * crack * 1.4 * (wRift + wOdd * 0.3);
      col += VIOLET * exp(-dx * 18.0) * along * 0.25 * open * wRift;
      float Rb = eB * 1.6;
      float wall = exp(-pow((r - Rb) / (0.012 + 0.02 * eB), 2.0)) * (0.5 + fbm3(vec2(atan(d.y, d.x) * 5.0, t * 0.4)));
      col += mix(VIOLET, CYAN, 0.3) * wall * (1.0 - sm(0.85, 1.0, eB)) * 0.9;
      float inside = 1.0 - sm(Rb - 0.02, Rb + 0.02, r);
      col = mix(col, col * vec3(0.85, 0.75, 1.15), inside * eB);
    }

    /* universo estranho: gravidade intensa, raios e um mar de polaritons */
    if (wOdd > 0.01) {
      vec2 gq = q;
      vec2 toC = c - gq; gq += toC * 0.06 / (dot(toC, toC) + 0.05) * wOdd;                 // poço gravitacional
      vec2 toM = m - gq; gq += toM * 0.05 * uMouseOn / (dot(toM, toM) + 0.04) * wOdd;      // o cursor também pesa
      gq += vec2(sin(gq.y * 9.0 - t * 1.6), cos(gq.x * 7.0 - t * 1.3)) * 0.008;             // ondas gravitacionais
      // três ondas planas a 120° → rede hexagonal de interferência;
      // a fase de vórtice no cursor gera o "garfo" típico de um vórtice quântico
      vec2 pq = q + vec2(sin(q.y * 9.0 - t * 1.6), cos(q.x * 7.0 - t * 1.3)) * 0.006;   // condensado: só a ondulação
      vec2 psi = vec2(0.0);
      float vort = uMouseOn * atan(q.y - m.y, q.x - m.x);
      for (int k = 0; k < 3; k++) {
        float a = float(k) * 2.0944 + 0.25;
        vec2 kv = vec2(cos(a), sin(a)) * 30.0;
        float ph = dot(kv, pq) - t * 1.1 + (k == 0 ? vort : 0.0);
        float amp = 0.75 + 0.5 * noise(pq * 3.0 + float(k) * 7.0 + t * 0.15);              // flutuações
        psi += vec2(cos(ph), sin(ph)) * amp;
      }
      float I = dot(psi, psi) / 9.0;
      I *= mix(1.0, sm(0.0, 0.05, length(q - m)), uMouseOn);                                // núcleo do vórtice
      float ang = atan(d.y, d.x);
      float rays = pow(abs(sin(ang * 9.0 + fbm3(vec2(ang * 2.0, t * 0.2)) * 3.0)), 30.0) * exp(-r * 1.4) * sm(0.03, 0.12, r);
      vec2 gl = abs(fract(gq * 7.0) - 0.5);
      float grid = (1.0 - sm(0.0, 0.03, min(gl.x, gl.y))) * 0.12;
      float fade = exp(-length(q - c) * 0.9);
      col += mix(VIOLET, CYAN, sm(0.3, 0.9, I)) * pow(I, 2.6) * 0.62 * wOdd * (0.45 + 0.55 * fade);
      col += mix(vec3(1.0), VIOLET, 0.4) * rays * 0.32 * wOdd;
      col += VIOLET * grid * wOdd * (0.5 + fade);
    }

    /* rasgo tridimensional: gravidade extrema, tempo dilatado, eletricidade estática
       e as forças forte, fraca e eletromagnética se aproximando */
    if (w3D > 0.01) {
      vec2 rd = q - c;
      float layers = 0.0;
      for (int k = 0; k < 6; k++) {                       // contornos da fenda recuando em profundidade
        float z = fract(float(k) / 6.0 + t * 0.035);
        float sc = mix(0.12, 2.6, z * z);
        vec2 lq = rd / sc;
        float an = atan(lq.y, lq.x);
        float rad = 0.2 + 0.06 * noise(vec2(an * 3.0 + float(k) * 5.0, float(k) * 1.7));
        float e = length(lq * vec2(1.7, 0.62));
        layers += exp(-pow((e - rad) / 0.014, 2.0)) * (1.0 - z) * sm(0.0, 0.18, z);
      }
      col += mix(VIOLET, CYAN, 0.35) * layers * 0.95 * w3D;
      float abyss = 1.0 - sm(0.07, 0.16, length(rd * vec2(1.7, 0.62)));
      col = mix(col, vec3(0.01, 0.0, 0.03), abyss * 0.85 * w3D);
      // eletricidade estática: raios congelados, curvados pela gravidade
      float a = atan(rd.y, rd.x), bolts = 0.0;
      for (int k = 0; k < 7; k++) {
        float ak = float(k) * 0.8976 + 0.3;
        float off = (fbm3(vec2(r * 7.0, float(k) * 3.1)) - 0.5) * 0.9 + 0.05 / (r + 0.05);
        float da = abs(mod(a - ak - off + 3.14159, 6.28318) - 3.14159);
        bolts += exp(-da * r * 110.0) * sm(0.12, 0.22, r) * exp(-r * 1.3);
      }
      col += mix(vec3(0.9, 0.97, 1.0), CYAN, 0.3) * bolts * 0.75 * w3D;
      // força forte: tubos de fluxo de cor ligando quarks (vermelho/verde/azul ≈ laranja/verde/ciano)
      for (int k = 0; k < 4; k++) {
        float fk = float(k);
        float ang0 = fk * 1.5708 + t * 0.05;
        vec2 pa = c + vec2(cos(ang0), sin(ang0) * 0.8) * (0.3 + 0.05 * fk);
        vec2 pb = pa + vec2(cos(ang0 + 2.1), sin(ang0 + 2.1)) * 0.09;
        vec2 ba = pb - pa; float h = clamp(dot(q - pa, ba) / dot(ba, ba), 0.0, 1.0);
        float dseg = length(q - pa - ba * h);
        vec3 qc = k == 0 ? ORANGE : (k == 1 ? GREEN : (k == 2 ? CYAN : VIOLET));
        col += qc * (exp(-dseg * 160.0) * (0.7 + 0.3 * sin(t * 3.0 + fk)) + exp(-length(q - pa) * 220.0) * 1.5 + exp(-length(q - pb) * 220.0) * 1.5) * 0.7 * w3D;
      }
      // força fraca: lampejos raros (decaimentos), lentos por causa do tempo dilatado
      vec2 cell = floor(q * vec2(6.0, 4.0));
      float hh = hash(cell + 3.7);
      float ft = fract(t * 0.25 + hh * 7.0);
      vec2 cpos = (cell + vec2(hash(cell + 1.1), hash(cell + 2.2))) / vec2(6.0, 4.0);
      col += mix(ORANGE, GREEN, hh) * exp(-length(q - cpos) * 140.0) * sm(0.0, 0.05, ft) * (1.0 - sm(0.05, 0.25, ft)) * step(0.55, hh) * 1.4 * w3D;
    }

    /* grande colapso → singularidade → Big Bang */
    if (crunch > 0.01 || uBang > 0.001) {
      col *= 1.0 - 0.6 * crunch * sm(0.05, 0.6, r);                     // tudo escurece fora do centro
      float core = (0.0015 + 0.004 * crunch) / (r * r + mix(0.003, 0.00002, crunch));
      col += mix(VIOLET, vec3(1.0), crunch) * core * crunch * (1.0 - uBang) * (0.85 + 0.15 * sin(t * 8.0));
      if (uBang > 0.001) {
        float R = uBang * 2.4;
        float ring = exp(-pow((r - R) / (0.02 + 0.12 * uBang), 2.0));
        float flash = exp(-r * r * 30.0) * (1.0 - sm(0.0, 0.35, uBang)) * 4.0;
        float cmb = fbm(q * 6.0 + 11.0);                                 // radiação cósmica de fundo
        vec3 cmbCol = mix(vec3(0.15, 0.25, 0.6), vec3(0.95, 0.55, 0.25), sm(0.35, 0.7, cmb));
        col += mix(vec3(1.0, 0.95, 0.85), ORANGE, uBang) * ring * (1.0 - uBang * 0.6) * 1.6;
        col += vec3(1.0) * flash;
        col += cmbCol * (1.0 - sm(R - 0.1, R + 0.05, r)) * 0.22 * sm(0.15, 0.6, uBang);
      }
    }

    /* o cursor como partícula de teste */
    col += CYAN * exp(-dot(q - m, q - m) * 900.0) * 0.1 * uMouseOn;

    /* buraco de minhoca (entrada e saída / buraco branco) */
    if (uWarp > 0.001) {
      vec2 wd = q - uWarpC; float wr = length(wd) + 1e-3; float wa = atan(wd.y, wd.x);
      float z = 0.22 / wr + uTunnelZ + t * (0.35 + 2.25 * uWarpHide);   // profundidade (tempo ou rolagem)
      vec2 tc = vec2(abs(wa) * 2.2, z);                    // ângulo espelhado: sem costura
      float tun = fbm(tc * vec2(1.0, 1.4));
      float rings = pow(0.5 + 0.5 * sin(z * 9.0), 6.0);    // anéis vindo em direção ao observador
      vec3 tcol = mix(vec3(0.03, 0.05, 0.12), CYAN * 0.85, sm(0.42, 0.95, tun));
      tcol += ORANGE * sm(0.62, 1.0, fbm3(tc * 3.0 + 4.0)) * 0.55;
      tcol += CYAN * rings * 0.35 * sm(0.04, 0.35, wr);
      tcol *= 0.3 + 0.9 * sm(0.0, 0.7, wr);
      tcol += vec3(1.0) * exp(-wr * wr * 45.0) * uWarp * 1.6;
      tcol *= uTunnelDim;
      col = mix(col, tcol, sm(0.0, 1.0, uWarp * 1.35 - wr * 0.55));
    }

    /* leitura: escurece a coluna de texto (desktop) e normaliza o brilho */
    col *= mix(1.0, 0.55 + 0.45 * sm(-0.25, 0.45, q.x / (uAspect * 0.5)), uSide * (1.0 - uWarp * uWarpHide));
    col *= uDim;
    col = 1.0 - exp(-col * 1.25);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const COPY_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D uTex; uniform vec2 uRes;
  void main() { gl_FragColor = texture2D(uTex, gl_FragCoord.xy / uRes); }
`;

const PT_VERT = /* glsl */`
  attribute vec4 aSeed; attribute float aPair; attribute float aSide;
  uniform float uTime, uPhase, uAspect, uMouseOn, uPx, uBang;
  uniform vec2 uCenter, uMouse;
  varying vec3 vCol; varying float vA;
  ${COMMON}
  void main() {
    float p = uPhase, t = uTime; vec4 s = aSeed; vec2 c = uCenter;
    float wNeb = bump(p, 0.0, 1.2) + sm(8.5, 10.0, p);   // poeira também no fim (é ela que colapsa)
    float wCol = bump(p, 1.0, 1.0), wStar = bump(p, 2.0, 1.0), wSN = bump(p, 3.0, 1.0);
    float wMag = bump(p, 4.0, 1.0), wBH = bump(p, 5.0, 1.0), wR = bump(p, 6.0, 1.0), wO = bump(p, 7.0, 1.0);
    float eSN = sm(2.35, 3.7, p);

    // poeira (nebulosa / colapso)
    vec2 base = vec2((s.x * 2.0 - 1.0) * uAspect * 0.55, (s.y * 2.0 - 1.0) * 0.55)
              + vec2(sin(t * 0.07 + s.z * 6.2831), cos(t * 0.05 + s.w * 6.2831)) * 0.04;
    float ck = wCol + wStar * 0.7;
    vec2 bd = base - c; float br = length(bd);
    vec2 dust = c + rot(ck * (1.2 / (br * 4.0 + 0.3)) + t * 0.15 * ck) * bd * mix(1.0, 0.35 + 0.4 * s.w, ck);
    vec2 dmv = dust - uMouse; float g = uMouseOn * exp(-dot(dmv, dmv) * 20.0) * (wNeb + wCol);
    dust = uMouse + rot(g * 1.5) * dmv * (1.0 + g * 0.15);

    // ejetos da supernova (desviados pelo cursor)
    float an = s.z * 6.2831; vec2 dir = vec2(cos(an), sin(an));
    vec2 ej = c + dir * eSN * (0.15 + 1.1 * s.w);
    vec2 em = ej - uMouse; ej += normalize(em + 1e-4) * uMouseOn * 0.07 * exp(-dot(em, em) * 30.0);

    // magnetar: partículas correndo pelas linhas de campo
    float L = 0.12 + s.w * 0.55;
    float th = fract(s.z + t * 0.04 * (1.0 + s.y)) * 3.14159;
    float rr = L * sin(th) * sin(th);
    vec2 loc = vec2(rr * sin(th) * (s.x < 0.5 ? 1.0 : -1.0), rr * cos(th));
    vec2 mg = c + rot(t * 0.9) * loc;

    // radiação Hawking: um par nasce no horizonte; um cai, o outro escapa
    const float RS = 0.085;
    float tau = fract(t / 3.0 + aPair);
    float ph = aPair * 6.2831 * 7.0;
    vec2 hd = vec2(cos(ph), sin(ph));
    vec2 hk = aSide < 0.5 ? c + hd * RS * (1.04 - 0.12 * tau)
                          : c + rot(tau * 0.8) * hd * (RS * 1.04 + tau * (0.3 + 0.5 * s.w));
    float hA = aSide < 0.5 ? pow(1.0 - tau, 3.0) : (1.0 - tau) * sm(0.0, 0.05, tau);

    // rasgo: filamentos ao longo da fenda e matéria na parede da bolha
    float eB = sm(5.85, 6.9, p);
    vec2 rf = s.x < 0.4
      ? vec2(c.x + (s.y - 0.5) * 0.03, c.y + (s.z - 0.5) * 1.2 * sm(5.5, 6.2, p))
      : c + dir * eB * 1.6 * (0.97 + 0.06 * s.y);
    // universo estranho: partículas correndo pelos raios
    float ra = (1.5708 + floor(s.z * 18.0) * 3.14159) / 9.0;
    vec2 ry = c + vec2(cos(ra), sin(ra)) * (0.03 + fract(t * 0.08 * (1.0 + s.y) + s.w) * 1.1);

    // rasgo 3D: matéria orbitando devagar (tempo dilatado)
    float w3 = bump(p, 8.0, 1.0);
    float oa = s.z * 6.2831 + t * 0.04 * (0.5 + s.y);
    vec2 orb = c + vec2(cos(oa) * 1.7, sin(oa) * 0.62) * (0.22 + 0.5 * s.w) ;
    float wD = wNeb + wCol + wStar;
    float W = wD + wSN + wMag + wBH + wR + wO + w3 + 1e-4;
    vec2 pos = (dust * wD + ej * wSN + mg * wMag + hk * wBH + rf * wR + ry * wO + orb * w3) / W;
    // grande colapso: tudo cai para o ponto; Big Bang: tudo é lançado para fora
    float cr = sm(8.4, 9.85, p);
    pos = c + (pos - c) * pow(1.0 - cr, 1.6);
    pos = mix(pos, c + dir * uBang * (0.25 + 1.4 * s.w), sm(0.0, 0.05, uBang));
    vA = wD * (0.3 + 0.4 * s.y) + wSN * (1.0 - eSN * 0.5) * 0.9 + wMag * 0.7 + wBH * hA + wR * 0.7 + wO * 0.55 + w3 * 0.6;
    vA *= 1.0 - 0.7 * sm(9.5, 10.0, p) * (1.0 - sm(0.0, 0.05, uBang));

    vec3 colC = vec3(0.50, 0.91, 0.95), colO = vec3(0.95, 0.65, 0.35), colG = vec3(0.35, 0.8, 0.65);
    vCol = s.y < 0.45 ? colC : (s.y < 0.8 ? colO : colG);
    vCol = mix(vCol, aSide < 0.5 ? colO : colC, wBH);
    vCol = mix(vCol, vec3(0.62, 0.5, 1.0), (wR + wO) * 0.7);

    gl_Position = vec4(pos.x / (uAspect * 0.5), pos.y / 0.5, 0.0, 1.0);
    gl_PointSize = uPx * (1.0 + s.w * 1.8) * (1.0 + wSN * 0.4 + wBH * 0.5 * aSide);
  }
`;

const PT_FRAG = /* glsl */`
  precision highp float;
  varying vec3 vCol; varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 1.6);
    gl_FragColor = vec4(vCol, a * vA);
  }
`;

const TRAIL_VERT = /* glsl */`
  attribute float aAge;
  uniform float uAspect, uPx, uAlpha;
  varying float vA;
  void main() {
    vA = (1.0 - aAge) * uAlpha;
    gl_Position = vec4(position.x / (uAspect * 0.5), position.y / 0.5, 0.0, 1.0);
    gl_PointSize = uPx * mix(7.0, 1.5, aAge);
  }
`;
const TRAIL_FRAG = /* glsl */`
  precision highp float;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 1.4);
    gl_FragColor = vec4(mix(vec3(0.5, 0.91, 0.95), vec3(1.0), 0.35), a * vA);
  }
`;

export function createCosmos(canvas, { sections = [], mode = 'scroll' } = {}) {
  const tunnelMode = mode === 'wormhole';   // página do projeto: a travessia acompanha a rolagem
  if (!canvas) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { canvas.remove(); return null; }

  const small = window.innerWidth < 760 || isTouch;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  let bgScale = small ? 0.32 : 0.42;
  const N = small ? 700 : 1600;
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x060912, 1);

  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.PlaneGeometry(2, 2);

  /* passe 1: fundo procedural em resolução reduzida */
  const rt = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false });
  const U = {
    uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uPhase: { value: 0 },
    uMouse: { value: new THREE.Vector2(9, 9) }, uMouseOn: { value: 0 }, uCenter: { value: new THREE.Vector2() },
    uWarp: { value: 0 }, uWarpC: { value: new THREE.Vector2() }, uOct: { value: small ? 3 : 4 },
    uAspect: { value: 1 }, uDim: { value: small ? 0.52 : 0.9 }, uSide: { value: small ? 0 : 1 },
    uBang: { value: 0 }, uTunnelZ: { value: 0 }, uTunnelDim: { value: 1 }, uWarpHide: { value: 1 },
  };
  const bgScene = new THREE.Scene();
  bgScene.add(new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: BG_VERT, fragmentShader: BG_FRAG, uniforms: U, depthTest: false, depthWrite: false })));

  /* passe 2: compõe o fundo + partículas em resolução cheia */
  const scene = new THREE.Scene();
  const copyU = { uTex: { value: rt.texture }, uRes: { value: new THREE.Vector2(1, 1) } };
  const copy = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: BG_VERT, fragmentShader: COPY_FRAG, uniforms: copyU, depthTest: false, depthWrite: false }));
  copy.renderOrder = 0; copy.frustumCulled = false;
  scene.add(copy);

  const seeds = new Float32Array(N * 4), pair = new Float32Array(N), side = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 4; k++) seeds[i * 4 + k] = Math.random();
    const pid = Math.floor(i / 2);
    pair[i] = ((pid * 0.6180339887) % 1);
    side[i] = i % 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  pGeo.setAttribute('aPair', new THREE.BufferAttribute(pair, 1));
  pGeo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  const PU = {
    uTime: U.uTime, uPhase: U.uPhase, uAspect: U.uAspect, uMouseOn: U.uMouseOn, uMouse: U.uMouse, uCenter: U.uCenter,
    uPx: { value: 2.2 * DPR }, uBang: U.uBang,
  };
  const points = new THREE.Points(pGeo, new THREE.ShaderMaterial({
    vertexShader: PT_VERT, fragmentShader: PT_FRAG, uniforms: PU,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  points.frustumCulled = false; points.renderOrder = 1;
  scene.add(points);

  /* a partícula virtual que seguimos (com rastro) */
  const TRAIL = 22;
  const trailPos = new Float32Array(TRAIL * 3);
  const trailAge = new Float32Array(TRAIL).map((_, i) => i / (TRAIL - 1));
  const tGeo = new THREE.BufferGeometry();
  const tAttr = new THREE.BufferAttribute(trailPos, 3); tAttr.setUsage(THREE.DynamicDrawUsage);
  tGeo.setAttribute('position', tAttr);
  tGeo.setAttribute('aAge', new THREE.BufferAttribute(trailAge, 1));
  const TU = { uAspect: U.uAspect, uPx: { value: 2.2 * DPR }, uAlpha: { value: 0 } };
  const trail = new THREE.Points(tGeo, new THREE.ShaderMaterial({
    vertexShader: TRAIL_VERT, fragmentShader: TRAIL_FRAG, uniforms: TU,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  trail.frustumCulled = false; trail.renderOrder = 2;
  scene.add(trail);
  const hero = { x: 0, y: 0, vx: 0, vy: 0, history: [] };

  /* legenda */
  const cap = document.createElement('div');
  cap.className = 'cosmos-caption mono';
  cap.setAttribute('aria-hidden', 'true');
  cap.innerHTML = '<span class="cosmos-caption__k"></span><b></b><span class="cosmos-caption__d"></span>';
  document.body.append(cap);
  let capIdx = -1, capOverride = null;
  const setCaption = (i, override) => {
    const key = override ? 'w' : i;
    if (key === capIdx) return;
    capIdx = key;
    const [title, desc] = override || CAPTIONS[i];
    cap.classList.remove('is-in');
    clearTimeout(setCaption.t);
    setCaption.t = setTimeout(() => {
      cap.children[0].textContent = override ? t('Fase ∞') : t('Fase {n}', { n: String(i + 1).padStart(2, '0') });
      cap.children[1].textContent = t(title);
      cap.children[2].textContent = t(desc);
      cap.classList.add('is-in');
    }, 220);
  };

  /* fase a partir da rolagem */
  let marks = [];
  const measure = () => {
    marks = sections.map((el) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      return { top, bottom: top + rect.height, f: parseFloat(el.dataset.phase) || 0 };
    }).sort((a, b) => a.top - b.top);
  };
  const targetPhase = () => {
    if (!marks.length) return 0;
    const maxS = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const kEnd = Math.min(1, Math.max(0, (window.scrollY - (maxS - window.innerHeight * 0.6)) / (window.innerHeight * 0.6)));
    const y = window.scrollY + window.innerHeight * (0.5 + 0.5 * kEnd * kEnd * (3 - 2 * kEnd));
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i];
      if (y < m.bottom || i === marks.length - 1) {
        if (y < m.top) return m.f;
        const pr = (y - m.top) / Math.max(1, m.bottom - m.top);
        const next = marks[i + 1];
        if (next && pr > 0.65) return m.f + (next.f - m.f) * ((pr - 0.65) / 0.35);
        return m.f;
      }
    }
    return 0;
  };

  /* cursor e alvo (projeto em foco) */
  let W = 1, H = 1, aspect = 1;
  const toQ = (cx, cy) => [(cx - W / 2) / H, (H / 2 - cy) / H];
  const mouseT = { x: 9, y: 9, on: 0 };
  let target = null;
  if (!isTouch) {
    window.addEventListener('pointermove', (e) => { [mouseT.x, mouseT.y] = toQ(e.clientX, e.clientY); mouseT.on = 1; }, { passive: true });
    document.addEventListener('pointerleave', () => { mouseT.on = 0; });
  }
  document.addEventListener('pointerover', (e) => {
    const a = e.target.closest?.('a[data-wormhole]');
    if (!a) return;
    const r = a.getBoundingClientRect();
    target = toQ(r.left + r.width * 0.58, r.top + r.height / 2);
  });
  document.addEventListener('pointerout', (e) => {
    const a = e.target.closest?.('a[data-wormhole]');
    if (a && !a.contains(e.relatedTarget)) target = null;
  });

  const resize = () => {
    W = window.innerWidth; H = window.innerHeight; aspect = W / H;
    renderer.setSize(W, H, false);
    const bw = Math.max(2, Math.round(W * DPR * bgScale)), bh = Math.max(2, Math.round(H * DPR * bgScale));
    rt.setSize(bw, bh);
    U.uRes.value.set(bw, bh);
    copyU.uRes.value.set(W * DPR, H * DPR);
    U.uAspect.value = aspect;
    if (small || aspect < 1.1) U.uCenter.value.set(0, -0.2);   // celular: terço inferior, longe dos títulos
    else U.uCenter.value.set(aspect * 0.5 * 0.5, 0.0);
    measure();
    if (reducedMotion) draw();
  };
  window.addEventListener('resize', resize);
  new ResizeObserver(() => measure()).observe(document.body);

  /* ---------- quadro ---------- */
  let phase = targetPhase();
  let forced = null;   // diagnóstico: __cosmos.force(6.4) fixa uma fase; force(null) volta à rolagem
  let warp = { v: 0, anim: null };
  const clock = new THREE.Clock();
  let time = 0;

  function updateHero(dt) {
    const wBH = Math.max(0, 1 - Math.abs(phase - 5));
    const c = U.uCenter.value;
    const RS = 0.085;
    let tx, ty;
    if (warp.anim) { tx = U.uWarpC.value.x; ty = U.uWarpC.value.y; }
    else if (target) { [tx, ty] = target; }
    else {
      // escapa do horizonte numa espiral e volta a nascer: uma partícula Hawking
      const u = (time * 0.09) % 1;
      const a = 2.2 + u * 2.4;
      const rad = RS * 1.05 + u * 0.55;
      tx = c.x + Math.cos(a) * rad; ty = c.y + Math.sin(a) * rad;
      if (u < 0.02) { hero.x = tx; hero.y = ty; hero.vx = hero.vy = 0; hero.history.length = 0; }
    }
    const k = warp.anim ? 40 : target ? 46 : 30;
    hero.vx += (tx - hero.x) * k * dt; hero.vy += (ty - hero.y) * k * dt;
    const damp = Math.exp(-(target ? 6 : 9) * dt);
    hero.vx *= damp; hero.vy *= damp;
    hero.x += hero.vx * dt * 6; hero.y += hero.vy * dt * 6;
    hero.history.unshift([hero.x, hero.y]);
    if (hero.history.length > TRAIL) hero.history.length = TRAIL;
    for (let i = 0; i < TRAIL; i++) {
      const h = hero.history[Math.min(i, hero.history.length - 1)] || [hero.x, hero.y];
      trailPos[i * 3] = h[0]; trailPos[i * 3 + 1] = h[1];
    }
    tAttr.needsUpdate = true;
    const want = warp.anim ? 1 : Math.min(1, wBH * 1.6);
    TU.uAlpha.value += (want - TU.uAlpha.value) * Math.min(1, dt * 5);
  }

  /* qualidade adaptativa: se o fps ficar baixo, reduz resolução/detalhe
     (nunca volta a subir, para não oscilar) */
  let level = 0, skipBg = false, frameNo = 0, ema = 1 / 60, since = 0;
  function adapt(raw) {
    ema += (raw - ema) * 0.05;
    since += raw;
    if (since < 2.5 || level >= 3) return;
    since = 0;
    if (ema > 1 / 38) {
      level++;
      if (level === 1) { bgScale *= 0.78; U.uOct.value = Math.max(2, U.uOct.value - 1); }
      if (level === 2) { bgScale *= 0.8; PU.uPx.value *= 1.1; }
      if (level === 3) { skipBg = true; }
      resize();
    }
  }

  function draw() {
    frameNo++;
    if (!skipBg || frameNo % 2 === 0 || warp.v > 0.001) {
      renderer.setRenderTarget(rt);
      renderer.render(bgScene, cam);
    }
    renderer.setRenderTarget(null);
    renderer.render(scene, cam);
  }

  let running = true;
  function frame() {
    if (!running) return;
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);          // física das partículas (estável)
    const real = Math.min(raw, 0.25);        // suavização: converge mesmo com fps baixo
    if (raw < 0.5) adapt(raw);               // ignora pausas (aba oculta, etc.)
    // dilatação gravitacional: perto do rasgo 3D e do colapso o tempo quase para
    const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    const timeScale = 1 - 0.82 * ss(7.6, 8.5, phase) * (1 - ss(9.7, 10, phase));
    time += dt * timeScale;
    U.uTime.value = time;
    const tp = tunnelMode ? 7 : (forced ?? targetPhase());
    phase += (tp - phase) * Math.min(1, real * 2.4);
    U.uPhase.value = phase;
    U.uMouse.value.x += (mouseT.x - U.uMouse.value.x) * Math.min(1, dt * 8);
    U.uMouse.value.y += (mouseT.y - U.uMouse.value.y) * Math.min(1, dt * 8);
    U.uMouseOn.value += (mouseT.on - U.uMouseOn.value) * Math.min(1, real * 3);
    if (warp.anim) warp.anim(real);
    else if (tunnelMode) {
      U.uWarpC.value.copy(U.uCenter.value);   // centro do túnel fora da coluna de texto
      // atravessando o buraco de minhoca ao longo da página; a saída acontece no fim
      const maxS = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const s = window.scrollY / maxS;
      const want = 0.85 * (1 - ss(0.78, 0.97, s));
      warp.v += (want - warp.v) * Math.min(1, real * 3);
      U.uTunnelZ.value += ((s * 18) - U.uTunnelZ.value) * Math.min(1, real * 4);
    }
    U.uWarp.value = warp.v;
    // Big Bang: dispara ao chegar à singularidade; reinicia se o visitante voltar
    if (phase > 9.85) U.uBang.value = Math.min(1, U.uBang.value + real / 2.6);
    else if (phase < 9.4) U.uBang.value = 0;
    updateHero(Math.min(raw, 0.1));
    setCaption(Math.max(0, Math.min(10, Math.round(phase))), warp.v > 0.15 ? WORMHOLE_CAPTION : null);
    draw();
    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    if (reducedMotion) return;
    if (!document.hidden && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame); }
    else if (document.hidden) running = false;
  });

  if (tunnelMode) { U.uTunnelDim.value = 0.55; U.uWarpHide.value = 0; }
  resize();
  if (reducedMotion) {
    // um quadro estático por fase, atualizado só quando a fase muda
    U.uTime.value = 12;
    let last = -1, raf = 0;
    const update = () => {
      raf = 0;
      const ph = Math.round(targetPhase());
      if (ph === last) return;
      last = ph; phase = ph; U.uPhase.value = ph;
      setCaption(ph);
      draw();
    };
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    update();
  } else {
    requestAnimationFrame(frame);
  }
  document.documentElement.classList.add('has-field');

  const animateWarp = (from, to, ms, ease) => new Promise((res) => {
    let e = 0;
    warp.v = from;
    warp.anim = (dt) => {
      e += (dt * 1000) / ms;
      const k = Math.min(1, e);
      warp.v = from + (to - from) * ease(k);
      if (k >= 1) { warp.anim = null; res(); }
    };
  });

  return {
    measure,
    /* entra no buraco de minhoca a partir de um ponto da tela */
    warp(clientX, clientY) {
      if (reducedMotion) return Promise.resolve();
      U.uWarpHide.value = 1; U.uTunnelDim.value = 1;
      const [x, y] = toQ(clientX, clientY);
      U.uWarpC.value.set(x, y);
      return animateWarp(0, 1, 1050, (k) => k * k * (3 - 2 * k));
    },
    /* sai do outro lado (buraco branco) */
    emerge() {
      if (reducedMotion) return Promise.resolve();
      U.uWarpC.value.copy(tunnelMode ? U.uCenter.value : new THREE.Vector2(0, 0));
      return animateWarp(1, tunnelMode ? 0.85 : 0, 1500, (k) => 1 - Math.pow(1 - k, 3));
    },
    reset() { warp.v = 0; warp.anim = null; U.uWarp.value = 0; if (reducedMotion) draw(); },
    force(v) { forced = v; },
    /* diagnóstico (console): fase atual × alvo e marcos das seções */
    debug: () => ({ level, bgScale: +bgScale.toFixed(3), phase: +phase.toFixed(3), target: +targetPhase().toFixed(3), marks: marks.map((m) => [Math.round(m.top), Math.round(m.bottom), m.f]) }),
  };
}
