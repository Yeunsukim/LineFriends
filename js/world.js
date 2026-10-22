'use strict';
// 테마별 패럴랙스 배경 + 바닥(구덩이 지원) + 날씨
LF.GY = 600;
const md = (a, n) => ((a % n) + n) % n;

LF.THEMES = {
  flowers: { sky: ['#9fdcff', '#d9f2ff', '#fff0f6'], far: '#bfe6c4', far2: '#d8f0d0', mid: 'blossom', ground: '#8fd889', groundD: '#6cbf6f', top: '#b4ef9e', soil: '#e8c9a0', weather: 'petals', sun: 1 },
  park:    { sky: ['#8fd3ff', '#cdeeff', '#f3fbff'], far: '#a8dcae', far2: '#c4ebc0', mid: 'tree', ground: '#86d27e', groundD: '#5fb866', top: '#a9ec92', soil: '#e3c39b', weather: 'leaves', sun: 1 },
  fair:    { sky: ['#b9a6ff', '#e4d6ff', '#ffe2f0'], far: '#d8c8ff', far2: '#ead9ff', mid: 'fair', ground: '#ffcf9a', groundD: '#f2b16f', top: '#ffe2bd', soil: '#e8a77a', weather: 'confetti', sun: 1 },
  gym:     { sky: ['#ffe9d6', '#fff3e8', '#fff8f1'], far: '#ffd9bd', mid: 'gym', ground: '#c9a7e8', groundD: '#a982d4', top: '#e2cdf5', soil: '#9b73c4', indoor: 1 },
  kitchen: { sky: ['#fff1dc', '#fff7ea', '#fffaf3'], far: '#ffe0bf', mid: 'kitchen', ground: '#f5c9a0', groundD: '#e6ad7b', top: '#ffe3c7', soil: '#d99a68', indoor: 1, checker: 1 },
  rain:    { sky: ['#7d95bd', '#a9bcd9', '#d4def0'], far: '#93a8c9', far2: '#a9bbd7', mid: 'city', ground: '#8fa2c0', groundD: '#7086aa', top: '#b2c3dc', soil: '#6d7f9e', weather: 'rain', dim: 1 },
  snow:    { sky: ['#bfe3ff', '#e2f3ff', '#f7fcff'], far: '#dff0fb', far2: '#eef8ff', mid: 'pine', ground: '#ffffff', groundD: '#dcebf7', top: '#ffffff', soil: '#b8d4ea', weather: 'snow', sun: 1 },
  market:  { sky: ['#2c2463', '#6c3f9e', '#ff8fb8'], far: '#4a3487', far2: '#5c40a0', mid: 'market', ground: '#6a4a9a', groundD: '#4d3478', top: '#8f6cc4', soil: '#3e2a66', weather: 'lantern', night: 1 },
  night:   { sky: ['#120f3a', '#33287a', '#7b5bc4'], far: '#2b2369', far2: '#3a2f80', mid: 'nightcity', ground: '#4a3d8f', groundD: '#30276b', top: '#6c5cc9', soil: '#241d55', weather: 'stars', night: 1 },
  final:   { sky: ['#ff9fce', '#ffd0e6', '#fff1f8'], far: '#ffc3dc', far2: '#ffd8e9', mid: 'castle', ground: '#ffc7e0', groundD: '#ff9ec7', top: '#ffe3f0', soil: '#f58ab8', weather: 'hearts', sun: 1 },
};

LF.cloud = (c, x, y, s, col) => {
  c.fillStyle = col; c.beginPath();
  c.arc(x, y, 30 * s, Math.PI * .5, Math.PI * 1.5); c.arc(x + 34 * s, y - 22 * s, 36 * s, Math.PI, 0); c.arc(x + 76 * s, y - 6 * s, 28 * s, Math.PI * 1.2, Math.PI * .5); c.closePath();
  c.fill();
};

