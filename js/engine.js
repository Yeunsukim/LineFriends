'use strict';
// 엔진: 저장/설정, 씬 전환, 입력, UI 위젯, 파티클

// ---------- 저장 & 설정 ----------
LF.save = {
  key: 'conybrown_loverun_v2', data: null,
  def() { return { runner: null, diff: 'normal', sfx: true, music: true, unlocked: 1, stages: {}, plays: 0 }; },
  load() { try { this.data = Object.assign(this.def(), JSON.parse(localStorage.getItem(this.key) || '{}')); } catch (e) { this.data = this.def(); } return this.data; },
  write() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { } },
  reset() { const keep = { runner: this.data.runner, diff: this.data.diff, sfx: this.data.sfx, music: this.data.music }; this.data = Object.assign(this.def(), keep); this.write(); },
  stars() { return Object.values(this.data.stages).reduce((a, s) => a + (s.stars || 0), 0); },
  lovePct() { return Math.round(this.stars() / (LF.STAGES.length * 3) * 100); },
};
// 주인공(달리는 쪽)과 상대
LF.P = () => LF.save.data.runner || 'cony';
LF.Q = () => LF.otherKind(LF.P());
LF.pn = () => LF.CHAR[LF.P()].name; LF.qn = () => LF.CHAR[LF.Q()].name;
// 한국어 조사: 받침 여부
LF.josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c % 28 ? a : b); };
// {P}, {Q}, {P가}, {Q를} … 치환
LF.fmt = s => s.replace(/\{([PQ])(이|가|을|를|은|는|와|과|에게|야|아)?\}/g, (m, who, j) => {
  const n = who === 'P' ? LF.pn() : LF.qn();
  if (!j) return n;
  const pairs = { 이: ['이', '가'], 가: ['이', '가'], 을: ['을', '를'], 를: ['을', '를'], 은: ['은', '는'], 는: ['은', '는'], 와: ['과', '와'], 과: ['과', '와'], 야: ['아', '야'], 아: ['아', '야'] };
  if (j === '에게') return n + '에게';
  return LF.josa(n, pairs[j][0], pairs[j][1]);
});
// easy: 아주 쉬움 — 느리고(speed), 가장 쉬운 패턴만(tierCap), 간격 넓게(density), 목표 하트 25%, 목숨 +2, 판정 넉넉(window)
LF.DIFF = {
  easy: { name: '쉬움', speed: .78, density: .62, quota: .25, window: 1.6, tierCap: 1, lives: 2 },
  normal: { name: '보통', speed: 1, density: 1, quota: .5, window: 1 },
  hard: { name: '어려움', speed: 1.12, density: 1.15, quota: .6, window: .8 },
  hell: { name: '지옥', speed: 1.25, density: 1.3, quota: .7, window: .65 },
};
LF.DIFF_ORDER = ['easy', 'normal', 'hard', 'hell'];
LF.diff = () => LF.DIFF[LF.save.data.diff] || LF.DIFF.normal;

