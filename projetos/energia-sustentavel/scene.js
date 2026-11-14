/* Cena do capítulo "Energia Sustentável é Fundamental".
   PROTÓTIPO da caixa explodida: um kit (caixa) cujas faces se afastam com a
   rolagem, revelando um núcleo de energia. Na próxima etapa esta cena pode ser
   substituída por modelos reais dos kits (GLTF) sem alterar o resto da página.

   Contrato: mount(container, { THREE }) → { update(p), resize(), destroy() } */

export function mount(container, { THREE }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);   // fundo 100% transparente: o cosmos aparece sem 'janela' escura
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 1.2, 9);

  const root = new THREE.Group();
  root.rotation.set(0.45, -0.6, 0);
  scene.add(root);

  const CYAN = 0x7fe7f2, ORANGE = 0xf2a65a, GREEN = 0x3fa58c;
  const S = 2.2; // aresta da caixa

  // 6 faces: cada uma com borda luminosa e vidro translúcido
  const faces = [];
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const colors = [CYAN, CYAN, ORANGE, GREEN, CYAN, ORANGE];
  dirs.forEach((d, i) => {
    const g = new THREE.Group();
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(S, S),
      new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }),
    );
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(S, S)),
      new THREE.LineBasicMaterial({ color: colors[i], transparent: true, opacity: 0.9 }),
    );
    // grade interna (circuito impresso)
    const grid = new THREE.GridHelper(S * 0.8, 6, colors[i], colors[i]);
    grid.rotation.x = Math.PI / 2;
    grid.material.transparent = true; grid.material.opacity = 0.18;
    g.add(plane, edges, grid);
    const v = new THREE.Vector3(...d);
    g.position.copy(v.clone().multiplyScalar(S / 2));
    g.lookAt(v.clone().multiplyScalar(S));
    g.userData.dir = v;
    root.add(g);
    faces.push(g);
  });

  // núcleo de energia
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.62, 1),
    new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.9 }),
  );
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 24, 24),
    new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.85 }),
  );
  root.add(core, glow);

  // 10 "temas" orbitando o núcleo
  const orbit = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: i % 2 ? CYAN : ORANGE }));
    const a = (i / 10) * Math.PI * 2;
    m.position.set(Math.cos(a) * 1.5, Math.sin(a * 2) * 0.25, Math.sin(a) * 1.5);
    orbit.add(m);
  }
  root.add(orbit);

  let progress = 0, shown = 0, raf = 0, t = 0;
  const ease = (x) => 1 - Math.pow(1 - x, 3);

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.position.z = w < 700 ? 12 : 9;
    root.position.x = w > 960 ? 1.9 : 0; // abre espaço para o texto à esquerda
    camera.updateProjectionMatrix();
  };
  resize();

  const loop = () => {
    t += 0.016;
    shown += (progress - shown) * 0.12;
    const e = ease(Math.min(1, shown * 1.25));
    faces.forEach((f, i) => {
      const off = S / 2 + e * (1.6 + (i % 3) * 0.25);
      f.position.copy(f.userData.dir).multiplyScalar(off);
      f.rotation.z = e * (i % 2 ? 0.35 : -0.35);
    });
    const coreScale = 0.4 + e * 0.9;
    core.scale.setScalar(coreScale);
    glow.scale.setScalar(coreScale * (1 + Math.sin(t * 3) * 0.05));
    core.rotation.y += 0.01; core.rotation.x += 0.004;
    orbit.rotation.y = t * 0.4;
    orbit.scale.setScalar(Math.max(0.001, e));
    root.rotation.y = -0.6 + shown * 1.4 + Math.sin(t * 0.3) * 0.05;
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
