'use strict';
// 화면: 타이틀 · 캐릭터 선택/설정 · 지도 · 결과 · 엔딩 + 스테이지 진행 흐름

// ---------- 스테이지 진행 ----------
LF.flow = {
  start(id) {
    this.stage = LF.STAGES[id - 1]; this.queue = this.stage.flow.slice(); this.res = { run: null, minis: [] }; this.buff = { lives: 0, magnet: false };
    LF.audio.init(); this.next();
  },
  next() {
    const k = this.queue.shift();
    if (!k) { LF.go('result', { stage: this.stage, res: this.res }); return; }
    if (k === 'run') LF.go('run', { stage: this.stage, buff: this.buff });
    else LF.go('mg_' + k, { stage: this.stage });
  },
  runDone(r) { this.res.run = r; this.next(); },
  miniDone(kind, score) {
    this.res.minis.push({ kind, score });
    if (kind === 'workout' && score >= .6) this.buff.lives = 1;
    if (kind === 'cook' && score >= .6) this.buff.magnet = true;
    this.next();
  },
};

// 공통 배경: 핑크 하늘 + 떠다니는 하트 + 반짝이
function dreamyBG(c, t, cols = ['#ffd3e8', '#ffeef6', '#e8dcff']) {
  const W = LF.W, H = LF.H;
  c.fillStyle = G.lin(c, 0, 0, 0, H, cols); c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = .16; c.translate(W / 2, 320);
  for (let i = 0; i < 14; i++) { c.rotate(TAU / 14); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, 0); c.lineTo(1200, -60); c.lineTo(1200, 60); c.fill(); }
  c.restore();
  const r = rng(3);
  for (let i = 0; i < 16; i++) { const x0 = r() * W, sp = 20 + r() * 30, sz = 18 + r() * 30, ph = r() * 100; const y = H + 40 - ((t * sp + ph * 20) % (H + 80)); c.globalAlpha = .35; G.drawHeart(c, x0 + Math.sin(t + ph) * 30, y, sz, ['#ff9cc2', '#ffc2d9', '#d6c2ff'][i % 3], null, 0, false); }
  c.globalAlpha = 1;
  for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, k = Math.max(0, Math.sin(t * (1 + r() * 2) + r() * 6)); if (k > .1) { c.globalAlpha = k; G.sparkle(c, x, y, 4 + r() * 9, '#fff'); } }
  c.globalAlpha = 1;
}
// 3D 공원 배경 (three.js가 없으면 2D 배경으로 대체). gy: 땅이 보이는 화면 높이, veil: 흰 안개
function parkBG(c, t, o = {}) {
  const key = o.theme || 'park';
  if (LF.scene3d('menu_' + key, { theme: key, len: 9000, x0: -5000, seed: 3, houses: [0, 30], noFront: true, props: [
    { t: 'dog', x: -2.9, z: -3.0, ry: .5 }, { t: 'controller', x: -5.2, z: -2.7 }, { t: 'bench', x: 3.4, z: -3.3 }, { t: 'planter', x: 1.7, z: -2.9 },
    { t: 'balloon', x: 5.2, z: -3.5 }, { t: 'mailbox', x: -1.6, z: -4.7 }, { t: 'picnic', x: 7.6, z: -2.9 }, { t: 'sign', x: 10.5, z: -3.4 }, { t: 'bench', x: -8.5, z: -3.2 }, { t: 'dog', x: 12.8, z: -2.9, ry: -.6 }] }) && LF.view3d((o.x || 0) + Math.sin(t * .07) * 300 - 640, o.gy || 520)) {
    if (o.veil) { c.fillStyle = `rgba(255,250,244,${o.veil})`; c.fillRect(0, 0, LF.W, LF.H); }
    return true;
  }
  dreamyBG(c, t, o.cols); return false;
}
function soundBtns(c) {
  const S = LF.save.data;
  for (const [i, on] of [[0, S.music], [1, S.sfx]]) {
    const x = LF.W - 50 - i * 76, y = LF.H - 46;
    c.fillStyle = on ? '#ff8fbd' : '#c9c0d4'; c.beginPath(); c.arc(x, y, 30, 0, TAU); c.fill(); c.lineWidth = 4; c.strokeStyle = '#fff'; c.stroke();
    if (i === 0) G.text(c, '♪', x, y + 2, { size: 34, color: '#fff' }); else LF.ICON.sound(c, x, y, 36, on);
    if (!on) { c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 18, y + 18); c.lineTo(x + 18, y - 18); c.stroke(); }
  }
}
function soundHit(x, y) {
  const S = LF.save.data;
  if (Math.hypot(x - (LF.W - 50), y - (LF.H - 46)) < 34) { S.music = !S.music; LF.save.write(); LF.audio.applyVol(); LF.sfx('click'); return true; }
  if (Math.hypot(x - (LF.W - 126), y - (LF.H - 46)) < 34) { S.sfx = !S.sfx; LF.save.write(); LF.audio.applyVol(); LF.sfx('click'); return true; }
  return false;
}