// ---------- 달려가 부둥켜 안고 빙글빙글 (골인 장면 · 설정 화면 공용) ----------
// 시간 t(초)에 따라 ① 서로 달려옴(rush) → ② 꼬옥 안음(hug) → ③ 안은 채 빙글빙글(spin).
// A = 왼쪽(오른쪽을 봄), B = 오른쪽(왼쪽을 봄). 도는 동안은 두 캐릭터가 한 점을 중심으로 돌며(앞·뒤 깊이와 크기 차이, 지나갈 때 방향이 바뀜) 폴짝폴짝 뛴다.
LF.hug = {
  RUSH: .9, HUG: .55, SPIN: 3.2 /* 정확히 2바퀴(속도는 서서히 빨라졌다 느려짐): 끝에서 A가 왼쪽·B가 오른쪽 */, JOY: 2.6,
  total() { return this.RUSH + this.HUG + this.SPIN + this.JOY; },
  pose(t, ax0, bx0, mx, gap = 26, r = 44) {
    const R = this.RUSH, H = this.HUG;
    if (t < R) { const e = ease.inOut(clamp(t / R, 0, 1)); return { ph: 'rush', mx, ax: lerp(ax0, mx - gap, e), bx: lerp(bx0, mx + gap, e), az: 0, bz: 0, adir: 1, bdir: -1, hop: 0 }; }
    if (t < R + H) { const u = (t - R) / H, g = gap * (1 - .35 * Math.sin(u * Math.PI)); return { ph: 'hug', mx, ax: mx - g, bx: mx + g, az: 0, bz: 0, adir: 1, bdir: -1, hop: Math.sin(u * Math.PI) * 6 }; }
    if (t < R + H + this.SPIN) {
      // 손을 맞잡고 한 점(mx)을 중심으로 원운동. 각 캐릭터는 항상 중심(=서로)을 바라봄 → 몸 방향이 옆모습→뒷모습→옆모습→정면으로 연속해서 바뀜.
      const u = (t - R - H) / this.SPIN, th = Math.PI + 4 * Math.PI * (u - Math.sin(2 * Math.PI * u) / (2 * Math.PI)); // 출발·도착은 천천히, 가운데는 빠르게
      const rr = lerp(gap, r, ease.out(clamp(u * this.SPIN / .4, 0, 1))), cs = Math.cos(th), sn = Math.sin(th);
      const view = (fx, fz) => ({ side: .9 * Math.pow(Math.abs(fx), .85), faceX: .1 * Math.abs(fx), faceA: clamp((fz + .8) / .5, 0, 1), armF: .6 + .9 * Math.abs(fx), armB: .6 + .9 * Math.abs(fx) });
      return { ph: 'spin', mx, ax: mx + rr * cs, bx: mx - rr * cs, az: sn, bz: -sn, adir: -cs >= 0 ? 1 : -1, bdir: cs >= 0 ? 1 : -1, hop: (1 - Math.cos(2 * th)) * 5,
        ap: view(-cs, -sn), bp: view(cs, sn), th, rr }; }
    // 나란히 서서 좋아함 (참고 그림): 서로 붙어 고개를 기울이고 폴짝폴짝. 돌기 끝 위치(±r)에서 부드럽게 붙는다.
    const u = t - R - H - this.SPIN, e = ease.out(clamp(u / .3, 0, 1)), jg = 41;
    return { ph: 'joy', mx, u, ax: mx - lerp(r, jg, e), bx: mx + lerp(r, jg, e), az: 0, bz: 0, adir: 1, bdir: -1, hop: Math.abs(Math.sin(u * 8)) * 5 };
  },
  anim(A, B, p) { const n = p.ph === 'rush' ? 'run' : p.ph === 'joy' ? 'joy' : p.ph === 'spin' ? 'twirl' : 'kiss'; A.play(n, { speed: 15 + (p.ph === 'spin' ? 4 : 0) }); B.play(n, { speed: 15 + (p.ph === 'spin' ? 4 : 0) }); },
  // 좋아하는 장면 둘레에 두근두근 뛰는 하트 (참고 그림의 배치)
  hearts(c, p, y, s, t) {
    const k = s / 128, e = ease.out(clamp((p.u || 0) / .5, 0, 1));
    [[-90, -158, 34], [-104, -112, 22], [-2, -184, 38], [68, -150, 30], [86, -108, 20], [-48, -196, 20]].forEach(([hx, hy, hs], i) => {
      const pulse = 1 + .12 * Math.sin(t * 9 + i * 1.3), fy = Math.sin(t * 3.4 + i * 1.9) * 4;
      G.drawHeart(c, p.mx + hx * k, y + (hy + fy) * k, hs * k * pulse * e, '#ff4f63', '#a92a40', 3 * k);
    });
  },
  // 뒤쪽 → 앞쪽 순서로 그린다. y: 발 위치, sA/sB: 캐릭터 크기
  draw(c, A, B, p, y, sA = 128, sB = 140, alpha = 1) {
    if (p.ph === 'spin') { // 바닥에 도는 궤적 (회전 방향이 보이도록)
      c.save(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3 * (sA / 128); c.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const a0 = p.th + i * 2.09; c.beginPath(); c.ellipse(p.mx, y + 5, p.rr * 1.5, p.rr * .42, 0, a0, a0 + 1.0); c.stroke(); }
      c.restore();
    }
    if (p.ph === 'hug' || p.ph === 'joy-kiss') { if (alpha < .999) c.save(), c.globalAlpha *= alpha; LF.drawEmbrace(c, A, B, p.ax, p.bx, y - p.hop, sA, sB); if (alpha < .999) c.restore(); return; }
    const list = [{ a: A, x: p.ax, z: p.az, dir: p.adir, s: sA, pose: p.ap }, { a: B, x: p.bx, z: p.bz, dir: p.bdir, s: sB, pose: p.bp }].sort((u, v) => (u.z + (p.ph === 'joy' && u.a.kind === 'cony' ? .5 : 0)) - (v.z + (p.ph === 'joy' && v.a.kind === 'cony' ? .5 : 0))); // 나란히 좋아하는 장면에선 코니가 앞 (참고 그림)
    for (const o of list) {
      const k = 1 + .1 * o.z;
      LF.shadow(c, o.x, y + 2, 46 * k * (o.s / 128), .18 * alpha);
      o.a.draw(c, o.x, y - p.hop, o.s * k, { dir: o.dir, alpha: alpha < .999 ? alpha : null, pose: o.pose });
    }
    if (p.ph === 'joy') { if (alpha < .999) c.save(), c.globalAlpha *= alpha; this.hearts(c, p, y, sA, LF.t); if (alpha < .999) c.restore(); }
  },
};

