/* Cena do capítulo "ESF · Energia Sustentável É Fundamental".
   Um kit (caixa) se abre e o núcleo vira uma esfera de partículas que, a cada
   trecho da rolagem, se transforma num experimento real do projeto:
   1 eletroscópio de folhas · 2 sensor de campo magnético · 3 experimento de Oersted ·
   4 LEDs infravermelhos como placa solar · 5 circuito misto · 6 pilha de limão ·
   7 condutivímetro Quarks (patente) · 8 aparelho de percepção óptica Quarks (patente).
   No fim, todos orbitam uma esfera com sulcos cerebrais.

   Contrato: mount(container, { THREE }) → { update(p), resize(), destroy() } */

export function mount(container, { THREE }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xe6f4ff, 0x1c1430, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7fe7f2, 0.9); rim.position.set(-5, 2, -4); scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);

  /* ---------- utilidades ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const sm = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({
    color, roughness: o.r ?? 0.55, metalness: o.m ?? 0.05, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1,
    transparent: o.op != null, opacity: o.op ?? 1, depthWrite: o.op == null || o.op > 0.6,
    side: o.ds ? THREE.DoubleSide : THREE.FrontSide, flatShading: !!o.flat,
  });
  const mesh = (geo, mat, parent, pos, rot) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    parent.add(m);
    return m;
  };
  const poly = (pts) => {
    const path = new THREE.CurvePath();
    for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(V(...pts[i]), V(...pts[i + 1])));
    return path;
  };
  const smooth = (pts, closed = false) => new THREE.CatmullRomCurve3(pts.map((p) => V(...p)), closed);
  const wire = (curve, r, mat, parent, seg = 64) => mesh(new THREE.TubeGeometry(curve, seg, r, 8, false), mat, parent);
  // caixa com cantos arredondados (o kit "de verdade", não um cubo de vértices vivos)
  const rbox = (w, h, d, r = 0.1) => {
    const b = Math.min(0.035, d / 4), W = w - 2 * b, H = h - 2 * b, R = Math.min(r, W / 2, H / 2);
    const s = new THREE.Shape();
    s.moveTo(-W / 2 + R, -H / 2); s.lineTo(W / 2 - R, -H / 2); s.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + R);
    s.lineTo(W / 2, H / 2 - R); s.quadraticCurveTo(W / 2, H / 2, W / 2 - R, H / 2); s.lineTo(-W / 2 + R, H / 2);
    s.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - R); s.lineTo(-W / 2, -H / 2 + R); s.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + R, -H / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 8 });
    g.center();
    return g;
  };
  // deformação determinística pela posição: vértices repetidos andam juntos (sem rachaduras)
  const deform = (geo, fn) => {
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); fn(v); p.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    return geo;
  };
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  };
  const HALO = canvasTex(64, 64, (x) => {
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  });
  const chargeTex = (sign) => canvasTex(64, 64, (x) => {
    x.fillStyle = sign > 0 ? '#f2a65a' : '#7fe7f2';
    x.beginPath(); x.arc(32, 32, 27, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#06101c'; x.fillRect(16, 28, 32, 8); if (sign > 0) x.fillRect(28, 16, 8, 32);
  });
  const PLUS = chargeTex(1), MINUS = chargeTex(-1);
  const glow = (color, size, parent, pos) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: HALO, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    s.scale.setScalar(size); if (pos) s.position.set(...pos);
    parent.add(s);
    return s;
  };
  const charges = (tex, size, parent, positions) => {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 });
    positions.forEach((p) => { const s = new THREE.Sprite(mat); s.scale.setScalar(size); s.position.set(...p); parent.add(s); });
    return mat;
  };
  // partículas que correm ao longo de um caminho (elétrons, fótons, íons)
  const flow = (curve, n, color, size, parent) => {
    const pos = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size, map: HALO, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; parent.add(pts);
    const tmp = new THREE.Vector3();
    return (time, speed, op) => {
      mat.opacity = op;
      pts.visible = op > 0.01;
      if (!pts.visible) return;
      for (let i = 0; i < n; i++) {
        curve.getPointAt((((i / n) + time * speed) % 1 + 1) % 1, tmp);
        pos[i * 3] = tmp.x; pos[i * 3 + 1] = tmp.y; pos[i * 3 + 2] = tmp.z;
      }
      geo.attributes.position.needsUpdate = true;
    };
  };
  const led = (color, parent, pos, rot, r = 0.07) => {
    const g = new THREE.Group(); g.position.set(...pos); if (rot) g.rotation.set(...rot); parent.add(g);
    const mat = std(color, { r: 0.2, op: 0.92, e: color, ei: 0 });
    mesh(new THREE.CylinderGeometry(r, r, r * 1.8, 20), mat, g, [0, r * 0.9, 0]);
    mesh(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat, g, [0, r * 1.8, 0]);
    const halo = glow(color, r * 9, g, [0, r * 2, 0]);
    return { g, set(v) { mat.emissiveIntensity = v * 1.6; halo.material.opacity = v * 0.9; } };
  };

  const CYAN = 0x7fe7f2, ORANGE = 0xf2a65a, VIOLET = 0xb48cff, SUN = 0xfbd04c, LIME = 0x9fd11e, LEMON = 0xf2dd3c, WGREEN = 0x37d67a;
  const PINK = 0xe2579b;

  /* ================= 1 · ELETROSCÓPIO DE FOLHAS ================= */
  function electroscope(k) {
    const g = new THREE.Group();
    g.userData.base = 0.8; g.position.y = -0.3;
    const prof = [[0.001, -1.12], [0.8, -1.12], [0.86, -1.06], [0.86, -0.98], [0.4, 0.36], [0.26, 0.56], [0.26, 0.94], [0.29, 0.97], [0.29, 1.0]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    mesh(new THREE.LatheGeometry(prof, 64), std(0xd6f2ff, { op: 0.13, r: 0.05, ds: true }), g);
    const rimMat = std(0xe6f7ff, { op: 0.45, e: CYAN, ei: 0.25 });
    mesh(new THREE.TorusGeometry(0.86, 0.011, 6, 72), rimMat, g, [0, -1.02, 0], [Math.PI / 2, 0, 0]);
    mesh(new THREE.TorusGeometry(0.29, 0.013, 6, 40), rimMat, g, [0, 0.99, 0], [Math.PI / 2, 0, 0]);
    // sílica azul no fundo
    const sil = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0), std(0x2747c9, { r: 0.35, e: 0x0b1a6b, ei: 0.6, flat: true }), 150);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler();
    for (let i = 0; i < 150; i++) {
      const a = i * 2.399, r = Math.sqrt((i + 0.5) / 150) * 0.76;
      q.setFromEuler(eu.set(i * 1.3, i * 0.7, 0));
      m4.compose(V(Math.cos(a) * r, -1.08 + ((i * 37) % 10) / 100, Math.sin(a) * r), q, V(1, 1, 1).multiplyScalar(0.7 + ((i * 13) % 7) / 10));
      sil.setMatrixAt(i, m4);
    }
    g.add(sil);
    mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.24, 32), std(0x18181c, { r: 0.85 }), g, [0, 1.1, 0]);
    const metal = std(0xd8dde4, { m: 0.85, r: 0.28 });
    mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.9, 12), metal, g, [0, 0.56, 0]);
    mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.34, 12), metal, g, [0.15, -0.39, 0], [0, 0, Math.PI / 2]);
    // bola de papel-alumínio amassado
    const bg = deform(new THREE.IcosahedronGeometry(0.4, 3), (v) => {
      v.multiplyScalar(1 + 0.08 * Math.sin(v.x * 13 + 1) * Math.sin(v.y * 11 + 2) * Math.sin(v.z * 12 + 3) + 0.04 * Math.sin(v.x * 27) * Math.sin(v.z * 25 + 1));
    });
    mesh(bg, std(0xc9ced6, { m: 0.9, r: 0.32, flat: true }), g, [0, 1.78, 0]);
    // folhas de alumínio presas no gancho
    const leafMat = std(0xeef2f6, { m: 0.8, r: 0.3, ds: true });
    const leaves = [-1, 1].map((s) => {
      const p = new THREE.Group(); p.position.set(0.31, -0.39, 0); p.userData.s = s; g.add(p);
      mesh(new THREE.PlaneGeometry(0.13, 0.5), leafMat, p, [0, -0.26, s * 0.004]);
      return p;
    });
    const leafQ = charges(MINUS, 0.12, leaves[0], [[0, -0.14, 0.03], [0, -0.3, 0.03], [0, -0.44, 0.03]]);
    leaves[1].add(...leaves[0].children.filter((c) => c.isSprite).map((c) => { const s = c.clone(); return s; }));
    const ballQ = charges(PLUS, 0.13, g, [[-0.3, 1.95, 0.32], [0.28, 1.62, 0.34], [0.05, 2.16, 0.22], [-0.2, 1.55, 0.36]]);
    // bastão eletrizado (cargas negativas) que se aproxima
    const rod = new THREE.Group(); rod.rotation.z = 1.2; g.add(rod);
    mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.3, 24), std(0x9aa6b8, { r: 0.35, m: 0.1 }), rod, [0, 0.65, 0]);
    const rodQ = charges(MINUS, 0.12, rod, [[0.1, 0.2, 0.06], [0.1, 0.5, 0.06], [0.1, 0.8, 0.06], [0.1, 1.1, 0.06]]);
    const run = flow(poly([[0, 1.45, 0.05], [0, -0.39, 0.05], [0.31, -0.39, 0.05], [0.31, -0.85, 0.05]]), 12, CYAN, 0.16 * k, g);
    return {
      g,
      update(u, t) {
        const a = sm(0.14, 0.36, u);
        rod.position.set(lerp(-2.6, -0.5, a), lerp(2.2, 1.85, a), 0.15);
        rodQ.opacity = a;
        const ch = sm(0.36, 0.58, u);                              // indução: elétrons descem para as folhas
        const ang = ch * 0.42 + Math.sin(t * 2.4) * 0.018 * ch;
        leaves.forEach((p) => { p.rotation.z = p.userData.s * ang; });
        leafQ.opacity = ch; ballQ.opacity = ch;
        run(t, 0.5, sm(0.34, 0.42, u) * (1 - sm(0.6, 0.7, u)) + ch * 0.25);
      },
    };
  }

  /* ================= 2 · SENSOR DE CAMPO MAGNÉTICO ================= */
  function hall(k) {
    const g = new THREE.Group();
    g.rotation.x = 0.3;
    const dev = new THREE.Group(); g.add(dev);
    const shell = std(0x262a33, { r: 0.55, op: 1 });
    mesh(rbox(1.7, 0.62, 1.2, 0.14), shell, dev, [0, -0.1, 0]);
    const lid = new THREE.Group(); lid.position.set(-0.85, 0.21, 0); dev.add(lid);
    const lidMat = std(0x30343e, { r: 0.45, op: 1 });
    mesh(rbox(1.7, 0.1, 1.2, 0.14), lidMat, lid, [0.85, 0.05, 0]);
    // por dentro: placa, sensor Hall, bateria e motor com peso excêntrico
    mesh(new THREE.BoxGeometry(1.3, 0.04, 0.85), std(0x1f7a4a, { r: 0.5, e: 0x0c3a20, ei: 0.5 }), dev, [0, -0.33, 0]);
    const hallChip = new THREE.Group(); hallChip.position.set(0.52, -0.2, 0.22); dev.add(hallChip);
    mesh(new THREE.BoxGeometry(0.16, 0.12, 0.05), std(0x111111, { r: 0.4 }), hallChip, [0, 0.06, 0]);
    [-0.05, 0, 0.05].forEach((x) => mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), std(0xd0d4d8, { m: 0.8 }), hallChip, [x, -0.04, 0]));
    const hallGlow = glow(VIOLET, 0.5, hallChip, [0, 0.08, 0.04]);
    mesh(new THREE.BoxGeometry(0.5, 0.2, 0.3), std(0x2b3f8c, { r: 0.5 }), dev, [-0.38, -0.2, 0.18]);
    mesh(new THREE.BoxGeometry(0.1, 0.06, 0.12), std(0xc7ccd2, { m: 0.8 }), dev, [-0.08, -0.13, 0.18]);
    const motor = new THREE.Group(); motor.position.set(0.05, -0.15, -0.22); dev.add(motor);
    mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.36, 24), std(0xcfd5dc, { m: 0.85, r: 0.3 }), motor, [0, 0, 0], [0, 0, Math.PI / 2]);
    mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), std(0xe0e4ea, { m: 0.9 }), motor, [0.28, 0, 0], [0, 0, Math.PI / 2]);
    const weight = new THREE.Group(); weight.position.set(0.36, 0, 0); motor.add(weight);
    mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 20, 1, false, 0, Math.PI), std(0xd4a84a, { m: 0.85, r: 0.3 }), weight, [0, 0, 0], [0, 0, Math.PI / 2]);
    const wireMat = std(0xd63a3a, { r: 0.5 });
    wire(smooth([[-0.15, -0.15, 0.18], [0.0, -0.05, 0.0], [-0.1, -0.12, -0.2]]), 0.012, wireMat, dev, 24);
    wire(smooth([[0.52, -0.12, 0.2], [0.35, -0.02, 0.0], [0.12, -0.05, -0.18]]), 0.012, std(0x222222), dev, 24);
    // ímã em barra (N vermelho, S azul) e linhas de campo
    const magnet = new THREE.Group(); g.add(magnet);
    mesh(rbox(0.42, 0.24, 0.24, 0.03), std(0xd63a3a, { r: 0.4 }), magnet, [-0.21, 0, 0]);
    mesh(rbox(0.42, 0.24, 0.24, 0.03), std(0x2f5fd6, { r: 0.4 }), magnet, [0.21, 0, 0]);
    const fieldMat = std(VIOLET, { op: 0, e: VIOLET, ei: 0.8 });
    [0.35, 0.55, 0.8].forEach((h) => {
      const pts = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; pts.push([Math.cos(a) * (0.42 + h), Math.sin(a) * h, 0]); }
      wire(smooth(pts, true), 0.008, fieldMat, magnet, 80);
    });
    const buzz = new THREE.Group(); g.add(buzz);
    const buzzMat = std(VIOLET, { op: 0, e: VIOLET, ei: 1 });
    [-1, 1].forEach((s) => [0.25, 0.4].forEach((r) => mesh(new THREE.TorusGeometry(r, 0.012, 6, 24, 1.2), buzzMat, buzz, [s * 0.95, -0.05, 0], [0, 0, s > 0 ? -0.6 : Math.PI - 0.6])));
    return {
      g,
      update(u, t) {
        const a = sm(0.1, 0.32, u);
        magnet.position.set(lerp(2.9, 1.5, a), 0.05, 0.1);
        fieldMat.opacity = a * 0.55;
        const vib = sm(0.3, 0.36, u);
        dev.position.set(Math.sin(t * 92) * 0.028 * vib, Math.sin(t * 71 + 1) * 0.02 * vib, 0);
        dev.rotation.z = Math.sin(t * 63) * 0.025 * vib;
        weight.rotation.x = t * 40 * vib;
        buzzMat.opacity = vib * (0.4 + 0.4 * Math.sin(t * 30));
        hallGlow.material.opacity = vib * 0.8;
        const open = sm(0.5, 0.7, u);                              // revela o mecanismo
        lid.rotation.z = open * 1.25;
        shell.opacity = 1 - open * 0.6; shell.depthWrite = open < 0.3;
        lidMat.opacity = 1 - open * 0.35;
      },
    };
  }

  /* ================= 3 · EXPERIMENTO DE OERSTED ================= */
  function oersted(k) {
    const g = new THREE.Group();
    g.rotation.set(0.35, -0.6, 0);   // a bobina fica de frente: dá para ver a bússola lá dentro
    g.userData.base = 0.9;
    mesh(rbox(2.3, 0.8, 1.6, 0.08), std(0x15161a, { r: 0.45, m: 0.25 }), g, [0, -0.72, 0]);
    // bobina: anel branco com espiras de cobre, eixo ao longo de x
    const ring = new THREE.Group(); ring.position.set(0, 0.6, 0); g.add(ring);
    const white = std(0xf1efe8, { r: 0.6, ds: true });
    mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.4, 64, 1, true), white, ring, [0, 0, 0], [0, 0, Math.PI / 2]);
    mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.4, 64, 1, true), white, ring, [0, 0, 0], [0, 0, Math.PI / 2]);
    [-0.2, 0.2].forEach((x) => mesh(new THREE.RingGeometry(0.76, 0.9, 64), white, ring, [x, 0, 0], [0, Math.PI / 2, 0]));
    const copper = std(0xc46a2b, { m: 0.8, r: 0.3 });
    for (let i = 0; i < 16; i++) mesh(new THREE.TorusGeometry(0.865, 0.016, 6, 72), copper, ring, [-0.16 + i * 0.0215, 0, 0], [0, Math.PI / 2, 0]);
    mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), white, g, [0, -0.29, 0]);
    // bússola no centro da bobina
    const compass = new THREE.Group(); compass.position.set(0, 0.25, 0); g.add(compass);
    mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 12), white, g, [0, -0.02, 0]);
    mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 40), std(0x101216, { r: 0.4 }), compass);
    const dial = canvasTex(256, 256, (x) => {
      x.fillStyle = '#f4f1e8'; x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#1d2433'; x.lineWidth = 3;
      for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2, r1 = i % 9 ? 108 : 96; x.beginPath(); x.moveTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1); x.lineTo(128 + Math.cos(a) * 120, 128 + Math.sin(a) * 120); x.stroke(); }
      x.fillStyle = '#c2452f'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('N', 128, 62); x.fillStyle = '#1d2433'; x.fillText('S', 128, 196); x.fillText('L', 196, 128); x.fillText('O', 60, 128);
    });
    mesh(new THREE.CircleGeometry(0.27, 48), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.6 }), compass, [0, 0.037, 0], [-Math.PI / 2, 0, 0]);
    const needle = new THREE.Group(); needle.position.y = 0.06; compass.add(needle);
    const cone = (color, dir) => { const m = mesh(new THREE.ConeGeometry(0.045, 0.24, 4), std(color, { r: 0.4, m: 0.3 }), needle, [0, 0, dir * 0.12], [dir * Math.PI / 2, 0, 0]); m.scale.set(1, 1, 0.35); };
    cone(0xd63a3a, -1); cone(0xf0f0f0, 1);
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 10), std(0xc9a44a, { m: 0.8 }), needle);
    // botão verde
    const btn = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 24), std(0x2fae4a, { r: 0.35, e: 0x2fae4a, ei: 0 }), g, [0.82, -0.27, 0.5]);
    mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 24), std(0xb8bcc2, { m: 0.85, r: 0.3 }), g, [0.82, -0.31, 0.5]);
    // corrente nas espiras e campo da bobina (ao longo do eixo x)
    const loop = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; loop.push([0, Math.cos(a) * 0.9, Math.sin(a) * 0.9]); }
    const amps = flow(new THREE.CatmullRomCurve3(loop.map((p) => V(...p)), true), 16, ORANGE, 0.17 * k, ring);
    const fieldMat = std(ORANGE, { op: 0, e: ORANGE, ei: 0.9 });
    [0.35, 0.6].forEach((h) => {
      const pts = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; pts.push([Math.cos(a) * 1.55, Math.sin(a) * h, 0]); }
      wire(smooth(pts, true), 0.008, fieldMat, ring, 96);
    });
    [-1.1, 1.1].forEach((x) => mesh(new THREE.ConeGeometry(0.07, 0.18, 12), fieldMat, ring, [x, 0, 0], [0, 0, -Math.PI / 2]));
    const st = { a: 0, v: 0 };
    return {
      g,
      update(u, t, dt) {
        const on = sm(0.36, 0.42, u);
        btn.position.y = -0.27 - on * 0.04;
        btn.material.emissiveIntensity = on * 0.6;
        amps(t, 0.6, on * 0.9);
        fieldMat.opacity = on * 0.6;
        // agulha: aponta para o norte terrestre; com corrente, gira para o eixo da bobina (mola amortecida)
        const target = on > 0.5 ? -Math.PI / 2 : 0;
        st.v += ((target - st.a) * 26 - st.v * 3.2) * dt; st.a += st.v * dt;
        needle.rotation.y = st.a + Math.sin(t * 3) * 0.02;
      },
    };
  }

  /* ================= 4 · LEDs INFRAVERMELHOS COMO PLACA SOLAR ================= */
  function solarWatch(k) {
    const g = new THREE.Group();
    const watch = new THREE.Group(); watch.position.set(0.55, -0.2, 0); g.add(watch);
    const pink = std(PINK, { r: 0.42 });
    mesh(rbox(1.3, 1.15, 0.3, 0.34), pink, watch);
    [-0.32, 0.32].forEach((x) => mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 24), pink, watch, [x, 0.55, 0], [Math.PI / 2, 0, 0]));
    const lcd = document.createElement('canvas'); lcd.width = 256; lcd.height = 232;
    const lcdTex = new THREE.CanvasTexture(lcd); lcdTex.colorSpace = THREE.SRGBColorSpace;
    const ctx = lcd.getContext('2d');
    const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); };
    let shownText = null;
    const drawLcd = (txt, on) => {
      if (txt === shownText) return; shownText = txt;
      ctx.clearRect(0, 0, 256, 232);
      ctx.fillStyle = '#16181d'; rr(14, 22, 228, 196, 26);
      ctx.fillStyle = on ? '#b9c9a6' : '#6f7a69'; rr(34, 46, 188, 92, 10);
      ctx.fillStyle = on ? '#1b2414' : 'rgba(27,36,20,0.12)';
      ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(txt, 128, 94);
      ctx.fillStyle = '#f4f1e8'; ctx.font = 'bold 26px sans-serif'; ctx.fillText('STOP WATCH', 128, 172);
      lcdTex.needsUpdate = true;
    };
    drawLcd('88:88', false);
    mesh(new THREE.PlaneGeometry(1.12, 1.0), new THREE.MeshStandardMaterial({ map: lcdTex, transparent: true, roughness: 0.4 }), watch, [0, -0.02, 0.16]);
    // três LEDs infravermelhos em série
    // cada LED tem a perninha maior (anodo, +) à esquerda e a menor (catodo, −) à direita;
    // um fiozinho liga o catodo de um ao anodo do próximo: estão em série
    const cluster = new THREE.Group(); cluster.position.set(-1.2, 0.55, 0.15); g.add(cluster);
    const clear = std(0xdde9ff, { op: 0.6, r: 0.08 });
    const legs = std(0xd0d4d8, { m: 0.85, r: 0.3 });
    const LX = [-0.22, 0, 0.22], AN = 0.38, CA = 0.28;
    LX.forEach((x) => {
      mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.13, 20), clear, cluster, [x, 0.065, 0]);
      mesh(new THREE.SphereGeometry(0.075, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), clear, cluster, [x, 0.13, 0]);
      mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 20), clear, cluster, [x, 0.01, 0]);
      mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), std(0x3a2a55), cluster, [x, 0.08, 0]);
      mesh(new THREE.CylinderGeometry(0.008, 0.008, AN, 6), legs, cluster, [x - 0.03, -AN / 2, 0]);
      mesh(new THREE.CylinderGeometry(0.008, 0.008, CA, 6), legs, cluster, [x + 0.03, -CA / 2, 0]);
    });
    const link = std(0xc46a2b, { m: 0.85, r: 0.3 });
    [0, 1].forEach((i) => wire(smooth([[LX[i] + 0.03, -CA + 0.01, 0], [LX[i] + 0.1, -CA - 0.09, 0.02], [LX[i + 1] - 0.03, -AN + 0.01, 0]]), 0.009, link, cluster, 16));
    const red = std(0xd63a3a, { r: 0.5 }), black = std(0x1d1d1f, { r: 0.5 });
    const redPath = smooth([[-1.45, 0.18, 0.15], [-1.55, -0.4, 0.25], [-1.0, -1.0, 0.25], [0.0, -1.1, 0.1], [0.75, -0.8, 0.0]]);
    const blackPath = smooth([[-0.95, 0.28, 0.15], [-0.85, -0.3, 0.25], [-0.5, -0.9, 0.2], [0.1, -1.0, 0.05], [0.4, -0.8, 0.0]]);
    wire(redPath, 0.02, red, g, 80); wire(blackPath, 0.02, black, g, 80);
    // sol
    const sun = new THREE.Group(); sun.position.set(-2.0, 1.75, -0.3); g.add(sun);
    mesh(new THREE.SphereGeometry(0.3, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffe27a }), sun);
    const sunGlow = glow(SUN, 2.2, sun);
    const rays = new THREE.Group(); sun.add(rays);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; mesh(new THREE.BoxGeometry(0.22, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: SUN }), rays, [Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0], [0, 0, a]); }
    const photons = flow(poly([[-1.75, 1.5, -0.2], [-1.2, 0.72, 0.15]]), 10, SUN, 0.16 * k, g);
    const electrons = flow(redPath, 14, CYAN, 0.12 * k, g);
    const ledGlow = glow(0xff6b8a, 0.9, cluster, [0, 0.12, 0]);
    let t0 = null;
    return {
      g,
      update(u, t) {
        const s = sm(0.12, 0.3, u);
        sun.scale.setScalar(Math.max(0.001, s)); sunGlow.material.opacity = s * 0.9;
        rays.rotation.z = t * 0.4;
        const pow = sm(0.34, 0.42, u);
        photons(t, 0.9, s * 0.9);
        electrons(t, 0.35, pow * 0.85);
        ledGlow.material.opacity = pow * (0.25 + 0.1 * Math.sin(t * 9));
        if (pow > 0.5) {
          if (t0 === null) t0 = t;
          const e = t - t0, m = Math.floor(e / 60) % 60, sec = Math.floor(e) % 60, cs = Math.floor((e * 100) % 100);
          drawLcd(`${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`.slice(0, 5 + (k < 1 ? 0 : 3)), true);
        } else { t0 = null; drawLcd('88:88', false); }
      },
    };
  }

  /* ================= 5 · CIRCUITO MISTO DO COTIDIANO ================= */
  function circuit(k) {
    const g = new THREE.Group();
    g.rotation.x = 0.5;
    const Y = -0.56;
    mesh(new THREE.BoxGeometry(3.1, 0.12, 2.0), std(0xc89a62, { r: 0.75 }), g, [0, -0.68, 0]);
    // suporte com 2 pilhas
    mesh(new THREE.BoxGeometry(0.9, 0.2, 0.42), std(0x1a1a1c, { r: 0.6 }), g, [-1.0, -0.52, 0.55]);
    [0.47, 0.63].forEach((z) => {
      mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.72, 24), std(0x2f6fd6, { r: 0.35, m: 0.3 }), g, [-1.0, -0.4, z], [0, 0, Math.PI / 2]);
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12), std(0xd0d4d8, { m: 0.9 }), g, [-0.62, -0.4, z], [0, 0, Math.PI / 2]);
    });
    const bulb = (x, z) => {
      const b = new THREE.Group(); b.position.set(x, -0.62, z); g.add(b);
      mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.12, 24), std(0x2a2d33, { r: 0.5 }), b, [0, 0.06, 0]);
      mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 20), std(0xc7ccd2, { m: 0.85, r: 0.3 }), b, [0, 0.2, 0]);
      mesh(new THREE.SphereGeometry(0.2, 32, 16), std(0xfff3d6, { op: 0.3, r: 0.05 }), b, [0, 0.45, 0]);
      const fil = mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 20, Math.PI), std(0x7a5a2a, { e: 0xffc65a, ei: 0 }), b, [0, 0.45, 0]);
      const h = glow(0xffd27a, 1.3, b, [0, 0.45, 0]);
      return (v) => { fil.material.emissiveIntensity = v * 3; h.material.opacity = v * 0.85; h.scale.setScalar(0.6 + v * 1.1); };
    };
    const L1 = bulb(-0.15, 0.7), L2 = bulb(0.95, 0.7), L3 = bulb(0.95, -0.4);
    // interruptor de faca
    const sw = new THREE.Group(); sw.position.set(-0.35, Y, -0.75); g.add(sw);
    mesh(new THREE.BoxGeometry(0.45, 0.05, 0.16), std(0x3a2a1e, { r: 0.7 }), sw, [0, -0.02, 0]);
    const lever = new THREE.Group(); lever.position.set(-0.18, 0.03, 0); sw.add(lever);
    mesh(new THREE.BoxGeometry(0.36, 0.025, 0.04), std(0xc46a2b, { m: 0.8, r: 0.3 }), lever, [0.18, 0, 0]);
    mesh(new THREE.SphereGeometry(0.035, 12, 8), std(0x111111), lever, [0.36, 0, 0]);
    const p = (x, z) => [x, Y, z];
    const inPath = poly([p(-0.6, 0.55), p(-0.6, 0.7), p(-0.15, 0.7), p(0.4, 0.7)]);
    const aPath = poly([p(0.4, 0.7), p(0.95, 0.7), p(1.35, 0.7), p(1.35, 0.15)]);
    const bPath = poly([p(0.4, 0.7), p(0.4, -0.4), p(0.95, -0.4), p(1.35, -0.4), p(1.35, 0.15)]);
    const outPath = poly([p(1.35, 0.15), p(1.35, -0.75), p(-0.35, -0.75), p(-1.45, -0.75), p(-1.45, 0.55)]);
    const wm = std(0xd63a3a, { r: 0.5 }), wb = std(0xe0a03a, { r: 0.5 }), wk = std(0x1d1d1f, { r: 0.5 });
    wire(inPath, 0.018, wm, g); wire(aPath, 0.018, wb, g); wire(bPath, 0.018, wb, g); wire(outPath, 0.018, wk, g);
    const fIn = flow(inPath, 8, CYAN, 0.12 * k, g), fA = flow(aPath, 7, CYAN, 0.12 * k, g), fB = flow(bPath, 9, CYAN, 0.12 * k, g), fOut = flow(outPath, 16, CYAN, 0.12 * k, g);
    return {
      g,
      update(u, t) {
        const on = sm(0.3, 0.38, u);
        lever.rotation.z = (1 - on) * 0.9;
        L1(on); L2(on * 0.45); L3(on * 0.45);                      // a corrente se divide no paralelo
        fIn(t, 0.5, on); fOut(t, 0.25, on); fA(t, 0.35, on * 0.8); fB(t, 0.25, on * 0.8);
      },
    };
  }

  /* ================= 6 · PILHA DE LIMÃO ================= */
  function lemons(k) {
    const g = new THREE.Group();
    g.rotation.x = 0.22;
    const plate = mesh(new THREE.CylinderGeometry(2.1, 1.95, 0.08, 64), std(0xe9e6df, { r: 0.35 }), g, [0, -0.78, 0]);
    plate.scale.z = 0.6;
    const lemonGeo = deform(new THREE.SphereGeometry(0.42, 48, 32), (v) => {
      const tip = Math.pow(Math.abs(v.x) / 0.42, 8);
      v.x *= 1.3 + 0.35 * tip;
      v.multiplyScalar(1 + 0.012 * Math.sin(v.x * 60) * Math.sin(v.y * 55) * Math.sin(v.z * 58));
    });
    const peel = std(LEMON, { r: 0.5, e: 0x3a3000, ei: 0.25 });
    const cu = std(0xc46a2b, { m: 0.85, r: 0.3 }), zn = std(0xaab1b9, { m: 0.85, r: 0.35 });
    const xs = [-1.25, 0, 1.25];
    const NAIL = [xs[2] + 0.2, 0, 0.1];
    const zinc3 = new THREE.Group(); zinc3.position.set(...NAIL); g.add(zinc3);
    xs.forEach((x, i) => {
      const l = mesh(lemonGeo, peel, g, [x, -0.38, 0]); l.rotation.y = (i - 1) * 0.25;
      mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.7, 10), cu, g, [x - 0.2, 0.0, 0.1]);
      mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 14), cu, g, [x - 0.2, 0.35, 0.1]);
      // o prego de zinco do último limão é o que se encaixa e desencaixa (abre e fecha o circuito)
      const holder = i === 2 ? zinc3 : g;
      const at = i === 2 ? [0, 0, 0] : [x + 0.2, 0.0, 0.1];
      mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.7, 10), zn, holder, at);
      mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 14), zn, holder, [at[0], at[1] + 0.35, at[2]]);
    });
    const wireMat = std(0x2a8a4a, { r: 0.5 });
    const links = [0, 1].map((i) => smooth([[xs[i] + 0.2, 0.36, 0.1], [xs[i] + 0.62, 0.75, 0.15], [xs[i + 1] - 0.2, 0.36, 0.1]]));
    // circuito externo: zinco do último limão → LED → cobre do primeiro
    const outA = smooth([[xs[2] + 0.2, 0.36, 0.1], [1.6, 1.0, 0.15], [0.6, 1.45, 0.2], [0.06, 1.25, 0.2]]);
    const outB = smooth([[-0.06, 1.25, 0.2], [-0.6, 1.45, 0.2], [-1.6, 1.0, 0.15], [xs[0] - 0.2, 0.36, 0.1]]);
    [...links, outB].forEach((c) => wire(c, 0.016, wireMat, g, 48));
    const outAMesh = wire(outA, 0.016, wireMat, g, 48);   // acompanha o prego quando ele sai do limão
    let lastLift = -1, lampV = 0;
    const lamp = led(0xff4a4a, g, [0, 1.2, 0.2], null, 0.09);
    const flows = [...links, outA, outB].map((c) => flow(c, 8, CYAN, 0.12 * k, g));
    // íons dentro de cada limão
    const ionPos = new Float32Array(3 * 18);
    const ionGeo = new THREE.BufferGeometry(); ionGeo.setAttribute('position', new THREE.BufferAttribute(ionPos, 3));
    const ionMat = new THREE.PointsMaterial({ color: ORANGE, size: 0.1 * k, map: HALO, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const ions = new THREE.Points(ionGeo, ionMat); ions.frustumCulled = false; g.add(ions);
    return {
      g,
      update(u, t) {
        // o prego entra no limão; o LED só acende com o circuito fechado e apaga assim que ele sai
        const closed = sm(0.24, 0.36, u), lift = 1 - closed;
        const th = -lift * 0.3;
        zinc3.position.set(NAIL[0] + lift * 0.15, NAIL[1] + lift * 0.62, NAIL[2]);
        zinc3.rotation.z = th;
        if (Math.abs(lift - lastLift) > 0.001) {
          lastLift = lift;
          outA.points[0].set(zinc3.position.x - 0.36 * Math.sin(th), zinc3.position.y + 0.36 * Math.cos(th), NAIL[2]);
          outA.updateArcLengths();
          outAMesh.geometry.dispose();
          outAMesh.geometry = new THREE.TubeGeometry(outA, 48, 0.016, 8, false);
        }
        lampV += ((closed > 0.98 ? 1 : 0) - lampV) * 0.35;
        const on = lampV;
        flows.forEach((f) => f(t, 0.4, on * 0.9));
        lamp.set(on * (0.85 + 0.15 * Math.sin(t * 7)));
        ionMat.opacity = on * 0.8;
        for (let i = 0; i < 18; i++) {
          const L = xs[i % 3], ph = (t * 0.5 + i * 0.37) % 1;
          ionPos[i * 3] = L + 0.2 - ph * 0.4; ionPos[i * 3 + 1] = -0.3 + Math.sin(i * 2.1 + t) * 0.12; ionPos[i * 3 + 2] = 0.28;
        }
        ionGeo.attributes.position.needsUpdate = true;
      },
    };
  }

  /* ================= 7 · CONDUTIVÍMETRO QUARKS (patente) ================= */
  function conductivimeter(k) {
    const g = new THREE.Group();
    g.rotation.set(0.32, 0.45, 0);
    const shellMat = std(0xa7abb1, { r: 0.55 });
    mesh(rbox(1.9, 0.75, 1.3, 0.16), shellMat, g);
    // LEDs de sinalização (verde, amarelo, vermelho) na face lateral
    const leds = [[WGREEN, 0.35], [0xf5d33c, 0], [0xf0463c, -0.35]].map(([c, z]) => {
      mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 20), std(0x2b2b2e), g, [-0.98, 0, z], [0, 0, Math.PI / 2]);
      return led(c, g, [-1.0, 0, z], [0, 0, Math.PI / 2], 0.075);
    });
    // chave liga/desliga
    mesh(new THREE.BoxGeometry(0.26, 0.18, 0.04), std(0x151517), g, [0.25, 0.05, 0.66]);
    const rocker = mesh(new THREE.BoxGeometry(0.2, 0.13, 0.05), std(0x232326, { r: 0.4 }), g, [0.25, 0.05, 0.69]);
    // compartimento reservador com o par de eletrodos
    const res = new THREE.Group(); res.position.set(1.25, -0.08, 0); g.add(res);
    mesh(new THREE.BoxGeometry(0.62, 0.05, 0.92), shellMat, res, [0, -0.25, 0]);
    mesh(new THREE.BoxGeometry(0.05, 0.5, 0.92), shellMat, res, [0.31, 0, 0]);
    [-0.46, 0.46].forEach((z) => mesh(new THREE.BoxGeometry(0.62, 0.5, 0.05), shellMat, res, [0, 0, z]));
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), std(0x151517), res, [0.1, -0.3, 0]);
    const liquidMat = std(0x9fdcff, { op: 0.55, r: 0.08 });
    const liquid = mesh(new THREE.BoxGeometry(0.56, 1, 0.86), liquidMat, res, [0, -0.22, 0]);
    const ins = std(0x141416, { r: 0.6 }), tip = std(0xd08040, { m: 0.85, r: 0.3 });
    [-0.18, 0.18].forEach((z) => {
      wire(smooth([[-0.45, 0.47, z], [-0.25, 0.58, z], [-0.02, 0.48, z], [0, 0.2, z], [0, -0.05, z]]), 0.035, ins, res, 40);
      mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 10), tip, res, [0, -0.12, z]);
    });
    const ionPos = new Float32Array(3 * 40);
    const ionGeo = new THREE.BufferGeometry(); ionGeo.setAttribute('position', new THREE.BufferAttribute(ionPos, 3));
    const ionMat = new THREE.PointsMaterial({ color: ORANGE, size: 0.08 * k, map: HALO, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const ions = new THREE.Points(ionGeo, ionMat); ions.frustumCulled = false; res.add(ions);
    const samples = [{ c: new THREE.Color(0x9fdcff), n: 6 }, { c: new THREE.Color(0xd8cf8a), n: 20 }, { c: new THREE.Color(0x8a6a44), n: 40 }];
    const col = new THREE.Color(0x9fdcff);
    let ts = null;
    return {
      g,
      update(u, t) {
        const fill = sm(0.12, 0.3, u);
        liquid.scale.y = Math.max(0.001, fill * 0.4); liquid.position.y = -0.22 + fill * 0.2;
        const on = sm(0.34, 0.4, u);
        rocker.rotation.x = on > 0.5 ? -0.25 : 0.25;
        let idx = 0;
        if (on > 0.5 && fill > 0.9) { if (ts === null) ts = t; idx = Math.floor((t - ts) / 2.4) % 3; } else ts = null;
        col.lerp(samples[idx].c, 0.06); liquidMat.color.copy(col);
        leds.forEach((l, i) => l.set(on > 0.5 && fill > 0.9 && i === idx ? 1 : 0));
        ionMat.opacity = fill * 0.85;
        ionGeo.setDrawRange(0, samples[idx].n);
        for (let i = 0; i < 40; i++) {
          ionPos[i * 3] = Math.sin(t * 0.9 + i * 1.7) * 0.22;
          ionPos[i * 3 + 1] = -0.2 + ((i * 0.13 + t * 0.05) % 1) * 0.16 * fill;
          ionPos[i * 3 + 2] = Math.sin(t * 0.7 + i * 2.3) * 0.36;
        }
        ionGeo.attributes.position.needsUpdate = true;
      },
    };
  }

  /* ================= 8 · APARELHO DE PERCEPÇÃO ÓPTICA QUARKS (patente) ================= */
  function optical(k) {
    const g = new THREE.Group();
    // de frente: o LED (face −x) aponta direto para o visitante; o cabo sai por trás
    g.rotation.set(0.32, Math.PI / 2 - 0.28, 0);   // leve perspectiva: dá para ver as chaves sendo acionadas
    g.userData.front = Math.PI / 2 - 0.28;
    const dev = new THREE.Group(); g.add(dev);
    mesh(rbox(1.6, 0.8, 1.15, 0.12), std(0x9fa3a9, { r: 0.55 }), dev);
    // três chaves alavanca: 5A (verde), 5B (vermelho), 5C (fase)
    // enfileiradas em linha reta no topo (da esquerda para a direita de quem olha)
    const toggles = [[0, -0.32], [0, 0], [0, 0.32]].map(([x, z]) => {
      mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 6), std(0x2a2b2f, { m: 0.5, r: 0.4 }), dev, [x, 0.43, z]);
      const lev = new THREE.Group(); lev.position.set(x, 0.46, z); dev.add(lev);
      mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.3, 10), std(0xd8dde4, { m: 0.85, r: 0.25 }), lev, [0, 0.15, 0]);
      return lev;
    });
    // LED bicolor (7) na face lateral
    mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 20), std(0x18181a), dev, [-0.84, 0, 0], [0, 0, Math.PI / 2]);
    const ledMat = std(0xffffff, { r: 0.2, op: 0.95, e: 0xffd23c, ei: 0 });
    const ledDome = mesh(new THREE.SphereGeometry(0.085, 24, 12), ledMat, dev, [-0.92, 0, 0]);
    const ledGlow = glow(0xffc21a, 1.1, dev, [-0.98, 0, 0]);
    // cabo e plugue de três pinos (rede elétrica alternada)
    wire(smooth([[0.8, -0.1, 0], [1.3, -0.25, 0.2], [1.5, -0.65, 0.5], [1.15, -0.85, 0.75], [1.6, -0.95, 0.9]]), 0.04, std(0x1d1d1f, { r: 0.6 }), dev, 64);
    const plug = new THREE.Group(); plug.position.set(1.72, -0.98, 0.95); plug.rotation.set(0, -0.5, -0.2); dev.add(plug);
    mesh(new THREE.BoxGeometry(0.3, 0.2, 0.22), std(0x1d1d1f, { r: 0.5 }), plug);
    [[0.06, 0.05], [-0.06, 0.05], [0, -0.05]].forEach(([y, z]) => mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 10), std(0xc9ced6, { m: 0.9, r: 0.25 }), plug, [0.24, y, z], [0, 0, Math.PI / 2]));
    // rastro de luz: persistência da visão enquanto a caixinha balança
    // calculado ponto a ponto, 1 ms por amostra, a partir do movimento: os traços seguem os 60 Hz da rede
    const N = 260, STEP = 0.001, HZ = 60, A = 0.9, W = 10;
    // mistura normal (não aditiva): pontos verdes e vermelhos sobrepostos continuam com a cor pura
    const trail = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 10, 6), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), N);
    trail.frustumCulled = false; g.add(trail);
    const wp = new THREE.Vector3(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    const C = { y: new THREE.Color(0xffc21a), g: new THREE.Color(0x3ee07a), r: new THREE.Color(0xff3b3b) };
    return {
      g,
      update(u, t) {
        // sequência: 5B acende o vermelho → desliga e 5A acende o verde → os dois juntos, em fase (amarelo)
        // e a caixinha balança → 5C tira de fase e, no balanço, verde e vermelho se revezam
        // só começa quando a caixinha já chegou ao lugar (o modelo termina de entrar em u ≈ 0.3)
        const redOn = u > 0.37 && u < 0.44 || u > 0.53;
        const greenOn = u > 0.46;
        const out = u > 0.66;
        const flip = (lev, v) => { lev.rotation.z += ((v ? 0.35 : -0.35) - lev.rotation.z) * 0.25; }; // alavanca vai para a frente (liga) ou para trás
        flip(toggles[0], greenOn); flip(toggles[1], redOn); flip(toggles[2], out);
        const swing = sm(0.55, 0.61, u);
        const s = Math.sin(t * W);
        dev.position.z = s * A * swing; dev.rotation.x = -s * 0.1 * swing;   // balanço lateral (esquerda ↔ direita)
        const both = redOn && greenOn;
        // parado, o olho funde os 60 Hz: em fase ou fora de fase o LED parece amarelo; só o balanço separa as cores
        const cur = both ? C.y : redOn ? C.r : C.g;
        const on = redOn || greenOn ? 1 : 0;
        const bright = both && !out ? 2.6 : both ? 2.2 : 1.8;      // amarelo bem forte, quente
        ledMat.emissive.copy(cur); ledMat.emissiveIntensity = on * bright;
        if (on) ledMat.color.copy(cur); else ledMat.color.set(0xe8e8e8);
        ledGlow.material.color.copy(cur); ledGlow.material.opacity = on * (bright > 2 ? 1 : 0.85);
        ledGlow.scale.setScalar(bright > 2 ? 1.4 : 1.0);
        for (let i = 0; i < N; i++) {
          const tt = t - i * STEP;
          wp.set(-0.97, 0, Math.sin(tt * W) * A * swing);
          const vis = both ? swing * (1 - i / N) : 0;
          sc.setScalar(Math.max(0.0001, vis));
          m4.compose(wp, q, sc);
          trail.setMatrixAt(i, m4);
          trail.setColorAt(i, out ? (Math.sin(tt * Math.PI * 2 * HZ) >= 0 ? C.g : C.r) : C.y);
        }
        trail.instanceMatrix.needsUpdate = true;
        if (trail.instanceColor) trail.instanceColor.needsUpdate = true;
      },
    };
  }

  /* ================= final · esfera com sulcos cerebrais ================= */
  function brain() {
    const g = new THREE.Group();
    const geo = deform(new THREE.IcosahedronGeometry(1, 30), (v) => {
      const n = v.clone().normalize();
      let f = 0, amp = 1, fr = 3.1;
      for (let o = 0; o < 3; o++) {
        const w = Math.sin(fr * n.x * 1.7 + Math.sin(fr * n.y * 1.3 + o) * 1.6 + o * 1.1) * Math.sin(fr * n.z * 1.5 + Math.sin(fr * n.x * 1.1) * 1.4);
        f += amp * (1 - Math.abs(w)); amp *= 0.5; fr *= 2.05;
      }
      let r = 1 + 0.06 * f;
      r -= 0.14 * Math.exp(-(n.x * n.x) / 0.003) * Math.max(0, n.y + 0.35);   // fissura entre os hemisférios
      v.copy(n).multiplyScalar(r);
      v.x *= 0.92; v.y *= 0.86; v.z *= 1.12;
    });
    const mat = std(0xc98fd8, { r: 0.42, m: 0.05, e: 0x5b2a8a, ei: 0.55 });
    mesh(geo, mat, g);
    const net = mesh(geo, new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.05, depthWrite: false }), g);
    net.scale.setScalar(1.004);
    const aura = glow(VIOLET, 4.2, g);
    return { g, update(t) { mat.emissiveIntensity = 0.45 + 0.2 * Math.sin(t * 2.2); aura.material.opacity = 0.35 + 0.1 * Math.sin(t * 2.2); g.rotation.y = t * 0.18; } };
  }

  /* ---------- caixa de abertura (o kit) ---------- */
  const S = 2.0;
  const intro = new THREE.Group(); root.add(intro);
  const faces = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((d, i) => {
    const f = new THREE.Group();
    const col = [CYAN, CYAN, ORANGE, LIME, CYAN, ORANGE][i];
    const fillMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false });
    const lineMat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9 });
    f.add(new THREE.Mesh(new THREE.PlaneGeometry(S, S), fillMat), new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(S, S)), lineMat));
    const v = V(...d); f.position.copy(v).multiplyScalar(S / 2); f.lookAt(v.clone().multiplyScalar(S));
    f.userData = { dir: v, fillMat, lineMat };
    intro.add(f);
    return f;
  });

  /* ---------- esfera de partículas que vira cada experimento ---------- */
  const ORB_N = 900;
  const orbPos = new Float32Array(ORB_N * 3);
  for (let i = 0; i < ORB_N; i++) {
    const y = 1 - (i / (ORB_N - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    orbPos[i * 3] = Math.cos(a) * r; orbPos[i * 3 + 1] = y; orbPos[i * 3 + 2] = Math.sin(a) * r;
  }
  const orbGeo = new THREE.BufferGeometry(); orbGeo.setAttribute('position', new THREE.BufferAttribute(orbPos, 3));
  const orbMat = new THREE.PointsMaterial({ color: CYAN, size: 0.07, map: HALO, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const orb = new THREE.Points(orbGeo, orbMat); root.add(orb);
  const coreGlow = glow(CYAN, 2.4, root);

  const builders = [electroscope, hall, oersted, solarWatch, circuit, lemons, conductivimeter, optical];
  const exps = builders.map((b) => { const e = b(1); e.g.visible = false; root.add(e.g); return e; });
  const COLORS = [CYAN, CYAN, VIOLET, ORANGE, SUN, LIME, LEMON, WGREEN, 0xff7a5a, VIOLET].map((c) => new THREE.Color(c));

  // final: cérebro + miniaturas animadas de todos os experimentos em órbita
  const finale = new THREE.Group(); finale.visible = false; root.add(finale);
  const br = brain(); finale.add(br.g);
  const ring = new THREE.Group(); ring.rotation.x = 0.32; finale.add(ring);
  const minis = builders.map((b, i) => {
    const e = b(0.3);
    const a = (i / builders.length) * Math.PI * 2;
    e.g.position.set(Math.cos(a) * 2.35, 0, Math.sin(a) * 2.35);
    e.g.scale.setScalar(0.27);
    ring.add(e.g);
    return e;
  });
  const synPos = new Float32Array(builders.length * 2 * 3);
  const synGeo = new THREE.BufferGeometry(); synGeo.setAttribute('position', new THREE.BufferAttribute(synPos, 3));
  const synapses = new THREE.LineSegments(synGeo, new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  synapses.frustumCulled = false; finale.add(synapses);
  const pulsePos = new Float32Array(builders.length * 3);
  const pulseGeo = new THREE.BufferGeometry(); pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3));
  const pulses = new THREE.Points(pulseGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, map: HALO, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pulses.frustumCulled = false; finale.add(pulses);
  const tmpV = new THREE.Vector3();

  /* ---------- enquadramento ---------- */
  let small = false;
  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    small = w < 760;
    // a câmera mira o centro da cena: nada é cortado embaixo durante a expansão
    if (small) { camera.position.set(0, 0.8, 14.5); root.position.set(0, 1.0, 0); }
    else { camera.position.set(0, 0.7, 11); root.position.set(w > 960 ? 1.4 : 0.6, 0.45, 0); }
    camera.lookAt(root.position.x * 0.55, root.position.y - (small ? 1.1 : 0.75), 0);
    camera.updateProjectionMatrix();
  };
  resize();

  let progress = 0, shown = 0, raf = 0, t = 0, last = performance.now();
  const col = new THREE.Color();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    t += dt;
    shown += (progress - shown) * Math.min(1, dt * 3.5);   // rolagem amortecida: a troca de experimento não dá saltos
    const x = Math.min(0.9999, clamp(shown) || 0) * 10; // protege contra progresso fora de 0–1 (recarga no meio da página)
    const seg = Math.floor(x), u = x - seg;

    // abertura: as faces se afastam e somem antes de chegar à borda da tela
    const open = seg === 0 ? sm(0.15, 0.75, u) : 1;
    intro.visible = open < 0.999;
    faces.forEach((f, i) => {
      f.position.copy(f.userData.dir).multiplyScalar(S / 2 + open * (1.0 + (i % 3) * 0.2));
      f.rotation.z = open * (i % 2 ? 0.4 : -0.4);
      f.userData.fillMat.opacity = 0.07 * (1 - open);
      f.userData.lineMat.opacity = 0.9 * (1 - open);
    });
    intro.rotation.y = t * 0.15;

    // quanto do modelo do trecho está visível (entra, fica, volta a ser esfera)
    let vis = 0;
    if (seg >= 1 && seg <= 8) vis = sm(0.03, 0.36, u) * (1 - sm(0.76, 1.0, u));
    else if (seg === 9) vis = sm(0.1, 0.35, u);
    const orbStrength = seg === 0 ? sm(0.05, 0.6, u) : 1 - vis;
    col.copy(COLORS[seg]);
    if (seg > 0 && u < 0.12) col.lerpColors(COLORS[seg - 1], COLORS[seg], u / 0.12);
    orbMat.color.copy(col); coreGlow.material.color.copy(col);
    orb.scale.setScalar(Math.max(0.001, (seg === 0 ? 0.3 + 0.6 * orbStrength : 0.9) + vis * 2.6));
    orbMat.opacity = orbStrength * 0.95;
    orbMat.size = 0.07 + vis * 0.05;
    orb.rotation.y = t * 0.5; orb.rotation.x = t * 0.2;
    orb.visible = orbMat.opacity > 0.01;
    coreGlow.material.opacity = orbStrength * 0.7;
    coreGlow.scale.setScalar(1.6 + Math.sin(t * 3) * 0.15);

    exps.forEach((e, i) => {
      const on = seg === i + 1 && vis > 0.001;
      e.g.visible = on;
      if (!on) return;
      e.g.scale.setScalar(vis * (e.g.userData.base || 1));
      e.g.rotation.y = e.g.userData.front != null
        ? e.g.userData.front - root.rotation.y + (1 - vis) * 1.4
        : (e.g.userData.ry ??= e.g.rotation.y) + (1 - vis) * 1.4 + Math.sin(t * 0.4) * 0.12;
      e.update(u, t, dt);
    });

    finale.visible = seg === 9 && vis > 0.001;
    if (finale.visible) {
      finale.scale.setScalar(vis * (small ? 0.58 : 1));   // no celular a órbita cabe na largura
      br.update(t);
      ring.rotation.y = t * 0.22;
      minis.forEach((m, i) => {
        m.g.rotation.y = -ring.rotation.y + (m.g.userData.ry ??= m.g.rotation.y);
        // cada experimento repete o próprio ciclo: liga, acontece, desliga (ímã vai e volta, bastão aproxima e afasta…)
        // ida e volta em velocidade constante: termina o ciclo e rebobina até o começo, sem cortes
        const ph = ((t + i * 0.9) / 8) % 1;   // ciclo de 8 s: 4 s de ida e 4 s de volta
        const mu = 0.08 + 0.7 * (ph < 0.5 ? ph * 2 : 2 - ph * 2);
        m.update(mu, t + i, dt);
        m.g.getWorldPosition(tmpV); finale.worldToLocal(tmpV);
        const dir = tmpV.clone().normalize();
        synPos.set([dir.x * 1.05, dir.y * 1.05, dir.z * 1.05, tmpV.x, tmpV.y, tmpV.z], i * 6);
        const f = (t * 0.6 + i * 0.13) % 1;
        pulsePos.set([lerp(dir.x * 1.05, tmpV.x, f), lerp(dir.y * 1.05, tmpV.y, f), lerp(dir.z * 1.05, tmpV.z, f)], i * 3);
      });
      synGeo.attributes.position.needsUpdate = true;
      pulseGeo.attributes.position.needsUpdate = true;
    }

    root.rotation.set(0.14, -0.42 + Math.sin(t * 0.25) * 0.16, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    update(p) { progress = Number.isFinite(p) ? p : 0; },
    resize,
    destroy() { cancelAnimationFrame(raf); renderer.dispose(); renderer.domElement.remove(); },
  };
}
