'use strict';
// 미니게임 6종: 뽀뽀 · 운동(2레인 리듬) · 요리(기억력+오븐) · 하트 받기 · 낚시 · 대화
LF.grade = s => s >= .9 ? ['완벽해요!', 3] : s >= .65 ? ['좋아요!', 2] : s >= .4 ? ['아쉬워요', 1] : ['다시 해볼까?', 0];

const MINI_BACK = { x: 70, y: 70, r: 40 }; // 인트로 화면의 뒤로가기 버튼

LF.makeMini = def => {
  const S = {
    enter(p) {
      this.p = p; this.st = p.stage; this.th = LF.THEMES[def.theme || this.st.theme]; this.D = LF.diff();
      this.state = 'intro'; this.t = 0; this.pt = 0; this.score = 0; this.doneT = 0;
      this.A = new LF.Actor(LF.P()); this.B = new LF.Actor(LF.Q());
      LF.audio.music('mini');
      LF.scene3d('mini_' + (def.theme || this.st.theme), { theme: def.theme || this.st.theme, len: 8000, x0: -4000, seed: 11 });
      this.startBtn = new LF.Button({ x: LF.W / 2, y: 522, w: 300, h: 84, label: '시작!', size: 40, color: 'green', pulse: true, onClick: () => this.begin() });
      this.nextBtn = new LF.Button({ x: LF.W / 2, y: 560, w: 300, h: 84, label: '계속하기', size: 38, color: 'green', pulse: true, onClick: () => LF.flow.miniDone(def.kind, this.score) });
      this.retryBtn = new LF.Button({ x: LF.W / 2, y: 560, w: 300, h: 84, label: '다시 하기', size: 38, color: 'white', onClick: () => LF.go('mg_' + def.kind, { stage: this.st }) });
      def.init.call(this, p);
    },
    begin() { if (this.state !== 'intro') return; this.state = 'play'; this.pt = 0; LF.sfx('go'); def.begin && def.begin.call(this); },
    finish(score) {
      if (this.state === 'done') return; this.score = clamp(score, 0, 1); this.state = 'done'; this.doneT = 0;
      this.reward = def.reward ? def.reward(this.score) : '';
      setTimeout(() => { if (LF.cur === this) { LF.sfx(this.score >= .65 ? 'win' : 'good'); LF.fx.confetti(LF.W / 2, 150, this.score >= .65 ? 70 : 15); } }, 900);
    },
    update(dt) {
      this.t += dt; LF.fx.update(dt); this.startBtn.update(dt); this.nextBtn.update(dt); this.retryBtn.update(dt);
      this.A.update(dt); this.B.update(dt);
      if (this.state === 'play') { this.pt += dt; def.update.call(this, dt); }
      else { if (this.state === 'done') this.doneT += dt; def.idle && def.idle.call(this, dt); }
    },
    draw(c) {
      const W = LF.W, H = LF.H;
      c.save(); if (LF.cam.shake > .5) c.translate(rand(-1, 1) * LF.cam.shake, rand(-1, 1) * LF.cam.shake);
      if (def.bg) def.bg.call(this, c); else if (!LF.view3d(this.t * 25 - 640, LF.GY)) { LF.drawBG(c, this.th, this.t * 20, this.t); LF.drawGround(c, this.th, this.t * 20, []); }
      def.draw.call(this, c);
      LF.fx.draw(c); LF.fx.drawTexts(c);
      c.restore();
      if (this.state === 'intro') {
        c.fillStyle = 'rgba(70,20,50,.35)'; c.fillRect(-LF.ox, 0, LF.VW, H);
        LF.panel(c, W / 2 - 420, 70, 840, 560, { r: 46 });
        G.text(c, def.title, W / 2, 140, { size: 60, color: '#2f6b4f', stroke: '#fff', sw: 12 });
        G.text(c, `STAGE ${this.st.id} · ${this.st.name}`, W / 2, 196, { size: 24, color: '#8a9a8f' });
        def.how.forEach((l, i) => G.text(c, LF.fmt(l), W / 2, 262 + i * 46, { size: 30, color: '#2f4a3c' }));
        LF.shadow(c, W / 2 - 300, 490, 40); this.A.draw(c, W / 2 - 300, 490, 130, { dir: 1 });
        LF.shadow(c, W / 2 + 300, 490, 40); this.B.draw(c, W / 2 + 300, 490, 130, { dir: -1 });
        if (this.state === 'intro') { this.A.play('wave'); this.B.play('idle'); }
        this.startBtn.draw(c);
        G.text(c, LF.touch ? '화면을 터치해 시작' : '스페이스 / 클릭으로 시작', W / 2, 600, { size: 20, color: '#8a9a8f' });
        // 뒤로가기 (터치에는 Esc가 없으니 화면에 버튼을 둔다)
        c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.arc(MINI_BACK.x, MINI_BACK.y, MINI_BACK.r, 0, TAU); c.fill(); c.lineWidth = 4; c.strokeStyle = '#ffb3d1'; c.stroke();
        c.strokeStyle = '#ff6fa5'; c.lineWidth = 8; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(MINI_BACK.x + 8, MINI_BACK.y - 16); c.lineTo(MINI_BACK.x - 8, MINI_BACK.y); c.lineTo(MINI_BACK.x + 8, MINI_BACK.y + 16); c.stroke();
      }
      if (this.state === 'done' && this.doneT > 1.1) {
        const e = ease.back(clamp((this.doneT - 1.1) / .5, 0, 1)), [msg, st] = LF.grade(this.score);
        c.fillStyle = `rgba(70,20,50,${.4 * Math.min(1, e)})`; c.fillRect(-LF.ox, 0, LF.VW, H);
        c.save(); c.translate(W / 2, H / 2 - 20); c.scale(e, e);
        LF.panel(c, -360, -250, 720, 470, { r: 46 });
        G.text(c, msg, 0, -185, { size: 62, color: '#2f6b4f', stroke: '#fff', sw: 12 });
        for (let i = 0; i < 3; i++) { const on = i < st; c.save(); c.translate((i - 1) * 100, -90 + (i === 1 ? -12 : 0)); if (on) c.rotate(Math.sin(this.t * 3 + i) * .08); G.drawHeart(c, 0, 0, 84, on ? '#ff4d84' : '#eadde6', '#fff', 6, on); c.restore(); }
        G.text(c, `성공도 ${Math.round(this.score * 100)}%`, 0, 10, { size: 40, color: '#3d6b55' });
        if (this.reward) G.text(c, this.reward, 0, 70, { size: 30, color: '#e08e00' });
        c.restore();
        this.nextBtn.y = H / 2 + 140; this.retryBtn.y = H / 2 + 140;
        if (this.score < .65) { this.nextBtn.x = W / 2 + 165; this.retryBtn.x = W / 2 - 165; this.retryBtn.draw(c); } else this.nextBtn.x = W / 2;
        this.nextBtn.draw(c);
      }
    },
    pointerdown(x, y, id) {
      if (this.state === 'intro') { if (Math.hypot(x - MINI_BACK.x, y - MINI_BACK.y) < MINI_BACK.r + 16) { LF.sfx('click'); LF.go('map'); } else this.begin(); return; }
      if (this.state === 'play') { def.press && def.press.call(this, x, y, id); return; }
      if (this.state === 'done' && this.doneT > 1.4) LF.ui.down(x, y, this.score < .65 ? [this.nextBtn, this.retryBtn] : [this.nextBtn]);
    },
    pointermove(x, y, id) { if (this.state === 'play' && def.move) def.move.call(this, x, y, id); },
    pointerup(x, y, id) { if (this.state === 'play' && def.release) def.release.call(this, x, y, id); },
    keydown(code) {
      if (code === 'Escape') { LF.go('map'); return; }
      if (this.state === 'intro' && (code === 'Space' || code === 'Enter')) { this.begin(); return; }
      if (this.state === 'play') { if (def.key) def.key.call(this, code, true); else if (code === 'Space' || code === 'Enter') def.press.call(this, null, null); return; }
      if (this.state === 'done' && this.doneT > 1.4 && (code === 'Space' || code === 'Enter')) LF.flow.miniDone(def.kind, this.score);
      if (this.state === 'done' && this.doneT > 1.4 && code === 'KeyR' && this.score < .65) LF.go('mg_' + def.kind, { stage: this.st });
    },
    keyup(code) { if (this.state === 'play' && def.key) def.key.call(this, code, false); },
  };
  for (const k of Object.keys(def)) if (!(k in S)) S[k] = def[k];
  return S;
};

