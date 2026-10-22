'use strict';
// 브라운 & 코니 벡터 캐릭터 리그 (단위: s = 캐릭터 키, 발 중앙이 원점, 위쪽이 -y)
// 모든 부위를 코드로 그리므로 아무리 확대해도 선명하고, 팔·다리·귀·눈·입이 따로 움직인다.

// 비율은 원본 영상 프레임에서 측정 (브라운 전체 키 = 1, 코니는 귀 포함 1.07)
LF.CHAR = {
  brown: {
    name: '브라운', fill: '#b9775a', shade: '#a5664b', line: '#4b2b1f', earIn: '#6e4535', muzzle: '#f8dfc3', blush: '#ff8f9a',
    head: { y: -.71, rx: .333, ry: .305, n: 2.0, top: 1, bot: 1 },
    ears: { x: .205, y: -.965, r: .078, rin: .045 },
    body: { top: -.47, bot: -.135, wTop: .178, wBot: .185 },
    hip: { x: .0985, y: -.2, w: .18 }, sho: { x: .231, y: -.405, len: .15, w: .108 },
    eye: { y: -.725, gap: .056, r: .021 }, mz: { dy: .092, rx: .076, ry: .063 }, shift: .14, lw: .017, crotch: -.215,
  },
  cony: {
    name: '코니', fill: '#ffffff', shade: '#f1ece9', line: '#3d2a22', earIn: '#ffa766', cheek: '#f8b9a2', blush: '#ff7f95',
    head: { y: -.678, rx: .307, ry: .285, n: 2.0, top: 1, bot: 1 },
    ear: { x: .085, y: -.866, len: .32, w: .112 },
    body: { top: -.43, bot: -.15, wTop: .175, wBot: .198 },
    hip: { x: .092, y: -.2, w: .168 }, sho: { x: .195, y: -.38, len: .145, w: .086 },
    eye: { y: -.694, gap: .047, r: .019 }, chk: { dy: .043, spread: .118, rx: .044 }, shift: .12, lw: .016, crotch: -.205,
  },
};
LF.otherKind = k => k === 'brown' ? 'cony' : 'brown';

// ---------- 애니메이션 (t: 경과 시간, o: 옵션) → 목표 포즈 ----------
const ANIM = {
  idle: t => { const b = Math.sin(t * 2.4); return { bob: -b * .006, sy: 1 + b * .013, sx: 1 - b * .008, armF: b * .03, armB: -b * .03, headRot: Math.sin(t * 1.1) * .035 }; },
  walk: t => { const p = t * 8, s = Math.sin(p), up = Math.max(0, s), dn = Math.max(0, -s); return { look: .6, liftF: up * .6, liftB: dn * .6, legF: s * .5, legB: -s * .5, armF: -s * .6, armB: s * .6, bob: -Math.abs(s) * .03, lean: .1, headRot: .04 }; },
  run: null, // 아래 RUN 클립(키프레임)으로 채움
  jump: null, // 아래 JUMP 클립
  fall: null, // 아래 FALL 클립
  slide: t => ({ sy: .58, sx: 1.24, lean: .3, legF: 1.45, legB: 1.25, armF: -1.7 + Math.sin(t * 30) * .1, armB: -1.5, eyes: 'squint', mouth: 'grin', bob: .01 }),
  hurt: t => ({ lean: Math.sin(t * 22) * .2, armF: 1.8 + Math.sin(t * 30) * .3, armB: -1.8 + Math.sin(t * 30) * .3, eyes: 'swirl', mouth: 'wavy', sy: .95, earDroop: .5 }),
  cheer: null, // 아래 CHEER 클립
  shy: t => ({ armF: 2.7, armB: 2.7, armTop: 1, lean: Math.sin(t * 3) * .08, headRot: Math.sin(t * 3) * .07, eyes: 'closed', mouth: 'grin', blush: 1 }),
  kiss: t => ({ lean: .2, headRot: .1 + Math.sin(t * 4) * .02, armF: -.55, armB: -.65, eyes: 'closed', mouth: 'kiss', blush: 1, legB: -.3, legF: .05 }),
  sad: t => ({ headY: .02, headRot: -.07 + Math.sin(t * 1.5) * .02, armF: -.04, armB: -.04, earDroop: .9, eyes: 'sad', mouth: 'frown', tears: 1, sy: .97 }),
  wave: t => ({ armF: 2.0 + Math.sin(t * 12) * .35, armB: .05, headRot: .06, eyes: 'happy', mouth: 'smile' }),
  throw: t => { const k = clamp(t / .22, 0, 1); return { armF: lerp(-.4, 1.9, ease.out(k)), armB: -.15, lean: .12, mouth: 'o' }; },
  give: t => ({ armF: 1.2 + Math.sin(t * 6) * .05, armB: -1.1, lean: .1, eyes: 'happy', mouth: 'smile', blush: .6 }),
  lift: (t, o) => { const k = o.k || 0; return { bob: (1 - k) * .055, sy: 1 - (1 - k) * .09, sx: 1 + (1 - k) * .05, armF: lerp(1.3, 2.05, k), armB: -lerp(1.3, 2.05, k), legF: (1 - k) * .3, legB: -(1 - k) * .3, eyes: k > .6 ? 'squint' : 'dot', mouth: k > .6 ? 'grin' : 'neutral', sweat: 1 }; },
  sit: t => ({ legF: 1.5, legB: 1.4, bob: .1, armF: .9 + Math.sin(t * 2) * .05, armB: -.6 }),
  hold: t => ({ armF: 2.05, armB: -2.05, bob: -Math.abs(Math.sin(t * 9)) * .02 }),
  dance: t => { const s = Math.sin(t * 6); return { lean: s * .15, bob: -Math.abs(s) * .06, armF: 1.5 + s * .5, armB: -1.5 + s * .5, legF: s * .3, legB: -s * .3, eyes: 'happy', mouth: 'smile' }; },
  dizzy: t => ({ lean: Math.sin(t * 4) * .15, headRot: Math.sin(t * 4 + 1) * .1, eyes: 'swirl', mouth: 'wavy', armF: .3, armB: .3 }),
  surprise: t => ({ bob: -Math.max(0, .12 - t * .5), armF: 1.7, armB: -1.7, eyes: 'wide', mouth: 'o', sy: 1.05 }),
  eat: t => ({ armF: 1.6 + Math.sin(t * 10) * .2, armB: .05, eyes: 'happy', mouth: Math.sin(t * 12) > 0 ? 'o' : 'neutral', blush: .5 }),
  pout: t => ({ armF: -.7, armB: -.7, headRot: -.1, eyes: 'angry', mouth: 'frown', lean: -.05 }),
};
// 새 파라미터: kneeF/B(무릎 접기, 라디안, 정강이가 뒤로) elbF/B(팔꿈치 접기, 아래팔이 앞으로) headSx/headSy(머리 눌림·늘어남, 목 기준) headX(머리 좌우) faceX(얼굴 3/4 돌림)
const POSE0 = { roll: 0, look: 0, side: 0, armOver: 0, liftF: 0, liftB: 0, bob: 0, lean: 0, sx: 1, sy: 1, headRot: 0, headY: 0, armF: 0, armB: 0, legF: 0, legB: 0, legLen: 1, armTop: 0, earDroop: 0, blush: 0, tears: 0, sweat: 0,
  kneeF: 0, kneeB: 0, elbF: 0, elbB: 0, headSx: 1, headSy: 1, headX: 0, faceX: 0, faceA: 1, shock: 0, armLen: 1, earA: 0, earBend: 0, wind: 0, earSpread: 0, earX: 0, earW: 1, earLen: 1 };