// ================= 타이틀 =================
// 물방울처럼 떠오르는 하트 (반투명 유리 느낌 + 하이라이트)
LF.newBubble = init => {
  const r = Math.random(), s = r < .48 ? rand(20, 42) : r < .8 ? rand(46, 84) : rand(100, 180); // 작은 것이 많고 큰 것이 가끔
  return { x: rand(30, LF.W - 30), y: init ? rand(0, LF.H) : LF.H + s * .6, s, v: rand(26, 62) * (1.25 - s / 220), ph: rand(0, 6), sw: rand(10, 34), life: rand(9, 16), age: init ? rand(0, 5) : 0,
    hue: pick([[255, 120, 150], [255, 150, 185], [255, 95, 125], [255, 175, 205]]) };
};
LF.drawBubble = (c, b, t) => {
  const fade = Math.min(1, b.age / 1.2) * Math.min(1, (b.y + b.s) / 160) * Math.min(1, (b.life - b.age) / 1.2);
  if (fade <= .01) return;
  const x = b.x + Math.sin(t * .9 + b.ph) * b.sw, y = b.y, s = b.s * (1 + Math.sin(t * 2 + b.ph) * .03), [R, G_, B] = b.hue;
  c.save(); c.globalAlpha = fade;
  G.heart(c, x, y, s);
  const g = c.createRadialGradient(x - s * .18, y - s * .22, s * .05, x, y, s * .75);
  g.addColorStop(0, `rgba(255,255,255,.65)`); g.addColorStop(.35, `rgba(${R},${G_},${B},.36)`); g.addColorStop(1, `rgba(${R},${G_},${B},.62)`);
  c.fillStyle = g; c.fill();
  c.lineWidth = Math.max(1.5, s * .03); c.strokeStyle = 'rgba(255,255,255,.75)'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(x - s * .24, y - s * .2, s * .1, s * .05, -.7, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(x - s * .06, y - s * .3, s * .025, 0, TAU); c.fill();
  c.restore();
};
LF.scenes.title = {
  enter() {
    this.t = 0; this.A = new LF.Actor('cony'); this.B = new LF.Actor('brown'); this.A.play('wave'); this.B.play('idle'); this.A.dir = 1; this.B.dir = -1;
    this.hop = 0; LF.audio.music('title');
    this.bub = []; for (let i = 0; i < 40; i++) this.bub.push(LF.newBubble(true));
    LF.ui.add({ x: LF.W / 2, y: 568, w: 360, h: 80, label: '시작하기', size: 42, color: 'green', pulse: true, onClick: () => { LF.audio.init(); LF.go(LF.save.data.runner ? 'map' : 'select', { first: !LF.save.data.runner }); } });
    LF.ui.add({ x: 960, y: LF.H - 52, w: 270, h: 80, label: '설정 · 캐릭터', size: 28, color: 'white', onClick: () => LF.go('select') });
  },
  update(dt) {
    this.t += dt; LF.fx.update(dt); LF.ui.update(dt); this.A.update(dt); this.B.update(dt);
    for (let i = 0; i < this.bub.length; i++) { const b = this.bub[i]; b.age += dt; b.y -= b.v * dt; if (b.y < -b.s || b.age > b.life) this.bub[i] = LF.newBubble(false); }
    const T = 7.4, u = this.t % T, FAR = 350, NEAR = 128, WAIT = 1.4, WALK = 1, SHY = .8;
    let k = 0, anim = 'wave', a = 1; // k: 가까워진 정도 0(멀리)~1(바로 옆)
    if (u < WAIT) { anim = 'wave'; a = clamp(u / .4, 0, 1); }
    else if (u < WAIT + WALK) { const w = (u - WAIT) / WALK; k = ease.inOut(w); anim = 'walk'; }
    else if (u < WAIT + WALK + SHY) { k = 1; anim = 'shy'; }
    else { k = 1; anim = 'joy'; a = clamp((T - u) / .5, 0, 1); }
    this.k = k; this.fade = a; this.dist = lerp(FAR, NEAR, k);
    if (anim !== this.phase) { this.phase = anim; if (anim === 'joy') { LF.sfx && LF.sfx('win'); LF.fx.hearts(LF.W / 2, 340, 22, { speed: 340 }); } }
    this.A.play(anim, { speed: 12 }); this.B.play(anim, { speed: 12 });
    this.beat = (this.beat || 0) + dt * (3 + 6 * k); // 가까울수록 하트가 빨리 두근
    if (Math.random() < dt * (1 + 4 * k)) LF.fx.hearts(LF.W / 2 + rand(-40, 40), 330, 1, { speed: 120, up: 220, g: 60, life: 2 });
  },
  draw(c) {
    const W = LF.W, t = this.t;
    parkBG(c, t, { gy: 470 });
    for (const b of this.bub) LF.drawBubble(c, b, t);
    LF.fx.draw(c);
    // 로고: 진한 초록 플레이트 + 금색 라인 + 크림색 글자
    const bob = Math.sin(t * 1.6) * 3, py = 34 + bob;
    c.save(); c.translate(W / 2, py);
    c.shadowColor = 'rgba(20,45,34,.45)'; c.shadowBlur = 40; c.shadowOffsetY = 14;
    G.rr(c, -400, 0, 800, 218, 54); c.fillStyle = G.lin(c, 0, 0, 0, 218, ['#2f6b4f', '#1d4a36']); c.fill(); c.shadowColor = 'transparent';
    c.lineWidth = 3; c.strokeStyle = '#e9c46a'; G.rr(c, -388, 12, 776, 194, 44); c.stroke();       // 안쪽 금테
    c.lineWidth = 1.2; c.strokeStyle = 'rgba(233,196,106,.55)'; G.rr(c, -378, 22, 756, 174, 36); c.stroke();
    // 윗줄 작은 글씨
    G.text(c, 'L I N E   F R I E N D S   F A N   G A M E', 0, 46, { size: 17, color: '#e9c46a' });
    // 이름: 코니 ♥ 브라운
    c.font = '112px ' + LF.FONT; const wl = c.measureText('코니').width, wr = c.measureText('브라운').width, gap = 74, total = wl + gap + wr, x0 = -total / 2;
    G.text(c, '코니', x0 + wl / 2, 116, { size: 112, color: '#fff8e8', shadow: 'rgba(0,0,0,.35)' });
    G.text(c, '브라운', x0 + wl + gap + wr / 2, 116, { size: 112, color: '#fff8e8', shadow: 'rgba(0,0,0,.35)' });
    const hs = 1 + Math.sin(t * 4) * .07; c.save(); c.translate(x0 + wl + gap / 2, 112); c.scale(hs, hs); G.drawHeart(c, 0, 0, 56, '#ff5c7a', '#ffe9c2', 4); c.restore();
    // 아랫줄: LOVE RUN + 금색 선
    G.text(c, 'L O V E   R U N', 0, 184, { size: 34, color: '#e9c46a' });
    for (const sd of [-1, 1]) { const g = c.createLinearGradient(sd * 150, 0, sd * 340, 0); g.addColorStop(0, '#e9c46a'); g.addColorStop(1, 'rgba(233,196,106,0)'); c.fillStyle = g; c.fillRect(sd > 0 ? 150 : -340, 183, 190, 2.5); }
    // 금빛 반짝임이 한 번씩 지나감
    c.save(); G.rr(c, -400, 0, 800, 218, 54); c.clip(); const sx = ((t * 260) % 1700) - 700; c.globalAlpha = .16; c.fillStyle = '#fff'; c.transform(1, 0, -.35, 1, 0, 0); c.fillRect(sx, 0, 60, 218); c.restore();
    c.restore();
    for (const [x, y, s2] of [[190, 292, 28], [1090, 300, 32], [250, 380, 18], [1030, 392, 20]]) { c.save(); c.translate(x, y + Math.sin(t * 2.4 + x) * 7); c.rotate(Math.sin(t * 1.8 + x) * .18); G.drawHeart(c, 0, 0, s2, '#ff5a8f', '#fff', 4); c.restore(); }
    // 캐릭터
    // 가운데 큰 하트 (코니 키와 비슷한 크기): 캐릭터 뒤에 그려서 둘 사이에 놓임
    { const k0 = this.k || 0, hs = 234 * (1 + .03 * k0 + (.035 + .045 * k0) * Math.sin(this.beat || 0)); c.save(); c.shadowColor = 'rgba(120,20,50,.35)'; c.shadowBlur = 30; c.shadowOffsetY = 10; G.drawHeart(c, W / 2, 386 + Math.sin(t * 2.4) * 4, hs, '#ff3d6e', '#fff', 9); c.restore(); }
    const D = this.dist || 350, fa = this.fade == null ? 1 : this.fade;
    LF.shadow(c, W / 2 - D, 494, 60, .18 * fa); LF.shadow(c, W / 2 + D, 494, 64, .18 * fa);
    this.A.draw(c, W / 2 - D, 492, 190, { dir: 1, alpha: fa < .999 ? fa : null }); this.B.draw(c, W / 2 + D, 492, 190, { dir: -1, alpha: fa < .999 ? fa : null });
    LF.ui.draw(c);
    const r = LF.save.data.runner;
    if (r) G.text(c, `${LF.CHAR[r].name} → ${LF.CHAR[LF.otherKind(r)].name}  ·  난이도 ${LF.diff().name}  ·  사랑 게이지 ${LF.save.lovePct()}%`, W / 2, 700, { size: 20, color: '#c0558c' });
    soundBtns(c);
    G.text(c, '팬 메이드 게임 · LINE FRIENDS 캐릭터 저작권은 LINE Corp.에 있습니다', 20, 708, { size: 13, color: '#b79ac4', align: 'left' });
  },
  pointerdown(x, y) { LF.audio.init(); if (soundHit(x, y)) return; LF.ui.down(x, y); },
  keydown(code) { if (code === 'Enter' || code === 'Space') LF.ui.btns[0].onClick(); },
};

// ================= 캐릭터 선택 + 설정 =================
LF.scenes.select = {
  enter(p) {
    this.t = 0; this.first = p.first;
    this.bub = []; for (let i = 0; i < 34; i++) this.bub.push(LF.newBubble(true)); // 물방울 하트
    const S = LF.save.data; this.choice = S.runner || 'cony';
    this.cards = ['cony', 'brown'].map((k, i) => ({ k, x: 360 + i * 560, A: new LF.Actor(k), B: new LF.Actor(LF.otherKind(k)) }));
    LF.audio.music('title');
    const dcol = (d, on) => on ? (d === 'hell' ? 'coral' : d === 'easy' ? 'pink' : 'green') : 'white';
    LF.DIFF_ORDER.forEach((d, i) => LF.ui.add({ x: 355 + i * 190, y: 510, w: 172, h: 76, label: LF.DIFF[d].name, size: 28, color: dcol(d, S.diff === d), onClick: b => { S.diff = d; LF.save.write(); LF.ui.btns.slice(0, 4).forEach((bb, j) => bb.color = dcol(LF.DIFF_ORDER[j], j === i)); } }));
    LF.ui.add({ x: LF.W / 2 + 160, y: 664, w: 300, h: 76, label: this.first ? '시작!' : '확인', size: 38, color: 'green', pulse: true, onClick: () => { S.runner = this.choice; LF.save.write(); LF.go('map'); } });
    LF.ui.add({ x: LF.W / 2 - 160, y: 664, w: 300, h: 76, label: '기록 초기화', size: 32, color: 'white', onClick: () => { if (confirm('스테이지 기록을 모두 지울까요?')) { LF.save.reset(); LF.fx.text(LF.W / 2, 600, '초기화했어요', { size: 30 }); } } });
  },
  update(dt) {
    this.t += dt; LF.fx.update(dt); LF.ui.update(dt);
    for (let i = 0; i < this.bub.length; i++) { const b = this.bub[i]; b.age += dt; b.y -= b.v * dt; if (b.y < -b.s || b.age > b.life) this.bub[i] = LF.newBubble(false); }
    for (const cd of this.cards) {
      const sel = cd.k === this.choice;
      if (sel) { // 서로 손 흔들기 → 달려옴 → 꼬옥 → 안은 채 빙글빙글 → 반복
        cd.t = (cd.t || 0) + dt; const L = LF.hug.total() + 1.2, tt = cd.t % L;
        if (tt < .5) { cd.p = null; cd.A.play('wave'); cd.B.play('wave'); }
        else { cd.p = LF.hug.pose(tt - .5, -130, 140, 5, 26, 40); LF.hug.anim(cd.A, cd.B, cd.p); }
        cd.fade = clamp(tt / .25, 0, 1) * clamp((L - tt) / .3, 0, 1);
      } else { cd.t = 0; cd.p = null; cd.fade = 1; cd.A.play('idle'); cd.B.play('idle'); }
      cd.A.update(dt); cd.B.update(dt);
    }
  },
  draw(c) {
    const W = LF.W, t = this.t;
    parkBG(c, t, { veil: .35, x: 3000 });
    for (const b of this.bub) LF.drawBubble(c, b, t);
    LF.fx.draw(c);
    G.text(c, '누가 누구에게 달려갈까요?', W / 2, 70, { size: 54, color: '#2f6b4f', stroke: '#fff', sw: 12 });
    for (const cd of this.cards) {
      const sel = cd.k === this.choice, x = cd.x, y = 290, s = sel ? 1.03 + Math.sin(t * 4) * .01 : .96;
      c.save(); c.translate(x, y); c.scale(s, s);
      LF.panel(c, -250, -170, 500, 330, { r: 40, border: sel ? '#3f8a66' : 'rgba(200,190,170,.6)', lw: sel ? 7 : 2 });
      // 미니 달리기 장면
      c.save(); G.rr(c, -230, -150, 460, 220, 26); c.clip();
      c.fillStyle = G.lin(c, 0, -150, 0, 70, ['#bfe6ff', '#fff2f8']); c.fillRect(-230, -150, 460, 220);
      c.fillStyle = '#9fdc8b'; c.fillRect(-230, 50, 460, 30);
      if (sel && cd.p) LF.hug.draw(c, cd.A, cd.B, cd.p, 50, 120, 120, cd.fade);
      else { const al = sel ? cd.fade : 1, o1 = { dir: 1 }, o2 = { dir: -1 }; if (al < .999) { o1.alpha = al; o2.alpha = al; }
        LF.shadow(c, -130, 52, 26, .18 * al); cd.A.draw(c, -130, 50, 120, o1);
        LF.shadow(c, 140, 52, 26, .18 * al); cd.B.draw(c, 140, 50, 120, o2); }
      if (sel) for (let i = 0; i < 3; i++) G.drawHeart(c, -40 + i * 30 + Math.sin(t * 6 + i) * 4, -60 - i * 12, 22, '#ff5a8f', null, 0, false);
      c.restore();
      G.text(c, `${LF.CHAR[cd.k].name}가 ${LF.CHAR[LF.otherKind(cd.k)].name}에게`.replace('브라운가', '브라운이'), 0, 115, { size: 40, color: sel ? '#2f6b4f' : '#9c8aa0' });
      c.restore();
      if (sel) { G.drawHeart(c, x + 210, y - 150, 54, '#3f8a66', '#fff', 6); G.text(c, '✓', x + 210, y - 148, { size: 30, color: '#fff' }); }
    }
    G.text(c, '난이도', 195, 510, { size: 32, color: '#3f8a66' });
    const d = LF.save.data.diff;
    G.text(c, { easy: '아주 쉬워요! 천천히 · 장애물 적게 · 목숨 +2 · 목표 하트 25%', normal: '보통 속도 (그래도 꽤 어려워요) · 목표 하트 50%', hard: '장애물 많고 더 빠름 · 목표 하트 60%', hell: '진짜 고수만… 목표 하트 70%' }[d], 640, 592, { size: 24, color: '#7a5a6a' });
    LF.ui.draw(c);
    soundBtns(c);
  },
  pop(cx) { // 선택한 카드 둘레에서 크고 작은 물방울 하트가 한꺼번에 솟아오름
    for (let i = 0; i < 18; i++) { const b = LF.newBubble(false); b.x = cx + rand(-230, 230); b.y = rand(200, 430); b.age = 0; b.v = rand(70, 190) * (1.15 - b.s / 260); b.life = rand(3.5, 7); this.bub.push(b); }
    if (this.bub.length > 90) this.bub.splice(0, this.bub.length - 90);
  },
  pointerdown(x, y) {
    if (soundHit(x, y)) return;
    if (LF.ui.down(x, y)) return;
    for (const cd of this.cards) if (Math.abs(x - cd.x) < 250 && Math.abs(y - 290) < 170) { if (this.choice !== cd.k) { LF.sfx('jump'); this.pop(cd.x); } this.choice = cd.k; }
  },
  keydown(code) {
    const was = this.choice; if (code === 'ArrowLeft') this.choice = 'cony'; if (code === 'ArrowRight') this.choice = 'brown'; if (was !== this.choice) { LF.sfx('jump'); this.pop(this.cards.find(cd => cd.k === this.choice).x); }
    if (code === 'Enter') LF.ui.btns[4].onClick(); if (code === 'Escape') LF.go('title');
  },
};

// ================= 지도 =================
LF.scenes.map = {
  enter() {
    this.t = 0; this.sel = null; const S = LF.save.data;
    this.nodes = LF.STAGES.map((s, i) => ({ s, x: 110 + i * 118, y: 420 + Math.sin(i * 1.1 + .4) * 110 }));
    this.cur = Math.min(S.unlocked, LF.STAGES.length);
    this.A = new LF.Actor(LF.P()); this.B = new LF.Actor(LF.Q()); this.B.dir = -1; this.B.play('wave');
    const n = this.nodes[this.cur - 1]; this.ax = n.x; this.ay = n.y; this.tx = n.x; this.ty = n.y;
    LF.audio.music('title');
    LF.ui.add({ x: 100, y: 664, w: 150, h: 76, label: '처음', size: 30, color: 'white', onClick: () => LF.go('title') });
    LF.ui.add({ x: 275, y: 664, w: 170, h: 76, label: '설정', size: 30, color: 'white', onClick: () => LF.go('select') });
    this.pop = [
      new LF.Button({ x: LF.W / 2 + 125, y: 540, w: 230, h: 80, label: '출발!', size: 38, color: 'green', pulse: true, onClick: () => LF.flow.start(this.sel.s.id) }),
      new LF.Button({ x: LF.W / 2 - 125, y: 540, w: 230, h: 80, label: '닫기', size: 38, color: 'white', onClick: () => { this.sel = null; } }),
    ];
  },
  update(dt) {
    this.t += dt; LF.fx.update(dt); LF.ui.update(dt); this.pop.forEach(b => b.update(dt)); this.A.update(dt); this.B.update(dt);
    const d = Math.hypot(this.tx - this.ax, this.ty - this.ay);
    if (d > 4) { const sp = 420 * dt; this.ax += (this.tx - this.ax) / d * Math.min(sp, d); this.ay += (this.ty - this.ay) / d * Math.min(sp, d); this.A.play('run', { speed: 15 }); this.A.dir = this.tx < this.ax ? -1 : 1; }
    else { this.A.play(this.sel ? 'cheer' : 'idle'); if (this.pendSel) { this.sel = this.pendSel; this.pendSel = null; LF.sfx('click'); } }
  },
  draw(c) {
    const W = LF.W, H = LF.H, t = this.t, S = LF.save.data;
    if (!parkBG(c, t, { gy: 700, veil: .12, x: -1500 })) {
      c.fillStyle = G.lin(c, 0, 0, 0, H, ['#a9dcff', '#e3f4ff', '#fff0f7']); c.fillRect(0, 0, W, H);
    }
    const n = this.nodes;
    // 길
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = '#fff'; c.lineWidth = 34; c.beginPath(); n.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
    c.strokeStyle = '#ffc2d9'; c.lineWidth = 12; c.setLineDash([2, 26]); c.beginPath(); n.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke(); c.setLineDash([]);
    n.forEach(p => {
      const s = p.s, open = s.id <= S.unlocked, rec = S.stages[s.id] || {}, st = rec.stars || 0, cur = s.id === this.cur;
      const r = 40, bob = cur ? Math.sin(t * 4) * 4 : 0;
      c.save(); c.translate(p.x, p.y + bob);
      c.fillStyle = 'rgba(150,60,110,.2)'; c.beginPath(); c.ellipse(0, r * .9, r * .9, 10, 0, 0, TAU); c.fill();
      G.heart(c, 0, 0, r * 2.1); c.fillStyle = open ? (st ? G.lin(c, 0, -r, 0, r, ['#ffe680', '#ffb52e']) : G.lin(c, 0, -r, 0, r, ['#ffa6c9', '#ff5c98'])) : '#d2c9da'; c.fill(); c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke();
      G.text(c, open ? String(s.id) : '🔒', 0, -2, { size: open ? 34 : 26, color: '#fff', stroke: open ? (st ? '#e08e00' : '#3d6b55') : null, sw: 6 });
      for (let k = 0; k < 3; k++) { c.save(); c.translate((k - 1) * 22, r + 10); G.star(c, 0, 0, 10); c.fillStyle = k < st ? '#ffd54a' : 'rgba(255,255,255,.8)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = k < st ? '#e5a100' : '#d9cce2'; c.stroke(); c.restore(); }
      c.restore();
    });
    const last = n[n.length - 1];
    LF.shadow(c, last.x + 70, last.y + 30, 30); this.B.draw(c, last.x + 70, last.y + 28, 100, { dir: -1 });
    LF.shadow(c, this.ax, this.ay - 30, 26); this.A.draw(c, this.ax, this.ay - 32, 90);
    // 상단 바
    LF.panel(c, 20, 18, 560, 78, { r: 39 });
    G.text(c, '사랑 게이지', 120, 58, { size: 26, color: '#3d6b55' });
    const pct = LF.save.lovePct() / 100;
    c.fillStyle = '#ffe3ef'; G.rr(c, 210, 40, 290, 36, 18); c.fill();
    if (pct > 0) { c.fillStyle = G.lin(c, 210, 0, 500, 0, ['#ff9cc2', '#ff3d7a']); G.rr(c, 210, 40, Math.max(36, 290 * pct), 36, 18); c.fill(); }
    G.drawHeart(c, 210 + 290 * pct, 58, 48, '#ff3d7a', '#fff', 5);
    G.text(c, Math.round(pct * 100) + '%', 540, 58, { size: 28, color: '#3d6b55' });
    LF.panel(c, W - 420, 18, 400, 78, { r: 39 });
    LF.portrait(c, this.A, W - 372, 57, 28, true); G.text(c, '→', W - 320, 57, { size: 32, color: '#ff8fb8' }); LF.portrait(c, this.B, W - 268, 57, 28, true);
    G.text(c, `${LF.diff().name}  ⭐ ${LF.save.stars()}/30`, W - 135, 58, { size: 26, color: '#3f8a66' });
    LF.ui.draw(c); soundBtns(c);
    if (this.sel) this.drawPop(c);
  },
  drawPop(c) {
    const W = LF.W, H = LF.H, s = this.sel.s, rec = LF.save.data.stages[s.id] || {};
    c.fillStyle = 'rgba(70,20,50,.4)'; c.fillRect(0, 0, W, H);
    LF.panel(c, W / 2 - 360, 130, 720, 470, { r: 46 });
    G.text(c, `STAGE ${s.id}`, W / 2, 180, { size: 28, color: '#e089b0' });
    G.text(c, s.name, W / 2, 236, { size: 62, color: '#2f6b4f', stroke: '#fff', sw: 10 });
    G.wrap(c, s.desc, 600, 28).forEach((l, i) => G.text(c, l, W / 2, 300 + i * 38, { size: 28, color: '#2f4a3c' }));
    const NM = { run: '달리기', kiss: '뽀뽀', workout: '운동', cook: '요리', catch: '하트 받기', fish: '낚시', daily: '대화' };
    const items = s.flow.map(f => NM[f]);
    const tw = items.length * 130; items.forEach((nm, i) => { const x = W / 2 - tw / 2 + 65 + i * 130; c.fillStyle = '#fff0f7'; G.rr(c, x - 58, 382, 116, 46, 23); c.fill(); c.lineWidth = 3; c.strokeStyle = '#ffb3d1'; c.stroke(); G.text(c, nm, x, 406, { size: 24, color: '#3d6b55' }); if (i < items.length - 1) G.text(c, '›', x + 65, 404, { size: 30, color: '#ffb3d1' }); });
    for (let k = 0; k < 3; k++) { c.save(); c.translate(W / 2 - 50 + k * 50, 465); G.star(c, 0, 0, 20); c.fillStyle = k < (rec.stars || 0) ? '#ffd54a' : '#f0e4ee'; c.fill(); c.lineWidth = 3; c.strokeStyle = k < (rec.stars || 0) ? '#e5a100' : '#dccfdc'; c.stroke(); c.restore(); }
    if (rec.best) G.text(c, `최고 점수 ${rec.best}`, W / 2 + 200, 465, { size: 22, color: '#3f8a66' });
    this.pop.forEach(b => b.draw(c));
  },
  pointerdown(x, y) {
    if (soundHit(x, y)) return;
    if (this.sel) { LF.ui.down(x, y, this.pop); return; }
    if (LF.ui.down(x, y)) return;
    for (const n of this.nodes) if (Math.hypot(n.x - x, n.y - y) < 50) {
      if (n.s.id > LF.save.data.unlocked) { LF.sfx('miss'); LF.fx.text(n.x, n.y - 60, '아직 잠겨 있어요', { size: 26, stroke: '#3f8a66' }); return; }
      this.tx = n.x; this.ty = n.y; this.pendSel = n; LF.sfx('jump'); return;
    }
  },
  keydown(code) {
    if (code === 'Escape') { if (this.sel) this.sel = null; else LF.go('title'); return; }
    if (code === 'Enter' || code === 'Space') { if (this.sel) LF.flow.start(this.sel.s.id); else { const n = this.nodes[this.cur - 1]; this.tx = n.x; this.ty = n.y; this.pendSel = n; } }
  },
};

// ================= 결과 =================
LF.scenes.result = {
  enter(p) {
    const { stage, res } = p, S = LF.save.data; this.stage = stage; this.res = res; this.t = 0;
    const run = res.run, minis = res.minis.map(m => m.score), miniAvg = minis.length ? minis.reduce((a, b) => a + b, 0) / minis.length : null;
    this.love = run.pct * .6 + (run.lives / run.maxLives) * .2 + (miniAvg == null ? run.pct : miniAvg) * .2;
    this.stars = this.love >= .88 ? 3 : this.love >= .7 ? 2 : 1;
    this.rank = this.love >= .95 ? 'S' : this.love >= .85 ? 'A' : this.love >= .7 ? 'B' : 'C';
    this.score = run.score + Math.round((miniAvg || 0) * 1000);
    this.miniAvg = miniAvg;
    const rec = S.stages[stage.id] || {}; this.newBest = !rec.best || this.score > rec.best;
    S.stages[stage.id] = { stars: Math.max(rec.stars || 0, this.stars), best: Math.max(rec.best || 0, this.score) };
    if (stage.id < LF.STAGES.length) S.unlocked = Math.max(S.unlocked, stage.id + 1);
    S.plays++; LF.save.write();
    this.A = new LF.Actor(LF.P()); this.B = new LF.Actor(LF.Q()); this.A.play('cheer'); this.B.play('cheer'); this.B.dir = -1;
    this.shown = 0; LF.audio.music('end'); LF.sfx('win');
    const final = stage.id === LF.STAGES.length, W = LF.W;
    LF.ui.add({ x: W / 2 + 230, y: 650, w: 320, h: 80, label: final ? '엔딩 보기' : '다음 스테이지', size: 36, color: 'green', pulse: true, onClick: () => final ? LF.go('ending') : LF.flow.start(stage.id + 1) });
    LF.ui.add({ x: W / 2 - 40, y: 650, w: 200, h: 80, label: '다시하기', size: 34, color: 'white', onClick: () => LF.flow.start(stage.id) });
    LF.ui.add({ x: W / 2 - 250, y: 650, w: 200, h: 80, label: '지도', size: 34, color: 'white', onClick: () => LF.go('map') });
  },
  update(dt) {
    this.t += dt; LF.fx.update(dt); LF.ui.update(dt); this.A.update(dt); this.B.update(dt);
    if (this.shown < this.stars && this.t > 1 + this.shown * .55) { this.shown++; LF.sfx('star'); const x = LF.W / 2 + 120 + (this.shown - 2) * 110; LF.fx.stars(x, 210, 16); LF.fx.ring(x, 210, '#ffd54a', 30); }
    if (this.t > .3 && this.t - dt <= .3) LF.fx.confetti(LF.W / 2, 100, 80);
    if (this.t > 1 + this.stars * .55 + .3 && !this.rankShown) { this.rankShown = true; LF.sfx('perfect'); LF.shake(8); }
  },
  draw(c) {
    const W = LF.W, t = this.t;
    parkBG(c, t, { veil: .25, x: 1500 });
    LF.fx.draw(c);
    LF.panel(c, 70, 40, 1140, 560, { r: 50 });
    G.text(c, 'STAGE CLEAR!', W / 2 + 120, 105, { size: 68, color: '#2f6b4f', stroke: '#fff', sw: 14 });
    G.text(c, this.stage.name, W / 2 + 120, 160, { size: 30, color: '#8a9a8f' });
    for (let i = 0; i < 3; i++) {
      const on = i < this.shown, k = on ? ease.back(clamp((t - (1 + i * .55)) / .4, 0, 1)) : 1, x = W / 2 + 120 + (i - 1) * 110;
      c.save(); c.translate(x, 225 + (i === 1 ? -14 : 0)); c.scale(k, k); c.rotate((i - 1) * .12);
      G.star(c, 0, 0, 50); c.fillStyle = on ? G.lin(c, 0, -50, 0, 50, ['#fff2a0', '#ffc22e']) : '#efe6ee'; c.fill(); c.lineWidth = 7; c.strokeStyle = on ? '#fff' : '#e2d6e0'; c.stroke(); c.restore();
    }
    // 캐릭터
    LF.shadow(c, 220, 540, 50); LF.shadow(c, 380, 540, 50);
    this.A.draw(c, 230, 538, 170, { dir: 1 }); this.B.draw(c, 370, 538, 170, { dir: -1 });
    // 랭크
    if (this.rankShown) { const e = ease.elastic(clamp((t - 1 - this.stars * .55 - .3) / .8, 0, 1)); c.save(); c.translate(300, 200); c.scale(e, e); c.rotate(-.15); G.text(c, this.rank, 0, 0, { size: 150, color: G.lin(c, 0, -70, 0, 70, ['#ffe680', '#ff8a3c']), stroke: '#fff', sw: 18 }); c.restore(); G.text(c, 'RANK', 300, 300, { size: 26, color: '#8a9a8f', alpha: e }); }
    const run = this.res.run;
    const rows = [['하트 수집', Math.round(run.pct * 100) + '%'], ['남은 목숨', '♥'.repeat(run.lives) + '♡'.repeat(run.maxLives - run.lives)], ['최대 콤보', run.maxCombo + ' 콤보']];
    if (this.miniAvg != null) rows.push(['미니게임', Math.round(this.miniAvg * 100) + '%']);
    rows.push(['총점', String(this.score)]);
    rows.forEach((r, i) => { const y = 315 + i * 52, k = clamp((t - .5 - i * .12) / .3, 0, 1); c.globalAlpha = k;
      G.text(c, r[0], 600, y, { size: 30, color: '#2f4a3c', align: 'left' }); G.text(c, r[1], 1110, y, { size: 32, color: i === rows.length - 1 ? '#2f6b4f' : '#3d6b55', align: 'right' });
      c.strokeStyle = '#ffd1e3'; c.lineWidth = 2; c.setLineDash([4, 8]); c.beginPath(); c.moveTo(600, y + 22); c.lineTo(1110, y + 22); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; });
    if (this.newBest && t > 2) G.text(c, '✨ 최고 기록!', 1060, 160, { size: 28, color: '#e08e00', stroke: '#fff', sw: 6 });
    LF.ui.draw(c); soundBtns(c);
  },
  pointerdown(x, y) { if (soundHit(x, y)) return; if (this.t > .8) LF.ui.down(x, y); },
  keydown(code) { if (this.t > .8 && (code === 'Enter' || code === 'Space')) LF.ui.btns[0].onClick(); if (code === 'Escape') LF.go('map'); },
};

// ================= 엔딩 =================
LF.scenes.ending = {
  enter() {
    this.t = 0; this.i = 0; this.ct = 0; this.pct = LF.save.lovePct();
    this.tier = this.pct >= 80 ? 'A' : this.pct >= 50 ? 'B' : 'C';
    this.A = new LF.Actor(LF.P()); this.B = new LF.Actor(LF.Q()); this.B.dir = -1;
    const T = {
      A: { title: '완전한 사랑 엔딩', slides: [
        { who: 'P', text: '{Q}! 여기까지 달려왔어!', a: 'run', b: 'surprise', d: 520 },
        { who: 'Q', text: '{P}… 이 많은 하트를 전부 나한테…?', a: 'give', b: 'shy', d: 300 },
        { who: 'P', text: '응. 내 마음 전부야. 받아줄래?', a: 'shy', b: 'shy', d: 220 },
        { who: 'Q', text: '당연하지! 나도 정말 정말 사랑해!', a: 'cheer', b: 'cheer', d: 180 },
        { who: '', text: '두 사람은 오래오래 행복했답니다 ♥', a: 'kiss', b: 'kiss', d: 226 }] },
      B: { title: '따뜻한 사랑 엔딩', slides: [
        { who: 'P', text: '{Q}, 조금 늦었지만… 하트 받아줘!', a: 'give', b: 'surprise', d: 400 },
        { who: 'Q', text: '헤헤, 조금 모자라도 괜찮아. 마음이 중요한 거니까!', a: 'shy', b: 'shy', d: 260 },
        { who: '', text: '두 사람은 손을 꼭 잡았어요 ♥', a: 'kiss', b: 'kiss', d: 226 }] },
      C: { title: '사랑의 씨앗 엔딩', slides: [
        { who: 'Q', text: '{P}, 넘어져도 끝까지 와줬구나.', a: 'sad', b: 'idle', d: 420 },
        { who: 'P', text: '다음엔 더 큰 하트를 가져올게!', a: 'cheer', b: 'shy', d: 300 },
        { who: '', text: '사랑은 이제부터 시작! (별을 더 모아보세요)', a: 'dance', b: 'dance', d: 220 }] },
    }[this.tier];
    this.T = T; this.apply(); LF.audio.music('end');
    LF.ui.add({ x: LF.W / 2 - 160, y: 650, w: 280, h: 80, label: '지도로', size: 36, color: 'green', visible: false, onClick: () => LF.go('map') });
    LF.ui.add({ x: LF.W / 2 + 160, y: 650, w: 280, h: 80, label: '처음으로', size: 36, color: 'white', visible: false, onClick: () => LF.go('title') });
  },
  apply() { const s = this.T.slides[Math.min(this.i, this.T.slides.length - 1)]; this.A.play(s.a); this.B.play(s.b); this.tdist = s.d; if (this.dist == null) this.dist = 700; },
  next() {
    if (this.i < this.T.slides.length) { this.i++; this.ct = 0; LF.sfx('click'); if (this.i < this.T.slides.length) this.apply(); else { this.A.play('kiss'); this.B.play('kiss'); LF.sfx('win'); LF.fx.confetti(LF.W / 2, 80, 100); LF.ui.btns.forEach(b => b.visible = true); } if (this.i >= this.T.slides.length - 1) { LF.fx.hearts(LF.W / 2, 330, 30, { speed: 420 }); LF.sfx('kiss'); } }
  },
  update(dt) {
    this.t += dt; this.ct += dt; LF.fx.update(dt); LF.ui.update(dt); this.A.update(dt); this.B.update(dt);
    this.dist = damp(this.dist, this.tdist, 2.5, dt);
    if (this.i >= this.T.slides.length - 1 && Math.random() < dt * 4) { const x = rand(100, LF.W - 100); LF.fx.hearts(x, rand(80, 300), 4, { speed: 240 }); LF.fx.stars(x, rand(80, 300), 3); }
  },
  draw(c) {
    const W = LF.W, H = LF.H, t = this.t, end = this.i >= this.T.slides.length;
    parkBG(c, t, { theme: 'final', gy: end ? 560 : 470, cols: end ? ['#ffb3d6', '#ffe6f2', '#e9dcff'] : ['#ffd3e8', '#fff2f8', '#efe6ff'] });
    LF.fx.draw(c);
    const cx = W / 2, gy = end ? 560 : 470, s = end ? 230 : 250;
    LF.shadow(c, cx - this.dist / 2, gy + 4, 60); LF.shadow(c, cx + this.dist / 2, gy + 4, 60);
    if (this.tdist === 226 && this.dist < 248) LF.drawEmbrace(c, this.A, this.B, cx - this.dist / 2, cx + this.dist / 2, gy + 2, s, s); // 마지막 뽀뽀: 서로 안은 채로
    else { this.A.draw(c, cx - this.dist / 2, gy + 2, s, { dir: 1 }); this.B.draw(c, cx + this.dist / 2, gy + 2, s, { dir: -1 }); }
    if (this.tdist === 226 && this.dist < 248) G.drawHeart(c, cx, gy - s * 1.15 + Math.sin(t * 4) * 8, 70 + Math.sin(t * 8) * 6, '#ff3d7a', '#fff', 6);
    if (!end) {
      const sl = this.T.slides[this.i], full = LF.fmt(sl.text), n = Math.min(full.length, Math.floor(this.ct * 26));
      LF.panel(c, 120, 520, 1040, 170, { r: 40, fill: 'rgba(255,255,255,.96)' });
      if (sl.who) { const nm = sl.who === 'P' ? LF.pn() : LF.qn(); G.rr(c, 150, 496, 200, 50, 25); c.fillStyle = '#ff6fa5'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#fff'; c.stroke(); G.text(c, nm, 250, 522, { size: 28, color: '#fff' }); }
      G.wrap(c, full.slice(0, n), 960, 36).forEach((l, i) => G.text(c, l, 160, 590 + i * 46, { size: 36, color: '#2f4a3c', align: 'left' }));
      if (n >= full.length) G.text(c, '▶', 1120, 660 + Math.sin(t * 6) * 4, { size: 28, color: '#ff6fa5' });
    } else {
      const e = ease.back(clamp(this.ct / .7, 0, 1));
      c.save(); c.translate(W / 2, 110); c.scale(e, e);
      G.text(c, 'THE END', 0, 0, { size: 110, color: '#fff', stroke: '#2f6b4f', sw: 22 });
      c.restore();
      G.text(c, LF.fmt('{P가} {Q}의 사랑을 쟁취했어요!'), W / 2, 200, { size: 44, color: '#3d6b55', stroke: '#fff', sw: 10, alpha: e });
      G.text(c, `${this.T.title}  ·  사랑 게이지 ${this.pct}%`, W / 2, 255, { size: 28, color: '#3f8a66', stroke: '#fff', sw: 6, alpha: e });
      LF.ui.draw(c);
    }
    soundBtns(c);
  },
  pointerdown(x, y) {
    if (soundHit(x, y)) return;
    if (this.i >= this.T.slides.length) { if (this.ct > .8) LF.ui.down(x, y); return; }
    const full = LF.fmt(this.T.slides[this.i].text);
    if (this.ct * 26 < full.length) this.ct = full.length / 26; else this.next();
  },
  keydown(code) { if (code === 'Space' || code === 'Enter') this.pointerdown(-1, -1); },
};
