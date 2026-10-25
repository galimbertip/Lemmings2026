(() => {
  'use strict';

  // ---------- Costanti ----------
  const W = 640;
  const H = 280;
  const TICK = 1000 / 60;
  const FALL_DEATH = 60;   // pixel di caduta oltre cui un Nailcap senza Parasol muore
  const STEP_UP = 4;       // gradino massimo che un Nailcap scavalca
  const TAP_RADIUS = 22;   // raggio di tocco generoso: niente click al pixel
  const KEYFRAME_EVERY = 300;  // un'istantanea ogni 5 secondi di gioco
  const REWIND_STEP = 300;     // il pulsante Riavvolgi torna indietro di 5 secondi
  const STRETCH_BRICKS = 14;
  const BASE_CAP = '#8A5CF6';
  const STEM = '#EFE8FF';
  const BRICK = [207, 198, 238];
  const STORAGE_KEY = 'gpverse.nailcap.progress.v1';

  // Ruoli: "trait" = tratto permanente che si somma al ruolo (Parasol, Clinger)
  const ROLE_DEFS = {
    stump:   { name: 'Stump',   color: '#8C99A6', desc: 'Si pianta e fa girare la folla' },
    rooter:  { name: 'Rooter',  color: '#C9824A', desc: 'Scava verso il basso' },
    parasol: { name: 'Parasol', color: '#2EC4B6', desc: 'Plana senza farsi male', trait: true },
    ram:     { name: 'Ram',     color: '#E5484D', desc: 'Sfonda in orizzontale' },
    stretch: { name: 'Stretch', color: '#F2B84B', desc: 'Allunga il gambo in una rampa' },
    clinger: { name: 'Clinger', color: '#7CF29A', desc: 'Scala le pareti', trait: true }
  };
  const ROLE_ORDER = ['stump', 'rooter', 'parasol', 'ram', 'stretch', 'clinger'];

  // Ambientazione: sottobosco notturno bioluminescente (palette GPverse)
  const THEME = {
    sky: ['#060914', '#0F0D26', '#1A1034'],
    far: '#161538',
    farGlow: 'rgba(61, 232, 240, 0.10)',
    near: '#0E0B22',
    rock: [[40, 34, 62], [33, 28, 52], [46, 39, 72]],
    vein: [74, 60, 118],
    edge: [[61, 232, 240], [30, 138, 146], [44, 70, 92]],
    under: [78, 56, 132],
    sprout: [184, 255, 249]
  };

  const LEVELS = window.NAILCAP_LEVELS;
  const WORLDS = window.NAILCAP_WORLDS;
  const VERSION = window.NAILCAP_VERSION;

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const terrainCanvas = document.createElement('canvas');
  terrainCanvas.width = W;
  terrainCanvas.height = H;
  const tctx = terrainCanvas.getContext('2d');
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = W;
  bgCanvas.height = H;
  const bctx = bgCanvas.getContext('2d');
  const portraitQuery = window.matchMedia('(orientation: portrait) and (max-width: 900px)');

  // ---------- Stato ----------
  // mask: 0 aria, 1 roccia, 2 gambo (costruito da Stretch)
  let mask = new Uint8Array(W * H);
  let state = null;
  let ambient = [];
  let selectedRole = null;
  let paused = false;
  let fast = false;
  let tapFx = null;
  const view = { scale: 1, ox: 0, oy: 0, dpr: 1 };

  // ---------- Progressi ----------
  function loadProgress() {
    try {
      const p = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (p && p.done) return p;
    } catch (e) { /* storage non disponibile */ }
    return { done: {}, last: 0 };
  }
  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (e) { /* ignora */ }
  }
  let progress = loadProgress();

  function isUnlocked(i) {
    return i === 0 || !!progress.done[LEVELS[i - 1].code];
  }

  // ---------- Terreno ----------
  function solid(x, y) {
    x |= 0; y |= 0;
    if (x < 0 || x >= W) return true;
    if (y < 0 || y >= H) return false;
    return mask[y * W + x] !== 0;
  }

  function buildMask(level) {
    mask = new Uint8Array(W * H);
    for (const s of level.terrain) {
      if (s.r) {
        const [x, y, w, h] = s.r;
        for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) {
          for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) mask[j * W + i] = 1;
        }
      } else if (s.e) {
        const [cx, cy, rx, ry] = s.e;
        for (let j = cy - ry; j <= cy + ry; j++) {
          for (let i = cx - rx; i <= cx + rx; i++) {
            const dx = (i - cx) / rx, dy = (j - cy) / ry;
            if (dx * dx + dy * dy <= 1 && i >= 0 && i < W && j >= 0 && j < H) mask[j * W + i] = 1;
          }
        }
      }
    }
  }

  // Disegna il terreno a partire dalla mask (all'avvio e dopo ogni riavvolgimento)
  function paintTerrain() {
    const img = tctx.createImageData(W, H);
    const d = img.data;
    const put = (k, c, a) => { const p = k * 4; d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = a === undefined ? 255 : a; };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = y * W + x;
        if (!mask[k]) continue;
        if (mask[k] === 2) { put(k, BRICK); continue; }
        let depth = 0;
        while (depth < 4 && y - depth - 1 >= 0 && mask[(y - depth - 1) * W + x]) depth++;
        const topIsAir = y - depth - 1 < 0 || !mask[(y - depth - 1) * W + x];
        const belowIsAir = y + 1 < H && !mask[(y + 1) * W + x];
        let c;
        if (depth < 3 && topIsAir && y > 0) {
          c = THEME.edge[depth];
        } else if (belowIsAir) {
          c = THEME.under;
        } else {
          // micelio: venature chiare che attraversano la roccia
          const v = Math.sin(x * 0.09 + Math.sin(y * 0.07) * 2.2) + Math.sin(y * 0.13 + x * 0.031);
          if (v > 1.72) c = THEME.vein;
          else {
            const n = ((x * 7 + y * 13) ^ (x * y)) & 15;
            c = n < 2 ? THEME.rock[2] : n < 5 ? THEME.rock[1] : THEME.rock[0];
          }
        }
        put(k, c);
        // germogli luminosi sulle superfici
        if (depth === 0 && topIsAir && y > 2 && ((x * 2654435761) >>> 0) % 41 === 0) {
          put(k - W, THEME.sprout, 200);
          put(k - 2 * W, THEME.sprout, 120);
        }
      }
    }
    tctx.putImageData(img, 0, 0);
  }

  function carve(x0, y0, w, h) {
    x0 |= 0; y0 |= 0;
    for (let j = y0; j < y0 + h; j++) {
      if (j < 0 || j >= H) continue;
      for (let i = x0; i < x0 + w; i++) if (i >= 0 && i < W) mask[j * W + i] = 0;
    }
    tctx.clearRect(x0, y0, w, h);
  }

  function fillBrick(x0, y, w) {
    if (y < 0 || y >= H) return;
    tctx.fillStyle = `rgb(${BRICK[0]}, ${BRICK[1]}, ${BRICK[2]})`;
    for (let i = x0; i < x0 + w; i++) {
      if (i < 0 || i >= W || mask[y * W + i]) continue;
      mask[y * W + i] = 2;
      tctx.fillRect(i, y, 1, 1);
    }
  }

  // ---------- Sfondo ----------
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildBackground(seed) {
    const rand = rng(seed);
    const g = bctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, THEME.sky[0]);
    g.addColorStop(0.55, THEME.sky[1]);
    g.addColorStop(1, THEME.sky[2]);
    bctx.fillStyle = g;
    bctx.fillRect(0, 0, W, H);

    // lucciole lontane
    for (let i = 0; i < 40; i++) {
      bctx.fillStyle = `rgba(159, 246, 250, ${0.15 + rand() * 0.35})`;
      bctx.fillRect(rand() * W, rand() * H * 0.7, 1, 1);
    }

    // funghi giganti sullo sfondo
    for (let i = 0; i < 6; i++) {
      const x = 30 + rand() * (W - 60);
      const capR = 34 + rand() * 40;
      const top = 40 + rand() * 90;
      const stemW = 8 + rand() * 10;
      const lean = (rand() - 0.5) * 30;
      bctx.fillStyle = THEME.far;
      bctx.beginPath();
      bctx.moveTo(x - stemW / 2, H);
      bctx.quadraticCurveTo(x - stemW / 2 + lean, (top + H) / 2, x - stemW / 3 + lean, top);
      bctx.lineTo(x + stemW / 3 + lean, top);
      bctx.quadraticCurveTo(x + stemW / 2 + lean, (top + H) / 2, x + stemW / 2, H);
      bctx.closePath();
      bctx.fill();
      bctx.beginPath();
      bctx.moveTo(x + lean - capR, top + 4);
      bctx.quadraticCurveTo(x + lean, top - capR * 0.9, x + lean + capR, top + 4);
      bctx.closePath();
      bctx.fill();
      bctx.fillStyle = THEME.farGlow;
      for (let s = 0; s < 6; s++) {
        const a = rand() * Math.PI;
        bctx.beginPath();
        bctx.arc(x + lean - Math.cos(a) * capR * 0.6, top - Math.sin(a) * capR * 0.35, 1.5 + rand() * 2.5, 0, Math.PI * 2);
        bctx.fill();
      }
    }

    // radici che pendono dall'alto
    bctx.strokeStyle = THEME.near;
    bctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = rand() * W;
      const len = 25 + rand() * 60;
      bctx.lineWidth = 2 + rand() * 4;
      bctx.beginPath();
      bctx.moveTo(x, 0);
      bctx.bezierCurveTo(x + (rand() - 0.5) * 30, len * 0.4, x + (rand() - 0.5) * 30, len * 0.7, x + (rand() - 0.5) * 20, len);
      bctx.stroke();
    }

    ambient = [];
    for (let i = 0; i < 28; i++) {
      ambient.push({ x: rand() * W, y: rand() * H, r: 0.6 + rand() * 1.1, v: 0.05 + rand() * 0.12, ph: rand() * Math.PI * 2 });
    }
  }

  function drawAmbient(now) {
    for (const s of ambient) {
      const y = ((s.y - now * s.v * 0.03) % H + H) % H;
      const x = s.x + Math.sin(now * 0.0006 + s.ph) * 6;
      const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(now * 0.002 + s.ph));
      ctx.fillStyle = `rgba(184, 255, 249, ${a})`;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------- Livello ----------
  function loadLevel(index) {
    const level = LEVELS[index];
    buildMask(level);
    paintTerrain();
    buildBackground(index * 7919 + 17);
    state = {
      index,
      level,
      caps: [],
      particles: [],
      roles: Object.assign({}, level.roles),
      released: 0,
      saved: 0,
      tick: 0,
      nextSpawn: 30,
      started: false,
      over: false,
      silent: false,
      // riavvolgimento: log delle azioni + istantanee periodiche
      log: [],
      ai: 0,
      keyframes: [],
      maxTick: 0
    };
    saveKeyframe();
    progress.last = index;
    saveProgress();
    selectedRole = ROLE_ORDER.find((r) => level.roles[r] > 0) || null;
    paused = false;
    updatePauseUi();
    $('lvl-code').textContent = level.code;
    $('lvl-name').textContent = level.name;
    $('total').textContent = level.total;
    $('goal').textContent = level.goal;
    timelineDirty = true;
    renderRoles();
    showIntro();
  }

  // ---------- Riavvolgimento ----------
  // La simulazione è deterministica: stesso livello + stesse azioni = stessa partita.
  // Per tornare a un istante si riparte dall'istantanea precedente e si risimula.
  function saveKeyframe() {
    const s = state;
    if (s.keyframes.some((k) => k.tick === s.tick)) return;
    s.keyframes.push({
      tick: s.tick,
      mask: mask.slice(),
      caps: s.caps.map((c) => Object.assign({}, c)),
      roles: Object.assign({}, s.roles),
      released: s.released,
      saved: s.saved,
      nextSpawn: s.nextSpawn
    });
  }

  function seek(target) {
    const s = state;
    target = Math.max(0, Math.min(Math.round(target), s.maxTick));
    let kf = s.keyframes[0];
    for (const k of s.keyframes) if (k.tick <= target && k.tick >= kf.tick) kf = k;
    mask = kf.mask.slice();
    paintTerrain();
    s.caps = kf.caps.map((c) => Object.assign({}, c));
    s.roles = Object.assign({}, kf.roles);
    s.released = kf.released;
    s.saved = kf.saved;
    s.nextSpawn = kf.nextSpawn;
    s.tick = kf.tick;
    s.over = false;
    s.particles = [];
    s.ai = 0;
    while (s.ai < s.log.length && s.log[s.ai].tick < s.tick) s.ai++;
    s.silent = true;
    while (s.tick < target && !s.over) step();
    s.silent = false;
    renderRoles();
    if (s.over) showResult(s.saved >= s.level.goal);
    else closeOverlay();
  }

  function rewindBy(ticks) {
    if (!state || !state.started) return;
    paused = true;
    updatePauseUi();
    seek(state.tick - ticks);
  }

  // ---------- Nailcap ----------
  function spawn() {
    const e = state.level.entrance;
    state.caps.push({ x: e.x, y: e.y, dir: 1, mode: 'fall', fall: 0, sub: 0, t: 0, parasol: false, clinger: false, bricks: 0 });
    state.released++;
  }

  function startFall(c) { c.mode = 'fall'; c.fall = 0; c.sub = 0; }

  function die(c, quiet) {
    c.dead = true;
    if (!quiet) burst(c.x, c.y - 5, BASE_CAP, 14);
  }

  function blockedByStump(c) {
    for (const o of state.caps) {
      if (o === c || o.dead || o.saved || o.mode !== 'stump') continue;
      const dx = o.x - c.x;
      if (Math.sign(dx) === c.dir && Math.abs(dx) <= 4 && Math.abs(o.y - c.y) < 8) return true;
    }
    return false;
  }

  function updateCap(c) {
    c.t++;
    const ex = state.level.exit;
    if (c.mode !== 'fall' && Math.abs(c.x - ex.x) < 6 && Math.abs(c.y - ex.y) < 4) {
      c.saved = true;
      state.saved++;
      burst(c.x, c.y - 8, '#9FF6FA', 10);
      return;
    }

    switch (c.mode) {
      case 'fall': {
        if (solid(c.x, c.y + 1)) {
          if (c.fall > FALL_DEATH && !c.parasol) { die(c); return; }
          c.mode = 'walk'; c.fall = 0; c.sub = 0;
          return;
        }
        c.sub += c.parasol && c.fall > 12 ? 0.55 : 1.6;
        while (c.sub >= 1) {
          c.sub -= 1;
          if (solid(c.x, c.y + 1)) break;
          c.y += 1;
          c.fall += 1;
        }
        if (c.y > H + 12) die(c, true);
        return;
      }

      case 'walk': {
        if (!solid(c.x, c.y + 1)) { startFall(c); return; }
        c.sub += 0.5;
        if (c.sub < 1) return;
        c.sub -= 1;
        if (blockedByStump(c)) { c.dir *= -1; return; }
        const nx = c.x + c.dir;
        let up = 0;
        while (up <= STEP_UP && solid(nx, c.y - up)) up++;
        if (up > STEP_UP) {
          if (c.clinger) { c.mode = 'climb'; c.t = 0; }
          else c.dir *= -1;
          return;
        }
        c.x = nx;
        c.y -= up;
        let down = 0;
        while (down < 3 && !solid(c.x, c.y + 1)) { c.y++; down++; }
        return;
      }

      case 'climb': {
        if (c.t % 2 !== 0) return;
        if (!solid(c.x + c.dir, c.y)) {
          // in cima: sale sul bordo e riprende a camminare
          c.x += c.dir;
          c.mode = 'walk';
          c.sub = 0;
          return;
        }
        if (c.y <= 12 || solid(c.x, c.y - 12)) {
          // sbatte contro un soffitto: si stacca e cade all'indietro
          c.dir *= -1;
          c.x += c.dir;
          startFall(c);
          return;
        }
        c.y -= 1;
        return;
      }

      case 'stump': {
        if (!solid(c.x, c.y + 1)) startFall(c);
        return;
      }

      case 'rooter': {
        if (c.t % 5 !== 0) return;
        if (!solid(c.x, c.y + 1) && !solid(c.x - 3, c.y + 1) && !solid(c.x + 3, c.y + 1)) { startFall(c); return; }
        if (c.y >= H - 3) { c.mode = 'walk'; return; }
        carve(c.x - 4, c.y, 9, 2);
        c.y += 1;
        if (c.t % 15 === 0) dust(c.x, c.y, ROLE_DEFS.rooter.color);
        return;
      }

      case 'ram': {
        if (!solid(c.x, c.y + 1)) { startFall(c); return; }
        if (c.t % 3 !== 0) return;
        let hit = false;
        for (let k = 1; k <= 6 && !hit; k++) {
          const px = c.x + c.dir * k;
          if (px < 0 || px >= W) continue;
          for (let j = c.y - 10; j <= c.y; j++) if (solid(px, j)) { hit = true; break; }
        }
        if (!hit && c.t > 12) { c.mode = 'walk'; return; }
        if (hit) {
          carve(c.dir > 0 ? c.x + 1 : c.x - 3, c.y - 10, 3, 11);
          if (c.t % 9 === 0) dust(c.x + c.dir * 4, c.y - 5, ROLE_DEFS.ram.color);
        }
        const nx = c.x + c.dir;
        if (nx > 0 && nx < W - 1) c.x = nx; else c.mode = 'walk';
        return;
      }

      case 'stretch': {
        // il gambo si allunga in una rampa: un mattone ogni 5 tick, 3 px avanti e 1 su
        if (!solid(c.x, c.y + 1)) { startFall(c); return; }
        if (c.t % 5 !== 0) return;
        if (solid(c.x + c.dir * 3, c.y - 2) || solid(c.x + c.dir * 3, c.y - 8)) {
          c.dir *= -1;
          c.mode = 'walk';
          return;
        }
        fillBrick(c.dir > 0 ? c.x : c.x - 5, c.y, 6);
        c.y -= 1;
        c.x += 3 * c.dir;
        if (--c.bricks <= 0) c.mode = 'walk';
        return;
      }
    }
  }

  // ---------- Particelle (solo estetiche, fuori dalla simulazione) ----------
  function burst(x, y, color, n) {
    if (state.silent) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 0.4 + Math.random() * 1.2;
      state.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, life: 40 + Math.random() * 20, color });
    }
  }
  function dust(x, y, color) {
    if (state.silent) return;
    for (let i = 0; i < 3; i++) {
      state.particles.push({ x, y, vx: (Math.random() - 0.5) * 0.8, vy: -Math.random() * 0.8, life: 20, color });
    }
  }
  function updateParticles() {
    const ps = state.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life--;
      if (p.life <= 0) ps.splice(i, 1);
    }
  }

  // ---------- Simulazione ----------
  function canAssign(c, role) {
    if (role === 'parasol') return !c.parasol;
    if (role === 'clinger') return !c.clinger;
    return c.mode === 'walk';
  }

  function applyRole(c, role) {
    if (!c || c.dead || c.saved || !canAssign(c, role) || (state.roles[role] || 0) <= 0) return false;
    if (role === 'parasol') c.parasol = true;
    else if (role === 'clinger') c.clinger = true;
    else {
      c.mode = role;
      c.t = 0;
      c.sub = 0;
      if (role === 'stretch') c.bricks = STRETCH_BRICKS;
    }
    state.roles[role]--;
    burst(c.x, c.y - 10, ROLE_DEFS[role].color, 6);
    return true;
  }

  function step() {
    const s = state;
    // azioni registrate per questo istante (rigiocate dopo un riavvolgimento)
    let changed = false;
    while (s.ai < s.log.length && s.log[s.ai].tick === s.tick) {
      const a = s.log[s.ai++];
      applyRole(s.caps[a.cap], a.role);
      changed = true;
    }
    if (changed && !s.silent) renderRoles();

    s.tick++;
    if (s.released < s.level.total && s.tick >= s.nextSpawn) {
      spawn();
      s.nextSpawn = s.tick + s.level.rate;
    }
    for (const c of s.caps) if (!c.dead && !c.saved) updateCap(c);
    if (!s.silent) updateParticles();
    if (tapFx && --tapFx.t <= 0) tapFx = null;

    if (s.tick % KEYFRAME_EVERY === 0) saveKeyframe();
    if (s.tick > s.maxTick) s.maxTick = s.tick;

    const alive = s.caps.some((c) => !c.dead && !c.saved);
    const timeLeft = s.level.time * 60 - s.tick;
    if ((s.released >= s.level.total && !alive) || timeLeft <= 0) finish();
  }

  function finish() {
    state.over = true;
    if (state.silent) return;
    const ok = state.saved >= state.level.goal;
    if (ok) {
      progress.done[state.level.code] = true;
      saveProgress();
    }
    showResult(ok);
  }

  // Nuova azione: da qui in poi la storia cambia, il "futuro" registrato si scarta
  function commitAction(capIndex, role) {
    const s = state;
    if (!applyRole(s.caps[capIndex], role)) return false;
    s.log.length = s.ai;
    s.log.push({ tick: s.tick, cap: capIndex, role });
    s.ai = s.log.length;
    s.keyframes = s.keyframes.filter((k) => k.tick <= s.tick);
    s.maxTick = s.tick;
    timelineDirty = true;
    return true;
  }

  // ---------- Input ----------
  function onPointer(e) {
    if (!state || !state.started || state.over) return;
    const r = canvas.getBoundingClientRect();
    const wx = ((e.clientX - r.left) * view.dpr - view.ox) / view.scale;
    const wy = ((e.clientY - r.top) * view.dpr - view.oy) / view.scale;
    tapFx = { x: wx, y: wy, t: 18 };
    if (!selectedRole || (state.roles[selectedRole] || 0) <= 0) return;
    let best = -1;
    let bestD = TAP_RADIUS * TAP_RADIUS;
    state.caps.forEach((c, i) => {
      if (c.dead || c.saved || !canAssign(c, selectedRole)) return;
      const dx = c.x - wx, dy = c.y - 6 - wy;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best < 0) return;
    if (commitAction(best, selectedRole)) renderRoles();
  }
  canvas.addEventListener('pointerdown', onPointer);

  // ---------- Disegno ----------
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    view.dpr = dpr;
    view.scale = Math.min(canvas.width / W, canvas.height / H);
    view.ox = (canvas.width - W * view.scale) / 2;
    view.oy = (canvas.height - H * view.scale) / 2;
  }
  window.addEventListener('resize', resize);

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Ingresso: un baccello di spore appeso a un gambo, i Nailcap cadono dal fondo
  function drawEntrance(e, tick) {
    const cx = e.x, cy = e.y - 24;
    let top = cy - 14;
    while (top > 0 && !solid(cx, top - 1)) top--;
    ctx.strokeStyle = '#2E2550';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.quadraticCurveTo(cx + 5, (top + cy) / 2, cx, cy - 12);
    ctx.stroke();
    ctx.fillStyle = '#3A2A66';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 15, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5A44A0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 8); ctx.quadraticCurveTo(cx - 12, cy, cx - 7, cy + 8);
    ctx.moveTo(cx + 8, cy - 8); ctx.quadraticCurveTo(cx + 12, cy, cx + 7, cy + 8);
    ctx.stroke();
    const glow = 0.55 + 0.45 * Math.sin(tick / 20);
    ctx.fillStyle = '#06090D';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 11, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(61, 232, 240, ${glow})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  function drawExit(x, y, tick) {
    ctx.beginPath();
    ctx.moveTo(x - 14, y + 1);
    ctx.lineTo(x - 14, y - 18);
    ctx.quadraticCurveTo(x, y - 42, x + 14, y - 18);
    ctx.lineTo(x + 14, y + 1);
    ctx.fillStyle = 'rgba(61, 232, 240, 0.14)';
    ctx.fill();
    ctx.strokeStyle = '#3DE8F0';
    ctx.lineWidth = 2;
    ctx.stroke();
    // cerchio delle fate: funghetti luminosi attorno all'uscita
    const glow = 0.5 + 0.5 * Math.sin(tick / 15);
    for (const [dx, s] of [[-20, 1], [-25, 0.7], [20, 1], [25, 0.7]]) {
      const fx = x + dx;
      ctx.fillStyle = '#CFC6EE';
      ctx.fillRect(fx - 0.7 * s, y - 4 * s, 1.4 * s, 4 * s);
      ctx.fillStyle = `rgba(61, 232, 240, ${0.55 + glow * 0.45})`;
      ctx.beginPath();
      ctx.moveTo(fx - 3 * s, y - 3.5 * s);
      ctx.quadraticCurveTo(fx, y - 9 * s, fx + 3 * s, y - 3.5 * s);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawCap(c) {
    const x = c.x, y = c.y;
    const gliding = c.parasol && c.mode === 'fall' && c.fall > 12;
    let capColor = BASE_CAP;
    if (ROLE_DEFS[c.mode]) capColor = ROLE_DEFS[c.mode].color;
    else if (c.mode === 'climb') capColor = ROLE_DEFS.clinger.color;
    else if (gliding) capColor = ROLE_DEFS.parasol.color;

    if (c.mode === 'stump') {
      ctx.strokeStyle = ROLE_DEFS.stump.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 5); ctx.lineTo(x + 6, y - 5);
      ctx.stroke();
    }
    if (gliding) {
      ctx.strokeStyle = STEM;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y - 9); ctx.lineTo(x, y - 14);
      ctx.stroke();
    }

    ctx.fillStyle = STEM;
    roundRect(x - 2, y - 8, 4, 8, 1.5);
    ctx.fill();

    // radici-ventosa del Clinger
    if (c.clinger) {
      ctx.fillStyle = ROLE_DEFS.clinger.color;
      ctx.fillRect(x - 2.6, y - 1, 1.6, 1.2);
      ctx.fillRect(x + 1, y - 1, 1.6, 1.2);
    }

    ctx.fillStyle = capColor;
    ctx.beginPath();
    if (gliding) {
      ctx.moveTo(x - 9, y - 13);
      ctx.quadraticCurveTo(x, y - 25, x + 9, y - 13);
    } else {
      ctx.moveTo(x - 5, y - 7);
      ctx.quadraticCurveTo(x + (c.mode === 'ram' ? c.dir * 2 : 0), y - 18, x + 5, y - 7);
    }
    ctx.closePath();
    ctx.fill();

    if (c.parasol && !gliding) {
      ctx.fillStyle = ROLE_DEFS.parasol.color;
      ctx.beginPath();
      ctx.arc(x, y - 11, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#111';
    const ox = c.mode === 'stump' ? 0 : c.dir * 0.6;
    ctx.fillRect(x - 1.3 + ox, y - 5.5, 0.9, 1.3);
    ctx.fillRect(x + 0.6 + ox, y - 5.5, 0.9, 1.3);
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#06090D';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!state) return;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    const now = performance.now();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bgCanvas, 0, 0);
    drawAmbient(now);
    drawEntrance(state.level.entrance, now / 16);
    drawExit(state.level.exit.x, state.level.exit.y, now / 16);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(terrainCanvas, 0, 0);
    for (const c of state.caps) if (!c.dead && !c.saved) drawCap(c);
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 30));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
    if (tapFx) {
      ctx.strokeStyle = 'rgba(61, 232, 240, 0.8)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(tapFx.x, tapFx.y, 8 + (18 - tapFx.t) * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (paused && state.started && !state.over) {
      ctx.fillStyle = 'rgba(11, 17, 24, 0.35)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#E6F1F5';
      ctx.font = '600 13px "Exo 2", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('In pausa · assegna i ruoli o trascina la timeline', W / 2, 22);
    }
  }

  // ---------- Interfaccia ----------
  const fmt = (ticks) => {
    const sec = Math.max(0, Math.floor(ticks / 60));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  };

  let hud = {};
  function setText(id, value) {
    if (hud[id] === value) return;
    hud[id] = value;
    $(id).textContent = value;
  }
  function updateHud() {
    if (!state) return;
    const out = state.caps.filter((c) => !c.dead && !c.saved).length;
    setText('saved', String(state.saved));
    setText('out', String(out));
    setText('timer', fmt(state.level.time * 60 - state.tick + 59));
    updateTimeline();
  }

  // Timeline: scala che cresce a blocchi di 15 s, così i segni non scivolano
  let timelineDirty = true;
  let timelineScale = 0;
  function updateTimeline() {
    const s = state;
    const scale = Math.max(1800, Math.ceil(s.maxTick / 900) * 900);
    const scrub = $('scrub');
    if (scale !== timelineScale || timelineDirty) {
      timelineScale = scale;
      timelineDirty = false;
      scrub.max = String(scale);
      const marks = $('tl-marks');
      marks.innerHTML = '';
      const seen = new Set();
      for (const a of s.log) {
        if (seen.has(a.tick)) continue;
        seen.add(a.tick);
        const m = document.createElement('span');
        m.className = 'mark';
        m.style.left = (a.tick / scale * 100) + '%';
        m.style.background = ROLE_DEFS[a.role].color;
        marks.appendChild(m);
      }
    }
    if (!scrubbing) scrub.value = String(s.tick);
    const track = $('tl-track');
    track.style.setProperty('--p', (s.tick / scale * 100) + '%');
    track.style.setProperty('--q', (s.maxTick / scale * 100) + '%');
    setText('tl-time', fmt(s.tick));
  }

  let scrubbing = false;
  $('scrub').addEventListener('pointerdown', () => {
    if (!state || !state.started) return;
    scrubbing = true;
    paused = true;
    updatePauseUi();
  });
  window.addEventListener('pointerup', () => { scrubbing = false; });
  $('scrub').addEventListener('input', (e) => {
    if (!state || !state.started) { e.target.value = '0'; return; }
    paused = true;
    updatePauseUi();
    const v = Number(e.target.value);
    if (v > state.maxTick) e.target.value = String(state.maxTick);
    seek(Math.min(v, state.maxTick));
  });

  function roleIcon(color) {
    return '<svg width="24" height="20" viewBox="0 0 28 24" aria-hidden="true">' +
      '<rect x="11" y="10" width="6" height="12" rx="2" fill="' + STEM + '"/>' +
      '<path d="M4 12 Q14 -4 24 12 Z" fill="' + color + '"/></svg>';
  }

  function renderRoles() {
    const list = $('role-list');
    list.innerHTML = '';
    for (const id of ROLE_ORDER) {
      if (!(id in state.level.roles)) continue;
      const def = ROLE_DEFS[id];
      const n = state.roles[id];
      const b = document.createElement('button');
      b.className = 'role' + (id === selectedRole ? ' selected' : '') + (n <= 0 ? ' empty' : '');
      b.setAttribute('aria-label', def.name + ', ' + n + ' disponibili. ' + def.desc);
      b.setAttribute('aria-pressed', id === selectedRole ? 'true' : 'false');
      b.innerHTML = roleIcon(def.color) + '<span class="name">' + def.name + '</span><span class="count">' + n + '</span>';
      b.addEventListener('click', () => {
        selectedRole = id;
        setRolesOpen(false);
        renderRoles();
      });
      list.appendChild(b);
    }
  }

  function setRolesOpen(open) {
    $('roles').classList.toggle('open', open);
    const t = $('roles-toggle');
    t.setAttribute('aria-expanded', open ? 'true' : 'false');
    t.setAttribute('aria-label', open ? 'Chiudi i ruoli' : 'Mostra i nomi dei ruoli');
    $('chevron').setAttribute('d', open ? 'M15 6 L9 12 L15 18' : 'M9 6 L15 12 L9 18');
  }
  $('roles-toggle').addEventListener('click', () => setRolesOpen(!$('roles').classList.contains('open')));

  function updatePauseUi() {
    $('pause-label').textContent = paused ? 'Riprendi' : 'Pausa';
    $('btn-pause').setAttribute('aria-label', paused ? 'Riprendi' : 'Pausa');
    $('btn-pause').classList.toggle('active', paused);
  }
  $('btn-pause').addEventListener('click', () => {
    if (!state || !state.started || state.over) return;
    paused = !paused;
    updatePauseUi();
  });
  $('btn-rewind').addEventListener('click', () => rewindBy(REWIND_STEP));
  $('btn-restart').addEventListener('click', () => { if (state) loadLevel(state.index); });
  $('btn-speed').addEventListener('click', () => {
    fast = !fast;
    $('speed-label').textContent = fast ? '2×' : '1×';
    $('btn-speed').setAttribute('aria-label', 'Velocità ' + (fast ? '2×' : '1×'));
    $('btn-speed').classList.toggle('active', fast);
  });
  $('btn-menu').addEventListener('click', showLevels);

  // ---------- Finestre ----------
  const overlay = $('overlay');
  const panel = $('overlay-panel');
  function openOverlay(html) {
    panel.innerHTML = html;
    overlay.hidden = false;
  }
  function closeOverlay() { overlay.hidden = true; }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }
  function bind(id, fn) { const el = $(id); if (el) el.addEventListener('click', fn); }

  function rolesChips(level) {
    return '<div class="chips">' + ROLE_ORDER.filter((r) => r in level.roles).map((r) =>
      '<span class="chip" style="border-color:' + ROLE_DEFS[r].color + '">' + ROLE_DEFS[r].name + ' ×' + level.roles[r] + '</span>'
    ).join('') + '</div>';
  }

  function backToGame() {
    if (state && !state.started) showIntro();
    else if (state && state.over) showResult(state.saved >= state.level.goal);
    else closeOverlay();
  }

  function showIntro() {
    const l = state.level;
    const fresh = (l.newRoles || []).map((r) =>
      '<p><strong style="color:' + ROLE_DEFS[r].color + '">Nuovo: ' + ROLE_DEFS[r].name + '</strong> · ' + esc(ROLE_DEFS[r].desc) + '</p>'
    ).join('');
    openOverlay(
      '<h2>' + esc(l.code + ' · ' + l.name) + '</h2>' +
      fresh +
      '<p>' + esc(l.hint) + '</p>' +
      rolesChips(l) +
      '<p>Salva almeno <strong>' + l.goal + '</strong> Nailcap su ' + l.total + '.</p>' +
      '<div class="row"><button class="btn primary" id="ov-play">Gioca</button><button class="btn" id="ov-levels">Livelli</button></div>'
    );
    bind('ov-play', () => { state.started = true; closeOverlay(); });
    bind('ov-levels', showLevels);
  }

  function showResult(ok) {
    const l = state.level;
    const hasNext = state.index + 1 < LEVELS.length;
    openOverlay(
      '<h2>' + (ok ? 'Livello superato!' : 'Non ce l\'hanno fatta') + '</h2>' +
      '<p>Salvati <strong>' + state.saved + '</strong> su ' + l.total + ' (obiettivo ' + l.goal + ').</p>' +
      (ok ? '' : '<p>Riavvolgi il tempo e cambia solo la mossa sbagliata.</p>') +
      '<div class="row">' +
      (ok && hasNext ? '<button class="btn primary" id="ov-next">Prossimo livello</button>' : '') +
      '<button class="btn' + (ok ? '' : ' primary') + '" id="ov-rewind">Riavvolgi 10 s</button>' +
      '<button class="btn" id="ov-retry">Ricomincia</button>' +
      '<button class="btn" id="ov-levels">Livelli</button></div>'
    );
    bind('ov-next', () => loadLevel(state.index + 1));
    bind('ov-rewind', () => rewindBy(600));
    bind('ov-retry', () => loadLevel(state.index));
    bind('ov-levels', showLevels);
  }

  function showLevels() {
    let html = '';
    for (const w of WORLDS) {
      const items = LEVELS.map((l, i) => ({ l, i })).filter((o) => o.l.world === w.id).map(({ l, i }) => {
        const unlocked = isUnlocked(i);
        const done = !!progress.done[l.code];
        return '<button class="level' + (done ? ' done' : '') + '" data-i="' + i + '"' + (unlocked ? '' : ' disabled') + '>' +
          '<strong>' + esc(l.code) + '</strong> ' + esc(l.name) +
          '<small>' + (done ? 'Completato' : unlocked ? 'Da giocare' : 'Bloccato') + '</small></button>';
      }).join('');
      html += '<h3 class="world">Mondo ' + w.id + ' · ' + esc(w.name) + '</h3><div class="levels">' + items + '</div>';
    }
    openOverlay(
      '<h2>Livelli</h2>' + html +
      '<div class="row">' +
      (state ? '<button class="btn" id="ov-close">Torna al livello</button><button class="btn" id="ov-restart">Ricomincia livello</button>' : '') +
      '</div>'
    );
    panel.querySelectorAll('.level').forEach((b) => {
      b.addEventListener('click', () => loadLevel(Number(b.dataset.i)));
    });
    bind('ov-close', backToGame);
    bind('ov-restart', () => loadLevel(state.index));
  }

  function showChangelog() {
    const html = window.NAILCAP_CHANGELOG.map((v) =>
      '<h3>' + esc(v.version) + ' <small>' + esc(v.date) + '</small></h3><ul>' +
      v.items.map((it) => '<li>' + esc(it) + '</li>').join('') + '</ul>'
    ).join('');
    openOverlay('<h2>Nailcap ' + esc(VERSION) + '</h2><div class="changelog">' + html + '</div>' +
      '<div class="row"><button class="btn primary" id="ov-close">Chiudi</button></div>');
    bind('ov-close', backToGame);
  }
  $('version-btn').textContent = VERSION;
  $('rotate-ver').textContent = VERSION;
  $('version-btn').addEventListener('click', showChangelog);

  // ---------- Ciclo principale ----------
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    let dt = now - last;
    last = now;
    if (dt > 250) dt = 250;
    const running = state && state.started && !state.over && !paused && overlay.hidden && !portraitQuery.matches;
    if (running) {
      acc += dt * (fast ? 2 : 1);
      while (acc >= TICK) {
        step();
        acc -= TICK;
        if (state.over) break;
      }
    } else {
      acc = 0;
    }
    draw();
    updateHud();
    requestAnimationFrame(frame);
  }

  resize();
  loadLevel(Math.min(progress.last || 0, LEVELS.length - 1));
  requestAnimationFrame(frame);

  // Esposto per i test automatici
  window.__nailcap = {
    get state() { return state; },
    step, loadLevel, solid, seek, commitAction,
    get mask() { return mask; }
  };
})();