// ---------- 키프레임 클립 ----------
// clip = { fps, blend, keys: [{ f: 유지 프레임 수(@fps), ...포즈 }] }  한 주기를 반복한다.
//  - 각 키 포즈를 f프레임 동안 머물다가, 구간의 마지막 blend 비율 동안 다음 포즈로 빠르게 이동 (blend=1이면 전 구간 부드럽게, 작을수록 만화처럼 딱딱 끊김)
//  - 숫자가 아닌 값(eyes, mouth 등)은 현재 키의 것을 그대로 쓴다.
const MIRROR = { legF: 'legB', liftF: 'liftB', kneeF: 'kneeB', armF: 'armB', elbF: 'elbB' };
LF.mirrorPose = p => { const o = Object.assign({}, p); for (const a in MIRROR) { const b = MIRROR[a]; if (a in p || b in p) { o[a] = p[b]; o[b] = p[a]; } } return o; };
LF.clipLen = clip => clip.keys.reduce((s, k) => s + k.f, 0) / clip.fps;
// ----- 달리기: 원본 러닝머신 장면(15fps 손그림)을 키포즈로 옮김. 한 주기 ≈ 0.47초, 두 걸음 -----
//  올림(공중: 무릎 든 다리 + 뒤로 뻗은 다리, 머리 솟음·귀 뒤로) → 눌림(착지: 몸·머리가 납작) → 중간(다리 곧게)을 좌우 다리를 바꿔 반복.
const RUN_BASE = { side: .8, faceX: .08, legLen: 1.55, armLen: 1.7, eyes: 'strain', mouth: 'run3', sweat: 3, blush: .4, wind: 1, earSpread: .06, earX: -.11, earW: 1.15, earLen: .8 };
const RUN_A = Object.assign({ f: 2, lean: .3, bob: -.05, sy: 1.04, sx: .97, headRot: -.14, headSy: 1.04, headSx: .98, headY: -.02,
  legF: 1.05, kneeF: .55, legB: -1.0, kneeB: .9, armF: -.95, elbF: .9, armB: 1.35, elbB: .8, earA: -.3, earBend: -.2 }, RUN_BASE);
const RUN_B = Object.assign({ f: 2, lean: .16, bob: .03, sy: .94, sx: 1.05, headRot: -.03, headSy: .9, headSx: 1.06, headY: .025,
  legF: .5, kneeF: .35, legB: -.5, kneeB: .7, armF: -.4, elbF: .9, armB: .6, elbB: .9, earA: -.2, earBend: .0 }, RUN_BASE);
const RUN_C = Object.assign({ f: 2, lean: .1, bob: -.02, sy: 1.01, sx: 1, headRot: -.1, headSy: 1, headSx: 1, headY: 0,
  legF: .05, kneeF: .1, legB: -.35, kneeB: 1.6, armF: .15, elbF: .9, armB: .1, elbB: .9, earA: -.26, earBend: -.12 }, RUN_BASE);
LF.RUN = { fps: 30, blend: .45, xfade: .1, keys: [RUN_A, RUN_B, RUN_C, LF.mirrorPose(RUN_A), Object.assign(LF.mirrorPose(RUN_B), { f: 3 }), Object.assign(LF.mirrorPose(RUN_C), { f: 3 })] }; // 원본 홀드: 2·2·2 · 2·3·3프레임
ANIM.run = LF.RUN;

// ----- 점프 (한 번 재생, 마지막 포즈 유지) -----
// 원본 낚시 영상(9.5~9.8초) 브라운이 코니에게 날아가 안기는 장면을 참고: 몸이 앞으로 길게 뻗고, 팔은 앞·위로, 다리는 뒤로 끌린다.
// 디딤(몸이 늘어남) → 무릎을 끌어올리며 상승 → 정점에서 웅크려 떠 있음. 착지는 A.land()가 눌림으로 마무리.
const SIDE = { side: .9, faceX: .1 };
LF.JUMP = { fps: 30, blend: .6, xfade: .06, once: true, keys: [
  Object.assign({ f: 2, lean: .12, bob: .02, sy: 1.14, sx: .9, headSy: 1.06, headSx: .96, headRot: .05, headY: -.02,
    legF: .25, kneeF: .2, legB: -.55, kneeB: .1, armF: .9, armB: .5, eyes: 'dot', mouth: 'o' }, SIDE),
  Object.assign({ wind: .7, earA: -.1, earBend: -.15, f: 3, lean: .3, bob: -.06, sy: 1.08, sx: .94, headSy: 1.03, headRot: -.06, headY: -.015,
    legF: 1.0, kneeF: 1.3, legB: -.45, kneeB: 1.1, armF: 1.75, armB: 1.45, elbF: .25, elbB: .25, eyes: 'dot', mouth: 'grin' }, SIDE),
  Object.assign({ f: 6, lean: .2, bob: -.07, sy: 1.03, sx: .98, headRot: -.02,
    legF: .9, kneeF: 1.5, legB: -.3, kneeB: 1.3, armF: 1.95, armB: 1.6, elbF: .2, elbB: .2, eyes: 'dot', mouth: 'grin' }, SIDE),
] };
ANIM.jump = LF.JUMP;

// ----- 낙하 (반복, 정면) -----
// 떨어질 때는 카메라를 향해 돌아서서 팔을 벌려 번갈아 허우적, 다리는 벌려 번갈아 버둥. 눈은 휘둥그레, 입은 "오".
const FALL_A = { wind: .9, earA: .06, earBend: .12, f: 3, side: 0, bob: -.05, sy: 1.08, sx: .95, headSy: 1.05, headRot: -.09, headY: -.015, roll: .05,
  armF: 2.2, armB: -1.5, legF: .38, liftF: .1, legB: -.3, liftB: .55, eyes: 'wide', mouth: 'o' };
const FALL_B = { wind: .9, earA: .06, earBend: .12, f: 3, side: 0, bob: -.02, sy: 1.05, sx: .97, headSy: 1.03, headRot: .09, headY: -.01, roll: -.05,
  armF: 1.5, armB: -2.2, legF: .3, liftF: .55, legB: -.38, liftB: .1, eyes: 'wide', mouth: 'o' };
LF.FALL = { fps: 30, blend: .7, xfade: .1, keys: [FALL_A, FALL_B] };
ANIM.fall = LF.FALL;