// ---------- 3D 배경 연결 ----------
// key가 바뀔 때만 3D 공원을 다시 짓고(무거움), 매 프레임 view3d로 카메라 위치를 알려준다.
LF.v3 = null;
LF.scene3d = (key, opts) => { if (!LF.W3.ok) return false; if (LF.W3.key !== key) { LF.W3.build(opts); LF.W3.key = key; } return true; };
LF.view3d = (cam, gy = LF.GY, fov) => { if (!LF.W3.ok) return false; LF.v3 = { cam, gy, fov }; return true; };

// ---------- 씬 ----------
LF.trans = { phase: 'none', t: 0, next: null, params: null };
LF.go = (name, params, instant) => {
  if (instant || !LF.cur) { LF._enter(name, params); return; }
  if (LF.trans.phase !== 'none') return;
  Object.assign(LF.trans, { phase: 'out', t: 0, next: name, params });
};
LF._enter = (name, params) => {
  const s = LF.scenes[name]; if (!s) { console.error('no scene', name); return; }
  if (LF.cur && LF.cur.exit) LF.cur.exit();
  LF.fx.clear(); LF.ui.btns = [];
  LF.cur = s; LF.curName = name; LF.syncW && LF.syncW(); s.enter && s.enter(params || {});
};
LF.updateTrans = dt => {
  const tr = LF.trans; if (tr.phase === 'none') return;
  tr.t += dt / .42;
  if (tr.phase === 'out' && tr.t >= 1) { LF._enter(tr.next, tr.params); tr.phase = 'in'; tr.t = 0; }
  else if (tr.phase === 'in' && tr.t >= 1) tr.phase = 'none';
};
LF.drawTrans = c => {
  const tr = LF.trans; if (tr.phase === 'none') return;
  const k = tr.phase === 'out' ? ease.inOut(Math.min(1, tr.t)) : 1 - ease.inOut(Math.min(1, tr.t));
  if (k <= .001) return;
  c.save();
  const s = 3600 * k;
  c.fillStyle = '#ff7eb0'; G.heart(c, LF.W / 2, LF.H / 2 + 40, s); c.fill();
  c.fillStyle = '#ffd3e6'; G.heart(c, LF.W / 2, LF.H / 2 + 40, s * .86); c.fill();
  if (k > .85) { c.globalAlpha = (k - .85) / .15; G.drawHeart(c, LF.W / 2, LF.H / 2, 90, '#ff5a8f', '#fff', 8); }
  c.restore();
};

// ---------- 화면 흔들림 / 번쩍임 ----------
LF.cam = { shake: 0, flash: 0, flashColor: '#fff' };
LF.shake = (a = 10) => { LF.cam.shake = Math.max(LF.cam.shake, a); };
LF.flash = (a = .6, col = '#fff') => { LF.cam.flash = a; LF.cam.flashColor = col; };