// ================= 뽀뽀 =================
LF.scenes.mg_kiss = LF.makeMini({
  kind: 'kiss', title: '두근두근 뽀뽀',
  how: ['빙글빙글 도는 하트가 금빛 구간에 들어올 때 탭!', '구간은 점점 작아지고 빨라져요', '5번 중 3번 이상 성공하면 쪽♡'],
  init() { this.round = 0; this.N = 5; this.acc = []; this.dist = 520; this.ang = 0; this.lock = 0; this.res = null; this.kissed = false; this.setRound(); this.A.play('idle'); this.B.play('idle'); },
  setRound() {
    const w = this.D.window, r = this.round;
    this.zw = [.95, .8, .68, .58, .5][r] * w; this.zc = rand(0, TAU); this.spd = [2.6, 3, 3.5, 4, 4.6][r] * (r % 2 ? -1 : 1);
  },
  // ---- 뽀뽀 성공 연출 타임라인(초): 다가감 → 수줍게 기울임 → 쪽! (화면이 확대되어 입맞춤이 크게 보임) → 여운 ----
  KT: { walk: 1.5, lean: .9, kiss: 2.4, end: 4.9 },
  kissStep(dt) {
    if (!this.kissed) return;
    const K = this.KT, k0 = this.kt; this.kt += dt; const k1 = this.kt;
    if (k0 < K.walk && k1 >= K.walk) { this.A.play('shy'); this.B.play('shy'); LF.sfx('good'); LF.fx.hearts(LF.W / 2, 330, 8, { speed: 200 }); }
    if (k0 < K.walk + K.lean && k1 >= K.walk + K.lean) { // 쪽!
      this.A.play('kiss'); this.B.play('kiss'); LF.sfx('kiss'); LF.flash(.45, '#ffe3f0'); LF.shake(6);
      LF.fx.hearts(LF.W / 2, LF.GY - 190, 36, { speed: 420, size: 30 }); LF.fx.stars(LF.W / 2, LF.GY - 160, 22); LF.fx.ring(LF.W / 2, LF.GY - 140, '#ff8fb8', 40, .6);
    }
    if (k0 < K.kiss + .5 && k1 >= K.kiss + .5) { LF.sfx('win'); LF.fx.hearts(LF.W / 2, LF.GY - 200, 26, { speed: 300 }); }
  },
  update(dt) {
    this.kissStep(dt);
    if (this.lock > 0) { this.lock -= dt; if (this.lock <= 0 && this.round < this.N) this.setRound(); return; }
    if (this.round < this.N) this.ang += this.spd * dt;
  },
  press() {
    if (this.lock > 0 || this.round >= this.N) return;
    const d = Math.abs(Math.atan2(Math.sin(this.ang - this.zc), Math.cos(this.ang - this.zc))); // 구간 중심과의 각도 차 (예전엔 이 값이 뒤집혀 구간 안에서 누르면 실패였음)
    let a = 0; if (d < this.zw / 2) a = d < this.zw * .15 ? 1 : 1 - (d / (this.zw / 2)) * .5;
    this.acc.push(a); this.round++; this.lock = .85;
    const cx = LF.W / 2, cy = 300;
    if (a > 0) { this.dist -= 85; LF.sfx(a >= .95 ? 'perfect' : 'good'); LF.fx.hearts(cx, cy, 8 + a * 10); LF.fx.text(cx, cy - 140, a >= .95 ? 'PERFECT!' : 'GOOD!', { size: 56, stroke: '#2f6b4f' }); this.A.setMood('happy', 'smile', .8); this.B.play('shy'); setTimeout(() => this.B.anim === 'shy' && !this.kissed && this.B.play('idle'), 700); }
    else { this.dist = Math.min(560, this.dist + 30); LF.sfx('miss'); LF.shake(8); LF.fx.text(cx, cy - 140, 'MISS…', { size: 52, stroke: '#3f8a66' }); this.B.play('pout'); setTimeout(() => !this.kissed && this.B.play('idle'), 700); }
    if (this.round >= this.N) setTimeout(() => this.end(), 800);
  },
  end() {
    const hits = this.acc.filter(a => a > 0).length, avg = this.acc.reduce((a, b) => a + b, 0) / this.N;
    if (hits >= 3) { this.kissed = true; this.kt = 0; this.kreal = this.dist; this.kdist0 = Math.max(this.dist, 340); this.A.play('walk', { speed: 12 }); this.B.play('walk', { speed: 12 }); }
    else { this.B.play('sad'); this.A.play('sad'); }
    setTimeout(() => this.finish(hits >= 3 ? avg : avg * .6), hits >= 3 ? this.KT.end * 1000 : 1600);
  },
  reward: s => s >= .65 ? '💖 사랑이 폭발했어요!' : '',
  // 성공 연출: 다가옴 → 기울임 → 쪽!(확대 + 비네트 + 큰 하트와 글자)
  drawKiss(c) {
    const W = LF.W, GY = LF.GY, K = this.KT, kt = this.kt, t = this.t, kissAt = K.walk + K.lean;
    const mid = Math.min(this.kdist0 || 520, 262), dWalk = lerp(this.kdist0 || 520, mid, ease.inOut(clamp(kt / K.walk, 0, 1))), dLean = lerp(mid, 226, ease.inOut(clamp((kt - K.walk) / K.lean, 0, 1)));
    const dStart = lerp(this.kreal || 520, this.kdist0 || 520, ease.out(clamp(kt / .35, 0, 1))), wk = clamp((kt - .35) / (K.walk - .35), 0, 1), dW2 = lerp(dStart, mid, ease.inOut(wk)), d = kt < .35 ? dStart : kt < K.walk ? dW2 : dLean, ax = W / 2 - d / 2, bx = W / 2 + d / 2;
    // 입맞춘 뒤에는 입술 쪽으로 서서히 확대
    const zk = ease.out(clamp((kt - kissAt) / .7, 0, 1)) * (1 - ease.in(clamp((kt - (K.end - .9)) / .9, 0, 1))), Z = 1 + .95 * zk, fx = W / 2, fy = GY - 150;
    c.save(); c.translate(fx, fy); c.scale(Z, Z); c.translate(-fx, -fy + zk * 30);
    LF.shadow(c, ax, GY + 4, 52); LF.shadow(c, bx, GY + 4, 52);
    const lift = kt >= kissAt ? Math.abs(Math.sin((kt - kissAt) * 5)) * 4 : 0; // 입 맞춘 뒤 설레서 살짝 콩콩
    if (kt >= kissAt) LF.drawEmbrace(c, this.A, this.B, ax, bx, GY + 2 - lift, 220, 220); // 쪽! 서로 안은 채로
    else { this.A.draw(c, ax, GY + 2 - lift, 220, { dir: 1 }); this.B.draw(c, bx, GY + 2 - lift, 220, { dir: -1 }); }
    c.restore();
    if (kt >= kissAt) {
      // 가장자리가 분홍으로 어두워지는 비네트 (눈이 입맞춤으로 모이게)
      const g = c.createRadialGradient(fx, fy, 160, fx, fy, 760); g.addColorStop(0, 'rgba(255,170,200,0)'); g.addColorStop(1, `rgba(150,40,90,${.5 * zk})`); c.fillStyle = g; c.fillRect(-LF.ox, 0, LF.VW, LF.H);
      // 머리 위에 큰 하트가 톡 튀어나와 두근두근
      const pk = ease.back(clamp((kt - kissAt) / .45, 0, 1)), hs = 120 * pk * (1 + .06 * Math.sin(t * 9));
      G.glow(c, W / 2, fy - 150, hs * 1.2, 'rgba(255,130,170,.45)'); G.drawHeart(c, W / 2, fy - 150 - Math.sin(t * 3) * 6, hs, '#ff3d6e', '#fff', 7);
      // 글자
      if (kt > kissAt + .25) { const e = ease.back(clamp((kt - kissAt - .25) / .4, 0, 1)); c.save(); c.translate(W / 2, 98 + Math.sin(t * 6) * 4); c.scale(e, e); G.text(c, '쪽♡', 0, 0, { size: 112, color: '#fff', stroke: '#e0457f', sw: 22 }); c.restore(); }
      if (kt > K.kiss) G.text(c, '사랑이 폭발했어요!', W / 2, 190, { size: 40, color: '#fff', stroke: '#2f6b4f', sw: 10, alpha: clamp((kt - K.kiss) / .4, 0, 1) });
    } else if (kt > K.walk) G.text(c, '두근두근…', W / 2, 160, { size: 54, color: '#fff', stroke: '#e0457f', sw: 12, alpha: clamp((kt - K.walk) / .3, 0, 1) });
    else if (kt > .2) G.text(c, '서로에게 다가가요…', W / 2, 160, { size: 40, color: '#fff', stroke: '#2f6b4f', sw: 10, alpha: clamp((kt - .2) / .4, 0, 1) });
  },
  draw(c) {
    const W = LF.W, GY = LF.GY, t = this.t;
    if (this.kissed) { this.drawKiss(c); return; }
    const d = this.dist, ax = W / 2 - d / 2, bx = W / 2 + d / 2;
    LF.shadow(c, ax, GY + 4, 52); LF.shadow(c, bx, GY + 4, 52);
    this.A.draw(c, ax, GY + 2, 220, { dir: 1 }); this.B.draw(c, bx, GY + 2, 220, { dir: -1 });
    if (this.state !== 'play' || this.round >= this.N) return;
    // 링 게이지
    const cx = W / 2, cy = 240, R = 110;
    c.save();
    c.lineWidth = 26; c.strokeStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
    c.strokeStyle = G.lin(c, cx - R, 0, cx + R, 0, ['#ffe680', '#ffb52e']); c.lineCap = 'round';
    c.beginPath(); c.arc(cx, cy, R, this.zc - this.zw / 2, this.zc + this.zw / 2); c.stroke();
    c.lineWidth = 4; c.strokeStyle = '#ff9cc2'; c.beginPath(); c.arc(cx, cy, R + 15, 0, TAU); c.stroke(); c.beginPath(); c.arc(cx, cy, R - 15, 0, TAU); c.stroke();
    const hx = cx + Math.cos(this.ang) * R, hy = cy + Math.sin(this.ang) * R;
    c.strokeStyle = 'rgba(255,77,136,.4)'; c.lineWidth = 6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(hx, hy); c.stroke();
    const dd = Math.abs(Math.atan2(Math.sin(this.ang - this.zc), Math.cos(this.ang - this.zc))), inZone = dd < this.zw / 2 && this.lock <= 0;
    if (inZone) { G.glow(c, hx, hy, 70, 'rgba(255,230,120,.9)'); G.text(c, '지금!', cx, cy - R - 52, { size: 40, color: '#fff', stroke: '#e08e00', sw: 9 }); }
    G.drawHeart(c, hx, hy, inZone ? 58 : 50, '#ff3d7a', '#fff', 5);
    G.drawHeart(c, cx, cy, 70 + Math.sin(t * 8) * 6, '#ff8fb8', '#fff', 5);
    G.text(c, `${this.round + 1}/${this.N}`, cx, cy + 6, { size: 26, color: '#fff' });
    c.restore();
    for (let i = 0; i < this.N; i++) { const a = this.acc[i]; G.drawHeart(c, W / 2 - 120 + i * 60, 660, 40, a == null ? 'rgba(255,255,255,.7)' : a > 0 ? '#ff4d84' : '#b9a6d9', '#fff', 3, a > 0); }
  },
});