// ----- 환호 (반복, 정면) -----
// 웅크림(예비동작) → 발사(몸이 늘어남) → 정점(만세, 팔이 몸보다 늦게 올라가 넘침) → 내려오며 → 착지 눌림 → 여운. 한 번 뛸 때마다 고개가 반대쪽으로 기울어요.
const CH_ARMS = (a, e) => ({ armF: a, armB: -a, elbF: e || 0, elbB: e || 0 });
const CHEER_SET = (tilt, dir) => [
  Object.assign({ f: 3, bob: .035, sy: .88, sx: 1.1, headSy: .94, headSx: 1.04, headY: .02, headRot: -tilt * .5, roll: 0, eyes: 'happy', mouth: 'smile' }, CH_ARMS(.35)),
  Object.assign({ f: 2, bob: -.12, sy: 1.12, sx: .92, headSy: 1.05, headRot: tilt * .4, liftF: .3, liftB: .3, eyes: 'happy', mouth: 'smile' }, CH_ARMS(2.0)),
  Object.assign({ f: 4, bob: -.2, sy: 1.02, sx: .99, headRot: tilt, roll: tilt * .5, liftF: .6, liftB: .6, eyes: 'happy', mouth: 'smile' }, CH_ARMS(2.45)),
  Object.assign({ f: 3, bob: -.07, sy: 1.06, sx: .96, headRot: tilt * .6, liftF: .25, liftB: .25, eyes: 'happy', mouth: 'smile' }, CH_ARMS(2.3)),
  Object.assign({ f: 3, bob: .04, sy: .88, sx: 1.1, headSy: .95, headSx: 1.04, headY: .02, headRot: tilt * .2, eyes: 'happy', mouth: 'smile' }, CH_ARMS(1.95)),
  Object.assign({ f: 2, bob: 0, sy: 1, sx: 1, headRot: -tilt * .2, eyes: 'happy', mouth: 'smile' }, CH_ARMS(2.5)),
];
LF.CHEER = { fps: 30, blend: .5, xfade: .1, keys: [...CHEER_SET(.07), ...CHEER_SET(-.07)] };
ANIM.cheer = LF.CHEER;
LF.sampleClip = (clip, t) => {
  const keys = clip.keys, total = keys.reduce((s, k) => s + k.f, 0);
  let u = clip.once ? clamp(t * clip.fps, 0, total - 1e-6) : ((t * clip.fps) % total + total) % total, i = 0;
  while (u >= keys[i].f) { u -= keys[i].f; i++; }
  const a = keys[i], b = clip.once && i === keys.length - 1 ? a : keys[(i + 1) % keys.length], k = u / a.f, bl = clip.blend == null ? .4 : clip.blend;
  const w = ease.inOut(clamp((k - (1 - bl)) / bl, 0, 1));
  const out = {};
  for (const n in POSE0) { const va = a[n] != null ? a[n] : POSE0[n], vb = b[n] != null ? b[n] : POSE0[n]; out[n] = va + (vb - va) * w; }
  for (const n of ['eyes', 'mouth']) if (a[n] != null) out[n] = a[n];
  return out;
};

LF.Actor = class {
  constructor(kind) {
    this.kind = kind; this.C = LF.CHAR[kind];
    this.anim = 'idle'; this.at = 0; this.opt = {}; this.dir = 1; this.turn = .55;
    this.p = Object.assign({}, POSE0); this.eyes = 'dot'; this.mouth = 'neutral';
    this.mood = null; this.moodT = 0; this.blink = 0; this.blinkT = rand(1, 3);
    this.ear = { a: 0, v: 0 }; this.vy = 0; this.prevBob = 0; this.costume = null;
    this.from = Object.assign({}, POSE0); this.xf = 1; this.ph = 0; this.imp = 0; this.impV = 0; this.tired = 0; this.sweatA = 0; // tired: 달리기 후반(70%~)에만 1 → 땀
  }
  land(k = 1) { this.imp = k; this.impV = 0; } // 착지 충격: 몸이 눌렸다가 튕기며 가라앉는다 (포즈 위에 얹는 스프링)
  play(name, opt) { if (name !== this.anim) { this.anim = name; this.at = 0; this.from = Object.assign({}, this.p); this.xf = 0; this.ph = 0; } if (opt) this.opt = opt; return this; }
  setMood(eyes, mouth, dur = 1.2) { this.mood = { eyes, mouth }; this.moodT = dur; return this; }
  update(dt) {
    this.at += dt; this.sweatA = damp(this.sweatA, this.tired ? 1 : 0, 4, dt);
    if (this.imp || this.impV) { this.impV += (-this.imp * 320 - this.impV * 14) * dt; this.imp += this.impV * dt; if (Math.abs(this.imp) < .002 && Math.abs(this.impV) < .02) this.imp = this.impV = 0; }
    const def = ANIM[this.anim] || ANIM.idle;
    let T;
    if (def.keys) {
      // 키프레임 클립: 포즈를 그대로 적용 (딱딱한 포즈 변화를 살리려고 추적 지연 없음). 다른 동작에서 넘어올 때만 잠깐 섞는다.
      this.ph += dt * clamp((this.opt.speed || 14) / 14, .8, 1.35);
      T = Object.assign({}, POSE0, LF.sampleClip(def, this.ph));
      this.xf = Math.min(1, this.xf + dt / (def.xfade || .1)); const w = ease.inOut(this.xf);
      for (const k in POSE0) this.p[k] = this.xf < 1 ? lerp(this.from[k], T[k], w) : T[k];
    } else {
      T = Object.assign({}, POSE0, def(this.at, this.opt));
      const rate = this.anim === 'throw' ? 40 : this.anim === 'slide' ? 30 : 16;
      for (const k in POSE0) this.p[k] = damp(this.p[k], T[k], rate, dt);
    }
    this.eyes = T.eyes || 'dot'; this.mouth = T.mouth || 'neutral';
    if (this.moodT > 0) { this.moodT -= dt; if (this.mood.eyes) this.eyes = this.mood.eyes; if (this.mood.mouth) this.mouth = this.mood.mouth; }
    this.blinkT -= dt; if (this.blinkT <= 0) { this.blink = .13; this.blinkT = rand(2, 4.5); } if (this.blink > 0) this.blink -= dt;
    // 귀의 2차 움직임 (스프링)
    const bobV = (this.p.bob - this.prevBob) / Math.max(dt, 1e-4); this.prevBob = this.p.bob;
    const tgt = clamp(this.vy / 2400 + bobV * 1.8, -.7, .7);
    this.ear.v += ((tgt - this.ear.a) * 150 - this.ear.v * 9) * dt; this.ear.a += this.ear.v * dt;
  }
  draw(c, x, y, s, o = {}) { LF.drawActor(c, this, x, y, s, o); }
};

// ---------- 그리기 ----------
// 원본처럼: 몸통·팔·다리는 하나의 실루엣(겹치는 곳에 선 없음) + 안쪽에 팔/다리 구분선만 살짝.
// 방법: 모든 부위를 외곽선 색으로 두껍게 한 번 → 몸 색으로 한 번 더 칠하면 바깥 테두리만 남는다.
LF.shadow = (c, x, y, w, alpha = .18) => { c.fillStyle = `rgba(60,30,40,${alpha})`; c.beginPath(); c.ellipse(x, y, w, w * .2, 0, 0, TAU); c.fill(); };