// ---------- 파티클 ----------
LF.fx = {
  list: [], texts: [],
  add(p) { const o = Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 1, size: 16, type: 'heart', color: '#ff6fa5', rot: 0, vr: 0, drag: 0, grow: 0, layer: 0 }, p); o.max = o.life; this.list.push(o); return o; },
  burst(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + (Math.random() - .5) * (o.spread || 1) : Math.random() * TAU, sp = (o.speed || 260) * (.35 + Math.random() * .85);
      const types = o.types || ['heart'];
      this.add({ x: x + (Math.random() - .5) * (o.rx || 0), y: y + (Math.random() - .5) * (o.ry || 0), vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp - (o.up || 0),
        g: o.g != null ? o.g : 420, life: (o.life || 1) * (.65 + Math.random() * .7), size: (o.size || 18) * (.6 + Math.random() * .8),
        type: pick(types), color: o.colors ? pick(o.colors) : '#ff6fa5', rot: Math.random() * 6, vr: (Math.random() - .5) * 8, drag: o.drag || 0, grow: o.grow || 0 });
    }
  },
  hearts(x, y, n = 10, o = {}) { this.burst(x, y, n, Object.assign({ types: ['heart'], colors: ['#ff5a8f', '#ff8fb4', '#ff3d7a', '#ffc2d9'], speed: 320, up: 200 }, o)); },
  stars(x, y, n = 10, o = {}) { this.burst(x, y, n, Object.assign({ types: ['star', 'sparkle'], colors: ['#ffd54a', '#fff', '#ffe9a0', '#ffb7d5'], speed: 300, g: 160 }, o)); },
  confetti(x, y, n = 50, o = {}) { this.burst(x, y, n, Object.assign({ types: ['conf'], colors: ['#ff6fa5', '#ffd54a', '#8fe3c8', '#c7b0ff', '#7fd0ff'], speed: 560, g: 700, life: 2, size: 14, up: 300, drag: .6 }, o)); },
  dust(x, y, n = 4, o = {}) { this.burst(x, y, n, Object.assign({ types: ['dust'], colors: ['rgba(255,255,255,.9)'], speed: 90, g: -40, life: .45, size: 16, up: 30, grow: 30 }, o)); },
  ring(x, y, color = '#fff', size = 20, life = .45) { this.add({ x, y, type: 'ring', color, size, life, grow: 260 }); },
  text(x, y, s, o = {}) { this.texts.push(Object.assign({ x, y, s, life: o.life || .9, max: o.life || .9, size: 34, color: '#fff', stroke: '#ff4d88', vy: -90 }, o)); },
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]; p.life -= dt;
      if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); continue; }
      p.vy += p.g * dt; if (p.drag) { const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.size += p.grow * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.life -= dt; t.y += t.vy * dt; t.vy *= (1 - 2 * dt); if (t.life <= 0) this.texts.splice(i, 1); }
  },
  draw(c, ox = 0) {
    for (const p of this.list) {
      const k = p.life / p.max, a = Math.min(1, k * 2.4);
      c.save(); c.globalAlpha = a; c.translate(p.x - ox, p.y);
      const s = p.size;
      switch (p.type) {
        case 'heart': c.rotate(Math.sin(p.rot) * .35); G.drawHeart(c, 0, 0, s, p.color, null, 0, true); break;
        case 'star': c.rotate(p.rot); G.star(c, 0, 0, s * .6); c.fillStyle = p.color; c.fill(); break;
        case 'sparkle': G.sparkle(c, 0, 0, s * (.45 + Math.abs(Math.sin(p.rot * 2)) * .6), p.color); break;
        case 'conf': c.rotate(p.rot); c.scale(1, Math.cos(p.rot * 2)); c.fillStyle = p.color; c.fillRect(-s / 2, -s / 4, s, s / 2); break;
        case 'dust': c.globalAlpha = a * .7; c.fillStyle = p.color; c.beginPath(); c.arc(0, 0, s / 2, 0, TAU); c.fill(); break;
        case 'ring': c.globalAlpha = k; c.strokeStyle = p.color; c.lineWidth = 6 * k + 1; c.beginPath(); c.arc(0, 0, s, 0, TAU); c.stroke(); break;
        case 'streak': c.globalAlpha = a * .9; c.strokeStyle = p.color; c.lineWidth = p.w || 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(p.len || 100, 0); c.stroke(); break;
        case 'note': c.rotate(Math.sin(p.rot) * .3); G.text(c, '♪', 0, 0, { size: s * 1.6, color: p.color }); break;
        case 'drop': c.fillStyle = p.color; c.beginPath(); c.ellipse(0, 0, s * .25, s * .45, 0, 0, TAU); c.fill(); break;
        default: c.fillStyle = p.color; c.beginPath(); c.arc(0, 0, s / 2, 0, TAU); c.fill();
      }
      c.restore();
    }
  },
  drawTexts(c) {
    for (const t of this.texts) {
      const k = t.life / t.max, pop = ease.back(clamp((1 - k) / .25, 0, 1));
      c.save(); c.translate(t.x, t.y); c.scale(pop, pop);
      G.text(c, t.s, 0, 0, { size: t.size, color: t.color, stroke: t.stroke, alpha: Math.min(1, k * 3) });
      c.restore();
    }
  },
  clear() { this.list.length = 0; this.texts.length = 0; },
};

