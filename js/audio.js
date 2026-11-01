// Sonoro di Nailcap: tutto sintetizzato in tempo reale con la Web Audio API, nessun file audio.
// - effetti per gli eventi di gioco, con panoramica stereo in base alla posizione
// - musica d'ambiente generativa, un tema per la schermata iniziale e uno per mondo
// - fruscio del vento nei livelli ventosi
// La musica usa Math.random: vive fuori dalla simulazione e non tocca il determinismo.
(() => {
  'use strict';

  const KEY = 'gpverse.nailcap.audio.v1';
  const MODES = ['all', 'sfx', 'off'];
  const LABEL = { all: 'musica ed effetti', sfx: 'solo effetti', off: 'spento' };
  let mode = 'all';
  try {
    const m = localStorage.getItem(KEY);
    if (MODES.includes(m)) mode = m;
  } catch (e) { /* storage non disponibile */ }

  let ctx = null;
  let musicBus = null;
  let sfxBus = null;
  let reverb = null;
  let noiseBuf = null;
  let duck = false;
  let pendingTheme = null;
  const last = {};

  // ---------- Avvio (i browser lo permettono solo dopo un tocco) ----------
  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    comp.connect(ctx.destination);
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.gain.value = 0;
    sfxBus.gain.value = 0;
    musicBus.connect(comp);
    sfxBus.connect(comp);
    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    reverb.connect(wet);
    wet.connect(comp);
    noiseBuf = makeNoise(2);
    applyMode();
    return ctx;
  }

  function makeNoise(sec) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  // riverbero "di grotta": rumore che decade, leggermente diverso tra i due canali
  function makeImpulse(sec) {
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return b;
  }

  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (pendingTheme && music.name !== pendingTheme) startMusic(pendingTheme);
  }
  ['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') ctx.suspend();
    else if (mode !== 'off') ctx.resume();
  });

  function applyMode() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const mv = mode === 'all' ? (duck ? 0.3 : 0.85) : 0;
    musicBus.gain.setTargetAtTime(mv, t, 0.25);
    sfxBus.gain.setTargetAtTime(mode === 'off' ? 0 : 0.85, t, 0.05);
  }

  // ---------- Mattoncini ----------
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function out(node, pan, send, bus) {
    let o = node;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(p);
      o = p;
    }
    o.connect(bus || sfxBus);
    if (send) {
      const s = ctx.createGain();
      s.gain.value = send;
      o.connect(s);
      s.connect(reverb);
    }
  }

  function tone(o) {
    const t0 = ctx.currentTime + (o.t || 0);
    const a = o.a || 0.005;
    const d = o.d || 0.2;
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + a + d);
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.1, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    let node = g;
    osc.connect(g);
    if (o.cut) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.cut;
      g.connect(f);
      node = f;
    }
    out(node, o.pan, o.send, o.bus);
    osc.start(t0);
    osc.stop(t0 + a + d + 0.05);
  }

  function noise(o) {
    const t0 = ctx.currentTime + (o.t || 0);
    const a = o.a || 0.002;
    const d = o.d || 0.15;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1200, t0);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + a + d);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.1, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    src.connect(f);
    f.connect(g);
    out(g, o.pan, o.send, o.bus);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + a + d + 0.05);
  }

  // ---------- Effetti ----------
  // nota "di firma" di ogni ruolo, tutte nella stessa scala pentatonica
  const ROLE_NOTE = { stump: 64, rooter: 59, parasol: 72, ram: 55, stretch: 67, clinger: 69, puff: 74, glow: 76, sprout: 71, mycelink: 62 };
  const SAVE_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
  const MIN_GAP = { dig: 90, bash: 110, brick: 45, rewind: 140, spawn: 60, saved: 35, death: 60, select: 30, fallout: 120, boing: 40, link: 60 };

  const SFX = {
    spawn: (p) => {
      tone({ f: 620, f2: 300, d: 0.12, vol: 0.1, pan: p });
      noise({ filter: 'highpass', f: 3000, d: 0.04, vol: 0.04, pan: p });
    },
    tap: () => tone({ type: 'triangle', f: 880, d: 0.05, vol: 0.05 }),
    select: () => tone({ f: 990, d: 0.05, vol: 0.06 }),
    role: (p, o) => {
      const m = ROLE_NOTE[o.role] || 67;
      tone({ type: 'triangle', f: mtof(m), d: 0.12, vol: 0.12, pan: p, send: 0.25 });
      tone({ f: mtof(m + 7), t: 0.06, d: 0.18, vol: 0.09, pan: p, send: 0.35 });
    },
    unstump: (p) => tone({ type: 'triangle', f: 330, f2: 660, d: 0.15, vol: 0.1, pan: p }),
    saved: (p, o) => {
      const m = 72 + SAVE_SCALE[((o.n || 1) - 1) % SAVE_SCALE.length];
      tone({ f: mtof(m), d: 0.5, vol: 0.13, pan: p, send: 0.5 });
      tone({ type: 'triangle', f: mtof(m + 12), d: 0.25, vol: 0.04, pan: p, send: 0.5 });
    },
    death: (p) => {
      noise({ filter: 'lowpass', f: 1400, f2: 200, d: 0.25, vol: 0.16, pan: p });
      tone({ f: 320, f2: 80, d: 0.25, vol: 0.1, pan: p });
    },
    fallout: (p) => tone({ f: 500, f2: 110, d: 0.6, vol: 0.05, pan: p }),
    dig: (p) => noise({ f: 420, q: 2, d: 0.06, vol: 0.12, pan: p }),
    bash: (p) => {
      noise({ filter: 'lowpass', f: 700, d: 0.08, vol: 0.2, pan: p });
      tone({ type: 'square', f: 90, d: 0.05, vol: 0.04, pan: p, cut: 600 });
    },
    brick: (p, o) => tone({ type: 'triangle', f: 280 + (o.n || 0) * 22, d: 0.05, vol: 0.06, pan: p }),
    fuse: (p) => tone({ f: 380, f2: 1300, a: 0.02, d: 0.95, vol: 0.04, pan: p }),
    puff: (p) => {
      noise({ filter: 'lowpass', f: 2400, f2: 300, d: 0.35, vol: 0.28, pan: p, send: 0.3 });
      tone({ f: 160, f2: 50, d: 0.3, vol: 0.22, pan: p });
    },
    germinate: (p) => {
      tone({ f: 1047, d: 0.3, vol: 0.06, pan: p, send: 0.6 });
      tone({ f: 1319, t: 0.06, d: 0.3, vol: 0.05, pan: p, send: 0.6 });
    },
    grow: (p) => tone({ type: 'triangle', f: 260, f2: 520, d: 0.2, vol: 0.07, pan: p }),
    boing: (p) => tone({ type: 'triangle', f: 200, f2: 640, a: 0.004, d: 0.26, vol: 0.13, pan: p }),
    link: (p) => {
      noise({ f: 400, f2: 3200, q: 3, d: 0.3, vol: 0.09, pan: p, send: 0.4 });
      tone({ f: 880, f2: 220, d: 0.3, vol: 0.05, pan: p, send: 0.4 });
    },
    bulb: (p) => [784, 988, 1175].forEach((f, i) => tone({ type: 'triangle', f, t: i * 0.05, d: 0.6, vol: 0.06, pan: p, send: 0.6 })),
    beep: (p, o) => tone({ type: 'square', f: 440 + (5 - (o.n || 5)) * 110, d: 0.08, vol: 0.05, cut: 2200 }),
    bloom: () => {
      noise({ filter: 'highpass', f: 900, a: 0.05, d: 1.1, vol: 0.18, send: 0.5 });
      [1047, 1319, 1568, 2093].forEach((f, i) => tone({ f, t: 0.05 + i * 0.07, d: 0.7, vol: 0.05, send: 0.7, pan: (i - 1.5) * 0.4 }));
    },
    win: () => [72, 76, 79, 84].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), t: i * 0.12, d: i === 3 ? 0.8 : 0.35, vol: 0.12, send: 0.5 })),
    lose: () => [67, 65, 63, 60].forEach((m, i) => tone({ f: mtof(m), t: i * 0.18, d: 0.4, vol: 0.1, send: 0.4 })),
    rewind: () => noise({ f: 2200, f2: 500, q: 2, d: 0.18, vol: 0.05 })
  };

  function play(name, o) {
    if (!ctx || mode === 'off' || ctx.state !== 'running') return;
    const fx = SFX[name];
    if (!fx) return;
    const now = performance.now();
    if (MIN_GAP[name] && now - (last[name] || 0) < MIN_GAP[name]) return;
    last[name] = now;
    o = o || {};
    const pan = o.x === undefined ? 0 : (o.x / 640 * 2 - 1) * 0.7;
    try { fx(pan, o); } catch (e) { /* un suono perso non deve fermare il gioco */ }
  }

  // ---------- Musica ----------
  // scale pentatoniche e progressioni (gradi della scala) diverse per ogni mondo
  const THEMES = {
    title: { root: 57, scale: [0, 3, 5, 7, 10], bpm: 72, density: 0.45, prog: [0, 3, 2, 4], cut: 900 },
    w1: { root: 55, scale: [0, 2, 4, 7, 9], bpm: 84, density: 0.55, prog: [0, 3, 4, 0], cut: 1100 },
    w2: { root: 57, scale: [0, 2, 4, 7, 9], bpm: 90, density: 0.6, prog: [0, 4, 3, 4], cut: 1200 },
    w3: { root: 53, scale: [0, 2, 5, 7, 9], bpm: 78, density: 0.42, prog: [0, 2, 3, 0], cut: 1500 },
    w4: { root: 50, scale: [0, 3, 5, 7, 10], bpm: 64, density: 0.22, prog: [0, 3, 0, 4], cut: 600 },
    w5: { root: 52, scale: [0, 1, 5, 7, 8], bpm: 74, density: 0.4, prog: [0, 1, 3, 0], cut: 800 }
  };
  const music = { name: null, theme: null, step: 0, next: 0, timer: 0 };

  function note(th, degree, octave) {
    const n = th.scale.length;
    const oct = Math.floor(degree / n);
    const d = ((degree % n) + n) % n;
    return mtof(th.root + th.scale[d] + 12 * (oct + octave));
  }

  function startMusic(name) {
    const th = THEMES[name];
    if (!th || !ctx) return;
    music.name = name;
    music.theme = th;
    music.step = 0;
    music.next = ctx.currentTime + 0.15;
    if (!music.timer) music.timer = setInterval(schedule, 100);
  }

  // pianificazione in anticipo: le note sono fissate sull'orologio audio, non sui timer
  function schedule() {
    if (!ctx || !music.theme || ctx.state !== 'running' || mode !== 'all') {
      if (ctx) music.next = Math.max(music.next, ctx.currentTime + 0.05);
      return;
    }
    const th = music.theme;
    const eighth = 60 / th.bpm / 2;
    while (music.next < ctx.currentTime + 0.4) {
      playStep(music.step, music.next, th, eighth);
      music.next += eighth;
      music.step++;
    }
  }

  function playStep(i, t, th, eighth) {
    const dt = t - ctx.currentTime;
    const deg = th.prog[Math.floor(i / 16) % th.prog.length];
    if (i % 16 === 0) {
      // tappeto: accordo di tre note, morbido e filtrato
      for (const k of [0, 2, 4]) {
        for (const det of [-7, 7]) {
          tone({ type: 'triangle', f: note(th, deg + k, 0), detune: det, t: dt, a: 1.2, d: eighth * 16, vol: 0.022, cut: th.cut, bus: musicBus, send: 0.5 });
        }
      }
      tone({ f: note(th, deg, -1), t: dt, a: 0.03, d: eighth * 12, vol: 0.08, bus: musicBus });
    } else if (i % 16 === 8) {
      tone({ f: note(th, deg + (Math.random() < 0.5 ? 2 : 0), -1), t: dt, a: 0.03, d: eighth * 6, vol: 0.05, bus: musicBus });
    }
    // arpeggio pizzicato, sparso
    const chance = th.density * (i % 2 === 0 ? 1 : 0.45);
    if (Math.random() < chance) {
      const k = [0, 2, 4, 5, 7][Math.floor(Math.random() * 5)];
      const oct = Math.random() < 0.2 ? 2 : 1;
      const pan = Math.random() - 0.5;
      tone({ f: note(th, deg + k, oct), t: dt, a: 0.004, d: 0.9, vol: 0.04, pan, bus: musicBus, send: 0.7 });
      tone({ type: 'triangle', f: note(th, deg + k, oct + 1), t: dt, a: 0.004, d: 0.3, vol: 0.008, pan, bus: musicBus, send: 0.7 });
    }
    // ogni tanto una campanella lontana
    if (i % 32 === 20 && Math.random() < 0.5) {
      tone({ f: note(th, deg + 4, 3), t: dt, a: 0.01, d: 2.2, vol: 0.016, pan: Math.random() * 1.2 - 0.6, bus: musicBus, send: 0.9 });
    }
  }

  // ---------- Vento ----------
  let wind = null;
  function setWind(v) {
    if (!ctx || ctx.state !== 'running') return;
    if (!wind) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 500;
      f.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f);
      f.connect(g);
      g.connect(sfxBus);
      src.start();
      wind = { g, f, v: -1 };
    }
    const target = Math.min(1, Math.max(0, v)) * 0.13;
    if (Math.abs(target - wind.v) < 0.004) return;
    wind.v = target;
    wind.g.gain.setTargetAtTime(target, ctx.currentTime, 0.35);
    wind.f.frequency.setTargetAtTime(320 + v * 900, ctx.currentTime, 0.35);
  }

  // ---------- Pulsanti audio ----------
  const ICONS = {
    all: '<path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor"/><path d="M16 9 Q18 12 16 15 M18.5 6.5 Q22 12 18.5 17.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    sfx: '<path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor"/><path d="M16 9 Q18 12 16 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    off: '<path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor"/><path d="M16 9 L21 15 M21 9 L16 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
  };
  function renderButtons() {
    for (const id of ['btn-sound', 't-sound']) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[mode] + '</svg>' +
        (id === 't-sound' ? '<span>Audio: ' + LABEL[mode] + '</span>' : '');
      el.setAttribute('aria-label', 'Audio: ' + LABEL[mode] + '. Tocca per cambiare');
      el.title = 'Audio: ' + LABEL[mode];
    }
  }
  function cycleMode() {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    try { localStorage.setItem(KEY, mode); } catch (e) { /* ignora */ }
    unlock();
    if (ctx && mode !== 'off' && ctx.state === 'suspended') ctx.resume();
    applyMode();
    renderButtons();
    play('tap');
  }
  for (const id of ['btn-sound', 't-sound']) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', cycleMode);
  }
  renderButtons();

  window.NailcapAudio = {
    play,
    setTheme(name) {
      pendingTheme = name;
      if (ctx && music.name !== name) startMusic(name);
    },
    setWind,
    setDuck(b) {
      b = !!b;
      if (b === duck) return;
      duck = b;
      applyMode();
    },
    get mode() { return mode; }
  };
})();