function union(c, C, shapes, fill = C.fill) {
  c.lineJoin = 'round'; c.lineCap = 'round';
  for (const f of shapes) { c.save(); f(c); c.lineWidth = C.lw * 2; c.strokeStyle = C.line; c.stroke(); c.fillStyle = C.line; c.fill(); c.restore(); }
  for (const f of shapes) { c.save(); f(c); c.fillStyle = fill; c.fill(); c.restore(); }
}
// 팔(어깨→손). 브라운: 손가락 없는 둥근 덩어리 / 코니: 바깥으로 살짝 나온 작은 손 + 아래쪽 아주 작은 손가락 혹
// side: +1 = 왼팔(몸통이 +x 쪽), -1 = 오른팔
// bend > 0 이면 아래팔이 +x 쪽으로, < 0 이면 -x 쪽으로 접힌다 (정면에선 안쪽=가슴 쪽, 옆모습에선 앞쪽).
function armShapes(C, kind, x, y, ang, len, w, side, bend = 0) {
  const bent = Math.abs(bend) > .02, L1 = bent ? len * .52 : len, L2 = len - L1, end = bent ? L2 : len;
  const upper = c => { c.translate(x, y); c.rotate(-ang); };
  const lower = c => { upper(c); if (bent) { c.translate(0, L1); c.rotate(-bend); } };
  const out = [];
  if (bent) out.push(c => { upper(c); G.rr(c, -w / 2, -w * .5, w, L1 + w * .5, w / 2); });
  out.push(c => { lower(c); G.rr(c, -w / 2, -w * .5, w, end + w * .5, w / 2); });
  if (kind === 'cony') {
    const o = -side * w * .22; // 바깥쪽
    out.push(c => { lower(c); c.beginPath(); c.ellipse(o, end, w * .62, w * .56, 0, 0, TAU); });
    for (const k of [0, 1]) out.push(c => { lower(c); c.beginPath(); c.arc(o + (k ? -side * w * .2 : side * w * .08), end + w * .22, w * .34, 0, TAU); });
  }
  return out;
}
function armLine(c, C, x, y, ang, len, w, side) { // 팔 안쪽 선: 팔 중간부터 몸통과 만나는 곳까지 곧게
  c.save(); c.translate(x, y); c.rotate(-ang); c.strokeStyle = C.line; c.lineWidth = C.lw; c.lineCap = 'round';
  c.beginPath(); c.moveTo(side * w * .5, len * .28); c.lineTo(side * w * .5, len + w * .25); c.stroke(); c.restore();
}
function legShape(x, y, ang, len, w) {
  return c => {
    c.translate(x, y); c.rotate(-ang);
    // 윗부분은 관절(엉덩이) 중심의 반원 → 다리를 크게 흔들어도 모서리가 몸 밖으로 삐져나오지 않음
    const hw = w / 2, r = w * .42, toe = w * .06, r2 = w * .36;
    c.beginPath(); c.moveTo(-hw, 0); c.arc(0, 0, hw, Math.PI, 0); c.lineTo(hw, len - w * .6);
    c.quadraticCurveTo(hw + toe * .7, len - w * .48, hw + toe, len - r2); c.quadraticCurveTo(hw + toe, len, hw + toe - r2, len);
    c.lineTo(-hw + r, len); c.quadraticCurveTo(-hw, len, -hw, len - r); c.closePath();
  };
}
// 무릎이 있는 다리: 허벅지 + 정강이(발 포함). bend=0이면 기존 다리 모양 그대로. 정강이는 무릎에서 뒤쪽으로 접힌다.
function legShapes(x, y, ang, len, w, bend = 0) {
  if (bend < .02) return [legShape(x, y, ang, len, w)];
  const L1 = len * .5, L2 = len - L1, hw = w / 2;
  return [
    c => { c.translate(x, y); c.rotate(-ang); c.beginPath(); c.moveTo(-hw, 0); c.arc(0, 0, hw, Math.PI, 0); c.lineTo(hw, L1); c.arc(0, L1, hw, 0, Math.PI); c.closePath(); },
    c => { c.translate(x, y); c.rotate(-ang); c.translate(0, L1); c.rotate(bend); legShape(0, 0, 0, L2, w)(c); },
  ];
}
function legLine(c, C, x, y, ang, len, w, side, from) { // 다리 사이 구분선
  c.save(); c.translate(x, y); c.rotate(-ang); c.strokeStyle = C.line; c.lineWidth = C.lw; c.lineCap = 'round';
  c.beginPath(); c.moveTo(side * w / 2, from + .02); c.lineTo(side * w / 2, len - w * .14); c.stroke(); c.restore();
}
function bodyShape(b) {
  return c => {
    const bh = b.bot - b.top;
    c.beginPath(); c.moveTo(-b.wTop, b.top);
    c.bezierCurveTo(-b.wTop - .02, b.top + bh * .55, -b.wBot, b.bot - .06, -b.wBot + .05, b.bot);
    c.lineTo(b.wBot - .05, b.bot);
    c.bezierCurveTo(b.wBot, b.bot - .06, b.wTop + .02, b.top + bh * .55, b.wTop, b.top);
    c.closePath();
  };
}