LF.drawBG = (c, th, cam, t) => {
  const W = LF.W, GY = LF.GY;
  c.fillStyle = G.lin(c, 0, 0, 0, GY, th.sky); c.fillRect(0, 0, W, LF.H);
  if (th.indoor) { drawIndoor(c, th, cam, t); return; }
  if (th.night) {
    const r = rng(9);
    for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * 420, k = .35 + .65 * Math.abs(Math.sin(t * (.6 + r() * 2) + i)); c.globalAlpha = k; G.sparkle(c, x, y, 1.5 + r() * 4.5, '#fff'); }
    c.globalAlpha = 1;
    G.glow(c, 1060, 120, 120, 'rgba(255,240,200,.35)');
    c.fillStyle = '#fff4cf'; c.beginPath(); c.arc(1060, 120, 48, 0, TAU); c.fill();
    c.fillStyle = th.sky[0]; c.beginPath(); c.arc(1080, 108, 42, 0, TAU); c.fill();
  } else if (th.sun) {
    G.glow(c, 200, 130, 190, 'rgba(255,245,190,.9)');
    c.fillStyle = '#fff6b8'; c.beginPath(); c.arc(200, 130, 50, 0, TAU); c.fill();
  }
  const ccol = th.night ? 'rgba(170,150,255,.18)' : th.dim ? 'rgba(235,240,250,.7)' : 'rgba(255,255,255,.92)';
  for (let i = 0; i < 7; i++) { const x = md(i * 330 - cam * .05 - t * 8, W + 400) - 200, y = 80 + (i * 67) % 150; LF.cloud(c, x, y, .9 + (i % 3) * .3, ccol); }
  // 먼 산/언덕 2겹
  hills(c, th.far2 || th.far, cam * .1, GY - 150, 60, .004, 0);
  hills(c, th.far, cam * .2, GY - 95, 45, .007, 2);
  drawMid(c, th, cam, t);
};

function hills(c, col, off, base, amp, f, ph) {
  c.fillStyle = col; c.beginPath(); c.moveTo(0, LF.GY + 10);
  for (let x = 0; x <= LF.W + 20; x += 20) { const wx = x + off; c.lineTo(x, base - Math.sin(wx * f + ph) * amp - Math.sin(wx * f * 2.7 + ph) * amp * .35); }
  c.lineTo(LF.W, LF.GY + 10); c.closePath(); c.fill();
}

function drawMid(c, th, cam, t) {
  const GY = LF.GY, par = .45, S = 360, i0 = Math.floor(cam * par / S) - 1;
  for (let i = i0; i < i0 + 6; i++) {
    const r = rng(i * 131 + 7), x = i * S - cam * par + r() * 120, a = r(), b = r();
    MID[th.mid] && MID[th.mid](c, x, GY, a, b, t, i, th);
  }
}

