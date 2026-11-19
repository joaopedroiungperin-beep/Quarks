/* Cena do capítulo "OSFIC": os mesmos palitos de picolé montam, em sequência,
   os três desafios da olimpíada conforme a rolagem:
   palitos soltos → ponte treliçada (com carga no centro do vão) →
   lançador de projéteis (dispara a esfera) → carro elétrico solar (anda sob o sol).

   Contrato: mount(container, { THREE }) → { update(p), resize(), destroy() } */

export function mount(container, { THREE }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 1.6, 10);
  camera.lookAt(0, 0.4, 0);

  const root = new THREE.Group();
  root.rotation.set(0.32, -0.5, 0);
  scene.add(root);

  const WOOD = 0xe9b46a, EDGE = 0xfff1d6, CYAN = 0x7fe7f2, GREEN = 0x9fd11e, BLUE = 0x1394d2, SUN = 0xfbd04c;
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  /* ---------- palitos: posição, ângulos e comprimento de cada montagem ---------- */
  // alvo: [x, y, z, rotZ, rotY, comprimento]
  const seg = (a, b, z) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z, Math.atan2(dy, dx), 0, Math.hypot(dx, dy)];
  };
  const bridge = [];
  const bot = [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]];
  const top = [[-1.5, 0.9], [-0.5, 0.9], [0.5, 0.9], [1.5, 0.9]];
  [-0.45, 0.45].forEach((z) => {
    for (let i = 0; i < 4; i++) bridge.push(seg(bot[i], bot[i + 1], z));
    for (let i = 0; i < 3; i++) bridge.push(seg(top[i], top[i + 1], z));
    for (let i = 0; i < 4; i++) { bridge.push(seg(bot[i], top[i], z)); bridge.push(seg(top[i], bot[i + 1], z)); }
  });
  [-1.5, -0.5, 0.5, 1.5].forEach((x) => bridge.push([x, 0, 0, 0, Math.PI / 2, 0.9]));       // tabuleiro
  [-1, 0, 1].forEach((x) => bridge.push([x, 0.9, 0, 0, Math.PI / 2, 0.9]));                 // travamento superior

  // lançador: o tiro vai para a esquerda, então a torre (eixo + batente) fica à esquerda
  // e a base longa se estende para trás (direita), onde o braço começa armado
  const ARM = { pivot: [-0.5, 0.85], len: 1.7, cocked: -0.3, fired: Math.PI / 2 + 0.3 };
  const STOP = [-0.72, 1.33]; // batente: o braço para aqui, inclinado para a frente
  const catapult = [
    [0.2, 0, -0.32, 0, 0, 2], [0.2, 0, 0.32, 0, 0, 2],                                     // base (vai para a direita)
    [-0.75, 0, 0, 0, Math.PI / 2, 0.64], [1.1, 0, 0, 0, Math.PI / 2, 0.64],                // travessas
    [-0.5, 0.42, -0.32, Math.PI / 2, 0, 0.85], [-0.5, 0.42, 0.32, Math.PI / 2, 0, 0.85],   // colunas do eixo
    [-0.5, 0.85, 0, 0, Math.PI / 2, 0.7],                                                   // eixo
    null,                                                                                   // braço (animado)
    [STOP[0], STOP[1] / 2, -0.32, Math.PI / 2, 0, STOP[1]], [STOP[0], STOP[1] / 2, 0.32, Math.PI / 2, 0, STOP[1]], // colunas do batente
    [STOP[0], STOP[1], 0, 0, Math.PI / 2, 0.7],                                             // barra do batente
  ];
  const car = [
    [0, 0.18, -0.28, 0, 0, 1.7], [0, 0.18, 0, 0, 0, 1.7], [0, 0.18, 0.28, 0, 0, 1.7],    // chassi (5 palitos)
    [-0.6, 0.18, 0, 0, Math.PI / 2, 0.8], [0.6, 0.18, 0, 0, Math.PI / 2, 0.8],
  ];

  const N = 42;
  const sticks = [];
  for (let i = 0; i < N; i++) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: WOOD, transparent: true, opacity: 0.9 });
    const box = new THREE.BoxGeometry(1, 0.055, 0.12);
    const edgeMat = new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.55 });
    g.add(new THREE.Mesh(box, mat), new THREE.LineSegments(new THREE.EdgesGeometry(box), edgeMat));
    // posição "solta": uma nuvem de palitos flutuando
    const a = (i / N) * Math.PI * 2, r = 1.4 + (i % 5) * 0.32;
    const loose = [Math.cos(a) * r * 1.4, 0.6 + Math.sin(a * 3) * 1.1, Math.sin(a) * r * 0.6, a * 2.3, a * 1.7, 0.85];
    g.userData = { mat, edgeMat, loose, phase: Math.random() * 6 };
    root.add(g);
    sticks.push(g);
  }
  const target = (stage, i) => {
    const list = [null, bridge, catapult, car][stage];
    return (list && list[i]) || null; // null = fica solto (palito sobrando)
  };

  /* ---------- peças extras de cada desafio ---------- */
  const basic = (color, opacity = 0.9) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
  // carga: garrafas de água no centro do vão
  const load = new THREE.Group();
  [-0.18, 0.18].forEach((z) => {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.6, 20), basic(CYAN, 0.35));
    bottle.position.set(0, 0.3, z);
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.16, 0.16, 0.6, 12)), new THREE.LineBasicMaterial({ color: CYAN }));
    rim.position.copy(bottle.position);
    load.add(bottle, rim);
  });
  root.add(load);
  // esfera do lançador + rastro
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 20), basic(0xff8f5a, 1));
  root.add(ball);
  const trail = Array.from({ length: 18 }, () => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), basic(0xffd3b0, 0));
    root.add(d); return d;
  });
  // carro: rodas, placa solar e sol
  const carParts = new THREE.Group();
  const wheels = [];
  [[-0.6, -0.42], [-0.6, 0.42], [0.6, -0.42], [0.6, 0.42]].forEach(([x, z]) => {
    const w = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 18);
    w.add(new THREE.Mesh(geo, basic(0x1d2433, 0.95)), new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: EDGE })));
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.2, z);
    carParts.add(w); wheels.push(w);
  });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, 0.62), basic(BLUE, 0.85));
  panel.position.set(0, 0.42, 0); panel.rotation.z = -0.12;
  const panelGrid = new THREE.GridHelper(0.62, 4, CYAN, CYAN);
  panelGrid.position.set(0, 0.44, 0); panelGrid.rotation.z = -0.12; panelGrid.scale.x = 1 / 0.62;
  panelGrid.material.transparent = true; panelGrid.material.opacity = 0.5;
  carParts.add(panel, panelGrid);
  root.add(carParts);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), basic(SUN, 0.95));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 24), basic(SUN, 0.15));
  sun.add(halo);
  sun.position.set(2.4, 2, -1);
  root.add(sun);
  // pista (régua no chão)
  const track = new THREE.Group();
  const lineMat = new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.6 });
  track.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3, 0, 0.7), new THREE.Vector3(3, 0, 0.7)]), lineMat));
  for (let i = 0; i <= 12; i++) {
    const x = -3 + i * 0.5;
    track.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, 0.7), new THREE.Vector3(x, 0, i % 2 ? 0.8 : 0.9)]), lineMat));
  }
  root.add(track);

  /* ---------- linha do tempo da rolagem ---------- */
  // [início, fim] de cada montagem; entre elas, os palitos voam para a próxima
  const BUILD = [[0.16, 0.3], [0.46, 0.56], [0.72, 0.8]];
  let progress = 0, shown = 0, raf = 0, time = 0;

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.position.z = w < 700 ? 13.5 : 10;
    root.position.x = w > 960 ? 1.8 : 0;
    camera.updateProjectionMatrix();
  };
  resize();

  const apply = (g, a, b, k, lift, i) => {
    const A = a || g.userData.loose, B = b || g.userData.loose;
    const bob = (x) => (x === g.userData.loose ? Math.sin(time * 0.8 + g.userData.phase) * 0.12 : 0);
    g.position.set(lerp(A[0], B[0], k), lerp(A[1] + bob(A), B[1] + bob(B), k) + Math.sin(Math.PI * k) * lift, lerp(A[2], B[2], k));
    g.rotation.set(0, lerp(A[4], B[4], k), lerp(A[3], B[3], k) + Math.sin(Math.PI * k) * (i % 2 ? 0.8 : -0.8));
    g.scale.set(lerp(A[5], B[5], k), 1, 1);
    const used = (a ? 1 - k : 0) + (b ? k : 0);
    g.userData.mat.opacity = 0.18 + used * 0.75;
    g.userData.edgeMat.opacity = 0.12 + used * 0.5;
  };

  const loop = () => {
    time += 0.016;
    shown += (progress - shown) * 0.08;
    const s = shown;
    // em que montagem estamos e quanto da transição já aconteceu
    let stage = 0, k = 0;
    if (s >= BUILD[2][0]) { stage = 3; k = clamp((s - BUILD[2][0]) / (BUILD[2][1] - BUILD[2][0])); }
    else if (s >= BUILD[1][0]) { stage = 2; k = clamp((s - BUILD[1][0]) / (BUILD[1][1] - BUILD[1][0])); }
    else if (s >= BUILD[0][0]) { stage = 1; k = clamp((s - BUILD[0][0]) / (BUILD[0][1] - BUILD[0][0])); }
    const e = ease(k);

    // braço do lançador: armado abaixado à direita; no disparo gira no sentido anti-horário
    // (sobe da direita para a esquerda) até bater no batente da torre
    const fire = clamp((s - 0.6) / 0.03);
    const th = lerp(ARM.cocked, ARM.fired, fire * fire); // acelera até o batente
    const dir = [Math.cos(th), Math.sin(th)];
    catapult[7] = [ARM.pivot[0] + dir[0] * ARM.len * 0.35, ARM.pivot[1] + dir[1] * ARM.len * 0.35, 0, th, 0, ARM.len];
    const tip = [ARM.pivot[0] + dir[0] * ARM.len * 0.85, ARM.pivot[1] + dir[1] * ARM.len * 0.85];

    sticks.forEach((g, i) => apply(g, target(stage - 1 < 0 ? 0 : stage - 1, i), target(stage, i), stage === 0 ? 0 : e, stage === 0 ? 0 : 0.9, i));

    // ponte: a carga desce no centro do vão
    const lk = stage === 1 ? clamp((s - 0.32) / 0.1) : 0;
    load.visible = stage === 1 && lk > 0;
    load.position.set(0, 0.9 + (1 - ease(lk)) * 2.2, 0);
    load.children.forEach((m) => { m.material.opacity = (m.isLineSegments ? 0.9 : 0.35) * Math.min(1, lk * 3); });

    // lançador: a esfera fica na ponta do braço até o disparo e segue em parábola
    const flight = clamp((s - 0.63) / 0.07);
    ball.visible = stage === 2 && e > 0.6;
    // soltura no ponto mais alto: a ponta do braço encostado no batente
    const rel = [ARM.pivot[0] + Math.cos(ARM.fired) * ARM.len * 0.85, ARM.pivot[1] + Math.sin(ARM.fired) * ARM.len * 0.85];
    const arc = (f) => [rel[0] - f * 4.2, Math.max(0.13, rel[1] + f * 1.0 - f * f * 3.1)];
    const bp = flight > 0 ? arc(flight) : tip;
    ball.position.set(bp[0], bp[1], 0);
    trail.forEach((d, j) => {
      const f = Math.max(0, flight - j * 0.035);
      const [x, y] = arc(f);
      d.position.set(x, y, 0);
      d.material.opacity = stage === 2 && flight > 0 && f > 0 ? 0.5 * (1 - j / trail.length) : 0;
    });

    // carro: aparece, a placa capta o sol e ele anda pela pista
    const cv = stage === 3 ? e : 0;
    const drive = clamp((s - 0.82) / 0.16);
    const cx = lerp(-1.6, 1.8, ease(drive));
    carParts.visible = cv > 0.01;
    carParts.scale.setScalar(Math.max(0.001, cv));
    carParts.position.x = cx;
    wheels.forEach((w) => { w.rotation.y -= drive > 0 && drive < 1 ? 0.25 : 0; });
    if (stage === 3) sticks.forEach((g, i) => { if (car[i]) g.position.x += cx; });
    sun.visible = stage === 3;
    sun.scale.setScalar(0.4 + cv * 0.6 + Math.sin(time * 2) * 0.03);
    track.visible = stage === 3;
    track.children.forEach((l) => { l.material.opacity = 0.6 * cv; });

    root.rotation.y = -0.5 + s * 0.9 + Math.sin(time * 0.25) * 0.04;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    update(p) { progress = p; },
    resize,
    destroy() { cancelAnimationFrame(raf); renderer.dispose(); renderer.domElement.remove(); },
  };
}
