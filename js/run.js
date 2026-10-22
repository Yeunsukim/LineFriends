'use strict';
// 달리기: 점프(2단) / 슬라이드 / 하트 던지기로 장애물·구덩이·발판을 넘어 상대에게 하트를 전한다.
const PH = { g: 3000, jv: 1090, jv2: 980, fastFall: 1700, cut: 380 };
const PX = 330; // 화면상 주인공 x

// 장애물 사양: w,h 크기 / shoot 하트로 파괴 가능
const OB = {
  low: { w: 66, h: 58 }, tall: { w: 56, h: 132 }, over: { w: 140, gap: 76 },
  roll: { w: 64, h: 64, shoot: true }, fly: { w: 76, h: 56, shoot: true }, drop: { w: 58, h: 60 },
};

// ---------- 레벨 패턴 ----------
// 각 패턴은 (L: 레벨 빌더, x: 시작 월드 좌표, r: 난수, sf: 속도 배율) → 차지한 폭
const CHUNKS = [
  { id: 'hearts', tier: 1, w: 3, make(L, x, r) { const n = 6 + (r() * 4 | 0), hi = r() < .4; for (let i = 0; i < n; i++) L.heart(x + i * 58, LF.GY - (hi ? 175 : 60) - (hi ? Math.sin(i / (n - 1) * Math.PI) * 40 : 0)); return n * 58; } },
  { id: 'low', tier: 1, w: 5, make(L, x) { L.obs('low', x + 120); L.arc(x, x + 320, 170, 5); return 330; } },
  { id: 'pitS', tier: 1, w: 4, make(L, x, r, sf) { const w = (150 + r() * 60) * sf; L.gap(x + 40, w); L.arc(x, x + w + 80, 150, 5); return w + 120; } },
  { id: 'low2', tier: 2, w: 4, make(L, x, r, sf) { const d = 330 * sf; L.obs('low', x + 80); L.obs('low', x + 80 + d); L.arc(x, x + 260, 160, 4); L.arc(x + d, x + d + 260, 160, 4); return d + 300; } },
  { id: 'tall', tier: 2, w: 3, make(L, x) { L.obs('tall', x + 140); L.arc(x, x + 360, 250, 5); return 380; } },
  { id: 'over', tier: 2, w: 4, make(L, x) { L.obs('over', x + 110); for (let i = 0; i < 5; i++) L.heart(x + 60 + i * 52, LF.GY - 28); return 380; } },
  { id: 'pitM', tier: 2, w: 3, make(L, x, r, sf) { const w = (240 + r() * 60) * sf; L.gap(x + 40, w); L.arc(x, x + w + 80, 190, 6); return w + 120; } },
  { id: 'bridge', tier: 2, w: 3, make(L, x, r, sf) { const w = 600 * sf; L.gap(x + 30, w); const pw = 150; L.plat(x + 30 + w * .3 - pw / 2, LF.GY - 110, pw); L.plat(x + 30 + w * .7 - pw / 2, LF.GY - 150, pw); L.heart(x + 30 + w * .3, LF.GY - 160); L.heart(x + 30 + w * .7, LF.GY - 200); L.heart(x + 30 + w * .5, LF.GY - 240, 'g'); return w + 90; } },
  { id: 'roll', tier: 2, w: 3, make(L, x) { L.obs('roll', x + 640); for (let i = 0; i < 5; i++) L.heart(x + i * 60, LF.GY - 60); return 420; } },
  { id: 'stairs', tier: 3, w: 2, make(L, x, r) { L.plat(x + 80, LF.GY - 140, 170); L.plat(x + 360, LF.GY - 260, 170); L.plat(x + 640, LF.GY - 370, 170); L.heart(x + 165, LF.GY - 190); L.heart(x + 445, LF.GY - 310); L.heart(x + 725, LF.GY - 420, 'g'); if (r() < .35) L.item('star', x + 725, LF.GY - 500); L.obs('low', x + 470); return 860; } },
  { id: 'fly', tier: 3, w: 3, make(L, x) { L.obs('fly', x + 260, { y: LF.GY - 120 }); for (let i = 0; i < 4; i++) L.heart(x + 60 + i * 60, LF.GY - 60); return 420; } },
  { id: 'lowOver', tier: 3, w: 3, make(L, x, r, sf) { const d = 380 * sf; L.obs('low', x + 60); L.obs('over', x + 60 + d); L.arc(x - 60, x + 200, 160, 4); for (let i = 0; i < 3; i++) L.heart(x + 70 + d + i * 50, LF.GY - 28); return d + 240; } },
  { id: 'pitL', tier: 3, w: 2, make(L, x, r, sf) { const w = (360 + r() * 60) * sf; L.gap(x + 40, w); L.arc(x, x + w + 80, 280, 7); L.heart(x + 40 + w / 2, LF.GY - 330, 'g'); return w + 130; } },
  { id: 'pitLow', tier: 3, w: 2, make(L, x, r, sf) { const w = 180 * sf; L.gap(x + 40, w); const d = x + 40 + w + 260 * sf; L.obs('low', d); L.arc(x, x + w + 80, 160, 4); L.arc(d - 120, d + 180, 160, 3); return d - x + 160; } },
  { id: 'tallPit', tier: 4, w: 2, make(L, x, r, sf) { L.obs('tall', x + 80); const w = 200 * sf; L.gap(x + 80 + 380 * sf, w); L.arc(x - 40, x + 260, 250, 4); L.arc(x + 80 + 360 * sf, x + 80 + 380 * sf + w + 40, 170, 3); return 80 + 380 * sf + w + 100; } },
  { id: 'moving', tier: 4, w: 2, make(L, x, r, sf) { const w = 640 * sf; L.gap(x + 30, w); L.plat(x + 30 + w / 2 - 80, LF.GY - 120, 160, { amp: 90, per: 2.2, ph: r() * 6 }); L.heart(x + 30 + w / 2, LF.GY - 300, 'g'); L.arc(x, x + 260, 170, 3); return w + 90; } },
  { id: 'flyPair', tier: 4, w: 2, make(L, x) { L.obs('fly', x + 220, { y: LF.GY - 70, amp: 30 }); L.obs('fly', x + 520, { y: LF.GY - 170, amp: 40 }); L.arc(x + 300, x + 480, 150, 3); return 640; } },
  { id: 'overLow', tier: 4, w: 2, make(L, x, r, sf) { L.obs('over', x + 60); L.obs('low', x + 60 + 330 * sf); for (let i = 0; i < 3; i++) L.heart(x + 70 + i * 50, LF.GY - 28); L.arc(x + 330 * sf - 60, x + 330 * sf + 200, 160, 4); return 330 * sf + 260; } },
  { id: 'drop', tier: 3, w: 3, needs: 'drops', make(L, x) { L.obs('drop', x + 300); L.obs('drop', x + 600); for (let i = 0; i < 6; i++) L.heart(x + 150 + i * 70, LF.GY - 60); return 760; } },
  { id: 'gauntlet', tier: 5, w: 2, make(L, x, r, sf) { L.obs('low', x + 60); L.obs('over', x + 60 + 360 * sf); const g = x + 60 + 360 * sf + 260 * sf; L.gap(g, 200 * sf); L.obs('roll', g + 900); L.arc(x - 40, x + 240, 160, 3); L.arc(g - 40, g + 240 * sf, 170, 4); return g + 200 * sf + 200 - x; } },
];