const MID = {
  blossom(c, x, GY, a, b) {
    const h = 170 + a * 90;
    c.fillStyle = '#c99a78'; c.beginPath(); c.moveTo(x - 10, GY); c.lineTo(x - 6, GY - h); c.lineTo(x + 6, GY - h); c.lineTo(x + 12, GY); c.fill();
    const cols = ['#ffc2d9', '#ffb0cc', '#ffd6e5'];
    [[0, -h - 20, 70], [-50, -h + 15, 52], [52, -h + 12, 56], [-20, -h - 55, 45], [30, -h - 45, 44]].forEach(([dx, dy, rr], k) => { c.fillStyle = cols[k % 3]; c.beginPath(); c.arc(x + dx, GY + dy, rr, 0, TAU); c.fill(); });
  },
  tree(c, x, GY, a, b) {
    const h = 150 + a * 80;
    c.fillStyle = '#b98b68'; c.fillRect(x - 9, GY - h, 18, h);
    c.fillStyle = '#7fcf86'; [[0, -h - 10, 64], [-44, -h + 20, 48], [46, -h + 18, 50]].forEach(([dx, dy, rr]) => { c.beginPath(); c.arc(x + dx, GY + dy, rr, 0, TAU); c.fill(); });
    c.fillStyle = '#9ade9a'; c.beginPath(); c.arc(x - 14, GY - h - 26, 28, 0, TAU); c.fill();
    if (b > .55) { c.fillStyle = '#ffb4cf'; c.fillRect(x + 90, GY - 34, 80, 10); c.fillRect(x + 96, GY - 26, 8, 26); c.fillRect(x + 156, GY - 26, 8, 26); c.fillRect(x + 90, GY - 64, 80, 8); }
  },
  fair(c, x, GY, a, b, t, i) {
    if (md(i, 4) === 0) {
      const R = 150, cy = GY - R - 40;
      c.strokeStyle = '#fff'; c.lineWidth = 8; c.beginPath(); c.arc(x, cy, R, 0, TAU); c.stroke();
      c.lineWidth = 3; for (let k = 0; k < 10; k++) { const an = k * TAU / 10 + t * .25, gx = x + Math.cos(an) * R, gy = cy + Math.sin(an) * R; c.beginPath(); c.moveTo(x, cy); c.lineTo(gx, gy); c.stroke(); c.fillStyle = ['#ff9cc2', '#ffd54a', '#8fe3c8', '#9bc4ff'][k % 4]; G.rr(c, gx - 15, gy, 30, 26, 8); c.fill(); }
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 50, GY); c.lineTo(x, cy); c.lineTo(x + 50, GY); c.closePath(); c.fill();
    } else {
      const w = 150 + a * 50, h = 110;
      c.fillStyle = '#fff'; c.fillRect(x - w / 2, GY - h, w, h);
      for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? '#ff8fbd' : '#ffd54a'; c.beginPath(); c.moveTo(x - w / 2 - 6 + k * (w + 12) / 6, GY - h); c.lineTo(x - w / 2 - 6 + (k + 1) * (w + 12) / 6, GY - h); c.lineTo(x, GY - h - 90); c.fill(); }
      c.fillStyle = '#ff5c98'; c.beginPath(); c.moveTo(x, GY - h - 90); c.lineTo(x + 34, GY - h - 102); c.lineTo(x, GY - h - 114); c.fill();
    }
  },
  city(c, x, GY, a, b, t, i, th) {
    const w = 110 + a * 70, h = 170 + b * 170;
    c.fillStyle = md(i, 2) ? '#8197bc' : '#7189b2'; c.fillRect(x - w / 2, GY - h, w, h);
    c.fillStyle = 'rgba(255,255,255,.28)'; for (let yy = GY - h + 18; yy < GY - 30; yy += 36) for (let xx = x - w / 2 + 14; xx < x + w / 2 - 18; xx += 28) c.fillRect(xx, yy, 16, 20);
  },
  nightcity(c, x, GY, a, b, t, i) {
    const w = 100 + a * 70, h = 160 + b * 200;
    c.fillStyle = md(i, 2) ? '#3c2f86' : '#46389a'; c.fillRect(x - w / 2, GY - h, w, h);
    for (let yy = GY - h + 18; yy < GY - 30; yy += 34) for (let xx = x - w / 2 + 12; xx < x + w / 2 - 16; xx += 26) { const lit = ((xx / 26 | 0) + (yy / 34 | 0) + i) % 3 === 0; c.fillStyle = lit ? '#ffe27a' : 'rgba(255,255,255,.08)'; c.fillRect(xx, yy, 14, 18); }
  },
  pine(c, x, GY, a, b) {
    const h = 150 + a * 90;
    c.fillStyle = '#8b6a55'; c.fillRect(x - 8, GY - 40, 16, 40);
    for (let k = 0; k < 3; k++) { const yb = GY - 30 - k * h * .26, wd = 74 - k * 16; c.fillStyle = '#7cc8a4'; c.beginPath(); c.moveTo(x - wd, yb); c.lineTo(x, yb - h * .42); c.lineTo(x + wd, yb); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - wd * .45, yb - h * .23); c.lineTo(x, yb - h * .42); c.lineTo(x + wd * .45, yb - h * .23); c.quadraticCurveTo(x, yb - h * .3, x - wd * .45, yb - h * .23); c.fill(); }
    if (b > .5) { const sx = x + 110; c.fillStyle = '#fff'; c.beginPath(); c.arc(sx, GY - 32, 34, 0, TAU); c.arc(sx, GY - 82, 24, 0, TAU); c.fill(); c.fillStyle = '#4b2b1f'; c.beginPath(); c.arc(sx - 8, GY - 86, 3.5, 0, TAU); c.arc(sx + 8, GY - 86, 3.5, 0, TAU); c.fill(); c.fillStyle = '#ff9a3c'; c.beginPath(); c.moveTo(sx, GY - 80); c.lineTo(sx + 16, GY - 77); c.lineTo(sx, GY - 74); c.fill(); c.fillStyle = '#ff6f8f'; c.fillRect(sx - 22, GY - 64, 44, 9); }
  },
  market(c, x, GY, a, b, t, i) {
    const w = 170 + a * 40, h = 120;
    c.fillStyle = '#3d2b70'; c.fillRect(x - w / 2, GY - h, w, h);
    for (let k = 0; k < 7; k++) { c.fillStyle = k % 2 ? '#ff7aa8' : '#fff1c9'; c.beginPath(); c.moveTo(x - w / 2 - 10 + k * (w + 20) / 7, GY - h - 34); c.lineTo(x - w / 2 - 10 + (k + 1) * (w + 20) / 7, GY - h - 34); c.lineTo(x - w / 2 - 10 + (k + 1) * (w + 20) / 7, GY - h + 6); c.arc(x - w / 2 - 10 + (k + .5) * (w + 20) / 7, GY - h + 6, (w + 20) / 14, 0, Math.PI); c.fill(); }
    for (const dx of [-w / 3, 0, w / 3]) { const gl = .65 + Math.sin(t * 3 + i + dx) * .15; G.glow(c, x + dx, GY - h + 34, 44, `rgba(255,210,110,${gl})`); c.fillStyle = '#ff5a5a'; c.beginPath(); c.ellipse(x + dx, GY - h + 34, 11, 15, 0, 0, TAU); c.fill(); c.fillStyle = '#ffd54a'; c.fillRect(x + dx - 6, GY - h + 17, 12, 4); }
  },
  castle(c, x, GY, a, b, t, i) {
    const w = 90 + a * 50, h = 190 + b * 110;
    c.fillStyle = '#ffadd0'; c.fillRect(x - w / 2, GY - h, w, h);
    c.fillStyle = '#ff7eb3'; c.beginPath(); c.moveTo(x - w / 2 - 12, GY - h); c.lineTo(x, GY - h - 90); c.lineTo(x + w / 2 + 12, GY - h); c.fill();
    G.drawHeart(c, x, GY - h - 104, 34, '#ff3d7f', null, 0, false);
    c.fillStyle = 'rgba(255,255,255,.75)'; G.rr(c, x - 13, GY - h + 40, 26, 44, 13); c.fill();
    c.fillStyle = '#fff'; G.rr(c, x - 18, GY - 58, 36, 58, 18); c.fill();
  },
};