// ================= 운동: 2레인 리듬 =================
LF.scenes.mg_workout = LF.makeMini({
  kind: 'workout', title: '러브 짐 리듬 운동', theme: 'gym',
  how: ['내려오는 하트가 선에 닿을 때 맞는 쪽을 눌러요', '← / A : 왼쪽     → / D : 오른쪽   (터치: 화면 좌우)', '잘하면 다음 달리기에서 목숨 +1!'],
  init() {
    const bpm = 118, beat = 60 / bpm, r = rng(this.st.id * 31);
    this.notes = []; let tt = 2;
    const pat = [[0], [1], [0], [1], [0, 1], [], [0], [0], [1], [1], [0], [1], [0, 1], [], [1], [0]];
    for (let bar = 0; bar < 4; bar++) for (let i = 0; i < 16; i += 1) {
      const step = pat[(i + bar * 3) % pat.length];
      if (i % 2 === 1 && r() > .25 + bar * .15) { tt += beat / 2; continue; }
      for (const lane of step) this.notes.push({ t: tt, lane, hit: null });
      tt += beat / 2;
    }
    this.N = this.notes.length; this.endT = tt + 1.2; this.lift = 0; this.combo = 0; this.flashL = [0, 0];
    this.A.play('lift', { k: 0 }); this.B.play('idle');
  },
  update(dt) {
    this.lift = Math.max(0, this.lift - dt * 3); this.A.opt.k = this.lift; this.A.play('lift', this.A.opt);
    this.flashL = this.flashL.map(f => Math.max(0, f - dt * 4));
    const ok = .19 * this.D.window;
    for (const n of this.notes) if (n.hit == null && this.pt > n.t + ok) { n.hit = 0; this.combo = 0; LF.sfx('miss'); LF.fx.text(n.lane ? 820 : 460, 520, 'MISS', { size: 34, stroke: '#3f8a66', color: '#e8e0ff' }); this.B.play('idle'); }
    if (this.pt > this.endT) this.finish(this.notes.reduce((a, n) => a + (n.hit || 0), 0) / this.N);
  },
  hitLane(lane) {
    this.flashL[lane] = 1; const w = this.D.window;
    let best = null; for (const n of this.notes) if (n.hit == null && n.lane === lane && Math.abs(n.t - this.pt) < .2 * w && (!best || n.t < best.t)) best = n;
    if (!best) return;
    const d = Math.abs(best.t - this.pt), x = lane ? 820 : 460;
    best.hit = d < .06 * w ? 1 : d < .12 * w ? .7 : .4; this.combo++; this.lift = 1;
    LF.sfx(best.hit === 1 ? 'perfect' : 'good'); LF.fx.text(x, 500, best.hit === 1 ? 'PERFECT' : best.hit > .5 ? 'GOOD' : 'OK', { size: 36, stroke: '#2f6b4f' }); LF.fx.ring(x, 580, '#ffd54a', 30);
    if (this.combo % 8 === 0) { this.B.play('cheer'); LF.fx.hearts(1040, 380, 8); }
  },
  key(code, on) { if (!on) return; if (code === 'ArrowLeft' || code === 'KeyA' || code === 'KeyF') this.hitLane(0); if (code === 'ArrowRight' || code === 'KeyD' || code === 'KeyJ') this.hitLane(1); },
  press(x) { if (x == null) return; this.hitLane(x < LF.W / 2 ? 0 : 1); },
  reward: s => s >= .6 ? '💪 다음 달리기 목숨 +1!' : '',
  draw(c) {
    const W = LF.W, GY = LF.GY, t = this.t;
    LF.shadow(c, 200, GY + 4, 60); this.A.draw(c, 200, GY + 2, 220, { dir: 1 });
    // 역기: 캐릭터의 실제 손 위치(어깨+팔 각도)를 따라가게 그림 → 손에 쥐고 있고, 힘줄수록 팔과 함께 올라감
    { const A = this.A, p = A.p, C = A.C, S = C.sho, k = 220, fy = GY + 2;
      const hy = (S.y + S.len * p.armLen * Math.cos(p.armF)) * p.sy + p.bob, hx = (S.x + S.len * p.armLen * Math.sin(p.armF)) * p.sx;
      const barY = fy + hy * k - 4, half = Math.max(70, hx * k + 22), cx = 200;
      c.lineCap = 'round'; c.strokeStyle = '#4b2b1f'; c.lineWidth = 16; c.beginPath(); c.moveTo(cx - half - 26, barY); c.lineTo(cx + half + 26, barY); c.stroke();
      c.strokeStyle = '#9aa0b5'; c.lineWidth = 9; c.beginPath(); c.moveTo(cx - half - 26, barY); c.lineTo(cx + half + 26, barY); c.stroke();
      for (const sd of [-1, 1]) { const x = cx + sd * (half + 22); G.rr(c, x - 14, barY - 38, 28, 76, 10); c.fillStyle = '#a98bd8'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#4b2b1f'; c.stroke(); G.rr(c, x - 6 - sd * 4, barY - 24, 12, 48, 6); c.fillStyle = '#8f70c4'; c.fill(); }
    }
    LF.shadow(c, 1100, GY + 4, 55); this.B.draw(c, 1100, GY + 2, 190, { dir: -1 });
    if (this.B.anim === 'cheer') G.text(c, '파이팅!!', 1100, 330, { size: 36, color: '#fff', stroke: '#2f6b4f', sw: 9 });
    // 레인
    const lx = [460, 820], hitY = 580;
    for (let i = 0; i < 2; i++) {
      c.fillStyle = `rgba(255,255,255,${.35 + this.flashL[i] * .4})`; G.rr(c, lx[i] - 70, 0, 140, LF.H, 30); c.fill();
      c.lineWidth = 8; c.strokeStyle = '#fff'; c.beginPath(); c.arc(lx[i], hitY, 48, 0, TAU); c.stroke();
      c.lineWidth = 4; c.strokeStyle = '#ff8fb8'; c.stroke();
      G.text(c, i ? '→' : '←', lx[i], hitY + 2, { size: 34, color: '#ff8fb8' });
    }
    if (this.state === 'play') for (const n of this.notes) {
      if (n.hit != null) continue; const y = hitY - (n.t - this.pt) * 560; if (y < -60 || y > LF.H + 60) continue;
      G.drawHeart(c, lx[n.lane], y, 70, n.lane ? '#3f8a66' : '#2f6b4f', '#fff', 6);
    }
    const done = this.notes.filter(n => n.hit != null).length;
    c.fillStyle = 'rgba(255,255,255,.8)'; G.rr(c, 440, 24, 400, 18, 9); c.fill(); c.fillStyle = '#ff6fa5'; G.rr(c, 440, 24, 400 * done / this.N, 18, 9); c.fill();
    if (this.combo >= 4) G.text(c, `${this.combo} COMBO`, 640, 80, { size: 34, color: '#fff', stroke: '#3f8a66', sw: 8 });
  },
});

// ================= 요리: 기억력 + 오븐 =================
function ingIcon(c, id, x, y, s) {
  const INK = '#4b2b1f'; c.save(); c.translate(x, y); c.lineWidth = s * .06; c.strokeStyle = INK; c.lineJoin = 'round';
  const ol = f => { c.fillStyle = f; c.fill(); c.stroke(); };
  switch (id) {
    case 'egg': c.beginPath(); c.ellipse(0, 0, s * .32, s * .4, 0, 0, TAU); ol('#fffaf0'); break;
    case 'milk': G.rr(c, -s * .25, -s * .25, s * .5, s * .62, s * .08); ol('#fff'); c.beginPath(); c.moveTo(-s * .25, -s * .25); c.lineTo(0, -s * .45); c.lineTo(s * .25, -s * .25); ol('#9fd8ff'); G.drawHeart(c, 0, s * .08, s * .22, '#ff8fb8', null, 0, false); break;
    case 'flour': c.beginPath(); c.moveTo(-s * .3, s * .38); c.quadraticCurveTo(-s * .42, -s * .1, -s * .2, -s * .32); c.lineTo(s * .2, -s * .32); c.quadraticCurveTo(s * .42, -s * .1, s * .3, s * .38); c.closePath(); ol('#fff1d0'); G.text(c, '밀', 0, s * .08, { size: s * .3, color: INK }); break;
    case 'butter': G.rr(c, -s * .38, -s * .18, s * .76, s * .36, s * .08); ol('#ffe27a'); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-s * .3, -s * .12, s * .3, s * .06); break;
    case 'berry': c.beginPath(); c.moveTo(0, s * .38); c.bezierCurveTo(-s * .45, s * .05, -s * .32, -s * .3, 0, -s * .22); c.bezierCurveTo(s * .32, -s * .3, s * .45, s * .05, 0, s * .38); ol('#ff4d6a'); c.fillStyle = '#7fcf86'; c.beginPath(); c.ellipse(0, -s * .26, s * .2, s * .08, 0, 0, TAU); c.fill(); c.stroke(); break;
    case 'sugar': G.rr(c, -s * .3, -s * .28, s * .6, s * .62, s * .08); ol('#fff'); c.fillStyle = '#ffd1e3'; for (const [dx, dy] of [[-.12, -.05], [.08, -.12], [.05, .12], [-.1, .17]]) { G.rr(c, dx * s - s * .07, dy * s - s * .07, s * .14, s * .14, s * .03); c.fill(); c.stroke(); } G.rr(c, -s * .3, -s * .38, s * .6, s * .12, s * .05); ol('#9fd8ff'); break;
    case 'cheese': c.beginPath(); c.moveTo(-s * .38, s * .26); c.lineTo(s * .34, s * .26); c.lineTo(s * .34, -s * .05); c.lineTo(-s * .38, -s * .3); c.closePath(); ol('#ffd54a'); c.fillStyle = '#e9b422'; for (const [dx, dy, r] of [[-.12, .06, .07], [.14, .1, .06], [.12, -.02, .045]]) { c.beginPath(); c.arc(dx * s, dy * s, r * s, 0, TAU); c.fill(); } break;
    case 'honey': G.rr(c, -s * .27, -s * .22, s * .54, s * .6, s * .12); ol('#ffb52e'); G.rr(c, -s * .3, -s * .36, s * .6, s * .16, s * .05); ol('#c98a52'); G.text(c, '꿀', 0, s * .1, { size: s * .3, color: INK }); break;
    case 'banana': c.beginPath(); c.moveTo(-s * .36, -s * .18); c.quadraticCurveTo(-s * .1, s * .5, s * .38, s * .02); c.quadraticCurveTo(s * .1, s * .2, -s * .24, -s * .26); c.closePath(); ol('#ffe14d'); c.fillStyle = '#7a5a2a'; c.fillRect(-s * .42, -s * .3, s * .1, s * .08); break;
    case 'choco': G.rr(c, -s * .32, -s * .38, s * .64, s * .76, s * .08); ol('#8a5a3e'); c.strokeStyle = 'rgba(255,255,255,.3)'; for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(-s * .32, -s * .38 + i * s * .25); c.lineTo(s * .32, -s * .38 + i * s * .25); c.stroke(); } break;
  }
  c.restore();
}
LF.scenes.mg_cook = LF.makeMini({
  kind: 'cook', title: '기억력 쿠키 굽기', theme: 'kitchen',
  how: ['{Q가} 보여주는 재료 순서를 기억했다가 똑같이 눌러요', '4개부터 시작해 하나씩 늘어나요 (최대 10개)  ·  숫자키 1~9, 0', '8개 이상 기억하면 통과! 마지막엔 오븐 타이밍'],
  init() {
    this.len = 4; this.best = 0; this.memDone = false; this.chances = { easy: 3, normal: 2, hard: 1, hell: 1 }[LF.save.data.diff] || 2; this.maxChances = this.chances; // 틀려도 기회가 남아 있으면 같은 개수로 다시
    this.sub = 'show'; this.seq = []; this.si = 0; this.sT = 0; this.inp = 0; this.lit = -1; this.litT = 0;
    this.cards = LF.INGR.map((g, i) => ({ g, x: 640 + ((i % 5) - 2) * 176, y: i < 5 ? 390 : 530, pop: 0 })); // 5열 × 2줄, 화면 가운데
    this.bake = 0; this.bakeStop = null; this.ph = 0; this.newRound();
    this.A.play('idle'); this.B.play('idle');
  },
  newRound() { const n = this.len, N = LF.INGR.length; this.seq = []; for (let i = 0; i < n; i++) { let v; do { v = (Math.random() * N) | 0; } while (i && v === this.seq[i - 1]); this.seq.push(v); } // (같은 재료가 연달아 나오지 않게)
     this.si = 0; this.sT = -.6; this.sub = 'show'; this.inp = 0; },
  begin() { this.newRound(); },
  update(dt) {
    this.cards.forEach(k => k.pop = Math.max(0, k.pop - dt * 5)); if (this.litT > 0) this.litT -= dt; else this.lit = -1;
    const gap = { easy: .95, normal: .78, hard: .7, hell: .6 }[LF.save.data.diff] || .78;
    if (this.sub === 'show') {
      this.sT += dt; this.B.play('wave');
      if (this.sT >= gap) { this.sT = 0; if (this.si < this.seq.length) { this.lit = this.seq[this.si]; this.litT = gap * .7; LF.audio.sfx('tick'); this.cards[this.lit].pop = 1; this.si++; } else { this.sub = 'input'; this.B.play('idle'); LF.fx.text(640, 260, '이제 따라 해봐!', { size: 44, stroke: '#3f8a66' }); } }
    } else if (this.sub === 'bake') { this.ph += dt * 5.4; this.m = this.bakeStop != null ? this.bakeStop : .5 + .5 * Math.sin(this.ph); }
  },
  pickCard(i) {
    if (this.sub !== 'input') return;
    const k = this.cards[i]; k.pop = 1; this.lit = i; this.litT = .2;
    if (this.seq[this.inp] === i) {
      this.inp++; LF.sfx('coin'); LF.fx.hearts(k.x, k.y - 40, 4, { speed: 160 });
      if (this.inp >= this.seq.length) { this.best = this.len; this.len++; if (this.len > 10) this.memDone = true; LF.sfx('good'); LF.fx.text(640, 260, this.best >= 8 ? `${this.best}개 통과!` : '정답!', { size: 54, stroke: '#2f6b4f' }); this.B.setMood('happy', 'smile', 1); this.nextStage(); }
    } else {
      this.chances--; if (this.chances <= 0) this.memDone = true; LF.sfx('miss'); LF.shake(10); LF.fx.text(640, 260, this.memDone ? '앗, 틀렸어!' : '앗! 다시 한 번!', { size: 50, stroke: '#3f8a66' }); this.B.setMood('sad', 'frown', 1); this.nextStage();
    }
  },
  nextStage() {
    this.sub = 'wait';
    setTimeout(() => { if (LF.cur !== this) return; if (!this.memDone) this.newRound(); else { this.sub = 'bake'; this.zc = rand(.6, .85); LF.fx.text(640, 220, '오븐 타이밍!', { size: 50, stroke: '#ff7a3c' }); } }, 1000);
  },
  press(x, y) {
    if (this.sub === 'input' && x != null) { this.cards.forEach((k, i) => { if (Math.abs(x - k.x) < 86 && Math.abs(y - k.y) < 62) this.pickCard(i); }); return; }
    if (this.sub === 'bake' && this.bakeStop == null) {
      this.bakeStop = this.m; const d = Math.abs(this.m - this.zc), w = .07 * this.D.window;
      this.bake = d < w * .5 ? 1 : d < w ? .75 : d < w * 2.2 ? .4 : .1;
      LF.sfx(this.bake >= .75 ? 'perfect' : 'miss');
      LF.fx.text(640, 220, this.bake >= 1 ? '완벽하게 노릇노릇!' : this.bake >= .75 ? '맛있게 구워졌어!' : this.bake >= .4 ? '조금 아쉬워…' : '앗, 탔다!', { size: 46, stroke: '#ff7a3c' });
      setTimeout(() => { if (LF.cur !== this) return; this.sub = 'serve'; const q = this.quality(); this.B.play(q >= .6 ? 'eat' : 'pout'); this.A.play(q >= .6 ? 'cheer' : 'sad'); if (q >= .6) LF.fx.hearts(900, 320, 24); setTimeout(() => this.finish(q), 2200); }, 900);
    }
  },
  // 기억 점수: 8개 이상이면 통과(0.7~1.0), 그 아래는 비례 (4개 .12 ~ 7개 .48)
  memScore() { const L = this.best; return L >= 8 ? .7 + .3 * (L - 8) / 2 : L >= 4 ? .6 * (L - 3) / 5 : 0; },
  quality() { return this.memScore() * .85 + this.bake * .15; },
  key(code, on) { if (!on) return; const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'].indexOf(code); if (i >= 0) this.pickCard(i); else if (code === 'Space' || code === 'Enter') this.press(null, null); },
  reward: s => s >= .6 ? '🧲 다음 달리기 하트 자석!' : '',
  draw(c) {
    const W = LF.W, GY = LF.GY, t = this.t;
    c.fillStyle = '#f8e2c8'; c.fillRect(0, 300, W, 420); c.fillStyle = '#ead1b5'; c.fillRect(0, 300, W, 18);
    LF.shadow(c, 1195, 316, 50); this.B.draw(c, 1195, 314, 170, { dir: -1 });
    LF.shadow(c, 85, 316, 50); this.A.draw(c, 85, 314, 160, { dir: 1 });
    if (this.sub === 'show' || this.sub === 'input' || this.sub === 'wait') {
      LF.panel(c, 300, 40, 680, 110, { r: 30 });
      G.text(c, `${this.len - 3}단계 · 재료 ${this.seq.length}개`, 640, 70, { size: 30, color: '#3d6b55' });
      G.text(c, '8개 이상 기억하면 통과', 640, 100, { size: 18, color: '#b0546f' });
      for (let i = 0; i < this.maxChances; i++) G.drawHeart(c, 896 + i * 32, 62, 24, i < this.chances ? '#ff4d84' : '#e8dde3', '#fff', 2, i < this.chances); G.text(c, '기회', 852, 63, { size: 18, color: '#9a7a8a' });
      for (let i = 0; i < this.seq.length; i++) { const x = 640 + (i - (this.seq.length - 1) / 2) * 44, done = this.sub === 'input' && i < this.inp; c.beginPath(); c.arc(x, 128, 14, 0, TAU); c.fillStyle = done ? '#ff6fa5' : (this.sub === 'show' && i < this.si ? '#ffd54a' : '#f3e6ee'); c.fill(); }
      if (this.sub === 'show') LF.bubble(c, LF.fmt('잘 봐! 순서 기억해~'), 1080, 120, { size: 26, maxW: 300 });
      for (let i = 0; i < this.cards.length; i++) {
        const k = this.cards[i], lit = this.lit === i, s = 1 + k.pop * .12;
        c.save(); c.translate(k.x, k.y); c.scale(s, s);
        LF.panel(c, -80, -58, 160, 116, { r: 26, border: lit ? '#ffb52e' : '#ffc2d9', fill: lit ? '#fff3c4' : undefined, lw: lit ? 7 : 5 });
        ingIcon(c, k.g.id, -34, -4, 74); G.text(c, k.g.name, 34, -12, { size: 22, color: '#2f4a3c' }); G.text(c, String((i + 1) % 10), 54, 30, { size: 19, color: '#8a9a8f' });
        c.restore();
      }
    } else if (this.sub === 'bake' || this.sub === 'serve') {
      const ox = 420, oy = 330;
      G.rr(c, ox, oy, 440, 280, 34); c.fillStyle = '#ffb7a0'; c.fill(); c.lineWidth = 6; c.strokeStyle = '#4b2b1f'; c.stroke();
      G.rr(c, ox + 40, oy + 70, 360, 170, 22); c.fillStyle = G.lin(c, 0, oy + 70, 0, oy + 240, ['#ffc46b', '#f06a26']); c.fill(); c.stroke();
      for (let i = 0; i < 3; i++) G.drawHeart(c, ox + 120 + i * 100, oy + 165 + Math.sin(t * 3 + i) * 3, 64, this.sub === 'serve' ? (this.bake >= .75 ? '#e8a46a' : this.bake >= .4 ? '#f2d0a0' : '#5a3a2a') : '#f2c48f', '#7a4a3a', 4, true);
      if (this.sub === 'bake') {
        const bx = 340, bw = 600, by = 260, m = this.m || 0, w = .07 * this.D.window;
        c.fillStyle = '#fff'; G.rr(c, bx - 8, by - 26, bw + 16, 52, 26); c.fill(); c.lineWidth = 5; c.strokeStyle = '#ff9cc2'; c.stroke();
        c.fillStyle = G.lin(c, bx, 0, bx + bw, 0, ['#fff1c4', '#ffb347', '#e0542a', '#5a3a2a']); G.rr(c, bx, by - 18, bw, 36, 18); c.fill();
        c.fillStyle = 'rgba(255,230,100,.9)'; c.fillRect(bx + (this.zc - w) * bw, by - 22, w * 2 * bw, 44);
        c.fillStyle = '#fff'; c.beginPath(); c.arc(bx + m * bw, by, 26, 0, TAU); c.fill(); c.lineWidth = 5; c.strokeStyle = '#4b2b1f'; c.stroke();
        G.text(c, '🔥', bx + m * bw, by + 2, { size: 26 });
        G.text(c, '금빛 구간에서 탭!', 640, 200, { size: 34, color: '#fff', stroke: '#e0542a', sw: 8 });
      } else {
        const q = this.quality();
        LF.bubble(c, q >= .85 ? '세상에서 제일 맛있어! 사랑해~' : q >= .6 ? '냠냠! 고마워!' : '음… 마음만 받을게…', 1080, 110, { size: 28, maxW: 340 });
      }
    }
  },
});

// ================= 하트 받기 =================
LF.scenes.mg_catch = LF.makeMini({
  kind: 'catch', title: '하늘에서 하트가 쏟아져요',
  how: ['{Q가} 던지는 하트를 바구니로 받아요', '← → 키 또는 손가락으로 끌어서 이동', '먹구름은 피하기! 목숨이 다 없어지면 끝'],
  init() { this.x = 640; this.tx = 640; this.items = []; this.pts = 0; this.need = { easy: 20, normal: 30, hard: 36, hell: 42 }[LF.save.data.diff] || 30; this.maxLives = 3 + (this.D.lives || 0); this.lives = this.maxLives; this.T = 32; this.spawn = 1; this.bx = 640; this.btx = 640; this.vx = 0; this.A.play('hold'); this.B.play('idle'); this.drag = false; },
  update(dt) {
    const spd = 1 + this.pt / 36; // (예전엔 /14 라 막판엔 3배로 빨라졌음)
    // 이동
    let dir = (LF.keys.has('ArrowLeft') || LF.keys.has('KeyA') ? -1 : 0) + (LF.keys.has('ArrowRight') || LF.keys.has('KeyD') ? 1 : 0);
    if (dir) this.tx = this.x + dir * 900 * dt * 1.2;
    const nx = clamp(damp(this.x, this.tx, 16, dt), 90, LF.W - 90); this.vx = (nx - this.x) / dt; this.x = nx;
    this.A.play(Math.abs(this.vx) > 60 ? 'run' : 'hold', { speed: 16 }); this.A.dir = this.vx < -30 ? -1 : this.vx > 30 ? 1 : this.A.dir;
    // 던지는 쪽
    if (Math.abs(this.bx - this.btx) < 10) this.btx = rand(160, LF.W - 160);
    this.bx = damp(this.bx, this.btx, 2.2 * spd, dt);
    this.spawn -= dt * spd;
    if (this.spawn <= 0) {
      this.spawn = rand(.42, .7); const r = Math.random();
      const cl = (.14 + this.pt * .004) * (this.D.window > 1 ? .5 : 1), type = r < cl ? 'cloud' : r < cl + .12 ? 'gold' : 'heart';
      this.items.push({ type, x: this.bx, y: 150, vx: rand(-160, 160), vy: rand(-200, -60), r: type === 'cloud' ? 40 : 30 });
      this.B.play('throw'); this.B.at = 0;
    }
    if (this.B.anim === 'throw' && this.B.at > .35) this.B.play('idle');
    const by = LF.GY - 210;
    for (const it of this.items) {
      it.vy += 520 * spd * dt; it.x += it.vx * dt; it.y += it.vy * dt; if (it.x < 40 || it.x > LF.W - 40) it.vx *= -1;
      if (!it.got && it.y > by - 20 && it.y < by + 30 && Math.abs(it.x - this.x) < 80) {
        it.got = true;
        if (it.type === 'cloud') { this.lives--; LF.sfx('hit'); LF.shake(14); LF.flash(.4, '#3f8a66'); this.A.setMood('swirl', 'wavy', 1); LF.fx.text(this.x, by - 60, '으앗!', { size: 40, stroke: '#7a5cff' }); if (this.lives <= 0) this.finish(this.pts / this.need * .8); }
        else { const v = it.type === 'gold' ? 3 : 1; this.pts += v; LF.sfx(v > 1 ? 'gold' : 'coin'); LF.fx.hearts(this.x, by, v * 3, { speed: 180 }); if (v > 1) LF.fx.text(this.x, by - 60, '+3', { size: 38, stroke: '#ffb52e' }); }
      }
    }
    this.items = this.items.filter(it => !it.got && it.y < LF.H + 60);
    if (this.pt >= this.T) this.finish(this.pts / this.need);
  },
  press(x) { if (x != null) { this.tx = x; this.drag = true; } },
  move(x) { if (this.drag || LF.touch) this.tx = x; },
  release() { this.drag = false; },
  key() { },
  reward: s => s >= .65 ? '💗 하트를 한가득!' : '',
  draw(c) {
    const W = LF.W, GY = LF.GY, t = this.t;
    // 위쪽 구름 발판 + 던지는 쪽
    LF.cloud(c, this.bx - 110, 210, 1.4, '#fff');
    this.B.draw(c, this.bx, 190, 120, { dir: 1 });
    for (const it of this.items) {
      if (it.type === 'cloud') { c.save(); c.translate(it.x, it.y); c.beginPath(); c.arc(-22, 6, 22, 0, TAU); c.arc(0, -8, 28, 0, TAU); c.arc(24, 6, 22, 0, TAU); c.fillStyle = '#8f98b3'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#4b2b1f'; c.stroke(); c.fillStyle = '#4b2b1f'; c.beginPath(); c.arc(-9, 2, 3.5, 0, TAU); c.arc(9, 2, 3.5, 0, TAU); c.fill(); c.restore(); }
      else G.drawHeart(c, it.x, it.y, it.type === 'gold' ? 62 : 46, it.type === 'gold' ? '#ffc22e' : '#ff4d84', '#fff', 5);
    }
    LF.shadow(c, this.x, GY + 4, 52);
    this.A.draw(c, this.x, GY + 2, 160);
    // 바구니 (머리 위)
    const by = GY - 210;
    c.save(); c.translate(this.x, by);
    c.beginPath(); c.moveTo(-78, -6); c.lineTo(78, -6); c.lineTo(58, 44); c.lineTo(-58, 44); c.closePath(); c.fillStyle = '#e8b57c'; c.fill(); c.lineWidth = 5; c.strokeStyle = '#4b2b1f'; c.stroke();
    c.strokeStyle = 'rgba(75,43,31,.4)'; c.lineWidth = 3; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 28, -4); c.lineTo(i * 22, 42); c.stroke(); }
    G.rr(c, -84, -14, 168, 16, 8); c.fillStyle = '#ffb3d1'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#4b2b1f'; c.stroke();
    c.restore();
    // HUD
    LF.panel(c, 24, 20, 330, 80, { r: 40 }); G.drawHeart(c, 72, 60, 44, '#ff4d84', '#fff', 4); G.text(c, `${this.pts} / ${this.need}`, 200, 62, { size: 38, color: '#3d6b55' });
    for (let i = 0; i < this.maxLives; i++) { c.globalAlpha = i < this.lives ? 1 : .25; LF.cloud(c, W - 90 - (this.maxLives - 1 - i) * 80, 66, .55, i < this.lives ? '#fff' : '#bbb'); c.globalAlpha = 1; }
    const tl = clamp(1 - this.pt / this.T, 0, 1); c.fillStyle = 'rgba(255,255,255,.8)'; G.rr(c, 440, 34, 400, 18, 9); c.fill(); c.fillStyle = tl < .25 ? '#ff6b6b' : '#6fc6ff'; G.rr(c, 440, 34, 400 * tl, 18, 9); c.fill();
  },
});

