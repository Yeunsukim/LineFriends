'use strict';
// 3D 공원 배경 (Three.js). 게임 평면(z=0)은 화면과 1:1로 맞물리도록 카메라를 정면으로 둔다.
//   월드 x(px) → X = x / K,  화면 y(px) → Y = (GY - y) / K,  K = 100px/유닛
// 캐릭터·하트·장애물은 2D 캔버스(위)에, 하늘·나무·길·발판은 이 3D 캔버스(아래)에 그린다.
LF.W3 = (() => {
  const K = 100, FOV = 40, D = (LF.H / 2) / (K * Math.tan(FOV / 2 * Math.PI / 180));
  let R, scene, cam, sun, hemi, sky, level = null, plats = [], t = 0, ok = false, theme = null, lanterns = [];

  // 테마 팔레트 (참고 사이트: 분홍 노을 + 단풍 + 주황 울타리 + 청록 집)
  const T = {
    flowers: { sky: ['#8fc9f7', '#ffc7dc', '#ffe8d2'], fog: '#ffd8e2', lawn: '#a9d36a', lawn2: '#c2dc6e', path: '#e09a5f', side: '#b8703f', leaves: ['#ffb3cc', '#ff9dbf', '#ffd0e0', '#f7a2c0', '#fff0f5'], trunk: '#9b6b4b', fence: '#e2713d', house: ['#3f9b8f', '#f3d2a8', '#2d7d73'], sunC: '#fff0dc', sunI: 1.15, hemiI: .75, tree: 'round' },
    park: { sky: ['#b87fc4', '#f1a6c0', '#ffd2ad'], fog: '#f4b9c4', lawn: '#a6c95a', lawn2: '#c6d665', path: '#d9854a', side: '#a9592f', leaves: ['#f2924a', '#f7b84f', '#e8693a', '#8cc152', '#6dae4c'], trunk: '#8a5a3c', fence: '#d8622f', house: ['#2f8f86', '#f2cfa2', '#216f68'], sunC: '#ffe2c4', sunI: 1.1, hemiI: .7, tree: 'round' },
    fair: { sky: ['#a99cff', '#f5b9e4', '#ffe0c4'], fog: '#f2c4e2', lawn: '#9fd47a', lawn2: '#bfe08a', path: '#e7a96a', side: '#b97a44', leaves: ['#ffd36b', '#ff9fc4', '#9fe3c8', '#c5b2ff', '#ffb36b'], trunk: '#9b6b4b', fence: '#ff8fb3', house: ['#ff8fb3', '#fff1d9', '#e86a98'], sunC: '#fff2e0', sunI: 1.15, hemiI: .8, tree: 'round' },
    gym: { sky: ['#8ed1ff', '#c9ecff', '#fff4dc'], fog: '#d8efff', lawn: '#93cf6c', lawn2: '#b0dc77', path: '#c99be8', side: '#8f66b8', leaves: ['#7cc96a', '#9ad86d', '#5fb35a', '#c3e47a', '#f6c64f'], trunk: '#8a5a3c', fence: '#9b7bff', house: ['#6f7ee8', '#f4ecff', '#4d5cc4'], sunC: '#ffffff', sunI: 1.2, hemiI: .8, tree: 'round' },
    kitchen: { sky: ['#ffbe8a', '#ffd9b3', '#fff1dc'], fog: '#ffdcb8', lawn: '#b5d06a', lawn2: '#d1dc78', path: '#f0b47e', side: '#c47e48', leaves: ['#f7b84f', '#f2924a', '#ffd36b', '#9ccc65', '#e8693a'], trunk: '#8a5a3c', fence: '#e2713d', house: ['#e8704e', '#fff0d6', '#c45032'], sunC: '#ffe4c4', sunI: 1.15, hemiI: .75, tree: 'round' },
    rain: { sky: ['#6d7fa6', '#9fb0cf', '#c9d3e6'], fog: '#aebbd4', lawn: '#7fae6a', lawn2: '#93bb76', path: '#9a8a86', side: '#6f625e', leaves: ['#5f9c6a', '#78b07a', '#4d8a5c', '#a6c47a', '#6b9b8a'], trunk: '#6e5546', fence: '#8f7f9f', house: ['#5b7fa8', '#e6e2da', '#3f5f88'], sunC: '#d8e2f4', sunI: .6, hemiI: .85, tree: 'round', rain: 1 },
    snow: { sky: ['#9fd0f5', '#d9eeff', '#fff7f2'], fog: '#e6f2ff', lawn: '#f4f8ff', lawn2: '#ffffff', path: '#cfd9e6', side: '#a6b6c9', leaves: ['#ffffff', '#eef6ff', '#dff0fb', '#7fbf9f', '#69ab8c'], trunk: '#8a6a55', fence: '#e2713d', house: ['#d65a5a', '#fff7ee', '#a83f3f'], sunC: '#ffffff', sunI: 1.0, hemiI: .95, tree: 'pine' },
    market: { sky: ['#1f1a52', '#5b3a95', '#f08fb5'], fog: '#5a3d8e', lawn: '#4f6a5a', lawn2: '#5d7a63', path: '#8a6aa8', side: '#5e447e', leaves: ['#3f6b5a', '#4d7a62', '#355e50', '#8a5aa8', '#6b4a8a'], trunk: '#4a3a3a', fence: '#c26a4a', house: ['#7a4fb0', '#f3d6ff', '#5a368a'], sunC: '#ffb8d0', sunI: .35, hemiI: .45, tree: 'round', night: 1 },
    night: { sky: ['#0d0b2e', '#2e2470', '#7c5cc4'], fog: '#2a2366', lawn: '#3a4f6e', lawn2: '#425a7a', path: '#5f58a8', side: '#3d3878', leaves: ['#2f4a6a', '#3b5b7d', '#27405e', '#5a4a9a', '#4a3a7a'], trunk: '#3a2f45', fence: '#8a7ad0', house: ['#4a5fb0', '#dfe4ff', '#33438a'], sunC: '#c9c4ff', sunI: .3, hemiI: .4, tree: 'round', night: 1 },
    final: { sky: ['#ff8fc4', '#ffc4de', '#fff0f6'], fog: '#ffd0e4', lawn: '#b8dc7a', lawn2: '#cfe58a', path: '#f2a6c4', side: '#cc6f98', leaves: ['#ff9dbf', '#ffb3cc', '#ffd0e0', '#ff7eb0', '#ffe08a'], trunk: '#9b6b4b', fence: '#ff6fa5', house: ['#ff7eb0', '#fff1f6', '#e04f8a'], sunC: '#fff0f6', sunI: 1.15, hemiI: .8, tree: 'round' },
  };

  const col = c => new THREE.Color(c).convertSRGBToLinear(); // sRGB 출력에 맞춰 색이 바래지 않게
  const lam = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: col(c), roughness: .92, metalness: 0 }, o));

  function init(canvas) {
    if (!window.THREE) return false;
    try {
      R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (e) { return false; }
    R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.NoToneMapping;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(FOV, LF.W / LF.H, .1, 400);
    cam.position.set(0, 2.4, D);
    hemi = new THREE.HemisphereLight(0xffffff, 0x88aa66, .9); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 12; sc.bottom = -8; sc.near = 1; sc.far = 80; sun.shadow.bias = -.0008; sun.shadow.normalBias = .02;
    scene.add(sun); scene.add(sun.target);
    // 하늘: 세로 그라데이션 돔
    sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { c0: { value: col('#8fc9f7') }, c1: { value: col('#ffc7dc') }, c2: { value: col('#ffe8d2') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > .12 ? mix(c1, c0, smoothstep(.12,.55,h)) : mix(c2, c1, smoothstep(-.05,.12,h)); gl_FragColor = vec4(c,1.0); }',
    }));
    scene.add(sky);
    scene.fog = new THREE.Fog(0xffd8e2, 45, 150);
    M = new THREE.Matrix4(); Q = new THREE.Quaternion(); V = new THREE.Vector3(); S = new THREE.Vector3(); E = new THREE.Euler();
    ok = true; return true;
  }
  function resize(w, h, dpr) { if (!ok) return; R.setPixelRatio(Math.min(dpr, 2)); R.setSize(w, h, false); }

  function applyTheme(key) {
    const th = T[key] || T.park; theme = th;
    sky.material.uniforms.c0.value = col(th.sky[0]); sky.material.uniforms.c1.value = col(th.sky[1]); sky.material.uniforms.c2.value = col(th.sky[2]);
    scene.fog.color = col(th.fog);
    hemi.color = col(th.night ? '#8a86d8' : '#fff4f0'); hemi.groundColor = col(th.lawn); hemi.intensity = th.hemiI * 1.25;
    sun.color = col(th.sunC); sun.intensity = th.sunI * 1.6;
  }

  // ---------- 모델 ----------
  let M, Q, V, S, E;
  function lumpy(r, detail = 2, amt = .14, seed = 1) { // 울퉁불퉁한 나뭇잎 덩어리
    const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, rr = rng(seed);
    const seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      let k = seen.get(key); if (k == null) { k = 1 + (rr() - .5) * amt * 2; seen.set(key, k); }
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * .92, p.getZ(i) * k);
    }
    // 법선을 중심에서 바깥 방향으로 → 각지지 않고 부드러운 뭉게뭉게 음영
    const n = g.attributes.normal; for (let i = 0; i < p.count; i++) { V.set(p.getX(i), p.getY(i), p.getZ(i)).normalize(); n.setXYZ(i, V.x, V.y, V.z); }
    return g;
  }
  function inst(geo, mat, list, shadow = true) { // list: [{x,y,z,s,sx,sy,sz,ry,c}]
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((o, i) => {
      E.set(o.rx || 0, o.ry || 0, o.rz || 0); Q.setFromEuler(E); V.set(o.x, o.y, o.z); S.set(o.sx || o.s || 1, o.sy || o.s || 1, o.sz || o.s || 1);
      M.compose(V, Q, S); m.setMatrixAt(i, M); if (o.c) m.setColorAt(i, col(o.c));
    });
    m.count = list.length; m.castShadow = shadow; m.receiveShadow = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    return m;
  }
  function house(th, x, z, s = 1, ry = 0) {
    const g = new THREE.Group(), [wall, cream, roof] = th.house;
    const w = 3.2, d = 2.6, h = 2.2;
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(w + (i % 2 ? .04 : 0), h / 5, d + (i % 2 ? .04 : 0)), lam(i % 2 ? cream : wall)); b.position.y = h / 10 + i * h / 5; b.castShadow = b.receiveShadow = true; g.add(b); }
    // 박공 지붕
    const shape = new THREE.Shape(); shape.moveTo(-w / 2 - .35, 0); shape.lineTo(0, 1.5); shape.lineTo(w / 2 + .35, 0); shape.lineTo(-w / 2 - .35, 0);
    const roofG = new THREE.ExtrudeGeometry(shape, { depth: d + .5, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2 });
    const rm = new THREE.Mesh(roofG, lam(roof)); rm.position.set(0, h, -d / 2 - .25); rm.castShadow = true; g.add(rm);
    const gable = new THREE.Shape(); gable.moveTo(-w / 2 + .2, 0); gable.lineTo(0, 1.15); gable.lineTo(w / 2 - .2, 0);
    const gm = new THREE.Mesh(new THREE.ShapeGeometry(gable), lam(cream)); gm.position.set(0, h + .02, d / 2 + .02); g.add(gm);
    // 둥근 창문 + 아치 문
    const ring = (y, xx) => { const t = new THREE.Mesh(new THREE.TorusGeometry(.26, .07, 8, 20), lam(cream)); t.position.set(xx, y, d / 2 + .05); g.add(t);
      const gl = new THREE.Mesh(new THREE.CircleGeometry(.24, 20), lam('#2a3340', { emissive: col(th.night ? '#ffcf73' : '#000000'), emissiveIntensity: th.night ? .9 : 0 })); gl.position.set(xx, y, d / 2 + .04); g.add(gl);
      const cr = new THREE.Mesh(new THREE.BoxGeometry(.46, .05, .02), lam(cream)); cr.position.set(xx, y, d / 2 + .06); g.add(cr); const cr2 = cr.clone(); cr2.rotation.z = Math.PI / 2; g.add(cr2); };
    ring(h + .5, 0); ring(1.2, -.75);
    const door = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.15, .1), lam('#e0782f')); door.position.set(.8, .58, d / 2 + .05); g.add(door);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(.4, .09, 8, 20, Math.PI), lam('#d9452f')); arch.position.set(.8, 1.15, d / 2 + .08); g.add(arch);
    g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(s);
    return g;
  }
  function lantern(th, x, z) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 2.4, 8), lam('#5a4a44')); post.position.y = 1.2; post.castShadow = true; g.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.6, .06, .06), lam('#5a4a44')); arm.position.set(.28, 2.35, 0); g.add(arm);
    const box = new THREE.Mesh(new THREE.BoxGeometry(.32, .4, .32), lam('#3d3436')); box.position.set(.55, 2.05, 0); g.add(box);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(.26, .32, .34), new THREE.MeshBasicMaterial({ color: col('#ffd27a') })); glow.position.set(.55, 2.05, 0); g.add(glow);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.3, .2, 4), lam('#3d3436')); cap.position.set(.55, 2.35, 0); cap.rotation.y = Math.PI / 4; g.add(cap);
    if (th.night) { const pl = new THREE.PointLight(0xffc870, 1.4, 6, 2); pl.position.set(.55, 1.95, .2); g.add(pl); }
    g.position.set(x, 0, z); return g;
  }

  // ---------- 3D 소품 (참고 사이트처럼 공원 곳곳에) ----------
  let anims = [];
  const mesh = (geo, color, o = {}) => { const m = new THREE.Mesh(geo, lam(color, o)); m.castShadow = true; m.receiveShadow = true; return m; };
  const at = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };
  const box = (w, h, d, c) => mesh(new THREE.BoxGeometry(w, h, d), c);
  const cyl = (rt, rb, h, c, seg = 12) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c);
  const ball = (r, c, seg = 16) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * .7 | 0)), c);
  // 둥근 사각 판 (게임기 몸체 등)
  function roundSlab(w, d, h, r, c) {
    const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: h * .35, bevelSize: h * .35, bevelSegments: 4, curveSegments: 10 });
    g.rotateX(-Math.PI / 2); g.translate(0, -h / 2, 0);
    return mesh(g, c);
  }
  function textTex(text, bg, fg, w = 512, h = 128) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 6; for (let y = 22; y < h; y += 34) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + 4); c.stroke(); }
    c.font = `${h * .58}px ${LF.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fg; c.fillText(text, w / 2, h * .54);
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }

  function bench() {
    const g = new THREE.Group(), wood = '#c8834e', iron = '#4b4c56';
    for (let i = 0; i < 3; i++) g.add(at(box(1.6, .06, .14, wood), 0, .45, -.18 + i * .17));
    for (let i = 0; i < 2; i++) g.add(at(box(1.6, .12, .05, wood), 0, .72 + i * .18, -.3, -.12));
    for (const sx of [-.68, .68]) { g.add(at(box(.07, .45, .07, iron), sx, .22, .15)); g.add(at(box(.07, .9, .07, iron), sx, .45, -.28, -.1)); g.add(at(box(.07, .06, .5, iron), sx, .62, 0)); }
    return g;
  }
  function mailbox() {
    const g = new THREE.Group();
    g.add(at(box(.1, .85, .1, '#8a5a3c'), 0, .42, 0));
    g.add(at(box(.34, .26, .5, '#b9c6cc'), 0, .95, 0));
    const top = mesh(new THREE.CylinderGeometry(.17, .17, .5, 16, 1, false, 0, Math.PI), '#b9c6cc'); top.rotation.set(Math.PI / 2, 0, Math.PI / 2); top.position.set(0, 1.08, 0); g.add(top);
    g.add(at(box(.03, .3, .03, '#e2453a'), .19, 1.14, .1)); g.add(at(box(.03, .1, .16, '#e2453a'), .19, 1.26, .17));
    g.add(at(box(.3, .2, .02, '#9aa8ae'), 0, .97, .26));
    return g;
  }
  // 시바견: 꼬리를 흔들고 고개를 갸웃
  function dog(sit = false) {
    const g = new THREE.Group(), fur = '#e9a25c', cream = '#fff3e0', dark = '#3b2a22';
    const body = ball(.32, fur); body.scale.set(1.35, .9, .85); body.position.set(0, sit ? .42 : .48, 0); if (sit) body.rotation.z = .5; g.add(body);
    const belly = ball(.24, cream); belly.scale.set(1.2, .7, .8); belly.position.set(.06, sit ? .36 : .4, 0); g.add(belly);
    const legs = sit ? [[.18, .12, .14], [.18, .12, -.14]] : [[.24, .14, .14], [.24, .14, -.14], [-.24, .14, .14], [-.24, .14, -.14]];
    for (const [x, y, z] of legs) { const l = cyl(.07, .07, .3, fur); l.position.set(x, y + .04, z); g.add(l); g.add(at(ball(.075, cream), x + .02, .04, z)); }
    if (sit) for (const z of [.17, -.17]) { const h = ball(.13, fur); h.scale.set(1.3, .6, .8); h.position.set(-.16, .12, z); g.add(h); }
    const head = new THREE.Group(); head.position.set(sit ? .3 : .42, sit ? .9 : .78, 0); g.add(head);
    const hd = ball(.26, fur); hd.scale.set(1, .92, 1); head.add(hd);
    const cheeks = ball(.18, cream); cheeks.scale.set(.9, .7, 1.25); cheeks.position.set(.08, -.08, 0); head.add(cheeks);
    const snout = ball(.1, cream); snout.scale.set(1.1, .8, 1); snout.position.set(.24, -.06, 0); head.add(snout);
    head.add(at(ball(.035, dark, 10), .34, -.04, 0));
    for (const z of [.11, -.11]) { head.add(at(ball(.032, dark, 10), .2, .06, z)); const ear = mesh(new THREE.ConeGeometry(.09, .18, 4), fur); ear.position.set(0, .26, z * 1.25); ear.rotation.set(z > 0 ? .3 : -.3, 0, 0); head.add(ear); }
    const tail = new THREE.Group(); tail.position.set(sit ? -.3 : -.4, sit ? .55 : .62, 0); g.add(tail);
    const tl = mesh(new THREE.TorusGeometry(.11, .055, 8, 14, Math.PI * 1.5), fur); tl.rotation.set(0, Math.PI / 2, .6); tl.position.set(0, .1, 0); tail.add(tl);
    const ph = Math.random() * 6;
    anims.push(t => { tail.rotation.x = Math.sin(t * 14 + ph) * .5; head.rotation.z = Math.sin(t * 1.3 + ph) * .12; head.rotation.y = Math.sin(t * .8 + ph) * .25; });
    return g;
  }
  // 커다란 게임 컨트롤러 (참고 사이트의 회색 패드)
  function controller() {
    const g = new THREE.Group(), body = '#a9b3ba', dark = '#7d878e';
    g.add(roundSlab(1.5, .7, .18, .28, body));
    for (const [x, z] of [[-.55, .35], [0, .38], [.55, .35]]) { const p = cyl(.2, .14, .55, body, 14); p.rotation.x = Math.PI / 2; p.position.set(x, 0, z + .22); g.add(p); g.add(at(ball(.14, body), x, 0, z + .5)); }
    g.add(at(cyl(.09, .09, .06, dark), -.45, .13, -.05));
    const cross = new THREE.Group(); cross.add(box(.28, .05, .08, dark)); cross.add(box(.08, .05, .28, dark)); cross.position.set(-.45, .13, -.05); g.add(cross);
    [['#e2453a', .38, -.12], ['#f5c242', .5, -.02], ['#3fa36b', .38, .08], ['#3f7fe0', .26, -.02]].forEach(([c, x, z]) => g.add(at(cyl(.055, .055, .07, c), x, .14, z)));
    g.add(at(cyl(.07, .05, .18, dark), 0, .18, .25));
    g.rotation.set(-1.0, .3, .06); // 비스듬히 세워서 버튼이 보이게
    const w = new THREE.Group(); g.position.y = .55; w.add(g); return w;
  }
  function planter(th) {
    const g = new THREE.Group();
    g.add(at(box(1.1, .32, .45, '#b06a3c'), 0, .16, 0)); g.add(at(box(1.18, .06, .53, '#c88050'), 0, .33, 0));
    const cols = th.night ? ['#ffd27a', '#ff8fb8', '#c5b2ff'] : ['#ff6f8f', '#ffd54a', '#ffffff', '#ff9a5c', '#c97bff'];
    for (let i = 0; i < 9; i++) { const x = -.42 + (i % 5) * .21, z = i < 5 ? -.08 : .1; g.add(at(cyl(.015, .015, .25, '#5f9c4f', 5), x, .45, z)); g.add(at(ball(.07, cols[i % cols.length], 10), x, .6, z)); }
    return g;
  }
  function balloon(color) {
    const g = new THREE.Group();
    const b = ball(.38, color, 20); b.scale.set(1, 1.15, 1); b.position.y = 2.9; b.castShadow = true; g.add(b);
    const knot = mesh(new THREE.ConeGeometry(.06, .1, 8), color); knot.position.y = 2.44; knot.rotation.x = Math.PI; g.add(knot);
    const str = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 2.4, 0), new THREE.Vector3(.1, 1.5, 0), new THREE.Vector3(0, .35, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff }));
    g.add(str); g.add(at(box(.12, .3, .12, '#8a5a3c'), 0, .15, 0));
    const ph = Math.random() * 6; anims.push(t => { b.position.y = 2.9 + Math.sin(t * 1.6 + ph) * .1; b.rotation.z = Math.sin(t * 1.1 + ph) * .08; });
    return g;
  }
  function picnic() {
    const g = new THREE.Group();
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#ffffff' : '#ff8fb3'; c.fillRect(i * 16, j * 16, 16, 16); }
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })); mat.rotation.x = -Math.PI / 2; mat.position.y = .02; mat.receiveShadow = true; g.add(mat);
    g.add(at(box(.5, .3, .34, '#d9a066'), .3, .17, -.1));
    const handle = mesh(new THREE.TorusGeometry(.18, .025, 6, 16, Math.PI), '#b07a45'); handle.position.set(.3, .32, -.1); g.add(handle);
    g.add(at(ball(.1, '#e2453a'), -.35, .1, .15)); g.add(at(ball(.09, '#ffd54a'), -.15, .09, .25));
    return g;
  }
  // "LOVE PARK" 나무 간판 (참고 사이트의 SOCIAL 문)
  function sign(text = 'LOVE PARK') {
    const g = new THREE.Group(), wood = '#9a5b34';
    for (const x of [-1.15, 1.15]) g.add(at(box(.18, 2.3, .18, wood), x, 1.15, 0));
    g.add(at(box(2.9, .16, .22, wood), 0, 2.32, 0)); g.add(at(box(3.2, .12, .26, '#7d4526'), 0, 2.46, 0));
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.1, .48, .08), [lam(wood), lam(wood), lam(wood), lam(wood), new THREE.MeshStandardMaterial({ map: textTex(text, '#b8743f', '#fff4e0'), roughness: .9 }), lam(wood)]);
    board.position.set(0, 1.85, .05); board.castShadow = true; g.add(board);
    return g;
  }
  function makeProp(type, th) {
    switch (type) {
      case 'bench': return bench();
      case 'mailbox': return mailbox();
      case 'dog': return dog(Math.random() < .5);
      case 'controller': return controller();
      case 'planter': return planter(th);
      case 'balloon': return balloon(pick(['#ff8fb3', '#ffd54a', '#8fd3ff', '#c5b2ff']));
      case 'picnic': return picnic();
      case 'sign': return sign();
    }
  }

  // ---------- 레벨 구성 ----------
  // o: { theme, len(px), gaps:[{x0,x1}](px), plats:[{x,y,w}](px), x0(px 시작) }
  function build(o) {
    if (!ok) return;
    if (level) { scene.remove(level); level.traverse(m => { if (m.geometry) m.geometry.dispose(); }); }
    applyTheme(o.theme); const th = theme;
    level = new THREE.Group(); scene.add(level); plats = []; lanterns = []; anims = [];
    const r = rng((o.seed || 7) * 131), x0 = (o.x0 != null ? o.x0 : -1500) / K, x1 = (o.len + 2600) / K;
    const gaps = (o.gaps || []).map(g => [g.x0 / K, g.x1 / K]).sort((a, b) => a[0] - b[0]);
    // 길 + 앞 잔디 (구덩이는 끊긴 곳 → 아래에 개울)
    const segs = []; let cx = x0;
    for (const [a, b] of gaps) { if (a > cx) segs.push([cx, a]); cx = Math.max(cx, b); }
    segs.push([cx, x1]);
    const pathM = lam(th.path), sideM = lam(th.side), lawnM = lam(th.lawn), edgeM = lam(th.lawn2);
    for (const [a, b] of segs) {
      const w = b - a, mx = (a + b) / 2;
      const p = new THREE.Mesh(new THREE.BoxGeometry(w, 3, 3.2), [sideM, sideM, pathM, sideM, sideM, sideM]); p.position.set(mx, -1.5, 0); p.receiveShadow = true; level.add(p);
      const f = new THREE.Mesh(new THREE.BoxGeometry(w, 3, 4), [sideM, sideM, lawnM, sideM, lawnM, sideM]); f.position.set(mx, -1.52, 3.6); f.receiveShadow = true; level.add(f);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(w, .08, .25), edgeM); lip.position.set(mx, .01, 1.62); lip.receiveShadow = true; level.add(lip);
    }
    for (const [a, b] of gaps) { // 개울
      const wtr = new THREE.Mesh(new THREE.BoxGeometry(b - a + .02, .2, 7.4), new THREE.MeshLambertMaterial({ color: col(th.night ? '#3b5ea8' : '#6cc6e8'), emissive: col(th.night ? '#1a2a60' : '#2a7fa8'), emissiveIntensity: .25 }));
      wtr.position.set((a + b) / 2, -1.25, 1.6); level.add(wtr);
    }
    // 뒤쪽 잔디밭 (끝없이)
    const back = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 200, 140), lawnM); back.rotation.x = -Math.PI / 2; back.position.set((x0 + x1) / 2, -.02, -71.6); back.receiveShadow = true; level.add(back);
    const back2 = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 200, 3), edgeM); back2.rotation.x = -Math.PI / 2; back2.position.set((x0 + x1) / 2, -.01, -3.1); back2.receiveShadow = true; level.add(back2);
    // 울타리 (길 뒤쪽). 개울과 소품 자리(열린 틈)에서는 끊김
    const posts = [], rails = [];
    const inGap = x => gaps.some(([a, b]) => x > a - .3 && x < b + .3);
    const openings = [];
    if (o.props) for (const q of o.props) openings.push([q.x - 1.4, q.x + 1.4]);
    else { openings.push([4.6, 8.4]); let x = 9; while (x < x1) { x += 4 + r() * 5; const w = 3 + r() * 2.2; openings.push([x, x + w]); x += w; } }
    const inOpen = x => openings.some(([a, b]) => x > a && x < b);
    for (let x = x0; x < x1; x += 1.1) {
      if (inGap(x) || inOpen(x)) continue;
      posts.push({ x, y: .45, z: -1.85, sx: .16, sy: .9, sz: .12 });
      if (!inGap(x + 1.1) && !inOpen(x + 1.1)) { rails.push({ x: x + .55, y: .62, z: -1.85, sx: 1.1, sy: .1, sz: .07 }); rails.push({ x: x + .55, y: .3, z: -1.85, sx: 1.1, sy: .1, sz: .07 }); }
    }
    const fenceM = lam(th.fence);
    level.add(inst(new THREE.BoxGeometry(1, 1, 1), fenceM, posts));
    level.add(inst(new THREE.BoxGeometry(1, 1, 1), fenceM, rails));
    const caps = posts.map(p => ({ x: p.x, y: .95, z: p.z, s: .12, ry: Math.PI / 4 }));
    level.add(inst(new THREE.ConeGeometry(1, 1, 4), fenceM, caps.map(c => Object.assign(c, { sx: .115, sy: .14, sz: .115 }))));
    // 나무
    const leaves = [], trunks = [], cones = [];
    for (let x = x0 - 5; x < x1 + 5; x += .9 + r() * 1.1) {
      for (let layer = 0; layer < 2; layer++) {
        if (r() < .25) continue;
        if (!layer && (o.houses || []).some(h => Math.abs(h - x) < 2.6)) continue;
        const z = layer ? -9 - r() * 22 : -3.4 - r() * 4.5, s = (layer ? 1.3 : .95) * (.8 + r() * .5), xx = x + (r() - .5) * .8;
        const h = 1.4 * s;
        trunks.push({ x: xx, y: h / 2, z, sx: .22 * s, sy: h, sz: .22 * s, c: th.trunk });
        if (th.tree === 'pine' && r() < .7) {
          for (let k = 0; k < 3; k++) cones.push({ x: xx, y: h * .7 + k * .7 * s, z, sx: (1.3 - k * .3) * s, sy: 1.1 * s, sz: (1.3 - k * .3) * s, c: pick(th.leaves.slice(0, 3).concat(th.leaves.slice(3))) });
        } else {
          const cc = pick(th.leaves);
          leaves.push({ x: xx, y: h + .7 * s, z, s: 1.0 * s, c: cc });
          leaves.push({ x: xx + .55 * s, y: h + .35 * s, z: z + .3, s: .7 * s, c: r() < .6 ? cc : pick(th.leaves) });
          leaves.push({ x: xx - .5 * s, y: h + .4 * s, z: z + .2, s: .72 * s, c: r() < .6 ? cc : pick(th.leaves) });
          if (r() < .6) leaves.push({ x: xx + .1 * s, y: h + 1.3 * s, z: z - .1, s: .62 * s, c: cc });
        }
      }
    }
    level.add(inst(new THREE.CylinderGeometry(.35, .5, 1, 7), lam('#ffffff'), trunks));
    level.add(inst(lumpy(1, 2, .12, 3), lam('#ffffff'), leaves));
    if (cones.length) level.add(inst(new THREE.ConeGeometry(1, 1, 8), lam('#ffffff'), cones));
    // 앞쪽 덤불·풀 (카메라 가까이)
    const bushes = [], grass = [];
    for (let x = x0; x < x1 && !o.noFront; x += 1.2 + r() * 2.5) { if (inGap(x)) continue; bushes.push({ x, y: .15, z: 3.4 + r() * 1.6, s: .35 + r() * .35, c: pick(th.leaves) }); }
    for (let x = x0; x < x1; x += .18 + r() * .3) { const z = r() < .5 ? -2.3 - r() * 10 : 2 + r() * 3; if (z > 0 && inGap(x)) continue; grass.push({ x, y: .06, z, sx: .05, sy: .12 + r() * .1, sz: .05, ry: r() * 3, rz: (r() - .5) * .5, c: r() < .5 ? th.lawn2 : th.leaves[3] }); }
    level.add(inst(lumpy(1, 1, .1, 5), lam('#ffffff'), bushes));
    level.add(inst(new THREE.ConeGeometry(1, 1, 4), lam('#ffffff'), grass, false));
    // 구름
    const clouds = [];
    for (let x = x0 - 40; x < x1 + 40; x += 12 + r() * 16) { const y = 12 + r() * 10, z = -60 - r() * 40, s = 2 + r() * 3; for (let k = 0; k < 4; k++) clouds.push({ x: x + k * s * .8, y: y + (k % 2) * s * .3, z, sx: s * (1 - Math.abs(k - 1.5) * .15), sy: s * .55, sz: s * .6, c: th.night ? '#6a5aa0' : '#ffffff' }); }
    const cm = inst(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: th.night ? .35 : .92 }), clouds, false); cm.receiveShadow = false; level.add(cm);
    // 별 (밤)
    if (th.night) { const n = 500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = x0 + r() * (x1 - x0 + 120) - 60; pos[i * 3 + 1] = 8 + r() * 60; pos[i * 3 + 2] = -120 - r() * 60; } const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); level.add(new THREE.Points(gg, new THREE.PointsMaterial({ color: 0xffffff, size: .6, fog: false }))); }
    // 집·랜턴
    for (let x = x0 + 14; x < x1; x += 30 + r() * 25) if (!(o.houses || []).some(h => Math.abs(h - x) < 8)) { const hz = -9 - r() * 6; level.add(house(th, x, hz, .9 + r() * .3, (r() - .5) * .5)); const mb = mailbox(); mb.position.set(x + 2.3, 0, hz + 1.9); level.add(mb); }
    for (const hx of o.houses || []) level.add(house(th, hx, -6.5, 1.05, 0));
    // 소품: 울타리 틈마다 하나씩 (메뉴는 지정 위치)
    const SC = { controller: 1.6, dog: 1.4, bench: 1.15, mailbox: 1.15, planter: 1.15, picnic: 1.25, balloon: 1, sign: 1 };
    const put = (type, x, z, ry = 0) => { const m = makeProp(type, th); if (!m) return; m.position.set(x, 0, z); m.rotation.y += ry; m.scale.setScalar(SC[type] || 1); m.traverse(k => { if (k.isMesh) { k.castShadow = true; k.receiveShadow = true; } }); level.add(m); };
    if (o.props) for (const q of o.props) put(q.t, q.x, q.z, q.ry || 0);
    else {
      put('sign', 6.5, -3.1);
      const W8 = [['bench', 3], ['dog', 2.2], ['planter', 3], ['balloon', 1.4], ['picnic', 1.6], ['controller', 1.1], ['mailbox', .8]], tot = W8.reduce((a, w) => a + w[1], 0);
      for (const [a, b] of openings.slice(1)) {
        const mx = (a + b) / 2; if (inGap(mx)) continue;
        let k = r() * tot, type = W8[0][0]; for (const [n, w] of W8) { k -= w; if (k <= 0) { type = n; break; } }
        put(type, mx, -2.75 - r() * .5, type === 'dog' ? (r() - .5) * 1.4 : (r() - .5) * .4);
      }
    }
    for (let x = x0 + 6; x < x1; x += 11 + r() * 6) { if (!inGap(x)) level.add(lantern(th, x, -2.4)); }
    // 발판 (게임 평면에 정확히 맞춤)
    const plankM = lam('#c98a55'), plankTop = lam('#e0a46a');
    for (const p of o.plats || []) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(p.w / K, .26, 1.4), [plankM, plankM, plankTop, plankM, plankM, plankM]);
      m.castShadow = m.receiveShadow = true; level.add(m); plats.push({ p, m });
    }
    syncPlats();
  }
  function syncPlats() { for (const { p, m } of plats) m.position.set((p.x + p.w / 2) / K, (LF.GY - p.y) / K - .13, 0); }

  // 매 프레임: camPx = 화면 왼쪽 끝의 월드 x(px), groundY = 바닥선의 화면 y
  let curFov = FOV;
  function frame(camPx, groundY = LF.GY, dt = 0, fov = FOV) {
    if (!ok || !level) return;
    t += dt;
    // 시야각을 넓히면서 카메라를 뒤로 빼서 게임 평면(z=0)의 크기는 그대로 두고 배경만 더 빠르게 휙휙 지나가 보이게 함
    curFov = damp(curFov, fov || FOV, 8, dt);
    if (Math.abs(cam.fov - curFov) > .01) { cam.fov = curFov; cam.updateProjectionMatrix(); }
    const dist = (LF.H / 2) / (K * Math.tan(curFov / 2 * Math.PI / 180));
    const cx = (camPx + LF.W / 2) / K, cy = (groundY - LF.H / 2) / K;
    cam.position.set(cx, cy, dist); cam.lookAt(cx, cy, 0);
    sun.position.set(cx - 8, 14, 10); sun.target.position.set(cx + 2, 0, -3); sun.target.updateMatrixWorld();
    sky.position.set(cx, 0, 0);
    syncPlats();
    for (const f of anims) f(t);
    R.render(scene, cam);
  }
  return { init, resize, build, frame, get ok() { return ok; }, K, themes: T };
})();