function drawIndoor(c, th, cam, t) {
  const W = LF.W, GY = LF.GY;
  c.fillStyle = th.far; c.fillRect(0, 0, W, GY);
  for (let x = -md(cam * .3, 100); x < W + 100; x += 100) for (let y = 40; y < GY - 150; y += 100) G.drawHeart(c, x + ((y / 100 | 0) % 2 ? 50 : 0), y, 18, 'rgba(255,255,255,.5)', null, 0, false);
  c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(0, GY - 150, W, 150);
  c.fillStyle = 'rgba(0,0,0,.05)'; c.fillRect(0, GY - 150, W, 6);
  const S = 420, par = .5, i0 = Math.floor(cam * par / S) - 1;
  for (let i = i0; i < i0 + 5; i++) {
    const x = i * S - cam * par + 100, r = rng(i * 71 + 3), kind = r();
    if (kind < .45) {
      c.fillStyle = '#fff'; G.rr(c, x - 100, 60, 200, 240, 22); c.fill();
      c.fillStyle = G.lin(c, 0, 72, 0, 288, ['#9fdcff', '#fff0f6']); G.rr(c, x - 86, 74, 172, 212, 14); c.fill();
      LF.cloud(c, x - 50 + Math.sin(t * .3 + i) * 10, 150, .5, '#fff');
      c.fillStyle = 'rgba(255,255,255,.95)'; c.fillRect(x - 4, 74, 8, 212); c.fillRect(x - 86, 176, 172, 8);
      c.fillStyle = th.mid === 'gym' ? '#c4b5ff' : '#ffb7d5';
      c.beginPath(); c.moveTo(x - 116, 52); c.quadraticCurveTo(x - 70, 170, x - 108, 320); c.lineTo(x - 84, 320); c.quadraticCurveTo(x - 44, 170, x - 80, 52); c.fill();
      c.beginPath(); c.moveTo(x + 116, 52); c.quadraticCurveTo(x + 70, 170, x + 108, 320); c.lineTo(x + 84, 320); c.quadraticCurveTo(x + 44, 170, x + 80, 52); c.fill();
    } else if (th.mid === 'gym') {
      c.fillStyle = '#e8d5ff'; G.rr(c, x - 120, 150, 240, 16, 8); c.fill(); G.rr(c, x - 120, 260, 240, 16, 8); c.fill();
      for (let k = 0; k < 4; k++) { const dx = x - 90 + k * 60; c.fillStyle = ['#ff8fbd', '#8fe3c8', '#ffd54a', '#9bc4ff'][k]; G.rr(c, dx - 20, 112, 12, 38, 5); c.fill(); G.rr(c, dx + 8, 112, 12, 38, 5); c.fill(); c.fillStyle = '#9aa0b5'; c.fillRect(dx - 10, 128, 20, 6); }
      c.fillStyle = '#fff'; G.rr(c, x - 70, 190, 140, 60, 12); c.fill(); G.text(c, 'LOVE GYM', x, 220, { size: 26, color: '#a982d4' });
    } else {
      c.fillStyle = '#ead1b5'; G.rr(c, x - 120, 160, 240, 14, 7); c.fill(); G.rr(c, x - 120, 270, 240, 14, 7); c.fill();
      for (let k = 0; k < 5; k++) { c.fillStyle = ['#ffd1e3', '#fff', '#ffe08a', '#c9f0e0', '#ffb7a0'][k]; G.rr(c, x - 110 + k * 46, 116, 36, 44, 10); c.fill(); G.rr(c, x - 104 + k * 46, 226, 30, 44, 9); c.fill(); }
      G.drawHeart(c, x, 82, 38, '#ff9cc2', null, 0, true);
    }
  }
}