LF.drawActorRaw = (c, A, x, y, s, o = {}) => {
  if (LF.drawSprite && LF.drawSprite(c, A, x, y, s, o)) return; // 이 캐릭터·동작에 스프라이트(그림 프레임)가 있으면 그것으로 그림
  const C = A.C, p0 = A.p, k0 = A.imp || 0, dir = o.dir != null ? o.dir : A.dir;
  let p = !k0 ? p0 : Object.assign({}, p0, { sy: p0.sy * (1 - .2 * k0), sx: p0.sx * (1 + .12 * k0), bob: p0.bob + .03 * k0, kneeF: p0.kneeF + .6 * Math.max(k0, 0), kneeB: p0.kneeB + .6 * Math.max(k0, 0), headSy: p0.headSy * (1 - .06 * k0) });
  if (o.pose) p = Object.assign({}, p, o.pose); // 장면에서 몸 방향 등을 덮어쓸 때 (예: 손잡고 도는 장면)
  c.save();
  c.translate(x, y);
  if (o.alpha != null) c.globalAlpha *= o.alpha;
  c.scale(s * dir, s);
  if (o.rot) { c.translate(0, -.45); c.rotate(o.rot * dir); c.translate(0, .45); }
  c.translate(0, p.bob + (1 - p.legLen) * (-C.hip.y)); // 다리 길이가 바뀌어도 발은 땅에 (짧아지면 엉덩이가 내려앉음)
  if (p.roll) c.rotate(p.roll);
  c.scale(p.sx, p.sy);
  const H = C.hip, S = C.sho, b = C.body;
  const legL = -H.y * p.legLen, lB = p.legB * .8, lF = p.legF * .8;
  const front = p.armTop < .5;
  // side: 달리기용 옆모습(0=정면, 1=옆). 옆모습에선 다리가 앞뒤로 엇갈리고 앞팔은 몸 앞, 뒷팔은 몸 뒤에서 흔들린다.
  const sd = clamp(p.side, 0, 1), side = sd > .5;
  const spread = (A.kind === 'cony' ? .2 : .07) * (1 - sd), aB = -spread + p.armB, aF = spread + p.armF;
  const hx = lerp(H.x, .028, sd), shx = lerp(S.x, .045, sd);
  const bd = Object.assign({}, b, { wTop: b.wTop * (1 - .05 * sd), wBot: b.wBot * (1 - .05 * sd) });
  // 기울기는 상체(팔/몸통/머리)에만: 엉덩이 기준 회전으로 어깨 좌표 계산
  const ca = Math.cos(p.lean), sa = Math.sin(p.lean);
  const rotP = (px, py) => { const dy = py - H.y; return [px * ca - dy * sa, H.y + px * sa + dy * ca]; };
  const [sbx, sby] = rotP(-shx, S.y), [sfx, sfy] = rotP(shx, S.y);
  const bodyF = c2 => { c2.translate(0, H.y); c2.rotate(p.lean); c2.translate(0, -H.y); bodyShape(bd)(c2); };
  const legBk = legShapes(-hx, H.y - p.liftB * .05, lB, legL * (1 - p.liftB * .5), H.w, p.kneeB), legFr = legShapes(hx, H.y - p.liftF * .05, lF, legL * (1 - p.liftF * .5), H.w, p.kneeF);
  const armBk = armShapes(C, A.kind, sbx, sby, aB - p.lean, S.len * p.armLen, S.w, 1, p.elbB), armFr = armShapes(C, A.kind, sfx, sfy, aF - p.lean, S.len * p.armLen, S.w, -1, p.elbF * lerp(-1, 1, sd)); // 앞팔(화면 오른쪽)은 정면일 때 안쪽(-x)으로 접힘
  if (side) {
    // 뒤쪽 팔·다리는 살짝 어둡게 몸 뒤에 → 몸통+앞다리 → (머리 전에) 앞팔
    if (front) union(c, C, armBk, C.shade);
    union(c, C, legBk, C.shade);
    union(c, C, [...legFr, bodyF]);
    if (front) union(c, C, armFr);
  } else if (p.armOver > .5) {
    union(c, C, [...legBk, ...legFr, bodyF]);
    if (front) union(c, C, [...armBk, ...armFr]); // 몸 앞으로 교차하는 팔은 테두리를 살려 위에
  } else {
    const shapes = [...legBk, ...legFr, bodyF];
    if (front) shapes.push(...armBk, ...armFr);
    union(c, C, shapes);
  }
  // 안쪽 구분선: 다리 사이, 팔 안쪽
  const from = b.bot - H.y - .005;
  // 가랑이 선: 몸통 아래쪽에서 시작해 두 다리 사이 틈으로 이어짐
  if (!side) {
    c.save(); c.translate(0, H.y); c.rotate(p.lean); c.translate(0, -H.y);
    c.strokeStyle = C.line; c.lineWidth = C.lw; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, C.crotch); c.lineTo(0, b.bot + .01); c.stroke(); c.restore();
  }
  if (front && !side) { if (Math.abs(p.armB) < .3) armLine(c, C, sbx, sby, aB - p.lean, S.len, S.w, 1); if (Math.abs(p.armF) < .3) armLine(c, C, sfx, sfy, aF - p.lean, S.len, S.w, -1); }
  // 머리 (상체 기울기 + 고개)
  c.save();
  c.translate(0, H.y); c.rotate(p.lean); c.translate(0, -H.y);
  const neckY = b.top + .04;
  c.translate(p.headX, neckY + p.headY); c.rotate(p.headRot); c.scale(p.headSx, p.headSy); c.translate(0, -neckY); // 목을 기준으로 눌리고 늘어남
  drawHead(c, A, C, p);
  c.restore();
  // 얼굴을 감싸는 팔 (부끄러움)
  if (!front) {
    c.save(); c.translate(0, p.headY);
    union(c, C, [...armShapes(C, A.kind, sbx, sby, -p.armB, S.len * 1.25, S.w, 1), ...armShapes(C, A.kind, sfx, sfy, p.armF, S.len * 1.25, S.w, -1)]);
    // 어깨 쪽 외곽선 지우기: 몸통 안쪽에 있는 어깨 둘레를 몸 색으로 덮어 팔이 몸에서 이어져 나오게 함 (바깥 윤곽은 그대로)
    c.save(); bodyF(c); c.clip();
    c.fillStyle = C.fill;
    for (const sx of [-shx, shx]) { c.beginPath(); c.arc(sx, S.y + S.w * .1, S.w * .72, 0, TAU); c.fill(); }
    c.restore();
    c.restore();
  }
  c.restore();
};

// 코니 귀: 뿌리가 넓고 위로 갈수록 살짝 좁아지는 둥근 끝
function earPath(c, w, len, bend = 0) {
  const hw = w / 2, tw = hw * .78, B = (x, y) => [x + bend * len * (y / len) * (y / len), y];
  c.beginPath(); c.moveTo(...B(-hw, 0));
  c.bezierCurveTo(...B(-hw * 1.02, -len * .45), ...B(-tw, -len * .75), ...B(-tw * .9, -len * .86));
  c.bezierCurveTo(...B(-tw * .7, -len * 1.01), ...B(tw * .7, -len * 1.01), ...B(tw * .9, -len * .86));
  c.bezierCurveTo(...B(tw, -len * .75), ...B(hw * 1.02, -len * .45), ...B(hw, 0));
  c.closePath();
}

