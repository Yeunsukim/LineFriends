'use strict';
// 메인: 캔버스(고해상도), 입력, 게임 루프
(function () {
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const wcv = document.getElementById('world'), stage = document.getElementById('stage');
  LF.canvas = canvas; LF.ctx = ctx;
  if (LF.mobile) document.documentElement.classList.add('touch');
  LF.W3.init(wcv); // three.js가 없으면(오프라인) 2D 배경으로 자동 대체
  let scale = 1;
  // 안전영역(노치·제스처바) 측정: env() 값을 padding으로 가진 보이지 않는 요소를 읽는다
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  // 화면 전체 크기(노치 영역까지 포함 — 배경은 끝까지 채운다). 안전영역은 LF.safe(px)에 따로 읽어 두고,
  // 버튼·점수판 같은 조작 요소만 resize()에서 LF.inL/inR(논리 좌표)로 안쪽에 둔다. 로딩 화면도 같은 값을 쓴다.
  LF.viewport = () => {
    const cs = getComputedStyle(probe), vv = window.visualViewport, S = LF.safe;
    S.t = parseFloat(cs.paddingTop) || 0; S.r = parseFloat(cs.paddingRight) || 0; S.b = parseFloat(cs.paddingBottom) || 0; S.l = parseFloat(cs.paddingLeft) || 0;
    return { w: Math.max(1, vv ? vv.width : innerWidth), h: Math.max(1, vv ? vv.height : innerHeight) };
  };
  LF.inL = 0; LF.inR = 0;
  // 화면 폭: 기본 1280x720(16:9). 모바일은 기기 비율(예: 20:9)에 맞춰 가로로 넓혀 좌우 여백을 없앤다. PC는 그대로.
  //  - 달리기(WIDE 장면)는 넓어진 폭을 그대로 쓴다 (HUD·버튼이 화면 가장자리에 붙고, 배경도 더 넓게 보임)
  //  - 그 밖의 장면은 1280 구성을 가운데 두고, 양옆은 3D 배경이 채운다 (게임 요소는 가운데 영역에만 있음)
  LF.VW = 1280; LF.ox = 0; LF.WIDE = new Set(['run']);
  LF.syncW = () => { LF.W = LF.WIDE.has(LF.curName) ? LF.VW : 1280; LF.ox = (LF.VW - LF.W) / 2; };
  function resize() {
    const vp = LF.viewport(), s = Math.min(vp.w / 1280, vp.h / LF.H), dpr = window.devicePixelRatio || 1;
    LF.VW = LF.mobile ? Math.round(clamp(vp.w / s, 1280, 1800)) : 1280; LF.syncW();
    const w = Math.floor(LF.VW * s), h = Math.floor(LF.H * s);
    // 노치가 있는 쪽 안전영역을 논리 좌표로 환산 (달리기 화면은 화면 끝에 붙으니, 이 값만큼 안쪽에 버튼·HUD를 둔다)
    // (캔버스가 화면보다 좁아 양옆에 남는 폭은 이미 안전영역을 넘어서 있으니 그만큼은 뺀다)
    const slack = Math.max(0, (vp.w / s - LF.VW) / 2);
    LF.inL = Math.max(0, LF.safe.l / s - slack); LF.inR = Math.max(0, LF.safe.r / s - slack);
    stage.style.width = w + 'px'; stage.style.height = h + 'px';
    for (const cv of [canvas, wcv]) { cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
    scale = Math.min(LF.mobile ? 2 : 3, s * dpr); // 화면 픽셀 밀도에 맞춰 그려서 선명하게 (모바일은 상한을 낮춰 부담 감소)
    canvas.width = Math.round(LF.VW * scale); canvas.height = Math.round(LF.H * scale);
    LF.W3.resize(w, h, dpr);
  }
  addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200));
  if (window.visualViewport) visualViewport.addEventListener('resize', resize);
  resize();

  // ---------- 모바일: 전체화면 + 가로 고정 (첫 터치에서 시도, 실패해도 무시) ----------
  let fsTried = false;
  function goFullscreen() {
    if (fsTried || !LF.mobile) return; fsTried = true;
    try {
      const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
      const p = req && req.call(el, { navigationUI: 'hide' });
      Promise.resolve(p).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => { });
    } catch (_) { }
  }

  const pos = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * LF.VW / r.width - LF.ox, y: (e.clientY - r.top) * LF.H / r.height }; };
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault(); LF.audio.init(); const p = pos(e); LF.ptr.x = p.x; LF.ptr.y = p.y; LF.ptr.down = true;
    if (e.pointerType === 'touch') LF.touch = true; else if (e.pointerType === 'mouse') LF.touch = false;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { }
    if (LF.cur && LF.cur.pointerdown && LF.trans.phase === 'none') LF.cur.pointerdown(p.x, p.y, e.pointerId);
  });
  canvas.addEventListener('pointermove', e => { const p = pos(e); LF.ptr.x = p.x; LF.ptr.y = p.y; LF.cur && LF.cur.pointermove && LF.cur.pointermove(p.x, p.y, e.pointerId); });
  const up = e => { const p = pos(e); LF.ptr.down = false; LF.audio.init(); goFullscreen(); LF.cur && LF.cur.pointerup && LF.cur.pointerup(p.x, p.y, e.pointerId); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return; LF.keys.add(e.code); LF.audio.init();
    if (LF.cur && LF.cur.keydown && LF.trans.phase === 'none') LF.cur.keydown(e.code);
  });
  addEventListener('keyup', e => { LF.keys.delete(e.code); LF.cur && LF.cur.keyup && LF.cur.keyup(e.code); });
  const pauseAll = () => { LF.keys.clear(); if (LF.curName === 'run' && LF.cur.state === 'run') LF.cur.paused = true; };
  addEventListener('blur', pauseAll);
  // 앱을 내리거나 화면이 꺼지면 달리기 일시정지 + 소리 정지, 돌아오면 소리 재개
  LF.lifecycle = hidden => {
    if (hidden) { pauseAll(); LF.audio.suspend && LF.audio.suspend(); } else { last = performance.now(); LF.audio.resumeCtx && LF.audio.resumeCtx(); }
  };
  document.addEventListener('visibilitychange', () => LF.lifecycle(document.hidden));
  // 하드웨어 뒤로가기(안드로이드 등)는 Esc와 같게 처리 → 일시정지·뒤로가기를 그대로 재사용
  // 타이틀에서는 뒤로가기를 2초 안에 두 번 누르면 앱 종료 (첫 번째엔 안내 문구)
  const toast = { msg: '', t: 0 };
  LF.toast = (msg, secs = 2) => { toast.msg = msg; toast.t = secs; };
  let exitArmed = 0;
  LF.back = () => {
    if (LF.curName === 'title' && LF.trans.phase === 'none') {
      const now = performance.now();
      if (now - exitArmed < 2000) { const A = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App; if (A && A.exitApp) A.exitApp(); return; }
      exitArmed = now; LF.toast('한 번 더 누르면 종료돼요'); return;
    }
    if (LF.cur && LF.cur.keydown && LF.trans.phase === 'none') LF.cur.keydown('Escape');
  };
  function drawToast(c, dt) {
    if (toast.t <= 0) return; toast.t -= dt;
    const a = Math.min(1, toast.t / .3), W = LF.VW, w = 460, h = 64;
    c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(60,30,50,.82)'; G.rr(c, W / 2 - w / 2, LF.H - 120, w, h, h / 2); c.fill();
    G.text(c, toast.msg, W / 2, LF.H - 120 + h / 2 + 2, { size: 28, color: '#fff' }); c.restore();
  }

  // ---------- 모바일 적응형 품질: 프레임이 계속 느리면 3D를 단계적으로 낮추고 마지막엔 2D 배경으로 ----------
  // 배경은 이 게임의 얼굴이라 3D를 끄지는 않는다: 해상도(1단계)는 "대부분 30fps 미만"이 4초, 그림자 끄기(2단계)는 "대부분 20fps 미만"이 8초 이어질 때만.
  const perf = { s30: 0, s50: 0, n: 0, t: 0 };
  function watchPerf(rawDt) {
    if (!LF.mobile || !LF.W3.ok || !LF.v3 || LF.noPerfWatch || LF.W3.quality >= 2) return; // noPerfWatch: 성능 측정할 때 끄는 디버그 스위치
    if (rawDt > .2) return; // 장면 전환·3D 공원 짓기·백그라운드 복귀의 일회성 끊김은 무시
    perf.n++; perf.t += rawDt; if (rawDt > 1 / 30) perf.s30++; if (rawDt > 1 / 20) perf.s50++;
    const last = LF.W3.quality >= 1, win = last ? 8 : 4;
    if (perf.t < win) return;
    const frac = (last ? perf.s50 : perf.s30) / perf.n; perf.s30 = perf.s50 = perf.n = perf.t = 0;
    if (frac > .6) { LF.W3.lowerQuality(); resize(); }
  }

  let last = performance.now();
  function frame(now) {
    const raw = (now - last) / 1000, dt = Math.min(.05, raw); last = now; LF.t += dt;
    watchPerf(raw);
    try {
      LF.updateTrans(dt);
      if (LF.cam.shake > 0) LF.cam.shake = Math.max(0, LF.cam.shake - dt * 40);
      if (LF.cam.flash > 0) LF.cam.flash = Math.max(0, LF.cam.flash - dt * 2.5);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, LF.VW, LF.H);
      LF.v3 = null; LF.syncW();
      if (LF.cur) {
        ctx.setTransform(scale, 0, 0, scale, LF.ox * scale, 0); // 1280 구성 장면은 가운데로
        LF.cur.update(dt);
        ctx.save();
        if (LF.cam.shake > .5 && LF.curName === 'run') ctx.translate(rand(-1, 1) * LF.cam.shake, rand(-1, 1) * LF.cam.shake);
        LF.cur.draw(ctx);
        ctx.restore();
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0); LF.W = LF.VW; // 장면 전환 효과는 화면 전체를 덮는다
      LF.drawTrans(ctx); drawToast(ctx, dt); LF.syncW();
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
    const fit = () => { const d = Math.min(window.devicePixelRatio || 1, 2), vp = LF.viewport(); cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d); sc = Math.min(vp.w * d / LF.W, vp.h * d / LF.H); ox = (cv.width - LF.W * sc) / 2; oy = (cv.height - LF.H * sc) / 2; };
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
  // ---------- PWA: 서비스 워커(오프라인 캐시) 등록 ----------
  // 개발 중(localhost)과 Capacitor 앱(https://localhost)에서는 등록하지 않는다 — 옛 파일이 캐시돼 수정이 안 보이는 것을 막기 위해. (테스트: 주소 뒤에 ?pwa)
  const isLocal = /^(localhost|127\.|\[::1\])/.test(location.hostname);
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && (!isLocal || location.search.includes('pwa'))) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
  }

  // ---------- Capacitor 앱 연동 (브라우저에서는 건너뜀) ----------
  const CapPlugins = window.Capacitor && window.Capacitor.Plugins;
  if (CapPlugins && CapPlugins.App) {
    CapPlugins.App.addListener('backButton', () => LF.back());
    CapPlugins.App.addListener('appStateChange', s => LF.lifecycle(!s.isActive));
  }
  if (CapPlugins && CapPlugins.StatusBar) { try { CapPlugins.StatusBar.hide(); } catch (_) { } }
  boot();
})();
