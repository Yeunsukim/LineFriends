'use strict';
// 메인: 캔버스(고해상도), 입력, 게임 루프
(function () {
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const wcv = document.getElementById('world'), stage = document.getElementById('stage');
  LF.canvas = canvas; LF.ctx = ctx;
  LF.W3.init(wcv); // three.js가 없으면(오프라인) 2D 배경으로 자동 대체
  let scale = 1;
  function resize() {
    const s = Math.min(innerWidth / LF.W, innerHeight / LF.H), dpr = window.devicePixelRatio || 1;
    const w = Math.floor(LF.W * s), h = Math.floor(LF.H * s);
    stage.style.width = w + 'px'; stage.style.height = h + 'px';
    for (const cv of [canvas, wcv]) { cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
    scale = Math.min(3, s * dpr); // 화면 픽셀 밀도에 맞춰 그려서 항상 선명하게
    canvas.width = Math.round(LF.W * scale); canvas.height = Math.round(LF.H * scale);
    LF.W3.resize(w, h, dpr);
  }
  addEventListener('resize', resize); resize();

  const pos = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * LF.W / r.width, y: (e.clientY - r.top) * LF.H / r.height }; };
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault(); LF.audio.init(); const p = pos(e); LF.ptr.x = p.x; LF.ptr.y = p.y; LF.ptr.down = true;
    if (e.pointerType === 'touch') LF.touch = true; else if (e.pointerType === 'mouse') LF.touch = false;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { }
    if (LF.cur && LF.cur.pointerdown && LF.trans.phase === 'none') LF.cur.pointerdown(p.x, p.y, e.pointerId);
  });
  canvas.addEventListener('pointermove', e => { const p = pos(e); LF.ptr.x = p.x; LF.ptr.y = p.y; LF.cur && LF.cur.pointermove && LF.cur.pointermove(p.x, p.y, e.pointerId); });
  const up = e => { const p = pos(e); LF.ptr.down = false; LF.cur && LF.cur.pointerup && LF.cur.pointerup(p.x, p.y, e.pointerId); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return; LF.keys.add(e.code); LF.audio.init();
    if (LF.cur && LF.cur.keydown && LF.trans.phase === 'none') LF.cur.keydown(e.code);
  });
  addEventListener('keyup', e => { LF.keys.delete(e.code); LF.cur && LF.cur.keyup && LF.cur.keyup(e.code); });
  addEventListener('blur', () => { LF.keys.clear(); if (LF.curName === 'run' && LF.cur.state === 'run') LF.cur.paused = true; });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; LF.t += dt;
    try {
      LF.updateTrans(dt);
      if (LF.cam.shake > 0) LF.cam.shake = Math.max(0, LF.cam.shake - dt * 40);
      if (LF.cam.flash > 0) LF.cam.flash = Math.max(0, LF.cam.flash - dt * 2.5);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, LF.W, LF.H);
      LF.v3 = null;
      if (LF.cur) {
        LF.cur.update(dt);
        ctx.save();
        if (LF.cam.shake > .5 && LF.curName === 'run') ctx.translate(rand(-1, 1) * LF.cam.shake, rand(-1, 1) * LF.cam.shake);
        LF.cur.draw(ctx);
        ctx.restore();
      }
      LF.drawTrans(ctx);
      if (LF.v3) { wcv.style.visibility = 'visible'; LF.W3.frame(LF.v3.cam, LF.v3.gy, dt, LF.v3.fov); } else wcv.style.visibility = 'hidden';
    } catch (err) {
      if (LF.lastErr !== String(err)) { LF.lastErr = String(err); console.error('[LF]', err && err.stack || err); }
    }
    requestAnimationFrame(frame);
  }
  // ---------- 로딩 화면: 게이지를 따라 달려가는 주인공이 기다리는 상대에게 도착하면 좋아하며 시작 ----------
  function startLoading() {
    const cv = document.getElementById('bootc'), fb = document.getElementById('bootfb');
    if (!cv) return { done: Promise.resolve(), set() { } };
    if (fb) fb.style.display = 'none';
    const c = cv.getContext('2d'), kinds = [LF.P(), LF.Q()], A = new LF.Actor(kinds[0]), B = new LF.Actor(kinds[1]);
    A.play('run', { speed: 14 }); B.play('wave');
    const L = { fonts: false, assets: false, t: 0, shown: 0, phase: 'load', pt: 0, bub: [] };
    for (let i = 0; i < 24; i++) L.bub.push(LF.newBubble(true));
    const bar = { x: 290, y: 560, w: 640, h: 34 };
    let sc = 1, ox = 0, oy = 0;
    const fit = () => { const d = window.devicePixelRatio || 1; cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d); sc = Math.min(cv.width / LF.W, cv.height / LF.H); ox = (cv.width - LF.W * sc) / 2; oy = (cv.height - LF.H * sc) / 2; };
    fit(); addEventListener('resize', fit);
    let last = performance.now(), stop = false, res; const done = new Promise(r => res = r);
    const frame = now => {
      if (stop) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; L.t += dt; LF.t += dt;
      const real = .3 + (L.fonts ? .35 : 0) + (L.assets ? .35 : 0), target = Math.min(real, L.t / 1.5);
      if (L.phase === 'load') { L.shown += (target - L.shown) * Math.min(1, dt * 7); if (L.shown >= .985 && target >= .999) { L.phase = 'joy'; L.pt = 0; L.shown = 1; } }
      else { L.pt += dt; if (L.pt > 1.3 && res) { res(); res = null; } }
      A.update(dt); B.update(dt);
      for (let i = 0; i < L.bub.length; i++) { const b = L.bub[i]; b.age += dt; b.y -= b.v * dt; if (b.y < -b.s || b.age > b.life) L.bub[i] = LF.newBubble(false); }
      // ----- 그리기 -----
      c.setTransform(1, 0, 0, 1, 0, 0);
      const g = c.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, '#ffd3e4'); g.addColorStop(.6, '#fff1ea'); g.addColorStop(1, '#fbe6cf'); c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
      c.setTransform(sc, 0, 0, sc, ox, oy);
      for (const b of L.bub) LF.drawBubble(c, b, L.t);
      const tipX = bar.x + bar.w * L.shown, gy = bar.y - 18, ex = bar.x + bar.w;
      // 제목
      const dots = '.'.repeat(1 + Math.floor(L.t * 2.5) % 3);
      G.text(c, L.phase === 'joy' ? '만났어요!' : '불러오는 중' + dots, LF.W / 2, 170, { size: 64, color: '#2f6b4f', stroke: '#fff', sw: 14 });
      G.text(c, `${LF.CHAR[kinds[0]].name}${kinds[0] === 'brown' ? '이' : '가'} ${LF.CHAR[kinds[1]].name}에게 달려가는 중`, LF.W / 2, 232, { size: 26, color: '#9a7a8a' });
      // 게이지
      c.save(); c.shadowColor = 'rgba(80,40,60,.25)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
      G.rr(c, bar.x - 8, bar.y - bar.h / 2 - 8, bar.w + 16, bar.h + 16, (bar.h + 16) / 2); c.fillStyle = '#fff'; c.fill(); c.restore();
      c.lineWidth = 3; c.strokeStyle = '#e9c46a'; G.rr(c, bar.x - 8, bar.y - bar.h / 2 - 8, bar.w + 16, bar.h + 16, (bar.h + 16) / 2); c.stroke();
      G.rr(c, bar.x, bar.y - bar.h / 2, bar.w, bar.h, bar.h / 2); c.fillStyle = '#f3e9dd'; c.fill();
      if (L.shown > .01) {
        c.save(); G.rr(c, bar.x, bar.y - bar.h / 2, bar.w, bar.h, bar.h / 2); c.clip();
        const fw = Math.max(bar.h, bar.w * L.shown); c.fillStyle = G.lin(c, bar.x, 0, bar.x + bar.w, 0, ['#ff9fc0', '#ff4d7e']); c.fillRect(bar.x, bar.y - bar.h / 2, fw, bar.h);
        c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(bar.x, bar.y - bar.h / 2 + 3, fw, bar.h * .32);
        c.globalAlpha = .28; c.fillStyle = '#fff'; for (let x = -40 + (L.t * 90) % 56; x < fw; x += 56) { c.beginPath(); c.moveTo(bar.x + x, bar.y + bar.h / 2); c.lineTo(bar.x + x + 18, bar.y + bar.h / 2); c.lineTo(bar.x + x + 40, bar.y - bar.h / 2); c.lineTo(bar.x + x + 22, bar.y - bar.h / 2); c.fill(); }
        c.restore();
      }
      G.text(c, Math.round(L.shown * 100) + '%', bar.x + bar.w / 2, bar.y + 3, { size: 24, color: L.shown > .5 ? '#fff' : '#b0546f', stroke: L.shown > .5 ? 'rgba(160,30,70,.35)' : null, sw: 5 });
      // 캐릭터: 주인공은 게이지 끝을 따라 달리고, 상대는 오른쪽 끝에서 손을 흔들며 기다림
      if (L.phase === 'load') {
        A.play('run', { speed: 14 }); B.play('wave');
        LF.shadow(c, tipX, bar.y - 6, 40); A.draw(c, tipX, gy - 6, 118, { dir: 1 });
        LF.shadow(c, ex + 96, bar.y - 6, 42); B.draw(c, ex + 96, gy - 6, 124, { dir: -1 });
      } else {
        A.play('joy'); B.play('joy');
        const k = Math.min(1, L.pt / .35), ax = lerp(tipX, ex + 20, ease.out(k));
        LF.shadow(c, ax, bar.y - 6, 40); A.draw(c, ax, gy - 6, 118, { dir: 1 });
        LF.shadow(c, ex + 96, bar.y - 6, 42); B.draw(c, ex + 96, gy - 6, 124, { dir: -1 });
        for (let i = 0; i < 6; i++) { const hx = (ax + ex + 96) / 2 + (i - 2.5) * 34, hy = gy - 200 - ((L.pt * 90 + i * 37) % 70), a = clamp(1 - ((L.pt * 90 + i * 37) % 70) / 70, 0, 1); c.save(); c.globalAlpha = a; G.drawHeart(c, hx, hy, 26 + (i % 3) * 8, '#ff4f63', '#fff', 3); c.restore(); }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return { done, set(k) { L[k] = true; }, stop() { stop = true; removeEventListener('resize', fit); } };
  }
  async function boot() {
    LF.save.load();
    const ld = startLoading(); // 게이지 + 코니·브라운 로딩 화면 (실제 불러오기가 끝나야 100%, 최소 약 1.5초)
    try { await Promise.race([document.fonts.load('40px Jua'), new Promise(r => setTimeout(r, 1500))]); } catch (_) { }
    ld.set('fonts');
    try { await Promise.race([Promise.all(Object.keys(LF.SPRITES || {}).map(k => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = LF.SPRITES[k].src; }))), new Promise(r => setTimeout(r, 2500))]); } catch (_) { }
    ld.set('assets');
    await Promise.race([ld.done, new Promise(r => setTimeout(r, 15000))]); ld.stop(); // (창이 백그라운드라 애니메이션이 멈춘 경우에도 영원히 대기하지 않게)
    LF._enter('title');
    const b = document.getElementById('boot'); b.classList.add('hide'); setTimeout(() => b.remove(), 600);
    requestAnimationFrame(frame);
  }
  boot();
})();
