(() => {
  'use strict';

  // ---------- Costanti ----------
  const W = 640;
  const H = 280;
  const TICK = 1000 / 60;
  const FALL_DEATH = 60;   // pixel di caduta oltre cui un Nailcap senza Parasol muore
  const STEP_UP = 4;       // gradino massimo che un Nailcap scavalca
  const TAP_RADIUS = 22;   // raggio di tocco generoso: niente click al pixel
  const BASE_CAP = '#8A5CF6';
  const STEM = '#EFE8FF';
  const STORAGE_KEY = 'gpverse.nailcap.progress.v1';

  const ROLE_DEFS = {
    stump:   { name: 'Stump',   color: '#8C99A6', desc: 'Si pianta e fa girare la folla' },
    rooter:  { name: 'Rooter',  color: '#C9824A', desc: 'Scava verso il basso' },
    parasol: { name: 'Parasol', color: '#2EC4B6', desc: 'Plana senza farsi male' },
    ram:     { name: 'Ram',     color: '#E5484D', desc: 'Sfonda in orizzontale' }
  };
  const ROLE_ORDER = ['stump', 'rooter', 'parasol', 'ram'];

  const LEVELS = window.NAILCAP_LEVELS;
  const VERSION = window.NAILCAP_VERSION;

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const terrainCanvas = document.createElement('canvas');
  terrainCanvas.width = W;
  terrainCanvas.height = H;
  const tctx = terrainCanvas.getContext('2d');
  const portraitQuery = window.matchMedia('(orientation: portrait) and (max-width: 900px)');

  // ---------- Stato ----------
  let mask = new Uint8Array(W * H);
  let state = null;
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
    return mask[y * W + x] === 1;
  }

  function buildTerrain(level) {
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
    const img = tctx.createImageData(W, H);
    const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = y * W + x;
        if (!mask[k]) continue;
        let depth = 0;
        while (depth < 4 && y - depth - 1 >= 0 && mask[(y - depth - 1) * W + x]) depth++;
        const topIsAir = y - depth - 1 < 0 || !mask[(y - depth - 1) * W + x];
        let c;
        if (depth < 3 && topIsAir && y > 0) {
          c = depth === 0 ? [70, 140, 80] : [47, 107, 58];
        } else {
          const n = ((x * 7 + y * 13) ^ (x * y)) & 15;
          c = n < 2 ? [74, 52, 38] : n < 4 ? [50, 36, 28] : [58, 42, 32];
        }
        const p = k * 4;
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
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

  // ---------- Livello ----------
  function loadLevel(index) {
    const level = LEVELS[index];
    buildTerrain(level);
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
      over: false
    };
    progress.last = index;
    saveProgress();
    selectedRole = ROLE_ORDER.find((r) => level.roles[r] > 0) || null;
    paused = false;
    updatePauseUi();
    $('lvl-code').textContent = level.code;
    $('lvl-name').textContent = level.name;
    $('total').textContent = level.total;
    $('goal').textContent = level.goal;
    renderRoles();
    showIntro();
  }

  // ---------- Nailcap ----------
  function spawn() {
    const e = state.level.entrance;
    state.caps.push({ x: e.x, y: e.y, dir: 1, mode: 'fall', fall: 0, sub: 0, t: 0, parasol: false });
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
        if (up > STEP_UP) { c.dir *= -1; return; }
        c.x = nx;
        c.y -= up;
        let down = 0;
        while (down < 3 && !solid(c.x, c.y + 1)) { c.y++; down++; }
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
    }
  }

  // ---------- Particelle ----------
  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 0.4 + Math.random() * 1.2;
      state.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, life: 40 + Math.random() * 20, color });
    }
  }
  function dust(x, y, color) {
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
  function step() {
    const s = state;
    s.tick++;
    if (s.released < s.level.total && s.tick >= s.nextSpawn) {
      spawn();
      s.nextSpawn = s.tick + s.level.rate;
    }
    for (const c of s.caps) if (!c.dead && !c.saved) updateCap(c);
    updateParticles();
    if (tapFx && --tapFx.t <= 0) tapFx = null;

    const alive = s.caps.some((c) => !c.dead && !c.saved);
    const timeLeft = s.level.time * 60 - s.tick;
    if ((s.released >= s.level.total && !alive) || timeLeft <= 0) finish();
  }

  function finish() {
    state.over = true;
    const ok = state.saved >= state.level.goal;
    if (ok) {
      progress.done[state.level.code] = true;
      saveProgress();
    }
    showResult(ok);
  }

  // ---------- Input ----------
  function canAssign(c, role) {
    if (role === 'parasol') return !c.parasol;
    return c.mode === 'walk';
  }

  function onPointer(e) {
    if (!state || !state.started || state.over) return;
    const r = canvas.getBoundingClientRect();
    const wx = ((e.clientX - r.left) * view.dpr - view.ox) / view.scale;
    const wy = ((e.clientY - r.top) * view.dpr - view.oy) / view.scale;
    tapFx = { x: wx, y: wy, t: 18 };
    if (!selectedRole || (state.roles[selectedRole] || 0) <= 0) return;
    let best = null;
    let bestD = TAP_RADIUS * TAP_RADIUS;
    for (const c of state.caps) {
      if (c.dead || c.saved || !canAssign(c, selectedRole)) continue;
      const dx = c.x - wx, dy = c.y - 6 - wy;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = c; }
    }
    if (!best) return;
    if (selectedRole === 'parasol') best.parasol = true;
    else { best.mode = selectedRole; best.t = 0; best.sub = 0; }
    state.roles[selectedRole]--;
    burst(best.x, best.y - 10, ROLE_DEFS[selectedRole].color, 6);
    renderRoles();
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

  function drawBackground() {
    ctx.fillStyle = '#0B1118';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#101A24';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, 40);
    ctx.quadraticCurveTo(560, 70, 480, 48);
    ctx.quadraticCurveTo(400, 30, 330, 58);
    ctx.quadraticCurveTo(250, 86, 180, 52);
    ctx.quadraticCurveTo(100, 24, 0, 50);
    ctx.closePath();
    ctx.fill();
  }

  function drawEntrance(e) {
    ctx.fillStyle = '#4A3426';
    roundRect(e.x - 40, e.y - 30, 50, 24, 10);
    ctx.fill();
    ctx.strokeStyle = '#5E4434';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(e.x - 34, e.y - 23); ctx.lineTo(e.x - 6, e.y - 23);
    ctx.moveTo(e.x - 32, e.y - 13); ctx.lineTo(e.x - 8, e.y - 13);
    ctx.stroke();
    ctx.fillStyle = '#06090D';
    ctx.beginPath();
    ctx.ellipse(e.x + 2, e.y - 18, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();
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
    const glow = 0.5 + 0.5 * Math.sin(tick / 15);
    ctx.fillStyle = `rgba(184, 255, 249, ${0.5 + glow * 0.5})`;
    for (const [dx, dy, r] of [[-19, -2, 2.2], [-22, -10, 1.5], [19, -2, 2.2], [22, -10, 1.5]]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCap(c) {
    const x = c.x, y = c.y;
    const gliding = c.parasol && c.mode === 'fall' && c.fall > 12;
    let capColor = BASE_CAP;
    if (ROLE_DEFS[c.mode]) capColor = ROLE_DEFS[c.mode].color;
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
    drawBackground();
    drawEntrance(state.level.entrance);
    drawExit(state.level.exit.x, state.level.exit.y, state.tick);
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
      ctx.fillStyle = 'rgba(11, 17, 24, 0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#E6F1F5';
      ctx.font = '600 18px "Exo 2", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('In pausa', W / 2, H / 2);
    }
  }

  // ---------- Interfaccia ----------
  let hud = {};
  function setText(id, value) {
    if (hud[id] === value) return;
    hud[id] = value;
    $(id).textContent = value;
  }
  function updateHud() {
    if (!state) return;
    const out = state.caps.filter((c) => !c.dead && !c.saved).length;
    const left = Math.max(0, Math.ceil((state.level.time * 60 - state.tick) / 60));
    setText('saved', String(state.saved));
    setText('out', String(out));
    setText('timer', Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'));
  }

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

  function showIntro() {
    const l = state.level;
    openOverlay(
      '<h2>' + esc(l.code + ' · ' + l.name) + '</h2>' +
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
      '<div class="row">' +
      (ok && hasNext ? '<button class="btn primary" id="ov-next">Prossimo livello</button>' : '') +
      '<button class="btn' + (ok ? '' : ' primary') + '" id="ov-retry">Riprova</button>' +
      '<button class="btn" id="ov-levels">Livelli</button></div>'
    );
    bind('ov-next', () => loadLevel(state.index + 1));
    bind('ov-retry', () => loadLevel(state.index));
    bind('ov-levels', showLevels);
  }

  function showLevels() {
    const items = LEVELS.map((l, i) => {
      const unlocked = isUnlocked(i);
      const done = !!progress.done[l.code];
      return '<button class="level' + (done ? ' done' : '') + '" data-i="' + i + '"' + (unlocked ? '' : ' disabled') + '>' +
        '<strong>' + esc(l.code) + '</strong> ' + esc(l.name) +
        '<small>' + (done ? 'Completato' : unlocked ? 'Da giocare' : 'Bloccato') + '</small></button>';
    }).join('');
    openOverlay(
      '<h2>Mondo 1 · Il sottobosco</h2>' +
      '<div class="levels">' + items + '</div>' +
      '<div class="row">' + (state ? '<button class="btn" id="ov-close">Torna al livello</button>' : '') + '</div>'
    );
    panel.querySelectorAll('.level').forEach((b) => {
      b.addEventListener('click', () => loadLevel(Number(b.dataset.i)));
    });
    bind('ov-close', () => { if (state && !state.started) showIntro(); else if (state && state.over) showResult(state.saved >= state.level.goal); else closeOverlay(); });
  }

  function showChangelog() {
    const html = window.NAILCAP_CHANGELOG.map((v) =>
      '<h3>' + esc(v.version) + ' <small>' + esc(v.date) + '</small></h3><ul>' +
      v.items.map((it) => '<li>' + esc(it) + '</li>').join('') + '</ul>'
    ).join('');
    const wasOpen = !overlay.hidden ? panel.innerHTML : null;
    openOverlay('<h2>Nailcap ' + esc(VERSION) + '</h2><div class="changelog">' + html + '</div>' +
      '<div class="row"><button class="btn primary" id="ov-close">Chiudi</button></div>');
    bind('ov-close', () => {
      if (wasOpen && state && !state.started) showIntro();
      else if (state && state.over) showResult(state.saved >= state.level.goal);
      else closeOverlay();
    });
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
  window.__nailcap = { get state() { return state; }, step, loadLevel, solid };
})();