// ================= 낚시 =================
LF.scenes.mg_fish = LF.makeMini({
  kind: 'fish', title: '하트 물고기 낚시',
  how: ['움직이는 낚싯바늘이 물고기 위에 오면 탭!', '분홍 하트 물고기 +2 · 파랑 +1 · 황금 +5', '장화는 -2! 30초 안에 15점을 노려요'],
  bg(c) {
    const W = LF.W, H = LF.H, t = this.t;
    c.fillStyle = G.lin(c, 0, 0, 0, 330, ['#2c2463', '#6c3f9e', '#ff9ec7']); c.fillRect(0, 0, W, 340);
    for (let i = 0; i < 12; i++) { const x = 60 + i * 106, y = 70 + (i % 3) * 22; G.glow(c, x, y, 34, 'rgba(255,210,110,.8)'); c.fillStyle = '#ff5a5a'; c.beginPath(); c.ellipse(x, y, 10, 13, 0, 0, TAU); c.fill(); }
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i <= 12; i++) { const x = 60 + i * 106; c.lineTo(x, 70 + (i % 3) * 22 - 14); } c.stroke();
    c.fillStyle = G.lin(c, 0, 330, 0, H, ['#5ec7e8', '#2563a8']); c.fillRect(0, 330, W, H - 330);
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; c.beginPath(); for (let x = 0; x <= W; x += 10) { const y = 332 + Math.sin(x * .025 + t * 2) * 6; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    c.fillStyle = 'rgba(255,255,255,.15)'; for (let i = 0; i < 16; i++) { c.beginPath(); c.arc((i * 97 + t * 14) % W, 400 + (i * 41) % 280, 3 + i % 4, 0, TAU); c.fill(); }
    // 부두
    c.fillStyle = '#b98b68'; G.rr(c, -20, 300, 240, 40, 10); c.fill(); c.lineWidth = 4; c.strokeStyle = '#4b2b1f'; c.stroke();
    c.fillStyle = '#b98b68'; c.fillRect(1060, 300, 260, 40); c.strokeRect(1060, 300, 260, 40);
  },
  init() { this.fish = []; this.hx = 640; this.hy = 170; this.hs = 'swing'; this.ph = 0; this.pts = 0; this.need = 15; this.T = 30; this.spawnT = 0; this.carry = null; this.stun = 0;
    for (let i = 0; i < 7; i++) this.spawnFish(true); this.A.play('sit'); this.B.play('idle'); },
  spawnFish(init) {
    const lane = (Math.random() * 4) | 0, y = 400 + lane * 72, dir = Math.random() < .5 ? 1 : -1, r = Math.random();
    const type = r < .08 ? 'gold' : r < .4 ? 'pink' : r < .58 ? 'boot' : 'blue';
    this.fish.push({ type, x: init ? rand(260, 1020) : (dir > 0 ? -80 : LF.W + 80), y, dir, sp: rand(80, 170) * (type === 'gold' ? 1.9 : 1) * (1 + (1 - this.D.window)), ph: rand(0, 6) });
  },
  update(dt) {
    this.spawnT -= dt; if (this.spawnT <= 0 && this.fish.length < 11) { this.spawnFish(false); this.spawnT = .55; }
    for (const f of this.fish) { f.x += f.dir * f.sp * dt; f.y += Math.sin(this.t * 2 + f.ph) * .4; }
    this.fish = this.fish.filter(f => f.x > -120 && f.x < LF.W + 120 && !f.caught);
    if (this.hs === 'swing') { this.ph += dt * (1.6 + this.pt * .02); this.hx = 640 + Math.sin(this.ph) * 420; }
    else if (this.hs === 'drop') {
      this.hy += 760 * dt;
      for (const f of this.fish) if (Math.abs(f.x - this.hx) < 40 && Math.abs(f.y - this.hy - 14) < 30) { this.carry = f; f.caught = true; this.hs = 'reel'; LF.sfx('pop'); break; }
      if (this.hy > 680) this.hs = 'reel';
    } else if (this.hs === 'reel') { this.hy -= 620 * dt; if (this.hy <= 170) { this.hy = 170; this.hs = 'swing'; this.land(); } }
    if (this.pt >= this.T) this.finish(this.pts / this.need);
  },
  land() {
    const f = this.carry; this.carry = null; if (!f) { LF.fx.text(this.hx, 230, '꽝…', { size: 40, stroke: '#3f8a66' }); return; }
    const v = { gold: 5, pink: 2, blue: 1, boot: -2 }[f.type]; this.pts = Math.max(0, this.pts + v);
    LF.fx.text(this.hx, 230, (v > 0 ? '+' : '') + v, { size: 50, stroke: v > 0 ? '#2f6b4f' : '#7a5cff' });
    if (v > 0) { LF.sfx(v >= 5 ? 'gold' : 'coin'); LF.fx.hearts(this.hx, 230, v * 3, { speed: 220 }); this.B.play('cheer'); setTimeout(() => this.B.play('idle'), 900); }
    else { LF.sfx('miss'); LF.shake(10); this.B.play('pout'); setTimeout(() => this.B.play('idle'), 900); }
    if (f.type === 'gold') LF.fx.stars(this.hx, 230, 20);
  },
  press() { if (this.hs === 'swing') { this.hs = 'drop'; LF.sfx('throw'); } },
  reward: s => s >= .65 ? '🐟 대어 낚시 성공!' : '',
  draw(c) {
    const W = LF.W, t = this.t;
    c.fillStyle = '#8f7ac0'; G.rr(c, 180, 140, W - 360, 12, 6); c.fill();
    c.fillStyle = '#ffd54a'; G.rr(c, this.hx - 26, 126, 52, 40, 12); c.fill(); c.lineWidth = 4; c.strokeStyle = '#4b2b1f'; c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(this.hx, 166); c.lineTo(this.hx, this.hy); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.arc(this.hx, this.hy + 12, 14, -Math.PI / 2 - .3, Math.PI * .9); c.stroke();
    for (const f of this.fish) drawFish(c, f.type, f.x, f.y, f.dir, t + f.ph);
    if (this.carry) drawFish(c, this.carry.type, this.hx, this.hy + 36, 1, t);
    LF.shadow(c, 110, 302, 40); this.A.draw(c, 110, 300, 140, { dir: 1 });
    LF.shadow(c, 1170, 302, 40); this.B.draw(c, 1170, 300, 140, { dir: -1 });
    LF.panel(c, 24, 20, 300, 76, { r: 38 }); G.drawHeart(c, 70, 58, 40, '#ff4d84', '#fff', 4); G.text(c, `${this.pts} / ${this.need}`, 190, 60, { size: 36, color: '#3d6b55' });
    const tl = clamp(1 - this.pt / this.T, 0, 1); c.fillStyle = 'rgba(255,255,255,.85)'; G.rr(c, 440, 34, 400, 18, 9); c.fill(); c.fillStyle = tl < .25 ? '#ff6b6b' : '#6fc6ff'; G.rr(c, 440, 34, 400 * tl, 18, 9); c.fill();
    if (this.hs === 'swing' && this.state === 'play') G.text(c, '탭!', this.hx, 100, { size: 30, color: '#fff', stroke: '#2f6b4f', sw: 7 });
  },
});
function drawFish(c, type, x, y, dir, t) {
  const INK = '#4b2b1f';
  c.save(); c.translate(x, y); c.scale(dir, 1); c.lineWidth = 4; c.strokeStyle = INK; c.lineJoin = 'round';
  if (type === 'boot') { c.beginPath(); c.moveTo(-14, -28); c.lineTo(12, -28); c.lineTo(12, 6); c.lineTo(34, 9); c.lineTo(34, 26); c.lineTo(-16, 26); c.closePath(); c.fillStyle = '#8a6a55'; c.fill(); c.stroke(); c.restore(); return; }
  const col = { gold: '#ffc22e', pink: '#ff8fbd', blue: '#7fc8ff' }[type], sw = Math.sin(t * 9) * 5;
  c.fillStyle = col;
  c.beginPath(); c.moveTo(-30, 0); c.lineTo(-52, -16 + sw); c.lineTo(-52, 16 - sw); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(0, 0, 36, 24, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = INK; c.beginPath(); c.ellipse(18, -4, 3.5, 4.5, 0, 0, TAU); c.fill();
  if (type === 'pink') G.drawHeart(c, -5, 3, 18, '#fff', null, 0, false); if (type === 'gold') G.sparkle(c, -5, 2, 11, '#fff');
  c.restore();
}

// ================= 대화 =================
LF.scenes.mg_daily = LF.makeMini({
  kind: 'daily', title: '둘만의 대화',
  how: ['{Q}의 말에 어울리는 대답을 골라요', '시간이 지나면 기회가 사라져요!', '숫자키 1·2·3 또는 버튼 터치'],
  bg(c) { if (LF.view3d(this.t * 12 - 640, LF.GY - 190)) return; c.save(); c.translate(0, -190); LF.drawBG(c, this.th, this.t * 8, this.t); LF.drawGround(c, this.th, this.t * 8, []); c.restore(); c.fillStyle = this.th.groundD; c.fillRect(0, LF.H - 190, LF.W, 190); },
  init() { this.sc = LF.DAILY[this.st.daily || 'rain']; this.ri = 0; this.vals = []; this.sub = 'ask'; this.sT = 0; this.limit = 7 * this.D.window; this.btns = []; this.makeChoices(); },
  begin() { this.sT = 0; },
  makeChoices() {
    const r = this.sc.rounds[this.ri], order = r.ch.map((_, i) => i).sort(() => Math.random() - .5);
    this.btns = order.map((ci, k) => new LF.Button({ x: LF.W / 2, y: 492 + k * 74, w: 760, h: 62, label: `${k + 1}. ${LF.fmt(r.ch[ci].t)}`, size: 28, color: ['pink', 'lav', 'mint'][k], onClick: () => this.pick(ci) }));
  },
  pick(ci) {
    if (this.sub !== 'ask') return;
    const ch = ci == null ? { t: '(…아무 말도 못 했다)', v: 0, r: '…응?', m: 'surprise' } : this.sc.rounds[this.ri].ch[ci];
    this.picked = ch; this.sub = 'react'; this.sT = 0; this.vals.push(ch.v);
    this.B.play(ch.m || 'idle'); this.A.play(ch.v >= .8 ? 'shy' : ch.v >= .5 ? 'idle' : 'sad');
    if (ch.v >= .8) { LF.sfx('perfect'); LF.fx.hearts(900, 300, 18); } else if (ch.v >= .5) LF.sfx('good'); else LF.sfx('miss');
  },
  update(dt) {
    this.btns.forEach(b => b.update(dt)); this.sT += dt;
    if (this.sub === 'ask' && this.sT > this.limit) this.pick(null);
    if (this.sub === 'react' && this.sT > 2.4) { this.ri++; if (this.ri >= this.sc.rounds.length) this.finish(this.vals.reduce((a, b) => a + b, 0) / this.vals.length); else { this.sub = 'ask'; this.sT = 0; this.makeChoices(); this.A.play('idle'); this.B.play('idle'); } }
  },
  press(x, y) { if (x != null && this.sub === 'ask') LF.ui.down(x, y, this.btns); },
  key(code, on) { if (!on || this.sub !== 'ask') return; const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(code); if (i >= 0 && this.btns[i]) this.btns[i].onClick(); },
  draw(c) {
    const W = LF.W, GY = LF.GY - 190, r = this.sc.rounds[Math.min(this.ri, this.sc.rounds.length - 1)];
    LF.panel(c, W / 2 - 260, 18, 520, 60, { r: 30 }); G.text(c, this.sc.title, W / 2, 49, { size: 30, color: '#3d6b55' });
    LF.shadow(c, 380, GY + 4, 50); this.A.draw(c, 380, GY + 2, 170, { dir: 1 });
    LF.shadow(c, 900, GY + 4, 50); this.B.draw(c, 900, GY + 2, 170, { dir: -1 });
    if (this.sub === 'ask') {
      LF.bubble(c, LF.fmt(r.q), 900, GY - 190, { size: 30, maxW: 460 });
      if (this.state === 'play') { this.btns.forEach(b => b.draw(c)); const k = clamp(1 - this.sT / this.limit, 0, 1); c.fillStyle = 'rgba(255,255,255,.85)'; G.rr(c, 340, 432, 600, 14, 7); c.fill(); c.fillStyle = k < .3 ? '#ff6b6b' : '#ffb52e'; G.rr(c, 340, 432, 600 * k, 14, 7); c.fill(); }
    } else if (this.picked) {
      LF.bubble(c, LF.fmt(this.picked.t), 380, GY - 190, { size: 28, maxW: 420, border: '#3f8a66' });
      if (this.sT > .7) LF.bubble(c, LF.fmt(this.picked.r), 900, GY - 190, { size: 30, maxW: 440, pop: ease.back(clamp((this.sT - .7) / .3, 0, 1)) });
    }
    G.text(c, `${Math.min(this.ri + 1, this.sc.rounds.length)} / ${this.sc.rounds.length}`, 70, 48, { size: 30, color: '#3d6b55', stroke: '#fff', sw: 6 });
  },
});