// 바닥: gaps = [{x0,x1}] (월드 좌표)
LF.drawGround = (c, th, cam, gaps = []) => {
  const W = LF.W, H = LF.H, GY = LF.GY;
  const segs = []; let x = cam - 50;
  const vis = gaps.filter(g => g.x1 > cam - 50 && g.x0 < cam + W + 50).sort((a, b) => a.x0 - b.x0);
  for (const g of vis) { if (g.x0 > x) segs.push([x, g.x0]); x = Math.max(x, g.x1); }
  if (x < cam + W + 50) segs.push([x, cam + W + 50]);
  // 구덩이 속 (어둡게)
  for (const g of vis) { const sx = g.x0 - cam, w = g.x1 - g.x0; c.fillStyle = G.lin(c, 0, GY, 0, H, ['rgba(60,30,60,.55)', 'rgba(30,10,40,.9)']); c.fillRect(sx, GY + 10, w, H - GY); }
  for (const [a, b] of segs) {
    const sx = a - cam, w = b - a;
    c.fillStyle = G.lin(c, 0, GY, 0, H, [th.ground, th.groundD]); c.fillRect(sx, GY + 8, w, H - GY);
    // 흙 무늬
    c.fillStyle = 'rgba(255,255,255,.12)';
    const i0 = Math.floor(a / 70), i1 = Math.ceil(b / 70);
    for (let i = i0; i < i1; i++) { const r = rng(i * 13 + 5), px = i * 70 + r() * 40 - cam, py = GY + 40 + r() * 70; if (px > sx + 8 && px < sx + w - 8) { if (th.checker) { c.fillStyle = (i % 2) ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.04)'; c.fillRect(i * 70 - cam, GY + 20, 70, H); } else { c.beginPath(); c.ellipse(px, py, 10 + r() * 8, 5 + r() * 3, 0, 0, TAU); c.fill(); } } }
    // 윗면 (부드러운 물결)
    c.fillStyle = th.top; c.beginPath(); c.moveTo(sx, GY + 18);
    for (let xx = 0; xx <= w; xx += 12) { const wx = a + xx; c.lineTo(sx + xx, GY + 14 + Math.sin(wx * .08) * 3); }
    c.lineTo(sx + w, GY - 2); c.lineTo(sx, GY - 2); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(sx, GY - 2, w, 4);
    // 가장자리
    c.strokeStyle = 'rgba(80,40,60,.25)'; c.lineWidth = 3; c.beginPath(); c.moveTo(sx, GY - 2); c.lineTo(sx, H); c.moveTo(sx + w, GY - 2); c.lineTo(sx + w, H); c.stroke();
    // 풀/꽃 장식
    if (!th.indoor && th.weather !== 'snow') {
      for (let i = i0; i < i1; i++) { const r = rng(i * 7 + 2), px = i * 70 + r() * 50 - cam; if (px < sx + 10 || px > sx + w - 10) continue; c.fillStyle = th.top; c.beginPath(); c.moveTo(px - 6, GY); c.lineTo(px - 2, GY - 10 - r() * 6); c.lineTo(px + 1, GY); c.lineTo(px + 4, GY - 8 - r() * 6); c.lineTo(px + 8, GY); c.fill(); if (r() > .7) { c.fillStyle = ['#ff8fbd', '#fff', '#ffd54a'][i % 3]; c.beginPath(); c.arc(px + 14, GY - 6, 4.5, 0, TAU); c.fill(); } }
    }
  }
};

LF.drawWeather = (c, th, t, cam = 0) => {
  const W = LF.W, H = LF.H;
  switch (th.weather) {
    case 'petals': for (let i = 0; i < 30; i++) { const x = md(i * 97 - t * 70 - cam * .3, W + 60) - 30, y = md(i * 53 + t * 50 + Math.sin(t + i) * 30, H); c.save(); c.translate(x, y); c.rotate(t * 1.5 + i); c.fillStyle = i % 3 ? '#ffc2d9' : '#ffe0ea'; c.beginPath(); c.ellipse(0, 0, 8, 4.5, 0, 0, TAU); c.fill(); c.restore(); } break;
    case 'leaves': for (let i = 0; i < 14; i++) { const x = md(i * 151 - t * 60 - cam * .3, W + 60) - 30, y = md(i * 77 + t * 40, H); c.save(); c.translate(x, y); c.rotate(t * 2 + i); c.fillStyle = '#9ade9a'; c.beginPath(); c.ellipse(0, 0, 9, 4, 0, 0, TAU); c.fill(); c.restore(); } break;
    case 'confetti': for (let i = 0; i < 26; i++) { const x = md(i * 71 - cam * .25, W), y = md(i * 43 + t * 40, H); c.save(); c.translate(x, y); c.rotate(t * 3 + i); c.fillStyle = ['#ffd54a', '#ff9cc2', '#8fe3c8', '#c7b0ff'][i % 4]; c.fillRect(-5, -3, 10, 6); c.restore(); } break;
    case 'rain': c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 110; i++) { const x = md(i * 41 - t * 220 - cam * .4, W + 100) - 20, y = md(i * 67 + t * 900, H + 60) - 30; c.moveTo(x, y); c.lineTo(x - 9, y + 26); } c.stroke(); c.fillStyle = 'rgba(60,80,130,.12)'; c.fillRect(0, 0, W, H); break;
    case 'snow': c.fillStyle = '#fff'; for (let i = 0; i < 90; i++) { const x = md(i * 59 + Math.sin(t * .8 + i) * 40 - cam * .35, W + 40) - 20, y = md(i * 31 + t * (50 + (i % 5) * 18), H + 20) - 10; c.globalAlpha = .55 + (i % 3) * .15; c.beginPath(); c.arc(x, y, 2 + (i % 4) * 1.2, 0, TAU); c.fill(); } c.globalAlpha = 1; break;
    case 'lantern': for (let i = 0; i < 10; i++) { const x = md(i * 150 + t * 16 - cam * .2, W + 60) - 30, y = 480 - md(i * 61 + t * 24, 420); G.glow(c, x, y, 16, 'rgba(255,200,110,.7)'); } break;
    case 'stars': for (let i = 0; i < 3; i++) { const k = md(t * .3 + i * .33, 1); if (k > .25) continue; const q = k * 4, x = 1200 - q * 900 + i * 120, y = 40 + q * 380 + i * 30; c.strokeStyle = `rgba(255,255,255,${1 - q})`; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 90, y - 50); c.stroke(); } break;
    case 'hearts': for (let i = 0; i < 12; i++) { const x = md(i * 113 + Math.sin(t + i) * 30, W), y = H + 40 - md(t * (30 + i * 3) + i * 90, H + 80); c.globalAlpha = .35; G.drawHeart(c, x, y, 18 + (i % 4) * 8, ['#ff9cc2', '#ffc2d9', '#ff7eb3'][i % 3], null, 0, false); } c.globalAlpha = 1; break;
  }
};