LF.scenes.run = {
  enter(p) {
    this.p = p; this.st = p.stage; this.R = this.st.run; this.th = LF.THEMES[this.st.theme]; this.D = LF.diff(); this.buff = p.buff || {};
    this.speed0 = this.R.speed * this.D.speed; this.sf = this.speed0 / 500;
    this.A = new LF.Actor(LF.P()); this.B = new LF.Actor(LF.Q()); this.A.play('run'); this.B.play('idle'); this.B.dir = -1;
    this.maxLives = 3 + (this.buff.lives || 0) + (this.D.lives || 0); this.lives = this.maxLives;
    this.pl = { x: 0, y: LF.GY, vy: 0, ground: true, plat: null, jumps: 0, slide: false, slideT: 0, inv: 0, star: 0, hurtT: 0, spin: 0, coyote: 0, buffer: 0, jumpHeld: false };
    this.cam = -PX; this.t = 0; this.time = 0; this.speed = this.speed0;
    this.score = 0; this.combo = 0; this.maxCombo = 0; this.got = 0; this.cool = 0; this.proj = []; this.dustT = 0;
    this.done = false; this.dvp = null; this.dv = null; // (장면 객체가 재사용되므로 골인 상태를 매번 초기화: 안 하면 한 번 성공한 뒤 다음 판이 골인에서 멈춤)
    this.state = 'intro'; this.st0 = 0; this.cnt = 4; this.paused = false; this.downHeld = false; this.ptrs = new Map();
    this.gen();
    this.hitstop = 0; this.punch = 0; this.fov = 34; this.trail = []; this.mile = {}; this.vig = 0; this.boost = 0; this.sp01 = 0; this.hbT = 0;
    this.goalX = this.R.len; this.partnerX = this.R.len + 520; this.camMax = this.partnerX - 900;
    this.quota = this.D.quota;
    LF.scene3d(`run${this.st.id}_${LF.save.data.diff}`, { theme: this.st.theme, len: this.partnerX, gaps: this.gaps, plats: this.plats, seed: this.st.id });
    LF.audio.music('run');
    this.pauseBtns = [
      new LF.Button({ x: LF.W / 2, y: 330, w: 320, h: 80, label: '계속하기', size: 36, color: 'green', onClick: () => { this.paused = false; } }),
      new LF.Button({ x: LF.W / 2 - 85, y: 425, w: 150, h: 80, label: '다시', size: 36, color: 'white', onClick: () => LF.go('run', this.p) }),
      new LF.Button({ x: LF.W / 2 + 85, y: 425, w: 150, h: 80, label: '지도', size: 36, color: 'white', onClick: () => LF.go('map') }),
    ];
    this.failBtns = [
      new LF.Button({ x: LF.W / 2 - 125, y: 520, w: 230, h: 80, label: '다시 도전', size: 36, color: 'green', pulse: true, onClick: () => LF.go('run', this.p) }),
      new LF.Button({ x: LF.W / 2 + 125, y: 520, w: 230, h: 80, label: '지도로', size: 36, color: 'white', onClick: () => LF.go('map') }),
    ];
  },

  // ----- 레벨 빌더 -----
  gen() {
    const R = this.R, D = this.D, diffIdx = { normal: 0, hard: 1, hell: 2, easy: 3 }[LF.save.data.diff] || 0; // (쉬움은 3: 기존 난이도의 레벨 배치가 바뀌지 않게)
    const r = rng(this.st.id * 7919 + diffIdx * 1013 + 17), sf = this.sf;
    this.obsL = []; this.items = []; this.gaps = []; this.plats = [];
    const L = {
      heart: (x, y, t = 'h') => this.items.push({ type: t, x, y, v: t === 'g' ? 5 : 1 }),
      item: (t, x, y) => this.items.push({ type: t, x, y, v: 0 }),
      arc: (x0, x1, apex, n) => { for (let i = 0; i < n; i++) { const k = n === 1 ? .5 : i / (n - 1); this.items.push({ type: 'h', x: lerp(x0, x1, k), y: LF.GY - 60 - Math.sin(k * Math.PI) * (apex - 60), v: 1 }); } },
      obs: (kind, x, o = {}) => this.obsL.push(Object.assign({ kind, x, y0: o.y || 0, amp: o.amp != null ? o.amp : 50, t: r() * 6, dead: false, act: false, vx: 0, fall: 0, ph: 'wait' }, o)),
      gap: (x, w) => this.gaps.push({ x0: x, x1: x + w }),
      plat: (x, y, w, o = {}) => this.plats.push(Object.assign({ x, y0: y, y, w, amp: 0, per: 2, ph: 0 }, o)),
    };
    const tierCap = Math.min(R.tier, D.tierCap || 9), pool = CHUNKS.filter(c => c.tier <= tierCap && (!c.needs || R[c.needs]));
    let x = 1500; const end = R.len - 1100;
    // 초반은 쉬운 패턴 위주로 → 진행할수록 어려운 패턴 비중 증가
    while (x < end) {
      const prog = x / R.len, maxTier = Math.min(tierCap, 1 + Math.floor(prog * (R.tier + .6)));
      const cand = pool.filter(c => c.tier <= Math.max(1, maxTier));
      const tot = cand.reduce((a, c) => a + c.w * (c.tier === maxTier ? 1.6 : 1), 0);
      let k = r() * tot, ch = cand[0];
      for (const c of cand) { k -= c.w * (c.tier === maxTier ? 1.6 : 1); if (k <= 0) { ch = c; break; } }
      const w = ch.make(L, x, r, sf);
      x += w + (240 + r() * 260) * sf / D.density;
    }
    this.totalV = this.items.reduce((a, i) => a + i.v, 0) || 1;
  },

  // ----- 바닥/발판 판정 -----
  solidAt(x) { for (const g of this.gaps) if (x > g.x0 + 10 && x < g.x1 - 10) return false; return true; },
  supported(x) { return this.solidAt(x - 16) || this.solidAt(x + 16); },

  input(act, on) {
    const p = this.pl;
    if (act === 'jump') { if (on) { p.buffer = .13; p.jumpHeld = true; } else { p.jumpHeld = false; if (p.vy < -PH.cut && !p.cut) { p.vy = -PH.cut; p.cut = true; } } }
    if (act === 'slide') { this.downHeld = on; if (on && !p.ground && this.state === 'run') { p.vy = Math.max(p.vy, PH.fastFall); LF.sfx('whoosh'); } }
    if (act === 'throw' && on) this.throwHeart();
  },
  doJump() {
    const p = this.pl;
    if (p.ground || p.coyote > 0) { p.vy = -PH.jv; p.ground = false; p.plat = null; p.coyote = 0; p.jumps = 1; p.cut = false; p.slide = false; LF.sfx('jump'); LF.fx.dust(PX, p.y, 5); return true; }
    if (p.jumps < 2) { p.vy = -PH.jv2; p.jumps = 2; p.cut = false; p.spin = 1; LF.sfx('jump2'); LF.fx.stars(PX, p.y - 40, 8, { speed: 160, life: .5, size: 14 }); LF.fx.ring(PX, p.y - 50, '#fff', 20, .4); return true; }
    return false;
  },
  throwHeart() {
    if (this.state !== 'run' || this.cool > 0) return;
    this.cool = .42; LF.sfx('throw'); this.A.play('throw');
    this.proj.push({ x: this.pl.x + 40, y: this.pl.y - (this.pl.slide ? 30 : 70), t: 0 });
  },
  hurt(kind) {
    const p = this.pl; if (p.inv > 0 || p.star > 0 || this.state !== 'run') return;
    this.lives--; p.inv = 1.6; p.hurtT = .55; this.combo = 0; this.speed = this.speed * .7;
    LF.sfx(kind === 'pit' ? 'fall' : 'hit'); LF.audio.voice(kind === 'pit' ? 'cony_ack' : 'cony_huh', 1); // 장애물에 걸림: 어? / 구덩이에 빠짐: 앗! LF.shake(16); LF.flash(.35, '#ff6b8a'); this.hitstop = .14; this.punch = -8; this.vig = 1; this.A.setMood('swirl', 'wavy', 1);
    LF.fx.stars(PX, p.y - 60, 10); LF.fx.text(PX, p.y - 150, kind === 'pit' ? '앗, 떨어졌다!' : '아야!', { size: 38, stroke: '#7a5cff' });
    if (this.lives <= 0) this.fail('lives');
  },
  fail(why) {
    this.state = 'fail'; this.st0 = 0; this.why = why; LF.sfx('lose'); this.A.play('sad'); LF.audio.music('mini');
  },

  update(dt) {
    this.t += dt; LF.fx.update(dt); LF.ui.update(dt); this.pauseBtns.forEach(b => b.update(dt)); this.failBtns.forEach(b => b.update(dt));
    if (this.paused) return;
    if (this.hitstop > 0) { this.hitstop -= dt; dt *= .12; } // 맞는 순간 잠깐 멈칫
    this.punch = damp(this.punch, 0, 5, dt); this.boost = Math.max(0, this.boost - dt * .7); this.vig = Math.max(0, this.vig - dt * 1.4);
    {
      const ratio = this.state === 'run' || this.state === 'goal' ? clamp((this.speed / this.speed0 - .9) * 4, 0, 1) : 0;
      const intro = this.state === 'intro' ? -6 * clamp(1 - this.st0 / 3.4, 0, 1) : 0;
      this.fov = 40 + ratio * 6 + this.boost * 7 + (this.pl.star > 0 ? 4 : 0) + this.punch + intro; // 빨라질수록 시야가 넓어져 배경이 휙휙 지나감
    }
    this.st0 += dt;
    const p = this.pl, GY = LF.GY;
    this.A.vy = p.vy; this.A.update(dt); this.B.update(dt);
    if (this.state === 'intro') {
      const k = Math.ceil(3.6 - this.st0);
      if (this.st0 > 1.4 && k !== this.cnt && k >= 0 && k <= 3) { this.cnt = k; LF.sfx(k > 0 ? 'count' : 'go'); }
      this.A.play('idle');
      if (this.st0 > 3.6) { this.state = 'run'; this.st0 = 0; this.A.play('run'); }
      return;
    }
    if (this.state === 'fail') return;
    if (this.state === 'deliver') { this.updDeliver(dt); return; }

    this.time += dt; if (this.cool > 0) this.cool -= dt;
    // 속도: 진행할수록 빨라지고, 피격 후 회복
    const prog = clamp(p.x / this.R.len, 0, 1); this.A.tired = prog >= .7 ? 1 : 0; // 70% 넘게 뛰면 그때부터 땀
    const target = this.speed0 * (1 + prog * .14) * (prog > .88 ? 1.07 : 1) * (p.star > 0 ? 1.15 : 1);
    if (this.state === 'run') for (const [k, txt] of [[.25, '1/4 지점!'], [.5, '절반 왔어요! 더 빨라져요'], [.75, '3/4! 조금만 더!'], [.88, '마지막 스퍼트!!']]) if (prog >= k && !this.mile[k]) {
      this.mile[k] = 1; this.boost = 1; LF.flash(.3, '#ffffff'); LF.sfx('star'); LF.shake(6); LF.fx.text(LF.W / 2, 230, txt, { size: 56, stroke: '#2f6b4f', life: 1.4 });
    }
    this.speed = damp(this.speed, target, 1.2, dt);
    let sp = this.speed;
    if (this.state === 'goal') { sp = Math.max(160, sp * .5); }
    p.x += sp * dt;
    if (this.state === 'goal' && p.x >= this.partnerX - 200) { p.x = this.partnerX - 200; this.startDeliver(); return; }
    this.cam = Math.min(p.x - PX, this.camMax);
    // 속도감: 바람 줄무늬 + 잔상, 목숨 1개일 땐 심장 박동
    const sp01 = clamp((this.speed - this.speed0 * .8) / (this.speed0 * .5), 0, 1.3) + this.boost;
    this.sp01 = sp01;
    if (Math.random() < dt * (16 + 34 * sp01)) LF.fx.add({ type: 'streak', x: LF.W + 60, y: rand(30, GY + 90), vx: -(1500 + this.speed * 1.5), g: 0, life: .7, len: rand(140, 320), w: rand(2, 4), color: 'rgba(255,255,255,.4)' });
    this.trail.push({ x: p.x, y: p.y, t: this.t }); while (this.trail.length && this.t - this.trail[0].t > .3) this.trail.shift();
    if (this.lives === 1 && this.state === 'run') { this.hbT -= dt; if (this.hbT <= 0) { this.hbT = .9; LF.sfx('heartbeat'); } }
    if (this.state === 'run' && p.x >= this.goalX) { this.state = 'goal'; this.st0 = 0; p.inv = 0; }

    // 입력 버퍼 / 점프
    if (p.buffer > 0) { p.buffer -= dt; if (this.state === 'run' && this.doJump()) p.buffer = 0; }
    // 슬라이드
    const wantSlide = this.downHeld && p.ground && this.state === 'run';
    if (wantSlide && !p.slide) { p.slide = true; p.slideT = 0; LF.sfx('slide'); }
    if (p.slide) { p.slideT += dt; if (!this.downHeld && p.slideT > .3) p.slide = false; if (!p.ground) p.slide = false; }
    // 물리
    const prevY = p.y;
    p.vy += PH.g * dt * (p.jumpHeld && p.vy < 0 ? .82 : 1);
    p.y += p.vy * dt;
    if (p.coyote > 0) p.coyote -= dt;
    // 움직이는 발판
    for (const pl of this.plats) { if (pl.amp) pl.y = pl.y0 + Math.sin(this.t * TAU / pl.per + pl.ph) * pl.amp; }
    let landed = false;
    // 발판 착지 (위에서만)
    if (p.vy >= 0) for (const pl of this.plats) {
      const top = pl.y; if (p.x + 18 < pl.x || p.x - 18 > pl.x + pl.w) continue;
      if (prevY <= top + 12 + (pl.amp ? 14 : 0) && p.y >= top) { p.y = top; landed = true; p.plat = pl; break; }
    }
    // 바닥
    if (!landed && p.vy >= 0 && p.y >= GY && prevY <= GY + 4 && this.supported(p.x)) { p.y = GY; landed = true; p.plat = null; }
    if (landed) {
      if (!p.ground && p.vy > 700) { LF.fx.dust(PX, p.y, 6, { speed: 140 }); LF.sfx('land'); this.A.land(1); }
      p.vy = 0; p.ground = true; p.jumps = 0; p.spin = 0;
    } else if (p.ground) {
      // 발판/바닥 끝에서 떨어짐
      const still = p.plat ? (p.x + 18 >= p.plat.x && p.x - 18 <= p.plat.x + p.plat.w && Math.abs(p.y - p.plat.y) < 20) : (p.y >= GY - 1 && this.supported(p.x));
      if (still) { p.vy = 0; if (p.plat) p.y = p.plat.y; else p.y = GY; }
      else { p.ground = false; p.coyote = .09; p.plat = null; p.jumps = Math.max(p.jumps, 1) - (p.jumps === 0 ? 1 : 0); }
    }
    if (p.spin > 0) p.spin = Math.max(0, p.spin - dt * 2.6);
    // 구덩이 추락
    if (p.y > LF.H + 120) {
      this.hurt('pit');
      if (this.state === 'run') {
        const g = this.gaps.find(g => p.x > g.x0 - 60 && p.x < g.x1 + 60) || { x1: p.x };
        let nx = g.x1 + 90; while (!this.supported(nx)) nx += 40;
        p.x = nx; p.y = GY - 320; p.vy = 0; p.ground = false; p.jumps = 1; p.inv = 2;
      }
    }
    if (p.inv > 0) p.inv -= dt; if (p.star > 0) p.star -= dt; if (p.hurtT > 0) p.hurtT -= dt;
    // 애니메이션 선택
    if (p.hurtT > 0) this.A.play('hurt');
    else if (p.slide) this.A.play('slide');
    else if (!p.ground) this.A.play(p.vy < 0 ? 'jump' : 'fall');
    else if (this.A.anim !== 'throw' || this.A.at > .3) this.A.play('run', { speed: 11 + sp / 140 });
    // 발 먼지
    this.dustT -= dt; if (p.ground && !p.slide && this.dustT <= 0) { this.dustT = .12; LF.fx.dust(PX - 20, p.y, 1, { speed: 50, vx: -80, size: 12 }); }
    if (p.slide && Math.random() < .5) LF.fx.dust(PX - 30, p.y, 1, { speed: 60, vx: -160, size: 14 });
    if (p.star > 0 && Math.random() < .6) LF.fx.add({ x: PX - 30 + rand(-10, 10), y: p.y - rand(10, 90), vx: -200, g: 0, life: .5, size: 14, type: 'sparkle', color: pick(['#ffe680', '#fff', '#ffb7d5']) });

    // 투사체
    for (const pr of this.proj) { pr.x += 1150 * dt; pr.t += dt; }
    // 장애물
    const sx = this.cam;
    for (const o of this.obsL) {
      if (o.dead) continue;
      const S = OB[o.kind], ox = o.x - sx;
      if (ox > LF.W + 900) continue;
      o.t += dt;
      if (o.kind === 'roll' && ox < LF.W + 100) { o.act = true; o.x -= 270 * dt * this.sf; }
      if (o.kind === 'fly') o.x -= 80 * dt;
      if (o.kind === 'drop') {
        if (o.ph === 'wait' && o.x - p.x < 620 * this.sf) { o.ph = 'warn'; o.ft = 0; LF.sfx('tick'); }
        if (o.ph === 'warn') { o.ft += dt; if (o.ft > .55) { o.ph = 'fall'; o.ft = 0; } }
        if (o.ph === 'fall') { o.ft += dt; o.fall = Math.min(1, o.ft / .38); if (o.fall >= 1) { o.ph = 'land'; LF.shake(6); LF.fx.dust(ox + S.w / 2, GY, 8, { speed: 200 }); LF.sfx('land'); } }
      }
      // 하트 투사체 충돌
      if (S.shoot) for (const pr of this.proj) {
        if (pr.hit) continue; const b = this.obBox(o);
        if (pr.x > b.x0 - 14 && pr.x < b.x1 + 14 && pr.y > b.y0 - 22 && pr.y < b.y1 + 22) { pr.hit = true; this.popOb(o); }
      }
      if (o.dead) continue;
      if (o.kind === 'drop' && o.ph !== 'fall' && o.ph !== 'land') continue;
      const b = this.obBox(o), hb = this.hitbox();
      if (hb.x1 > b.x0 && hb.x0 < b.x1 && hb.y1 > b.y0 && hb.y0 < b.y1) { if (p.star > 0) this.popOb(o); else this.hurt('ob'); }
      else if (!o.near && !p.ground && ['low', 'tall', 'roll', 'drop'].includes(o.kind) && hb.x1 > b.x0 && hb.x0 < b.x1 && hb.y1 <= b.y0 && hb.y1 > b.y0 - 26) {
        o.near = 1; this.score += 50 * this.mult(); LF.sfx('perfect'); LF.fx.text(PX + 60, p.y - 170, '아슬아슬!', { size: 38, stroke: '#e08e00' }); LF.fx.stars(PX, p.y - 20, 6, { speed: 200, life: .5 });
      }
    }
    this.proj = this.proj.filter(pr => !pr.hit && pr.x - sx < LF.W + 100);
    this.obsL = this.obsL.filter(o => !o.dead || false).filter(o => o.x - sx > -400);
    // 아이템
    const hb = this.hitbox(), mag = this.buff.magnet || p.star > 0;
    for (const it of this.items) {
      if (it.got) continue;
      if (it.x - sx > LF.W + 80) break;
      if (mag && it.type !== 'star' && Math.abs(it.x - p.x) < 260 && Math.abs(it.y - (p.y - 50)) < 260) { it.x = damp(it.x, p.x, 9, dt); it.y = damp(it.y, p.y - 50, 9, dt); }
      if (it.x > hb.x0 - 22 && it.x < hb.x1 + 22 && it.y > hb.y0 - 26 && it.y < hb.y1 + 26) this.collect(it);
    }
    this.items = this.items.filter(i => !i.got && i.x - sx > -100);
    // 위급: 일정 시간 공중에 오래 있을 때 귀 펄럭
  },
  hitbox() { const p = this.pl, h = p.slide ? 48 : 98; return { x0: p.x - 22, x1: p.x + 22, y0: p.y - h, y1: p.y - 4 }; },
  obBox(o) {
    const S = OB[o.kind], GY = LF.GY;
    switch (o.kind) {
      case 'over': return { x0: o.x + 6, x1: o.x + S.w - 6, y0: -200, y1: GY - S.gap };
      case 'fly': { const cy = o.y0 + Math.sin(o.t * 3) * o.amp; return { x0: o.x + 10, x1: o.x + S.w - 10, y0: cy - S.h / 2 + 8, y1: cy + S.h / 2 - 6 }; }
      case 'drop': { const yb = o.ph === 'land' ? GY : lerp(-80, GY, ease.in(o.fall)); return { x0: o.x + 8, x1: o.x + S.w - 8, y0: yb - S.h + 6, y1: yb }; }
      default: return { x0: o.x + 8, x1: o.x + S.w - 8, y0: GY - S.h + 8, y1: GY };
    }
  },
  popOb(o) {
    o.dead = true; const b = this.obBox(o), cx = (b.x0 + b.x1) / 2 - this.cam, cy = (b.y0 + b.y1) / 2;
    LF.sfx('pop'); LF.fx.confetti(cx, cy, 14, { speed: 300 }); LF.fx.hearts(cx, cy, 5, { speed: 200 }); LF.fx.ring(cx, cy, '#ffd54a', 20);
    this.score += 30 * this.mult(); LF.fx.text(cx, cy - 40, '+' + 30 * this.mult(), { size: 30, stroke: '#ffb52e' });
  },
  mult() { return Math.min(5, 1 + Math.floor(this.combo / 10)); },
  collect(it) {
    it.got = true; const sx = it.x - this.cam;
    if (it.type === 'star') { this.pl.star = 5; LF.sfx('star'); LF.fx.stars(sx, it.y, 20); LF.fx.text(sx, it.y - 40, '블링 스타!', { size: 40, stroke: '#ffb52e' }); return; }
    this.got += it.v; this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
    const pts = (it.type === 'g' ? 50 : 10) * this.mult(); this.score += pts;
    if (it.type === 'g') { LF.sfx('gold'); LF.fx.hearts(sx, it.y, 10, { speed: 260 }); LF.fx.text(sx, it.y - 40, '+' + pts, { size: 36, stroke: '#ffb52e' }); }
    else { LF.sfx('coin'); LF.fx.burst(sx, it.y, 4, { types: ['sparkle'], colors: ['#fff', '#ffd1e3'], speed: 140, g: 0, life: .35, size: 16 }); }
    if (this.combo % 10 === 0) { LF.fx.text(PX + 40, this.pl.y - 170, `${this.combo} 콤보! x${this.mult()}`, { size: 34, stroke: '#3f8a66' }); LF.sfx('good'); }
  },

  startDeliver() {
    this.A.tired = 0; this.B.tired = 0; // 골인해서 만났을 땐 땀 없음
    this.state = 'deliver'; this.st0 = 0; this.pct = this.got / this.totalV; this.ok = this.pct >= this.quota;
    this.A.play('idle'); this.B.dir = -1; this.dv = { phase: 0, t: 0 };
    LF.audio.music(null);
  },
  updDeliver(dt) {
    const d = this.dv; d.t += dt;
    const ax = this.pl.x - this.cam, bx = this.partnerX - this.cam;
    if (d.phase === 0) { this.A.play('give'); if (d.t > .6) { d.phase = 1; d.t = 0; LF.sfx('throw'); } }
    else if (d.phase === 1) { d.k = Math.min(1, d.t / 1.5); if (d.k >= 1) { d.phase = 2; d.t = 0;
        if (this.ok) { LF.sfx('win'); this.B.play('shy'); LF.fx.hearts(bx, LF.GY - 140, 26, { speed: 380 }); LF.fx.confetti(LF.W / 2, 120, 70); this.A.play('cheer'); }
        else { LF.sfx('lose'); this.B.play('pout'); this.A.play('sad'); } } }
    else if (d.phase === 2) {
      if (this.ok) { if (d.t > .85) { d.phase = 3; d.t = 0; d.ax0 = ax; d.bx0 = bx; d.mx = (ax + bx) / 2; d.fxT = 0; d.last = ''; LF.sfx('whoosh'); } }
      else if (d.t > 3.2 && !this.done && this.state !== 'fail') this.fail('quota');
    }
    else if (d.phase === 3) { // 성공: 서로 달려와 → 꼬옥 → 안은 채 빙글빙글
      const H = LF.hug, p = H.pose(d.t, d.ax0, d.bx0, d.mx); this.dvp = p; H.anim(this.A, this.B, p);
      if (p.ph !== d.last) {
        if (p.ph === 'hug') { LF.sfx('kiss'); LF.fx.hearts(d.mx, LF.GY - 120, 18, { speed: 300 }); }
        if (p.ph === 'spin') { LF.sfx('perfect'); LF.fx.confetti(LF.W / 2, 120, 60); }
        if (p.ph === 'joy') { LF.audio.voice('cony_laugh', 1); LF.sfx('win'); LF.fx.stars(d.mx, LF.GY - 150, 14, { speed: 260 }); }
        d.last = p.ph;
      }
      if (p.ph === 'spin' || p.ph === 'joy') { d.fxT -= dt; if (d.fxT <= 0) { d.fxT = .16; LF.fx.hearts(d.mx + rand(-40, 40), LF.GY - 150, 2, { speed: 240 }); } }
      if (d.t > H.total() + .4 && !this.done) { this.done = true; LF.flow.runDone({ pct: this.pct, lives: this.lives, maxLives: this.maxLives, score: this.score, maxCombo: this.maxCombo }); }
    }
  },

  // ----- 그리기 -----
  draw(c) {
    const W = LF.W, H = LF.H, GY = LF.GY, t = this.t, cam = this.cam, p = this.pl;
    const is3d = LF.view3d(cam, GY, this.fov); // 하늘·나무·길·발판은 3D 캔버스가 그림
    if (!is3d) {
      LF.drawBG(c, this.th, cam, t);
      LF.drawGround(c, this.th, cam, this.gaps);
      for (const pl of this.plats) { const x = pl.x - cam; if (x > W || x + pl.w < 0) continue; drawPlat(c, x, pl.y, pl.w, this.th); }
    }
    // 결승 아치 & 상대
    const gx = this.goalX - cam; if (gx > -300 && gx < W + 300) drawGoal(c, gx, GY, t);
    const bx = this.partnerX - cam, hug = this.state === 'deliver' && this.dv.phase === 3 && this.dvp; // 포옹·빙글빙글 중엔 따로 그림
    if (bx < W + 200 && !hug) {
      LF.shadow(c, bx, GY + 4, 52);
      const near = this.state === 'run' && this.partnerX - p.x < 1400;
      if (near && this.B.anim === 'idle') this.B.play('wave');
      this.B.draw(c, bx, GY + 2, 140, { dir: -1 });
    }
    // 아이템
    for (const it of this.items) { const x = it.x - cam; if (x < -60 || x > W + 60) continue; drawItem(c, it, x, t); }
    // 장애물
    for (const o of this.obsL) { const x = o.x - cam; if (x < -300 || x > W + 300) continue; drawOb(c, this, o, x, t); }
    // 투사체
    for (const pr of this.proj) { const x = pr.x - cam; c.save(); c.translate(x, pr.y); c.rotate(Math.sin(pr.t * 30) * .3); G.drawHeart(c, 0, 0, 40, '#ff3d7a', '#fff', 4); c.restore(); LF.fx.add({ x: x - 20, y: pr.y + rand(-6, 6), vx: -100, g: 0, life: .25, size: 10, type: 'sparkle', color: '#fff' }); }
    // 주인공
    if (!hug) {
      const ax = p.x - cam;
      const onG = p.ground ? p.y : (this.supported(p.x) ? GY : null);
      if (onG != null) LF.shadow(c, ax, onG + 4, 46 * clamp(1 - (onG - p.y) / 400, .3, 1));
      if (p.star > 0) { G.glow(c, ax, p.y - 60, 120, `rgba(255,236,140,${.5 + Math.sin(t * 20) * .2})`); }
      // 콤보 불꽃 (잔상은 외곽선이 검게 겹쳐 보여서 뺐음)
      if (this.combo >= 10 && this.state === 'run') { const k = clamp((this.combo - 8) / 40, .3, 1.2); for (let i = 0; i < 3; i++) G.glow(c, ax - 40 - i * 45, p.y - 55 + Math.sin(t * 12 + i) * 6, (70 - i * 14) * k, `rgba(${i ? '255,120,160' : '255,170,60'},${.38 - i * .08})`); }
      const blink = p.inv > 0 && Math.floor(p.inv * 16) % 2 === 0;
      this.A.draw(c, ax, p.y + 2, 128, { alpha: blink ? .35 : 1, rot: p.spin > 0 ? (1 - p.spin) * TAU : 0 });
    }
    if (hug) LF.hug.draw(c, this.A, this.B, this.dvp, GY + 2, 128, 140);
    // 하트 날리기 (도착 연출)
    if (this.state === 'deliver' && this.dv.phase === 1) {
      const k = this.dv.k, ax = p.x - cam + 40, x = lerp(ax, bx - 30, k), y = lerp(GY - 100, GY - 150, k) - Math.sin(k * Math.PI) * 140;
      const hs = lerp(40, 270, ease.in(k)) + Math.sin(t * 20) * (4 + 10 * k); // 점점 커지는 하트
      G.glow(c, x, y, hs * .9, 'rgba(255,120,160,.35)');
      c.save(); c.translate(x, y); c.rotate(Math.sin(k * 9) * .25 * (1 - k * .6)); G.drawHeart(c, 0, 0, hs, '#ff3d7a', '#fff', 5 + hs * .02); c.restore();
    }
    LF.fx.draw(c);
    LF.drawWeather(c, this.th, t, cam);
    if (this.state === 'deliver' && this.dv.phase === 2) {
      const txt = this.ok ? LF.fmt(this.dv.t > .4 ? '{P}, 정말 고마워! 사랑해!' : '어머… 이렇게 많은 하트를…!') : LF.fmt(`하트가 모자라… (${Math.round(this.pct * 100)}% / ${Math.round(this.quota * 100)}%)`);
      LF.bubble(c, txt, bx, GY - 175, { size: 28, maxW: 460, pop: ease.back(clamp(this.dv.t / .35, 0, 1)) });
    }
    this.drawWarn(c); this.drawVig(c);
    LF.fx.drawTexts(c);
    this.drawHUD(c);
    this.drawOverlay(c);
  },

  // 다가오는 위험 경고: 오른쪽 가장자리에 삼각 표시 (가까울수록 크게 깜빡)
  drawWarn(c) {
    if (this.state !== 'run') return;
    const W = LF.W, GY = LF.GY, cam = this.cam, t = this.t, list = [];
    for (const g of this.gaps) { const d = g.x0 - cam - W; if (d > -10 && d < 900) list.push({ d, y: GY - 30, k: 'pit' }); }
    for (const o of this.obsL) { if (o.dead) continue; const b = this.obBox(o), d = b.x0 - cam - W; if (d > -10 && d < 900) list.push({ d, y: clamp(o.kind === 'over' ? GY - 70 : (b.y0 + b.y1) / 2, 110, GY - 10), k: o.kind }); }
    list.sort((a, b) => a.d - b.d);
    for (const w of list.slice(0, 3)) {
      const a = clamp(1 - w.d / 900, .3, 1), s = 1 + Math.sin(t * 14) * .1 + (w.d < 250 ? .15 : 0);
      c.save(); c.translate(W - 34, w.y); c.scale(s, s); c.globalAlpha = a;
      c.beginPath(); c.moveTo(-18, 0); c.lineTo(10, -22); c.lineTo(10, 22); c.closePath();
      c.fillStyle = w.k === 'pit' ? '#7a5cff' : w.k === 'over' ? '#ff9f3c' : '#ff4d5e'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#fff'; c.lineJoin = 'round'; c.stroke();
      G.text(c, w.k === 'over' ? '↓' : w.k === 'pit' ? '↑' : '!', 2, 2, { size: 20, color: '#fff' });
      c.restore();
    }
  },
  // 가장자리 어둡게(속도), 맞으면 빨갛게, 목숨 1개면 심장 뛰듯 붉게
  drawVig(c) {
    const W = LF.W, H = LF.H, sp = clamp(this.sp01 || 0, 0, 1.3);
    const low = this.lives === 1 && this.state === 'run' ? .1 + Math.sin(this.t * 7) * .05 : 0;
    const a = Math.min(.38, sp * .12 + this.vig * .3 + low);
    if (a < .02) return;
    const red = this.vig > .05 || low > 0, g = c.createRadialGradient(W / 2, H / 2, H * .55, W / 2, H / 2, H * 1.0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, red ? `rgba(220,40,70,${a})` : `rgba(20,30,50,${a})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  },

  drawHUD(c) {
    const W = LF.W, p = this.pl, t = this.t;
    if (this.state === 'intro') return;
    // 왼쪽: 초상화 + 목숨
    LF.panel(c, 18, 16, 120 + this.maxLives * 50, 96, { r: 48 });
    LF.portrait(c, this.A, 66, 64, 38);
    for (let i = 0; i < this.maxLives; i++) {
      const on = i < this.lives, x = 140 + i * 50, beat = on && i === this.lives - 1 ? 1 + Math.sin(t * 8) * .06 : 1;
      c.save(); c.translate(x, 64); c.scale(beat, beat);
      G.drawHeart(c, 0, 0, 42, on ? '#ff4d84' : '#eadde6', on ? '#fff' : '#d8c8d4', 4, on); c.restore();
    }
    // 가운데: 점수 + 콤보
    const sx = W / 2;
    c.fillStyle = 'rgba(255,255,255,.88)'; G.rr(c, sx - 150, 14, 300, 70, 35); c.fill(); c.lineWidth = 4; c.strokeStyle = '#ffb3d1'; c.stroke();
    G.text(c, 'SCORE', sx - 88, 49, { size: 20, color: '#ff8fb8' });
    G.text(c, String(this.score).padStart(6, '0'), sx + 38, 51, { size: 40, color: '#2f6b4f', stroke: '#fff', sw: 6 });
    if (this.combo >= 5) {
      const pop = 1 + Math.max(0, .3 - (this.time % 10) * 0) * 0 + Math.sin(t * 10) * .04;
      c.save(); c.translate(sx, 104); c.scale(pop, pop);
      c.fillStyle = G.lin(c, -90, 0, 90, 0, ['#3f8a66', '#ff5c98']); G.rr(c, -92, -20, 184, 40, 20); c.fill();
      G.text(c, `${this.combo} COMBO  x${this.mult()}`, 0, 1, { size: 24, color: '#fff' }); c.restore();
    }
    // 오른쪽: 하트 게이지 (액체가 차오르는 큰 하트)
    const hx = W - 170, hy = 66, hs = 100, pct = clamp(this.got / this.totalV, 0, 1);
    c.save();
    G.heart(c, hx, hy, hs); c.fillStyle = '#fff'; c.fill();
    c.save(); G.heart(c, hx, hy, hs); c.clip();
    const top = hy + hs * .46 - pct * hs * .95;
    c.fillStyle = G.lin(c, 0, top, 0, hy + hs / 2, ['#ff8fb8', '#ff3d7a']);
    c.beginPath(); c.moveTo(hx - hs, hy + hs);
    for (let x = -hs; x <= hs; x += 6) c.lineTo(hx + x, top + Math.sin(x * .1 + t * 5) * 3.5);
    c.lineTo(hx + hs, hy + hs); c.closePath(); c.fill();
    const qy = hy + hs * .46 - this.quota * hs * .95;
    c.setLineDash([6, 5]); c.strokeStyle = 'rgba(120,60,200,.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(hx - hs, qy); c.lineTo(hx + hs, qy); c.stroke(); c.setLineDash([]);
    c.restore();
    G.heart(c, hx, hy, hs); c.lineWidth = 5; c.strokeStyle = pct >= this.quota ? '#ffd54a' : '#ff8fb8'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(hx - 24, hy - 20, 12, 7, -.7, 0, TAU); c.fill();
    G.text(c, Math.round(pct * 100) + '%', hx, hy + 8, { size: 28, color: '#fff', stroke: '#3d6b55', sw: 6 });
    c.restore();
    G.text(c, `목표 ${Math.round(this.quota * 100)}%`, hx - 100, hy + 44, { size: 18, color: '#7a5cff', stroke: '#fff', sw: 5, align: 'right' });
    if (pct >= this.quota) G.text(c, 'OK!', hx + 64, hy - 34, { size: 22, color: '#ffb52e', stroke: '#fff', sw: 5 });
    // 일시정지
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(W - 52, 60, 32, 0, TAU); c.fill(); c.lineWidth = 4; c.strokeStyle = '#ffb3d1'; c.stroke();
    c.fillStyle = '#ff6fa5'; G.rr(c, W - 64, 46, 9, 28, 3); c.fill(); G.rr(c, W - 49, 46, 9, 28, 3); c.fill();
    // 하단: 진행 트랙
    const tx0 = 300, tx1 = W - 300, ty = LF.H - 26, prog = clamp(p.x / this.goalX, 0, 1);
    c.fillStyle = 'rgba(255,255,255,.7)'; G.rr(c, tx0, ty - 6, tx1 - tx0, 12, 6); c.fill();
    c.fillStyle = G.lin(c, tx0, 0, tx1, 0, ['#ffc2d9', '#2f6b4f']); G.rr(c, tx0, ty - 6, (tx1 - tx0) * prog, 12, 6); c.fill();
    for (const g of this.gaps) { const gx = tx0 + (tx1 - tx0) * clamp(g.x0 / this.goalX, 0, 1); c.fillStyle = 'rgba(120,60,120,.35)'; c.fillRect(gx, ty - 6, 2, 12); }
    LF.portrait(c, this.A, tx0 + (tx1 - tx0) * prog, ty - 4, 20, true);
    LF.portrait(c, this.B, tx1 + 30, ty - 4, 22, true);
    G.drawHeart(c, tx1 + 56, ty - 22, 20, '#ff4d84', '#fff', 3);
    // 터치 버튼
    if (LF.touch) {
      touchBtn(c, 110, LF.H - 120, 70, 'slide', this.downHeld);
      touchBtn(c, W - 120, LF.H - 120, 82, 'jump', p.jumpHeld);
      touchBtn(c, W - 290, LF.H - 90, 56, 'throw', this.cool > 0, this.cool / .42);
    } else if (this.time < 7 && this.state === 'run') {
      const a = clamp((7 - this.time) / 1.5, 0, 1);
      G.text(c, '스페이스·↑ 점프(2단)   ↓ 슬라이드(공중에선 급강하)   X 하트 던지기', W / 2, LF.H - 62, { size: 22, color: '#fff', stroke: 'rgba(200,60,120,.85)', sw: 7, alpha: a });
    }
  },
  drawOverlay(c) {
    const W = LF.W, H = LF.H, t = this.t;
    if (this.state === 'intro') {
      const k = this.st0;
      c.fillStyle = `rgba(255,220,236,${.55 * clamp(1 - (k - 3) / .6, 0, 1)})`; c.fillRect(0, 0, W, H);
      const e = ease.back(clamp(k / .5, 0, 1)), out = clamp((k - 1.6) / .4, 0, 1);
      if (out < 1) {
        c.save(); c.translate(W / 2 - out * 1400, 230); c.scale(e, e);
        c.fillStyle = G.lin(c, -380, 0, 380, 0, ['#ff7eb3', '#2f6b4f', '#3f8a66']); G.rr(c, -380, -70, 760, 140, 70); c.fill();
        c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke();
        G.text(c, `STAGE ${this.st.id}`, 0, -30, { size: 30, color: '#ffe8f3' });
        G.text(c, this.st.name, 0, 20, { size: 64, color: '#fff', stroke: '#c43070', sw: 10 });
        c.restore();
        G.text(c, LF.fmt(`하트를 ${Math.round(this.quota * 100)}% 이상 모아서 {Q에게} 전해줘!`), W / 2 - out * 1400, 350, { size: 34, color: '#fff', stroke: '#3d6b55', sw: 9, alpha: e });
        G.text(c, `난이도: ${this.D.name}`, W / 2 - out * 1400, 400, { size: 24, color: '#7a5cff', stroke: '#fff', sw: 6, alpha: e });
      }
      if (k > 1.6) { const n = Math.ceil(3.6 - k), f = (3.6 - k) % 1, s = 1 + (1 - f) * .5; c.save(); c.translate(W / 2, 330); c.scale(s, s); G.text(c, n > 0 ? String(n) : 'GO!', 0, 0, { size: 170, color: '#ffe680', stroke: '#2f6b4f', sw: 22, alpha: clamp(f * 3, 0, 1) }); c.restore(); }
    }
    if (this.state === 'run' && this.st0 < .8) G.text(c, 'GO!', W / 2, 330, { size: 170, color: '#ffe680', stroke: '#2f6b4f', sw: 22, alpha: 1 - this.st0 / .8 });
    if (this.state === 'goal' && this.st0 < 2) G.text(c, LF.fmt('{Q}가 보여요!'.replace('{Q}가', '{Q가}')), W / 2, 220, { size: 52, color: '#fff', stroke: '#2f6b4f', sw: 12, alpha: 1 - this.st0 / 2 });
    if (this.state === 'fail') {
      const e = ease.back(clamp(this.st0 / .5, 0, 1));
      c.fillStyle = `rgba(60,20,50,${.5 * Math.min(1, this.st0 * 3)})`; c.fillRect(0, 0, W, H);
      c.save(); c.translate(W / 2, H / 2 - 40); c.scale(e, e);
      LF.panel(c, -330, -200, 660, 330, { r: 40 });
      G.text(c, this.why === 'quota' ? '하트가 모자라요…' : '앙~ 넘어졌어요…', 60, -120, { size: 46, color: '#2f6b4f' });
      G.text(c, this.why === 'quota' ? `목표 ${Math.round(this.quota * 100)}% 중 ${Math.round(this.pct * 100)}% 모았어요` : `진행 ${Math.round(clamp(this.pl.x / this.goalX, 0, 1) * 100)}% · 하트 ${Math.round(this.got / this.totalV * 100)}%`, 60, -60, { size: 26, color: '#7a5a6a' });
      G.text(c, '포기하지 마! 다시 달려보자!', 60, 0, { size: 26, color: '#3f8a66' });
      c.restore();
      LF.shadow(c, W / 2 - 230, H / 2 + 60, 40);
      this.A.draw(c, W / 2 - 230, H / 2 + 60, 150);
      if (this.st0 > .4) this.failBtns.forEach(b => b.draw(c));
    }
    if (this.paused) {
      c.fillStyle = 'rgba(60,20,50,.5)'; c.fillRect(0, 0, W, H);
      LF.panel(c, W / 2 - 220, 190, 440, 300, { r: 40 });
      G.text(c, '잠깐 쉬어요', W / 2, 250, { size: 44, color: '#2f6b4f' });
      this.pauseBtns.forEach(b => b.draw(c));
    }
    if (LF.cam.flash > 0) { c.fillStyle = LF.cam.flashColor; c.globalAlpha = LF.cam.flash * .5; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
  },

  // ----- 입력 -----
  pointerdown(x, y, id) {
    if (this.paused) { LF.ui.down(x, y, this.pauseBtns); return; }
    if (this.state === 'fail') { if (this.st0 > .4) LF.ui.down(x, y, this.failBtns); return; }
    if (Math.hypot(x - (LF.W - 52), y - 60) < 40) { this.paused = true; LF.sfx('click'); return; }
    if (this.state === 'deliver') return;
    let act;
    if (LF.touch) {
      if (Math.hypot(x - (LF.W - 290), y - (LF.H - 90)) < 70) act = 'throw';
      else if (x < LF.W * .4 && y > LF.H * .45) act = 'slide';
      else act = 'jump';
    } else act = 'jump';
    this.ptrs.set(id, act); this.input(act, true);
  },
  pointerup(x, y, id) { const a = this.ptrs.get(id); if (a) { this.ptrs.delete(id); this.input(a, false); } },
  keydown(code) {
    if (code === 'Escape' || code === 'KeyP') { if (this.state !== 'fail') this.paused = !this.paused; return; }
    if (this.paused) return;
    if (this.state === 'fail') { if (code === 'Enter' || code === 'Space') LF.go('run', this.p); return; }
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') this.input('jump', true);
    if (code === 'ArrowDown' || code === 'KeyS') this.input('slide', true);
    if (code === 'KeyX' || code === 'KeyJ' || code === 'KeyZ') this.input('throw', true);
  },
  keyup(code) {
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') this.input('jump', false);
    if (code === 'ArrowDown' || code === 'KeyS') this.input('slide', false);
  },
};

// ---------- 그리기 도우미 ----------
const INK = '#4b2b1f';
function ol(c, fill, lw = 4) { c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); }
function face(c, x, y, s = 1, mood = 'smile') {
  c.fillStyle = INK; c.beginPath(); c.ellipse(x - 9 * s, y, 3.2 * s, 4 * s, 0, 0, TAU); c.ellipse(x + 9 * s, y, 3.2 * s, 4 * s, 0, 0, TAU); c.fill();
  c.strokeStyle = INK; c.lineWidth = 2.6 * s; c.lineCap = 'round'; c.beginPath();
  if (mood === 'angry') { c.moveTo(x - 15 * s, y - 10 * s); c.lineTo(x - 4 * s, y - 6 * s); c.moveTo(x + 15 * s, y - 10 * s); c.lineTo(x + 4 * s, y - 6 * s); c.moveTo(x - 6 * s, y + 11 * s); c.quadraticCurveTo(x, y + 5 * s, x + 6 * s, y + 11 * s); }
  else { c.arc(x, y + 5 * s, 5 * s, .3, Math.PI - .3); }
  c.stroke();
}
function drawPlat(c, x, y, w, th) {
  c.save();
  c.fillStyle = 'rgba(60,30,60,.15)'; G.rr(c, x + 4, y + 8, w, 30, 15); c.fill();
  G.rr(c, x, y, w, 30, 15); ol(c, th.indoor ? '#fff3e0' : th.night ? '#b6a3ff' : '#fff', 4);
  c.fillStyle = th.top; G.rr(c, x + 6, y + 4, w - 12, 10, 5); c.fill();
  for (let i = 0; i < 3; i++) G.drawHeart(c, x + w * (i + 1) / 4, y + 20, 10, '#ffb3d1', null, 0, false);
  c.restore();
}
function drawGoal(c, x, GY, t) {
  c.save();
  c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 4;
  G.rr(c, x - 14, GY - 230, 20, 230, 8); ol(c, '#fff'); G.rr(c, x + 196, GY - 230, 20, 230, 8); ol(c, '#fff');
  c.save(); c.translate(x + 101, GY - 250); c.rotate(Math.sin(t * 2) * .02);
  G.rr(c, -140, -38, 280, 76, 38); ol(c, G.lin(c, -140, 0, 140, 0, ['#ff9cc2', '#2f6b4f']));
  G.text(c, '♥ GOAL ♥', 0, 2, { size: 38, color: '#fff' }); c.restore();
  for (let i = 0; i < 8; i++) { const k = i / 7; G.drawHeart(c, lerp(x - 4, x + 206, k), GY - 205 + Math.sin(k * Math.PI) * 26, 20, ['#ff6fa5', '#ffd54a', '#8fe3c8'][i % 3], null, 0, false); }
  c.restore();
}
function drawItem(c, it, x, t) {
  const y = it.y + Math.sin(t * 5 + it.x * .02) * 5;
  if (it.type === 'h') { G.drawHeart(c, x, y, 40, '#ff4d84', '#fff', 4); }
  else if (it.type === 'g') { G.glow(c, x, y, 50, 'rgba(255,220,120,.7)'); const s = 58 + Math.sin(t * 7) * 4; G.drawHeart(c, x, y, s, G.lin(c, 0, y - 30, 0, y + 30, ['#ffe680', '#ffb52e']), '#fff', 5); if (Math.sin(t * 9 + it.x) > .4) G.sparkle(c, x + 24, y - 24, 11, '#fff'); }
  else if (it.type === 'star') { G.glow(c, x, y, 64, 'rgba(255,240,150,.85)'); c.save(); c.translate(x, y); c.rotate(Math.sin(t * 4) * .3); G.star(c, 0, 0, 32); ol(c, G.lin(c, 0, -32, 0, 32, ['#fff2a0', '#ffc22e']), 4); face(c, 0, 4, .8); c.restore(); }
}
function drawOb(c, S, o, x, t) {
  const GY = LF.GY, sk = S.R.skin, spec = OB[o.kind];
  c.save();
  switch (o.kind) {
    case 'low': lowSkin(c, sk.low, x, GY, spec.w, spec.h, t); break;
    case 'tall': tallSkin(c, sk.tall, x, GY, spec.w, spec.h, t); break;
    case 'over': overSkin(c, sk.over, x, GY, spec.w, GY - spec.gap, t); break;
    case 'roll': { const r = spec.h / 2; c.translate(x + r, GY - r); c.rotate(-o.x * .03);
      c.beginPath(); c.arc(0, 0, r, 0, TAU);
      if (sk.roll === 'snowball') { ol(c, '#f7fbff'); c.fillStyle = '#d6e9f7'; c.beginPath(); c.arc(-10, 8, 11, 0, TAU); c.arc(12, -10, 8, 0, TAU); c.fill(); }
      else if (sk.roll === 'egg') { c.beginPath(); c.ellipse(0, 0, r * .85, r, 0, 0, TAU); ol(c, '#fff8ea'); c.fillStyle = '#ffe1a8'; c.beginPath(); c.arc(6, 6, 9, 0, TAU); c.fill(); }
      else { ol(c, '#fff'); for (let i = 0; i < 6; i++) { c.fillStyle = ['#ff6fa5', '#ffd54a', '#6fc6ff'][i % 3]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r - 2, i * Math.PI / 3, (i + 1) * Math.PI / 3); c.fill(); } c.beginPath(); c.arc(0, 0, r, 0, TAU); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.fill(); }
      break; }
    case 'fly': { const b = S.obBox(o), cx = (b.x0 + b.x1) / 2 - S.cam, cy = (b.y0 + b.y1) / 2; c.translate(cx, cy); flySkin(c, sk.fly, t + o.t); break; }
    case 'drop': {
      if (o.ph === 'warn' || o.ph === 'fall') { const a = .3 + Math.abs(Math.sin(t * 16)) * .4; c.fillStyle = `rgba(255,60,90,${a})`; c.beginPath(); c.ellipse(x + spec.w / 2, GY, spec.w * .8, 12, 0, 0, TAU); c.fill(); G.text(c, '!', x + spec.w / 2, GY - 50, { size: 50, color: '#fff', stroke: '#ff3d6a', sw: 10 }); }
      if (o.ph === 'fall' || o.ph === 'land') { const b = S.obBox(o); dropSkin(c, S.R.drops, b.x0 - S.cam - 8, b.y1, spec.w, spec.h, o.ph === 'fall', t); }
      break; }
  }
  c.restore();
}
function lowSkin(c, k, x, GY, w, h, t) {
  c.save(); c.translate(x, GY);
  switch (k) {
    case 'bush': c.beginPath(); c.arc(w * .28, -h * .45, h * .45, Math.PI * .7, Math.PI * 1.9); c.arc(w * .62, -h * .6, h * .5, Math.PI * 1.1, Math.PI * 2.1); c.arc(w * .85, -h * .3, h * .32, Math.PI * 1.4, Math.PI * .4); c.lineTo(w * .05, 0); c.closePath(); ol(c, '#7fcf86');
      for (const [px, py] of [[.3, -.5], [.6, -.75], [.75, -.35]]) G.drawHeart(c, w * px, h * py, 12, '#ff8fbd', null, 0, false); break;
    case 'rock': c.beginPath(); c.moveTo(2, 0); c.quadraticCurveTo(-6, -h * .7, w * .3, -h); c.quadraticCurveTo(w * .7, -h * 1.1, w - 2, -h * .45); c.quadraticCurveTo(w + 6, -2, w - 6, 0); c.closePath(); ol(c, '#c9c2d6'); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(w * .35, -h * .72, 10, 5, -.5, 0, TAU); c.fill(); face(c, w / 2, -h * .38, 1); break;
    case 'cone': c.beginPath(); c.moveTo(w * .2, -4); c.lineTo(w * .5, -h); c.lineTo(w * .8, -4); c.closePath(); ol(c, '#ff9a5c'); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(w * .35, -h * .45); c.lineTo(w * .65, -h * .45); c.lineTo(w * .7, -h * .3); c.lineTo(w * .3, -h * .3); c.fill(); G.rr(c, 0, -10, w, 10, 4); ol(c, '#ff7a3c'); break;
    case 'dumbbell': G.rr(c, 0, -h, 22, h, 9); ol(c, '#a98bd8'); G.rr(c, w - 22, -h, 22, h, 9); ol(c, '#a98bd8'); G.rr(c, 18, -h / 2 - 6, w - 36, 12, 6); ol(c, '#c9c2d6'); G.drawHeart(c, 11, -h / 2, 13, '#ffd1e3', null, 0, false); G.drawHeart(c, w - 11, -h / 2, 13, '#ffd1e3', null, 0, false); break;
    case 'cake': G.rr(c, 2, -h * .7, w - 4, h * .7, 10); ol(c, '#ffe0c2'); c.fillStyle = '#ff9cc2'; c.beginPath(); c.moveTo(2, -h * .7); for (let i = 0; i <= 5; i++) c.quadraticCurveTo(2 + (i - .5) * (w - 4) / 5, -h * .45, 2 + i * (w - 4) / 5, -h * .7); c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke(); c.beginPath(); c.arc(w / 2, -h * .8, 9, 0, TAU); ol(c, '#ff3d6a', 3); break;
    case 'hydrant': G.rr(c, w * .2, -h, w * .6, h, 12); ol(c, '#ff6f8f'); G.rr(c, w * .05, -h * .6, w * .9, 14, 7); ol(c, '#ff6f8f'); c.beginPath(); c.arc(w / 2, -h, w * .3, Math.PI, 0); ol(c, '#ff6f8f'); break;
    case 'snowman': c.beginPath(); c.arc(w / 2, -h * .32, h * .32, 0, TAU); ol(c, '#fff'); c.beginPath(); c.arc(w / 2, -h * .78, h * .23, 0, TAU); ol(c, '#fff'); c.fillStyle = INK; c.beginPath(); c.arc(w / 2 - 6, -h * .82, 2.8, 0, TAU); c.arc(w / 2 + 6, -h * .82, 2.8, 0, TAU); c.fill(); c.fillStyle = '#ff9a3c'; c.beginPath(); c.moveTo(w / 2, -h * .77); c.lineTo(w / 2 + 14, -h * .75); c.lineTo(w / 2, -h * .72); c.fill(); c.fillStyle = '#ff6f8f'; c.fillRect(w / 2 - 16, -h * .58, 32, 7); break;
    case 'crate': G.rr(c, 2, -h, w - 4, h, 8); ol(c, '#e2b07c'); c.lineWidth = 3; c.strokeStyle = INK; c.beginPath(); c.moveTo(8, -h + 6); c.lineTo(w - 8, -6); c.moveTo(w - 8, -h + 6); c.lineTo(8, -6); c.stroke(); break;
    default: G.rr(c, 0, -h, w, h, 12); ol(c, '#ffc2d9');
  }
  c.restore();
}
function tallSkin(c, k, x, GY, w, h, t) {
  c.save(); c.translate(x, GY);
  switch (k) {
    case 'fence': c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -h + 18); c.lineTo(w / 2, -h); c.lineTo(w, -h + 18); c.lineTo(w, 0); c.closePath(); ol(c, '#fff'); c.fillStyle = '#ff9cc2'; c.fillRect(3, -h * .55, w - 6, 12); G.drawHeart(c, w / 2, -h + 36, 18, '#ff6fa5', null, 0, false); break;
    case 'boxes': for (let i = 0; i < 2; i++) { G.rr(c, 0, -h / 2 * (i + 1), w, h / 2, 8); ol(c, ['#ffd1e3', '#c9f0e0'][i]); G.drawHeart(c, w / 2, -h / 2 * (i + .5), 18, '#ff6fa5', null, 0, false); } break;
    case 'jars': for (let i = 0; i < 2; i++) { G.rr(c, 4, -h / 2 * (i + 1) + 6, w - 8, h / 2 - 6, 12); ol(c, ['#ffe08a', '#ffb7a0'][i]); G.rr(c, 0, -h / 2 * (i + 1), w, 12, 5); ol(c, '#fff'); } break;
    case 'lamp': G.rr(c, w / 2 - 7, -h, 14, h, 6); ol(c, '#7a6aa8'); c.beginPath(); c.arc(w / 2, -h, 22, 0, TAU); G.glow(c, w / 2, -h, 50, 'rgba(255,230,140,.7)'); c.beginPath(); c.arc(w / 2, -h, 20, 0, TAU); ol(c, '#fff2a0'); break;
  }
  c.restore();
}
function overSkin(c, k, x, GY, w, bottom, t) {
  c.save();
  const sw = Math.sin(t * 2.5 + x * .01) * 3;
  if (k === 'branch') {
    c.fillStyle = '#b98b68'; c.strokeStyle = INK; c.lineWidth = 4;
    G.rr(c, x - 30, bottom - 70, w + 60, 46, 22); ol(c, '#b98b68');
    c.beginPath(); c.arc(x + 20, bottom - 80, 50, 0, TAU); c.arc(x + w / 2, bottom - 100, 64, 0, TAU); c.arc(x + w - 20, bottom - 80, 50, 0, TAU); ol(c, '#7fcf86');
    for (let i = 0; i < 4; i++) { const lx = x + 10 + i * (w - 20) / 3; c.beginPath(); c.moveTo(lx, bottom - 30); c.quadraticCurveTo(lx + 8, bottom - 10 + sw, lx, bottom); c.lineWidth = 3; c.stroke(); c.beginPath(); c.ellipse(lx, bottom + 2 + sw, 10, 6, 0, 0, TAU); ol(c, '#9ade9a', 3); }
    c.fillStyle = INK; c.fillRect(x + w / 2 - 6, -10, 12, bottom - 150);
  } else if (k === 'bar') {
    c.fillStyle = '#9aa0b5'; c.fillRect(x + 10, -10, 10, bottom); c.fillRect(x + w - 20, -10, 10, bottom);
    G.rr(c, x - 10, bottom - 40, w + 20, 40, 14); ol(c, '#a98bd8'); G.text(c, '숙여!', x + w / 2, bottom - 19, { size: 22, color: '#fff' });
  } else {
    c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 14, -10); c.lineTo(x + 14, bottom - 60); c.moveTo(x + w - 14, -10); c.lineTo(x + w - 14, bottom - 60); c.stroke();
    c.save(); c.translate(x + w / 2, bottom - 36); c.rotate(sw * .01);
    G.rr(c, -w / 2 - 14, -40, w + 28, 76, 18); ol(c, G.lin(c, 0, -40, 0, 36, ['#ffb3d1', '#ff6fa5']));
    G.text(c, '♥ 슬라이드 ♥', 0, -2, { size: 22, color: '#fff' });
    c.restore();
    for (let i = 0; i < 5; i++) { const fx = x - 10 + i * (w + 20) / 4; c.beginPath(); c.moveTo(fx - 12, bottom); c.lineTo(fx, bottom + 16 + sw); c.lineTo(fx + 12, bottom); c.closePath(); ol(c, ['#ffd54a', '#8fe3c8', '#c7b0ff'][i % 3], 3); }
  }
  c.restore();
}
function flySkin(c, k, t) {
  const flap = Math.sin(t * 30);
  switch (k) {
    case 'bee':
      c.save(); c.globalAlpha = .85; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 8, -24 - flap * 3, 12, 18 + flap * 4, s * .4, 0, TAU); ol(c, 'rgba(230,245,255,.9)', 3); } c.restore();
      c.beginPath(); c.ellipse(0, 0, 32, 24, 0, 0, TAU); ol(c, '#ffd54a');
      c.save(); c.beginPath(); c.ellipse(0, 0, 32, 24, 0, 0, TAU); c.clip(); c.fillStyle = INK; c.fillRect(-6, -30, 10, 60); c.fillRect(12, -30, 8, 60); c.restore();
      c.beginPath(); c.ellipse(0, 0, 32, 24, 0, 0, TAU); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-18, -4, 7, 0, TAU); c.fill(); c.fillStyle = INK; c.beginPath(); c.arc(-20, -4, 3.5, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(30, 0); c.lineTo(42, 0); c.lineWidth = 3; c.stroke(); break;
    case 'balloon':
      c.beginPath(); c.ellipse(0, -6, 30, 36, 0, 0, TAU); ol(c, '#ff8fbd'); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-11, -20, 7, 11, .4, 0, TAU); c.fill(); face(c, 0, -6, .9, 'angry');
      c.beginPath(); c.moveTo(0, 30); c.quadraticCurveTo(10, 48, -4, 64); c.lineWidth = 3; c.strokeStyle = INK; c.stroke(); break;
    case 'cloud':
      c.beginPath(); c.arc(-24, 6, 22, 0, TAU); c.arc(0, -8, 28, 0, TAU); c.arc(26, 6, 22, 0, TAU); ol(c, '#a9b3cc'); face(c, 0, 4, 1, 'angry');
      if (Math.sin(t * 6) > .3) { c.fillStyle = '#ffe14a'; c.beginPath(); c.moveTo(4, 28); c.lineTo(-8, 44); c.lineTo(0, 44); c.lineTo(-6, 62); c.lineTo(12, 38); c.lineTo(4, 38); c.fill(); }
      break;
    case 'bird':
      c.beginPath(); c.ellipse(0, 0, 30, 22, 0, 0, TAU); ol(c, '#8fd0ff'); c.beginPath(); c.moveTo(-4, -6); c.quadraticCurveTo(10, -30 - flap * 14, 22, -8); ol(c, '#c4e8ff', 3);
      c.beginPath(); c.moveTo(-30, -2); c.lineTo(-44, 2); c.lineTo(-30, 8); ol(c, '#ffb52e', 3); c.fillStyle = INK; c.beginPath(); c.arc(-16, -6, 3.5, 0, TAU); c.fill(); break;
  }
}
function dropSkin(c, k, x, bottom, w, h, falling, t) {
  c.save(); c.translate(x + w / 2, bottom);
  if (k === 'icicle') { c.beginPath(); c.moveTo(-w / 2, -h); c.lineTo(w / 2, -h); c.lineTo(0, 0); c.closePath(); ol(c, '#d6f0ff'); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(-w / 4, -h + 6); c.lineTo(-4, -h + 6); c.lineTo(-6, -16); c.fill(); }
  else {
    if (falling) { c.strokeStyle = 'rgba(255,190,90,.6)'; c.lineWidth = 18; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -h / 2); c.lineTo(60, -h / 2 - 170); c.stroke(); }
    c.beginPath(); c.arc(0, -h / 2, h / 2, 0, TAU); ol(c, falling ? '#ffb347' : '#8b6fbf'); G.star(c, 0, -h / 2, h * .3); c.fillStyle = falling ? '#fff2a0' : '#ffd54a'; c.fill();
  }
  c.restore();
}
function touchBtn(c, x, y, r, kind, active, cd = 0) {
  c.save(); c.globalAlpha = .9; c.translate(x, y); const s = active ? .92 : 1; c.scale(s, s);
  c.fillStyle = kind === 'jump' ? '#ff6fa5' : kind === 'slide' ? '#3f8a66' : '#ffb52e';
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke();
  c.fillStyle = '#fff';
  if (kind === 'jump') { c.beginPath(); c.moveTo(0, -r * .45); c.lineTo(r * .42, r * .12); c.lineTo(-r * .42, r * .12); c.fill(); G.text(c, '점프', 0, r * .45, { size: r * .32, color: '#fff' }); }
  else if (kind === 'slide') { c.beginPath(); c.moveTo(0, r * .3); c.lineTo(r * .42, -r * .25); c.lineTo(-r * .42, -r * .25); c.fill(); G.text(c, '슬라이드', 0, r * .55, { size: r * .26, color: '#fff' }); }
  else { G.drawHeart(c, 0, -2, r * .9, '#fff', null, 0, false); if (cd > 0) { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + cd * TAU); c.fill(); } }
  c.restore();
}

// 초상화: 원 안에 캐릭터 머리
LF.portrait = (c, A, x, y, r, small) => {
  c.save();
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = small ? '#fff' : G.lin(c, 0, y - r, 0, y + r, ['#fff4f9', '#ffd6e8']); c.fill();
  c.save(); c.clip();
  const s = r * 2.35, oy = y - A.C.head.y * s + r * .12; // 머리가 원 중앙에 오도록
  LF.drawActor(c, A, x, oy, s, { dir: 1 });
  c.restore();
  c.lineWidth = small ? 3 : 4; c.strokeStyle = small ? '#ff8fb8' : '#fff'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
  c.restore();
};