function drawHead(c, A, C, p) {
  const H = C.head, tx = A.turn * C.shift * (1 - clamp(p.side, 0, 1)) * (1 + p.look * 1.4) + p.faceX, t = LF.t; // 달릴 때는 얼굴이 진행 방향으로 돌아감
  const headShape = c2 => G.blob(c2, 0, H.y, H.rx, H.ry, H.n, H.top, H.bot);
  if (A.kind === 'brown') {
    const ears = [-1, 1].map(sd => c2 => { c2.beginPath(); c2.arc(sd * C.ears.x + tx * .2, C.ears.y, C.ears.r, 0, TAU); });
    union(c, C, [...ears, headShape]); // 귀와 머리가 이어진 하나의 실루엣
    for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * C.ears.x + tx * .2 + sd * .004, C.ears.y + .004, C.ears.rin, 0, TAU); c.fillStyle = C.earIn; c.fill(); }
    headShape(c); c.fillStyle = C.fill; c.fill(); // 머리 위로 넘친 귀 안쪽 가리기
  } else {
    const E = C.ear, ears = [];
    // 서 있을 땐 원본처럼 고정. 달릴 때(wind)는 귀가 뒤로 살짝 젖혀지고 끝이 파르르 떨림 (최대 약 0.2rad, 너무 뒤로 넘어가지 않게)
    const fl = [0, 1].map(i => p.wind * Math.sin(LF.t * 27 + i * 1.9));
    const angs = [-1, 1].map((sd, i) => sd * (.07 * (1 - Math.min(1, p.earSpread * 12)) + p.earSpread) + clamp(p.earA + fl[i] * .03, -.4, .1)), bends = [0, 1].map(i => clamp(p.earBend + p.wind * Math.sin(LF.t * 31 + i * 2.4 + 1) * .05, -.3, .2));
    [-1, 1].forEach((sd, i) => ears.push(c2 => { c2.translate(sd * E.x + tx * .3 + p.earX, E.y); c2.rotate(angs[i]); earPath(c2, E.w * p.earW, E.len * p.earLen, bends[i]); }));
    union(c, C, [...ears, headShape]); // 귀와 머리가 이어진 하나의 실루엣
    [-1, 1].forEach((sd, i) => { c.save(); c.translate(sd * E.x + tx * .3 + p.earX, E.y); c.rotate(angs[i]); c.translate(0, -E.len * p.earLen * .14); earPath(c, E.w * .42 * p.earW, E.len * p.earLen * .72, bends[i]); c.fillStyle = C.earIn; c.fill(); c.restore(); });
  }
  // 얼굴 (p.faceA < 1: 뒤돌아 서서히 사라짐)
  c.save(); if (p.faceA < 1) c.globalAlpha *= clamp(p.faceA, 0, 1);
  const E = C.eye, ey = E.y, gap = E.gap, r = E.r, fx = tx;
  if (A.mouth === 'kiss3') profileFace(c, A, C, p);
  else if (A.kind === 'brown') {
    const M = C.mz, mx = fx * 1.1, my = ey + M.dy;
    c.beginPath(); c.ellipse(mx, my, M.rx, M.ry, 0, 0, TAU); c.fillStyle = C.muzzle; c.fill();
    if (p.blush > .05) blush(c, C, fx, ey + .07, .15, p.blush, .04, p.blush > .5 ? 1 : 0); // 볼이 아주 빨개지면 사선 해칭
    eyes(c, A, C, fx, ey, gap, r);
    const nx = mx, ny = my - .026;
    c.beginPath(); c.moveTo(nx - .026, ny - .01); c.quadraticCurveTo(nx, ny - .019, nx + .026, ny - .01); c.quadraticCurveTo(nx + .017, ny + .017, nx, ny + .017); c.quadraticCurveTo(nx - .017, ny + .017, nx - .026, ny - .01);
    c.fillStyle = C.line; c.fill();
    mouth(c, A, C, nx, ny + .017, .022);
  } else {
    blush(c, C, fx, ey + C.chk.dy, C.chk.spread, .85 + p.blush * .15, C.chk.rx, 0);
    eyes(c, A, C, fx, ey, gap, r);
    const nx = fx * 1.05, ny = ey + .038;
    if (A.mouth === 'run3') runMouth(c, C, nx, ny);
    else if (A.mouth === 'joy') { // 속 빈 코 + 줄기 + 크게 벌린 웃는 입
      c.strokeStyle = C.line; c.lineWidth = C.lw * .62; c.lineCap = 'round';
      c.beginPath(); c.arc(nx, ny, .02, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.stroke();
      c.beginPath(); c.moveTo(nx, ny + .02); c.lineTo(nx, ny + .034); c.stroke();
      const w = .046, h = .085, my = ny + .034; // 크게 웃는 입
      c.beginPath(); c.moveTo(nx - w, my); c.quadraticCurveTo(nx, my + .014, nx + w, my); c.bezierCurveTo(nx + w * .95, my + h * 1.05, nx - w * .95, my + h * 1.05, nx - w, my); c.closePath();
      c.fillStyle = '#e8513f'; c.fill(); c.lineWidth = C.lw * .62; c.stroke();
      c.save(); c.clip(); c.beginPath(); c.ellipse(nx, my + h * .82, w * .62, h * .3, 0, 0, TAU); c.fillStyle = '#ff8f8f'; c.fill(); c.restore();
    }
    else { c.beginPath(); c.ellipse(nx, ny, .018, .012, 0, 0, TAU); c.fillStyle = C.line; c.fill(); mouth(c, A, C, nx, ny + .012, .02); }
  }
  c.restore();
  const runSweat = p.sweat >= 2.5, sweatOn = !runSweat || A.sweatA > .05; // 달릴 때 땀은 지칠 때만
  if (runSweat && A.sweatA > .05) { c.save(); c.globalAlpha *= A.sweatA; }
  if (p.sweat >= 2.5 && A.kind === 'cony' && sweatOn) { // 달릴 때(코니): 얼굴 가장자리에 흩어진 U자 땀방울이 15fps로 자리를 바꿔 나타남
    const spots = [[-.69, -.27], [-.41, .05], [-.47, .63], [.8, .2], [.6, -.62], [-.1, .85]];
    spots.forEach(([ux, uy], i) => {
      if (Math.floor(t * 7.5 + i * 1.7) % 3 === 0) return;
      const x = ux * H.rx, y = H.y + uy * H.ry, w = .015, h = .017;
      c.beginPath(); c.moveTo(x - w, y - .012); c.lineTo(x - w, y + .004); c.quadraticCurveTo(x - w, y + h, x, y + h); c.quadraticCurveTo(x + w, y + h, x + w, y + .004); c.lineTo(x + w, y - .012); c.closePath();
      c.fillStyle = '#c3d6f2'; c.fill();
      c.beginPath(); c.moveTo(x - w, y - .012); c.lineTo(x - w, y + .004); c.quadraticCurveTo(x - w, y + h, x, y + h); c.quadraticCurveTo(x + w, y + h, x + w, y + .004); c.lineTo(x + w, y - .012);
      c.strokeStyle = '#6d84b4'; c.lineWidth = C.lw * .5; c.lineCap = 'round'; c.stroke();
    });
  }
  if (p.sweat > .3 && sweatOn && (p.sweat < 2.5 || A.kind !== 'cony')) { const sx = H.rx * .9, sy = H.y - H.ry * .5 + Math.sin(t * 6) * .01; c.beginPath(); c.moveTo(sx, sy - .05); c.quadraticCurveTo(sx + .035, sy + .005, sx, sy + .025); c.quadraticCurveTo(sx - .035, sy + .005, sx, sy - .05); c.fillStyle = '#9fd8ff'; c.fill(); c.lineWidth = C.lw * .7; c.strokeStyle = '#4aa3d8'; c.stroke(); }
  if (runSweat && A.sweatA > .05) c.restore();
  if (p.sweat > 1.5 && p.sweat < 2.5) for (let j = 0; j < 4; j++) { // 힘쓸 때 사방으로 튀는 땀방울
    const k = (t * 1.3 + j * .26) % 1, sd = j % 2 ? 1 : -1, dx = sd * H.rx * (.95 + .4 * k), dy = H.y - H.ry * (.55 - (j > 1 ? .35 : 0)) - .07 * k + k * k * .12;
    c.globalAlpha = 1 - k * k; c.beginPath(); c.moveTo(dx, dy - .03); c.quadraticCurveTo(dx + .02, dy + .005, dx, dy + .018); c.quadraticCurveTo(dx - .02, dy + .005, dx, dy - .03); c.fillStyle = '#9fd8ff'; c.fill(); c.globalAlpha = 1;
  }
  if (p.shock > .3) { // 놀랄 때 머리 위로 떨어지는 세로 충격선
    const top = (A.kind === 'cony' ? C.ear.y - C.ear.len : C.ears.y - C.ears.r) - .02;
    c.strokeStyle = C.line; c.lineWidth = C.lw * .6; c.lineCap = 'round';
    for (let i = -4; i <= 4; i++) { const x = i * .065 + Math.sin(t * 30 + i) * .004, L = .045 + ((i * 7 + 20) % 3) * .02 + Math.abs(Math.sin(t * 22 + i * 2)) * .02; c.beginPath(); c.moveTo(x, top - .01); c.lineTo(x, top - .01 - L); c.stroke(); }
  }
  if (p.tears > .3) for (const sd of [-1, 1]) { const k = (t * 1.6 + (sd > 0 ? .5 : 0)) % 1, tx2 = fx + sd * gap, ty = ey + .03 + k * .12; c.globalAlpha = 1 - k; c.beginPath(); c.ellipse(tx2, ty, .014, .022, 0, 0, TAU); c.fillStyle = '#7cc8ff'; c.fill(); c.globalAlpha = 1; }
}