// ---------- UI 위젯 ----------
// 참고 사이트 스타일: 흰 카드 + 짙은 초록 알약 버튼 + 베이지 보조 버튼
LF.PAL = {
  green: ['#4b9a6c', '#2f6f4f', '#1f4f37'], white: ['#fffdf6', '#eadcb8', '#b8923a'], cream: ['#fff7e8', '#f6ead2', '#d8c7a4'],
  pink: ['#ff8fb8', '#f0628f', '#c8406e'], coral: ['#ffb08f', '#ef7350', '#c9532f'], gray: ['#f1eee8', '#d8d2c6', '#aaa294'],
  lav: ['#ffffff', '#ffffff', '#d9d1c1'], sky: ['#ffffff', '#ffffff', '#d9d1c1'],
};
LF.INK = '#2f4a3c';
LF.Button = class {
  constructor(o) { Object.assign(this, { x: 0, y: 0, w: 240, h: 72, label: '', color: 'green', size: 30, enabled: true, press: 0, hov: 0, onClick: null, icon: null, sub: null, key: null, pulse: false, visible: true }, o); }
  hit(x, y) { return this.visible && this.enabled && Math.abs(x - this.x) <= this.w / 2 && Math.abs(y - this.y) <= this.h / 2; }
  update(dt) { this.press = Math.max(0, this.press - dt * 5); this.hov = damp(this.hov, this.hit(LF.ptr.x, LF.ptr.y) && !LF.touch ? 1 : 0, 14, dt); }
  draw(c) {
    if (!this.visible) return;
    const key = this.enabled ? this.color : 'gray', [c1, c2, c3] = LF.PAL[key], light = key === 'white' || key === 'lav' || key === 'sky' || key === 'cream' || key === 'gray';
    const sc = (1 + this.hov * .04 - this.press * .08) * (this.pulse ? 1 + Math.sin(LF.t * 4) * .02 : 1);
    const w = this.w, h = this.h, r = h / 2;
    c.save(); c.translate(this.x, this.y - this.hov * 2); c.scale(sc, sc);
    c.shadowColor = 'rgba(40,50,40,.22)'; c.shadowBlur = 18; c.shadowOffsetY = 6 - this.press * 4;
    G.rr(c, -w / 2, -h / 2, w, h, r); c.fillStyle = (light && key !== 'white') ? c1 : G.lin(c, 0, -h / 2, 0, h / 2, key === 'white' ? [c1, c2] : [c1, c2]); c.fill();
    c.shadowColor = 'transparent';
    if (key === 'white') { // 샴페인 아이보리 + 금테 + 가는 안쪽 금선 + 부드러운 입체감
      c.save(); G.rr(c, -w / 2, -h / 2, w, h, r); c.clip();
      c.lineWidth = 6; c.strokeStyle = 'rgba(255,255,255,.9)'; c.save(); c.translate(0, 3.5); G.rr(c, -w / 2, -h / 2, w, h, r); c.stroke(); c.restore();      // 윗면 하이라이트
      c.strokeStyle = 'rgba(160,118,40,.30)'; c.save(); c.translate(0, -3.5); G.rr(c, -w / 2, -h / 2, w, h, r); c.stroke(); c.restore();                  // 아랫면 따뜻한 그림자
      c.fillStyle = 'rgba(255,255,255,.4)'; G.rr(c, -w / 2 + 10, -h / 2 + 5, w - 20, h * .36, r * .7); c.fill();
      c.restore();
      c.lineWidth = 1.3; c.strokeStyle = 'rgba(184,146,58,.55)'; G.rr(c, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, r - 6); c.stroke(); // 안쪽 금선
      c.lineWidth = 3; c.strokeStyle = G.lin(c, -w / 2, -h / 2, w / 2, h / 2, ['#f6df9a', '#b8923a', '#f2d98a', '#a47d2c']); G.rr(c, -w / 2, -h / 2, w, h, r); c.stroke(); // 금테
    }
    else if (light) { c.lineWidth = 2.5; c.strokeStyle = c3; c.stroke(); }
    else { c.fillStyle = 'rgba(255,255,255,.16)'; G.rr(c, -w / 2 + 6, -h / 2 + 4, w - 12, h * .42, r * .8); c.fill(); }
    const tc = light ? (key === 'gray' ? '#8c8478' : LF.INK) : '#ffffff';
    let tx = 0;
    if (this.icon) { const iw = this.size * 1.1; if (this.label) tx = iw * .45; this.icon(c, this.label ? -G.measure(c, this.label, this.size) / 2 - iw * .2 : 0, 0, this.size); }
    if (this.label) G.text(c, this.label, tx, 2, key === 'white' ? { size: this.size, color: '#33513f', shadow: 'rgba(255,255,255,.95)' } : { size: this.size, color: tc }); // 회색 버튼 글자는 눌러 새긴 느낌
    if (this.sub) G.text(c, this.sub, 0, h * .3, { size: this.size * .45, color: tc });
    if (this.enabled) { // 타이틀 로고와 같은 빛살: 비스듬한 밝은 띠가 버튼 위를 쓱 지나감 (버튼마다 시작 시각이 다름)
      const per = 3.4, u = (((LF.t + this.x * .0031 + this.y * .0017) % per) + per) % per / per;
      if (u < .3) {
        const k = u / .3, bw = Math.max(26, h * .5), sx = -w / 2 - bw * 2 + k * (w + bw * 4);
        c.save(); G.rr(c, -w / 2, -h / 2, w, h, r); c.clip(); c.globalAlpha = (key === 'white' ? .75 : light ? .42 : .2) * Math.sin(k * Math.PI);
        c.fillStyle = key === 'white' ? '#fff' : light ? '#ff9cc2' : '#fff'; // (회색 버튼의 빛살은 분홍이 아니라 흰색)
        c.transform(1, 0, -.35, 1, 0, 0); c.fillRect(sx, -h, bw, h * 2); c.fillRect(sx + bw * 1.5, -h, bw * .35, h * 2); c.restore();
      }
    }
    c.restore();
  }
};
LF.ui = {
  btns: [],
  add(o) { const b = new LF.Button(o); this.btns.push(b); return b; },
  update(dt) { this.btns.forEach(b => b.update(dt)); },
  draw(c, list = this.btns) { list.forEach(b => b.draw(c)); },
  down(x, y, list = this.btns) {
    for (let i = list.length - 1; i >= 0; i--) { const b = list[i]; if (b.hit(x, y)) { b.press = 1; LF.sfx('click'); b.onClick && b.onClick(b); return b; } }
    return null;
  },
};
// 아이콘 (벡터)
LF.ICON = {
  play: (c, x, y, s) => { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - s * .28, y - s * .36); c.lineTo(x + s * .38, y); c.lineTo(x - s * .28, y + s * .36); c.closePath(); c.fill(); },
  pause: (c, x, y, s) => { c.fillStyle = '#fff'; G.rr(c, x - s * .32, y - s * .36, s * .22, s * .72, s * .08); c.fill(); G.rr(c, x + s * .1, y - s * .36, s * .22, s * .72, s * .08); c.fill(); },
  retry: (c, x, y, s) => { c.strokeStyle = '#fff'; c.lineWidth = s * .14; c.lineCap = 'round'; c.beginPath(); c.arc(x, y, s * .3, -.4, 4.4); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x + s * .38, y - s * .32); c.lineTo(x + s * .36, y + s * .02); c.lineTo(x + s * .06, y - s * .16); c.fill(); },
  home: (c, x, y, s) => { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x, y - s * .4); c.lineTo(x + s * .42, y - s * .02); c.lineTo(x + s * .3, y - s * .02); c.lineTo(x + s * .3, y + s * .36); c.lineTo(x - s * .3, y + s * .36); c.lineTo(x - s * .3, y - s * .02); c.lineTo(x - s * .42, y - s * .02); c.closePath(); c.fill(); },
  gear: (c, x, y, s) => { c.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { c.save(); c.translate(x, y); c.rotate(i * Math.PI / 4); c.fillRect(-s * .08, -s * .42, s * .16, s * .2); c.restore(); } c.beginPath(); c.arc(x, y, s * .28, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(x, y, s * .11, 0, TAU); c.fill(); },
  heart: (c, x, y, s) => G.drawHeart(c, x, y, s * .8, '#fff', null, 0, false),
  map: (c, x, y, s) => { c.strokeStyle = '#fff'; c.lineWidth = s * .1; c.lineJoin = 'round'; c.beginPath(); c.moveTo(x - s * .4, y - s * .28); c.lineTo(x - s * .13, y - s * .38); c.lineTo(x + s * .13, y - s * .28); c.lineTo(x + s * .4, y - s * .38); c.lineTo(x + s * .4, y + s * .3); c.lineTo(x + s * .13, y + s * .38); c.lineTo(x - s * .13, y + s * .28); c.lineTo(x - s * .4, y + s * .38); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(x - s * .13, y - s * .38); c.lineTo(x - s * .13, y + s * .28); c.moveTo(x + s * .13, y - s * .28); c.lineTo(x + s * .13, y + s * .38); c.stroke(); },
  next: (c, x, y, s) => { LF.ICON.play(c, x - s * .14, y, s * .8); LF.ICON.play(c, x + s * .18, y, s * .8); },
  sound: (c, x, y, s, on = true) => { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - s * .4, y - s * .14); c.lineTo(x - s * .18, y - s * .14); c.lineTo(x + s * .06, y - s * .36); c.lineTo(x + s * .06, y + s * .36); c.lineTo(x - s * .18, y + s * .14); c.lineTo(x - s * .4, y + s * .14); c.closePath(); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = s * .08; c.lineCap = 'round'; if (on) { c.beginPath(); c.arc(x + s * .08, y, s * .2, -.8, .8); c.stroke(); c.beginPath(); c.arc(x + s * .08, y, s * .36, -.8, .8); c.stroke(); } else { c.beginPath(); c.moveTo(x + s * .16, y - s * .14); c.lineTo(x + s * .42, y + s * .14); c.moveTo(x + s * .42, y - s * .14); c.lineTo(x + s * .16, y + s * .14); c.stroke(); } },
};
// 흰 카드 패널 (부드러운 그림자)
LF.panel = (c, x, y, w, h, o = {}) => {
  const r = o.r || 28;
  c.save();
  c.shadowColor = o.shadow || 'rgba(60,45,30,.2)'; c.shadowBlur = 26; c.shadowOffsetY = 8;
  G.rr(c, x, y, w, h, r); c.fillStyle = o.fill || 'rgba(255,255,255,.97)'; c.fill();
  c.shadowColor = 'transparent';
  if (o.border && o.border !== '#ffb3d1') { c.lineWidth = o.lw || 4; c.strokeStyle = o.border; c.stroke(); }
  else { c.lineWidth = 1.5; c.strokeStyle = 'rgba(200,190,170,.6)'; c.stroke(); }
  c.restore();
};
// 말풍선 (tx,ty = 꼬리 끝)
LF.bubble = (c, s, tx, ty, o = {}) => {
  const size = o.size || 28, maxW = o.maxW || 420, pad = 22;
  const lines = G.wrap(c, s, maxW - pad * 2, size);
  c.font = `${size}px ${LF.FONT}`;
  const w = Math.min(maxW, Math.max(...lines.map(l => c.measureText(l).width)) + pad * 2), lh = size * 1.25, h = lines.length * lh + pad * 1.3;
  const k = o.pop != null ? o.pop : 1;
  const bx = clamp(tx - w / 2, 12, LF.W - w - 12), by = o.below ? ty + 18 : ty - h - 18;
  c.save(); c.translate(tx, ty); c.scale(k, k); c.translate(-tx, -ty);
  c.fillStyle = 'rgba(150,50,90,.15)'; G.rr(c, bx, by + 5, w, h, 22); c.fill();
  const qx = clamp(tx, bx + 30, bx + w - 30);
  c.beginPath(); G.rr(c, bx, by, w, h, 22); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3; c.strokeStyle = o.border || '#d9cfbd'; c.stroke();
  c.beginPath(); if (o.below) { c.moveTo(qx - 14, by + 2); c.lineTo(tx, ty); c.lineTo(qx + 14, by + 2); } else { c.moveTo(qx - 14, by + h - 2); c.lineTo(tx, ty); c.lineTo(qx + 14, by + h - 2); }
  c.fillStyle = '#fff'; c.fill(); c.stroke();
  c.fillStyle = '#fff'; c.fillRect(qx - 12, o.below ? by - 1 : by + h - 5, 24, 7);
  lines.forEach((l, i) => G.text(c, l, bx + w / 2, by + pad * .65 + lh * i + lh / 2, { size, color: LF.INK }));
  c.restore();
};
