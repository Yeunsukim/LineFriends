'use strict';
// 코니 & 브라운 러브 런 — 코어 (네임스페이스, 수학, 벡터 도형, 텍스트)
const LF = {
  W: 1280, H: 720,
  FONT: '"Jua","Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif',
  scenes: {}, cur: null, curName: '', t: 0,
  ptr: { x: -999, y: -999, down: false },
  keys: new Set(),
  touch: ('ontouchstart' in window) || navigator.maxTouchPoints > 0,
};
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const ease = {
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * TAU / 3) + 1,
};
// 프레임레이트와 무관한 부드러운 추적
const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
const rng = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];

// ---------- 벡터 도형 ----------
const G = {
  rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  },
  // 초타원(둥근 사각) — 캐릭터 머리용. top/bot: 위/아래 반지름 배율
  blob(c, cx, cy, rx, ry, n = 2.4, top = 1, bot = 1) {
    c.beginPath();
    const N = 56, e = 2 / n;
    for (let i = 0; i <= N; i++) {
      const a = i / N * TAU, ca = Math.cos(a), sa = Math.sin(a);
      const x = cx + rx * Math.sign(ca) * Math.pow(Math.abs(ca), e);
      const y = cy + ry * (sa > 0 ? bot : top) * Math.sign(sa) * Math.pow(Math.abs(sa), e);
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath();
  },
  heart(c, x, y, s) {
    const t = s / 2;
    c.beginPath(); c.moveTo(x, y + t * .92);
    c.bezierCurveTo(x + t * 1.3, y + t * .1, x + t * 1.02, y - t * 1.0, x, y - t * .38);
    c.bezierCurveTo(x - t * 1.02, y - t * 1.0, x - t * 1.3, y + t * .1, x, y + t * .92);
    c.closePath();
  },
  drawHeart(c, x, y, s, fill = '#ff5a8f', line = null, lw = 0, shine = true) {
    G.heart(c, x, y, s);
    c.fillStyle = fill; c.fill();
    if (line) { c.lineWidth = lw || s * .08; c.strokeStyle = line; c.lineJoin = 'round'; c.stroke(); }
    if (shine) { c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(x - s * .2, y - s * .18, s * .11, s * .065, -.7, 0, TAU); c.fill(); }
  },
  star(c, x, y, r, n = 5, inner = .48) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * inner : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
  },
  sparkle(c, x, y, r, fill = '#fff') {
    c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.closePath(); c.fillStyle = fill; c.fill();
  },
  lin(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; },
  rad(c, x, y, r0, r1, stops) { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; },
  glow(c, x, y, r, color) { c.fillStyle = G.rad(c, x, y, 0, r, [color, 'rgba(255,255,255,0)']); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); },
  text(c, s, x, y, o = {}) {
    c.save();
    c.font = `${o.size || 28}px ${LF.FONT}`; c.textAlign = o.align || 'center'; c.textBaseline = o.base || 'middle';
    c.lineJoin = 'round';
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.shadow) { c.fillStyle = o.shadow; c.fillText(s, x, y + (o.size || 28) * .09); }
    if (o.stroke) { c.lineWidth = o.sw || (o.size || 28) * .22; c.strokeStyle = o.stroke; c.strokeText(s, x, y); }
    c.fillStyle = o.color || '#fff'; c.fillText(s, x, y);
    c.restore();
  },
  measure(c, s, size) { c.font = `${size}px ${LF.FONT}`; return c.measureText(s).width; },
  wrap(c, s, maxW, size) {
    c.font = `${size}px ${LF.FONT}`;
    const out = []; let line = '';
    for (const word of s.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (c.measureText(test).width > maxW && line) { out.push(line); line = word; } else line = test;
    }
    if (line) out.push(line); return out;
  },
};
