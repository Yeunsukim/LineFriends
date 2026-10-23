'use strict';
// WebAudio 신시사이저: 효과음 + 장면별 BGM (외부 파일 없음)
LF.audio = (() => {
  let ac = null, master = null, musicBus = null, sfxBus = null, timer = null, step = 0, nextT = 0, song = null, noiseBuf = null;
  const N = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = .7; master.connect(ac.destination);
      musicBus = ac.createGain(); sfxBus = ac.createGain(); musicBus.connect(master); sfxBus.connect(master);
      applyVol();
      noiseBuf = ac.createBuffer(1, ac.sampleRate * .5, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      timer = setInterval(sched, 60);
      setTimeout(() => LF.audio.preload && LF.audio.preload(), 0); // 목소리 미리 디코드 (첫 재생이 늦지 않게)
    } catch (e) { ac = null; }
  }
  function applyVol() { if (!ac) return; musicBus.gain.value = LF.save.data.music ? .55 : 0; sfxBus.gain.value = LF.save.data.sfx ? 1 : 0; }
  function osc(f, t, d, type, v, bus, slide = 0, attack = .005) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + attack); g.gain.exponentialRampToValueAtTime(.0005, t + d);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + .05);
  }
  function noise(t, d, v, bus, hp = 6000) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0005, t + d);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + d + .02);
  }
  const bell = (f, t, d, v) => { osc(f, t, d, 'sine', v, musicBus); osc(f * 2, t, d * .6, 'sine', v * .3, musicBus); osc(f * 3.01, t, d * .3, 'triangle', v * .08, musicBus); };
  // 곡: 코드 진행 + 멜로디 패턴(16분음표, -1 쉼표) + 드럼
  const SONGS = {
    title: { bpm: 96, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], mel: [72, -1, 76, -1, 79, -1, 76, 77, 76, -1, 74, -1, 72, -1, -1, -1, 69, -1, 72, -1, 76, -1, 74, 72, 74, -1, 76, -1, 79, -1, -1, -1], drum: 0 },
    run: { bpm: 150, chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], mel: [72, 74, 76, -1, 79, -1, 76, -1, 74, 76, 74, 72, 69, -1, 72, -1, 71, 72, 74, -1, 76, -1, 79, 81, 79, -1, 76, -1, 74, -1, -1, -1], drum: 2 },
    mini: { bpm: 124, chords: [[62, 65, 69], [60, 64, 67], [58, 62, 65], [60, 64, 67]], mel: [74, -1, 77, 74, 81, -1, 79, -1, 77, -1, 76, -1, 74, -1, 72, -1, 70, -1, 74, 72, 77, -1, 76, -1, 74, 72, 74, 76, 74, -1, -1, -1], drum: 1 },
    end: { bpm: 84, chords: [[53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 64], [57, 60, 64, 67]], mel: [76, -1, -1, 77, 79, -1, 84, -1, 83, -1, 79, -1, 76, -1, -1, -1, 74, -1, -1, 76, 77, -1, 81, -1, 79, -1, 77, 76, 74, -1, -1, -1], drum: 0 },
  };
  function sched() {
    if (!ac || !song) return;
    const S = SONGS[song], sd = 60 / S.bpm / 4;
    if (nextT < ac.currentTime - .3) nextT = ac.currentTime + .05;
    while (nextT < ac.currentTime + .25) {
      const bar = Math.floor(step / 16) % S.chords.length, ch = S.chords[bar], st = step % 16, t = nextT;
      const m = S.mel[step % S.mel.length]; if (m > 0) bell(N(m), t, .5, .09);
      if (st % 8 === 0) osc(N(ch[0] - 24), t, sd * 7, 'triangle', .16, musicBus);
      if (st % 4 === 2 && S.drum) ch.forEach(n => osc(N(n), t, sd * 1.5, 'sine', .028, musicBus));
      if (!S.drum && st % 4 === 0) ch.forEach((n, i) => bell(N(n), t + i * .03, 1.2, .025));
      if (S.drum) {
        if (st % 4 === 0) osc(150, t, .14, 'sine', .3, musicBus, -110);
        if (S.drum > 1 && st % 8 === 4) noise(t, .12, .12, musicBus, 1800);
        if (st % 2 === 1) noise(t, .03, .04, musicBus, 8000);
      }
      nextT += sd; step++;
    }
  }
  // ---- 녹음된 목소리(LF.VOICE: data URI WAV). 처음 쓸 때 디코드해서 캐시 ----
  const voiceBuf = {}, voiceWait = {};
  function loadVoice(name) {
    if (voiceBuf[name] || voiceWait[name] || !ac || !(LF.VOICE && LF.VOICE[name])) return voiceWait[name];
    const b64 = LF.VOICE[name].split(',')[1], bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    voiceWait[name] = ac.decodeAudioData(u8.buffer).then(b => { voiceBuf[name] = b; }).catch(() => { });
    return voiceWait[name];
  }
  function voice(name, vol = 1) {
    if (!ac) return; if (ac.state === 'suspended') ac.resume();
    const play = () => { const b = voiceBuf[name]; if (!b) return; const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(sfxBus); s.start(); };
    if (voiceBuf[name]) play(); else { const p = loadVoice(name); p && p.then(play); }
  }
  const T = () => ac.currentTime;
  const FX = {
    click: () => osc(880, T(), .07, 'sine', .15, sfxBus, 300),
    jump: () => osc(420, T(), .18, 'square', .06, sfxBus, 500),
    jump2: () => { osc(600, T(), .2, 'square', .05, sfxBus, 700); osc(900, T() + .05, .15, 'sine', .07, sfxBus, 500); },
    slide: () => noise(T(), .22, .12, sfxBus, 1200),
    land: () => osc(180, T(), .08, 'sine', .12, sfxBus, -60),
    coin: () => { osc(1046, T(), .07, 'square', .045, sfxBus); osc(1568, T() + .05, .14, 'square', .045, sfxBus); },
    gold: () => [1046, 1318, 1568, 2093].forEach((f, i) => osc(f, T() + i * .05, .16, 'square', .045, sfxBus)),
    hit: () => { osc(300, T(), .35, 'sawtooth', .14, sfxBus, -220); noise(T(), .18, .2, sfxBus, 500); },
    fall: () => osc(700, T(), .7, 'triangle', .15, sfxBus, -600),
    pop: () => { osc(1200, T(), .1, 'sine', .14, sfxBus, -800); noise(T(), .06, .1, sfxBus, 3000); },
    throw: () => osc(500, T(), .14, 'triangle', .12, sfxBus, 600),
    star: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => osc(f, T() + i * .045, .2, 'triangle', .1, sfxBus)),
    win: () => [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => osc(f, T() + i * .1, .45, 'triangle', .12, sfxBus)),
    lose: () => [440, 415, 392, 330].forEach((f, i) => osc(f, T() + i * .2, .4, 'triangle', .12, sfxBus)),
    perfect: () => [1318, 1760, 2093].forEach((f, i) => osc(f, T() + i * .05, .2, 'triangle', .1, sfxBus)),
    good: () => { osc(988, T(), .1, 'triangle', .1, sfxBus); osc(1318, T() + .06, .16, 'triangle', .1, sfxBus); },
    miss: () => osc(220, T(), .25, 'sawtooth', .08, sfxBus, -80),
    kiss: () => { osc(1400, T(), .08, 'sine', .15, sfxBus, 600); osc(1900, T() + .09, .18, 'sine', .12, sfxBus, -900); },
    count: () => osc(660, T(), .14, 'square', .07, sfxBus),
    go: () => { osc(990, T(), .35, 'square', .08, sfxBus, 300); osc(1320, T() + .05, .3, 'square', .05, sfxBus, 200); },
    tick: () => osc(1500, T(), .03, 'square', .04, sfxBus),
    whoosh: () => noise(T(), .3, .1, sfxBus, 800),
    heartbeat: () => { osc(70, T(), .15, 'sine', .4, sfxBus, -20); osc(70, T() + .18, .15, 'sine', .3, sfxBus, -20); },
  };
  return {
    init, applyVol, voice,
    // 앱이 백그라운드로 가면 소리를 멈추고(배터리·소음), 돌아오면 이어서 재생
    suspend() { if (ac && ac.state === 'running') ac.suspend().catch(() => { }); },
    resumeCtx() { if (ac && ac.state !== 'running') ac.resume().catch(() => { }); },
    preload() { if (ac && LF.VOICE) for (const k in LF.VOICE) loadVoice(k); },
    sfx(name) { if (!ac) return; try { FX[name] && FX[name](); } catch (e) { } },
    music(name) { init(); if (name === song) return; song = name; step = 0; if (ac) nextT = ac.currentTime + .1; },
  };
})();
LF.sfx = n => LF.audio.sfx(n);