// 뽀뽀할 때의 옆얼굴 (참고 그림): 눈은 하나(감은 U자), 볼은 하나, 입술은 얼굴 윤곽 앞쪽에 '3'자 모양으로 볼록 튀어나와 상대 입술에 닿는다. (+x가 상대 쪽)
function profileFace(c, A, C, p) {
  const H = C.head, rx = H.rx, ry = H.ry, ey = C.eye.y, brown = A.kind === 'brown';
  const lipY = ey + (brown ? .1 : .072), dy = (lipY - H.y) / ry, ex = rx * Math.sqrt(Math.max(.2, 1 - dy * dy));
  // 볼
  c.save(); c.globalAlpha = .95; c.fillStyle = C.cheek || C.blush; c.beginPath(); c.ellipse(rx * (brown ? .36 : .34), ey + (brown ? .06 : .045), .052, .03, 0, 0, TAU); c.fill(); c.restore();
  // 감은 눈 (U자)
  const r = C.eye.r * 1.55; c.strokeStyle = C.line; c.lineWidth = C.lw * .9; c.lineCap = 'round';
  c.beginPath(); c.arc(rx * .5, ey - r * .55, r * 1.4, Math.PI * .1, Math.PI * .9); c.stroke();
  if (brown) { // 곰 주둥이: 윤곽 앞쪽에 베이지색 주둥이 + 코
    c.beginPath(); c.ellipse(ex - .05, lipY - .012, .058, .05, 0, 0, TAU); c.fillStyle = C.muzzle; c.fill();
    c.beginPath(); c.ellipse(ex - .018, lipY - .05, .018, .013, 0, 0, TAU); c.fillStyle = C.line; c.fill();
  }
  // 입술: 얼굴 윤곽 위에 걸친 동그란 덩어리 두 개(위·아래)가 겹쳐 '3'자 — 반은 안쪽, 반은 바깥으로 살짝만 나옴
  const fill = brown ? C.muzzle : C.fill, R = .022, off = .02, cx0 = ex + .013; // 조금 작게, 윤곽선 쪽(약간 바깥)으로
  c.save(); c.lineJoin = 'round'; c.lineWidth = C.lw * 1.15; c.strokeStyle = C.line; c.fillStyle = fill;
  const lobe = y => { c.beginPath(); c.arc(cx0, y, R, 0, TAU); };
  for (const y of [lipY - off, lipY + off]) { lobe(y); c.stroke(); }
  for (const y of [lipY - off, lipY + off]) { lobe(y); c.fill(); }
  c.fillRect(cx0 - R - .03, lipY - off - R * .55, R + .03 - .004, 2 * (off + R * .55)); // 윤곽선이 입술 안쪽을 가르지 않게 덮음 (덩어리 바깥 선은 남김)
  c.restore();
}

function blush(c, C, fx, y, spread, a, rx, lines = 0) {
  c.save(); c.globalAlpha = clamp(a, 0, 1) * (C.cheek ? .95 : .7);
  for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(fx * .9 + sd * spread, y, rx, rx * .58, 0, 0, TAU); c.fillStyle = C.cheek || C.blush; c.fill(); }
  if (lines > .5) { c.strokeStyle = '#ff6b8a'; c.lineWidth = .009; for (const sd of [-1, 1]) for (let i = -1; i <= 1; i++) { const bx = fx * .9 + sd * spread + i * .022; c.beginPath(); c.moveTo(bx - .008, y + .012); c.lineTo(bx + .008, y - .012); c.stroke(); } }
  c.restore();
}

function strainEyes(c, C, fx, ey) {
  const nx = fx * 1.05;
  c.strokeStyle = C.line; c.lineWidth = C.lw * .72; c.lineCap = 'round'; c.lineJoin = 'round';
  for (const sd of [-1, 1]) { // 꺾쇠 꼭짓점이 코 쪽, 막대는 바깥으로 (3/4 얼굴이라 오른쪽 눈은 조금 작게)
    const k = sd > 0 ? .9 : 1, ax = nx + sd * (sd > 0 ? .036 : .042), sx = ax + sd * .092 * k, tx = ax + sd * .042 * k;
    c.beginPath(); c.moveTo(sx, ey); c.lineTo(ax, ey); c.moveTo(tx, ey - .055 * k); c.lineTo(ax, ey); c.lineTo(tx, ey + .055 * k); c.stroke();
  }
  for (const [x0, y0, x1, y1] of [[-.076, -.114, -.037, -.05], [.02, -.13, .011, -.062], [.059, -.11, .034, -.056]]) { c.beginPath(); c.moveTo(nx + x0, ey + y0); c.lineTo(nx + x1, ey + y1); c.stroke(); }
}
function runMouth(c, C, nx, ny) { // 속 빈 작은 코 + 그 아래 큰 "3"
  c.strokeStyle = C.line; c.lineWidth = C.lw * .72; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.arc(nx, ny, .0164, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(nx, ny + .0164); c.lineTo(nx - .0136, ny + .03);
  c.bezierCurveTo(nx + .025, ny + .026, nx + .058, ny + .046, nx + .011, ny + .064);
  c.bezierCurveTo(nx + .075, ny + .07, nx + .075, ny + .12, nx - .0095, ny + .127); c.stroke();
}
function eyes(c, A, C, fx, ey, gap, r) {
  let mode = A.eyes;
  if (mode === 'joy') mode = A.kind === 'cony' ? 'squint' : 'happy'; // 좋아서 어쩔 줄 모르는 표정
  if (mode === 'strain') { if (A.kind === 'cony') return strainEyes(c, C, fx, ey); mode = A.blink > 0 ? 'blink' : 'dot'; } // 브라운은 달릴 때 눈을 감지 않고 동그랗게 뜸
  if (mode === 'dot' && A.blink > 0) mode = 'blink';
  c.fillStyle = C.line; c.strokeStyle = C.line; c.lineWidth = C.lw * .9; c.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const x = fx + sd * gap, y = ey;
    switch (mode) {
      case 'blink': c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.stroke(); break;
      case 'happy': c.beginPath(); c.arc(x, y + r * .7, r * 1.25, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); break;
      case 'closed': c.beginPath(); c.arc(x, y - r * .9, r * 1.25, Math.PI * .15, Math.PI * .85); c.stroke(); break;
      case 'squint': { // 꽉 감은 눈: 꼭짓점(안쪽, 코 쪽)에서 세 줄이 바깥으로 퍼지는 화살표 모양 (꺾쇠 + 가운데 막대)
        const L = r * 3.9, ax = fx * 1.05 + sd * .042, tilt = sd < 0 ? .2 : 0;
        c.lineWidth = C.lw * .62; c.beginPath();
        for (const a of [.75, 0, -.75]) { const th = tilt + a; c.moveTo(ax, y); c.lineTo(ax + sd * L * Math.cos(th), y - L * Math.sin(th)); }
        c.stroke(); break; }
      case 'heart': G.drawHeart(c, x, y, r * 3.6, '#ff4d7e', null, 0, false); break;
      case 'swirl': c.beginPath(); for (let i = 0; i < 20; i++) { const a = i * .55 + LF.t * 9 * sd, rr = r * .12 * i * .55; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.stroke(); break;
      case 'wide': c.beginPath(); c.ellipse(x, y, r * 1.25, r * 1.5, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(x - r * .35, y - r * .45, r * .4, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.fillStyle = C.line; break;
      case 'sad': c.beginPath(); c.ellipse(x, y + r * .2, r * .85, r * 1.05, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(x - sd * r * 1.4, y - r * 2.4); c.lineTo(x + sd * r * .6, y - r * 1.6); c.stroke(); break;
      case 'angry': c.beginPath(); c.ellipse(x, y + r * .2, r * .85, r * 1.05, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(x - sd * r * 1.3, y - r * 1.6); c.lineTo(x + sd * r * .8, y - r * 2.4); c.stroke(); break;
      default: c.beginPath(); c.ellipse(x, y, r * .9, r * 1.15, 0, 0, TAU); c.fill();
    }
  }
}

function mouth(c, A, C, x, y, m) {
  c.strokeStyle = C.line; c.fillStyle = C.line; c.lineWidth = C.lw * .85; c.lineCap = 'round'; c.lineJoin = 'round';
  const m0 = A.mouth === 'joy' ? (A.kind === 'cony' ? 'smile' : 'grin') : A.mouth;
  switch (m0) {
    case 'o': c.beginPath(); c.ellipse(x, y + m * .8, m * .5, m * .65, 0, 0, TAU); c.fill(); break;
    case 'smile': c.beginPath(); c.moveTo(x - m * 1.1, y + m * .2); c.quadraticCurveTo(x, y + m * 2.3, x + m * 1.1, y + m * .2); c.closePath(); c.fill();
      c.beginPath(); c.ellipse(x, y + m * 1.05, m * .5, m * .3, 0, 0, TAU); c.fillStyle = '#ff8a9e'; c.fill(); break;
    case 'grin': c.beginPath(); c.moveTo(x - m * 1.0, y + m * .3); c.quadraticCurveTo(x, y + m * 1.5, x + m * 1.0, y + m * .3); c.stroke(); break;
    case 'run3': case 'kiss': c.beginPath(); c.moveTo(x - m * .1, y + m * .1); c.quadraticCurveTo(x + m * .9, y + m * .35, x, y + m * .75); c.quadraticCurveTo(x + m * .9, y + m * 1.15, x - m * .1, y + m * 1.4); c.stroke(); break;
    case 'shout': c.beginPath(); c.ellipse(x, y + m * 1.5, m * .55, m * 1.55, 0, 0, TAU); c.fillStyle = '#d9531e'; c.fill(); c.stroke(); break;
    case 'frown': c.beginPath(); c.moveTo(x - m * .9, y + m * 1.1); c.quadraticCurveTo(x, y + m * .1, x + m * .9, y + m * 1.1); c.stroke(); break;
    case 'wavy': c.beginPath(); for (let i = 0; i <= 6; i++) c.lineTo(x - m + i * m / 3, y + m * .7 + (i % 2 ? -m * .3 : m * .3)); c.stroke(); break;
    default:
      if (A.kind === 'brown') { // ㅅ 모양
        c.beginPath(); c.moveTo(x, y - m * .2); c.lineTo(x, y + m * .55); c.moveTo(x - m * .85, y + m * 1.15); c.quadraticCurveTo(x - m * .2, y + m * .7, x, y + m * .55); c.quadraticCurveTo(x + m * .2, y + m * .7, x + m * .85, y + m * 1.15); c.stroke();
      } else { // ω 모양
        c.beginPath(); c.moveTo(x, y - m * .2); c.lineTo(x, y + m * .35); c.moveTo(x - m * .95, y + m * .35); c.quadraticCurveTo(x - m * .5, y + m * 1.0, x, y + m * .35); c.quadraticCurveTo(x + m * .5, y + m * 1.0, x + m * .95, y + m * .35); c.stroke();
      }
  }
}

// 반투명(alpha<1)로 그릴 때: 몸을 겹쳐 칠하는 방식이라 그대로 투명하게 그리면 겹친 외곽선이 안쪽에 검게 비친다.
// 그래서 한 번 불투명하게 따로 그린 뒤 통째로 반투명 합성한다.
LF.drawActor = (c, A, x, y, s, o = {}) => {
  if (o.alpha == null || o.alpha >= .999) return LF.drawActorRaw(c, A, x, y, s, o);
  const k = (c.getTransform && c.getTransform().a) || 1, W = Math.ceil(s * 3 * k), buf = LF._actorBuf || (LF._actorBuf = document.createElement('canvas'));
  if (buf.width !== W) { buf.width = W; buf.height = W; }
  const b = buf.getContext('2d'); b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, W, W); b.setTransform(k, 0, 0, k, 0, 0);
  LF.drawActorRaw(b, A, s * 1.5, s * 2.2, s, Object.assign({}, o, { alpha: null }));
  c.save(); c.globalAlpha *= o.alpha; c.drawImage(buf, x - s * 1.5, y - s * 2.2, s * 3, s * 3); c.restore();
};

// ---------- 서로 안기 (뽀뽀 장면 등) ----------
// 두 캐릭터가 마주 보고 서 있을 때, 각자의 앞팔이 상대의 등을 감싸 안는다. (캐릭터 팔이 짧아서 직접 팔 모양을 그려 줌)
// 그리는 순서: 오른쪽 팔(상대 B가 A의 등을 감음) → A 몸 → A의 팔(B의 등을 감음) → B 몸 : 상대 몸이 팔 끝을 가려서 '등 뒤로 감싼' 것처럼 보임.
LF.drawEmbrace = (c, A, B, ax, bx, y, sA, sB, o = {}) => {
  const info = (P, x, s, dir, px, ps, o = {}) => {
    const C = P.C, S = C.sho, H = C.hip, p = P.p, lean = p.lean || 0, dy = S.y - H.y, shx = .045;
    const lx = shx * Math.cos(lean) - dy * Math.sin(lean), ly = H.y + shx * Math.sin(lean) + dy * Math.cos(lean);
    const sx = x + dir * lx * s * (p.sx || 1), sy = y + (ly * (p.sy || 1) + (p.bob || 0)) * s;
    return { C, s, sx, sy, tx: px + dir * ps * .06, ty: sy + (o.low ? .17 : .055) * s, w: S.w * s * .95, low: o.low };
  };
  const arm = a => {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    const path = () => { c.beginPath(); c.moveTo(a.sx, a.sy); c.bezierCurveTo(a.sx + (a.tx - a.sx) * .3, a.sy + .09 * a.s, a.sx + (a.tx - a.sx) * .7, a.ty + .02 * a.s, a.tx, a.ty); }; // 어깨에서 아래로 살짝 굽어 상대 등 쪽으로
    path(); c.lineWidth = a.w + a.C.lw * a.s * 2; c.strokeStyle = a.C.line; c.stroke();
    path(); c.lineWidth = a.w; c.strokeStyle = a.C.fill; c.stroke();
    c.restore();
  };
  const ia = info(A, ax, sA, 1, bx, sB, {}), ib = info(B, bx, sB, -1, ax, sA, { low: true }), dop = Object.assign({}, o);
  if (o.arms) arm(ib); // 안는 팔 그리기는 끔(팔이 너무 길어 보여서). 팔은 몸 옆에 내려둠
  A.draw(c, ax, y, sA, Object.assign({ dir: 1 }, dop));
  if (o.arms) arm(ia);
  B.draw(c, bx, y, sB, Object.assign({ dir: -1 }, dop));
};
