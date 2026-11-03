// Sincronizzazione dei progressi tra dispositivi con Firebase (accesso Google + Firestore).
// Documento per utente: nailcap/{uid} = { done: {codice: true}, best: {codice: n}, updatedAt }
// I progressi si uniscono sempre "al meglio": un livello superato su un dispositivo
// risulta superato ovunque, e per ogni livello si tiene il record più alto.
// Include una verifica guidata che spiega in italiano quale passaggio manca.

const config = window.NAILCAP_FIREBASE;
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const TIMEOUT = 9000;

let auth = null;
let db = null;
let fb = null;          // funzioni dell'SDK caricate dinamicamente
let sdkError = null;
let user = null;
let status = '';
let remoteCount = null;
let pushTimer = null;
let diag = null;        // risultato dell'ultima verifica: [{ ok, label, detail }]
let busy = false;

// ---------- Messaggi di errore comprensibili ----------
const HINTS = {
  'auth/unauthorized-domain': 'Il sito del gioco non è autorizzato. In Firebase: Sicurezza › Authentication › Impostazioni › Domini autorizzati › aggiungi galimbertip.github.io',
  'auth/operation-not-allowed': 'L\'accesso con Google è spento. In Firebase: Sicurezza › Authentication › Metodo di accesso › Google › attiva e salva',
  'auth/configuration-not-found': 'Authentication non è ancora attivo. In Firebase: Sicurezza › Authentication › Inizia, poi attiva Google',
  'auth/popup-blocked': 'Il browser ha bloccato la finestra di accesso. Consenti le finestre popup per questo sito, oppure tocca di nuovo Accedi',
  'auth/network-request-failed': 'Nessuna risposta dai server di Google: controlla la connessione',
  'auth/api-key-not-valid': 'La chiave API non è valida o è limitata. In Google Cloud › Credenziali controlla la chiave del progetto (referrer consentito: https://galimbertip.github.io/*)',
  'auth/internal-error': 'Errore interno dell\'accesso Google: riprova; se continua, mandami la verifica',
  'auth/web-storage-unsupported': 'Il browser blocca la memoria del sito (navigazione privata o cookie bloccati): prova in una finestra normale',
  'permission-denied': 'Il database rifiuta la lettura o la scrittura: le regole non sono pubblicate. In Firebase: Firestore › Regole › incolla le regole del README › Pubblica',
  'not-found': 'Il database Firestore non esiste ancora. In Firebase: Database e spazio di archiviazione › Firestore › Crea database',
  'failed-precondition': 'Il database Firestore non esiste ancora o non è pronto. In Firebase: Firestore › Crea database',
  'unavailable': 'Il database non risponde: connessione assente, oppure il database Firestore non è stato creato',
  'timeout': 'Il database non ha risposto entro pochi secondi: di solito significa che Firestore non è stato creato, o che la rete blocca la connessione',
  'unauthenticated': 'Accesso scaduto: esci e accedi di nuovo'
};

function codeOf(e) {
  if (!e) return 'sconosciuto';
  const c = e.code || e.message || String(e);
  if (/referer|referrer/i.test(e.message || '')) return 'auth/api-key-not-valid';
  if (/database.*does not exist|NOT_FOUND/i.test(e.message || '')) return 'not-found';
  return String(c).replace(/^firestore\//, '');
}
function hintFor(code) {
  return HINTS[code] || ('Errore "' + code + '": mandami il testo della verifica e lo sistemo');
}

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), ms))]);
}

// ---------- Interfaccia ----------
function slot() {
  return document.getElementById('sync-slot');
}

function el(tag, attrs, text) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
  if (text) e.textContent = text;
  return e;
}

function button(label, primary, fn) {
  const b = el('button', { class: 'btn' + (primary ? ' primary' : ''), type: 'button' }, label);
  b.addEventListener('click', fn);
  if (busy) b.disabled = true;
  return b;
}

function localCount() {
  const p = window.NailcapProgress && window.NailcapProgress.get();
  return p ? Object.keys(p.done).filter((k) => p.done[k]).length : 0;
}

function renderTitleChip() {
  const chip = document.getElementById('t-sync');
  if (!chip) return;
  if (!config) { chip.textContent = ''; return; }
  chip.textContent = user ? 'Cloud: collegato' + (user.displayName ? ' (' + user.displayName.split(' ')[0] + ')' : '') : 'Cloud: non collegato';
  chip.classList.toggle('on', !!user);
}

function render() {
  renderTitleChip();
  const box = slot();
  if (!box) return;
  box.hidden = false;
  box.innerHTML = '';
  box.appendChild(el('h3', { class: 'sync-title' }, 'Progressi su tutti i dispositivi'));
  if (sdkError) {
    box.appendChild(el('p', {}, 'La sincronizzazione non si è avviata: ' + hintFor(codeOf(sdkError))));
  } else if (!auth) {
    box.appendChild(el('p', {}, status || 'Caricamento dell\'accesso…'));
  } else if (!user) {
    box.appendChild(el('p', {}, 'Accedi con lo stesso account Google su ogni dispositivo (telefono, PC, tablet): i progressi si uniranno da soli.'));
    const row = el('div', { class: 'row' });
    row.appendChild(button('Accedi con Google', true, login));
    row.appendChild(button('Verifica', false, runDiagnostics));
    box.appendChild(row);
  } else {
    const p = el('p', {});
    p.appendChild(document.createTextNode('Collegato come '));
    p.appendChild(el('strong', {}, user.displayName || user.email || 'account Google'));
    const n = localCount();
    p.appendChild(document.createTextNode(' · su questo dispositivo ' + n + (n === 1 ? ' livello superato' : ' livelli superati') + (remoteCount !== null ? ', online ' + remoteCount : '')));
    box.appendChild(p);
    const row = el('div', { class: 'row' });
    row.appendChild(button('Sincronizza ora', true, syncNow));
    row.appendChild(button('Verifica', false, runDiagnostics));
    row.appendChild(button('Esci', false, () => fb.signOut(auth)));
    box.appendChild(row);
  }
  if (status && auth) box.appendChild(el('p', { class: 'sync-status' }, status));
  if (diag) {
    const ul = el('ul', { class: 'diag' });
    for (const d of diag) {
      const li = el('li', { class: d.ok === true ? 'ok' : d.ok === false ? 'ko' : 'wait' });
      li.appendChild(el('span', { class: 'dmark', 'aria-hidden': 'true' }, d.ok === true ? '✓' : d.ok === false ? '✗' : '…'));
      const t = el('span', {});
      t.appendChild(el('strong', {}, d.label));
      if (d.detail) t.appendChild(document.createTextNode(' — ' + d.detail));
      li.appendChild(t);
      ul.appendChild(li);
    }
    box.appendChild(ul);
    if (!busy) {
      const row = el('div', { class: 'row' });
      row.appendChild(button('Copia la verifica', false, copyDiag));
      box.appendChild(row);
    }
  }
}

function setStatus(s) {
  status = s;
  render();
}

function timeNow() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// ---------- Lettura e scrittura ----------
function userDoc() {
  return fb.doc(db, 'nailcap', user.uid);
}

async function pull() {
  const snap = await withTimeout(fb.getDoc(userDoc()), TIMEOUT);
  if (snap.exists()) {
    const data = snap.data();
    remoteCount = Object.keys(data.done || {}).filter((k) => data.done[k]).length;
    window.NailcapProgress.merge(data);
  } else {
    remoteCount = 0;
  }
}

async function push() {
  const p = window.NailcapProgress.get();
  await withTimeout(fb.setDoc(userDoc(), { done: p.done, best: p.best, updatedAt: fb.serverTimestamp() }, { merge: true }), TIMEOUT);
  remoteCount = Object.keys(p.done).filter((k) => p.done[k]).length;
}

async function syncNow() {
  if (!user) return;
  setStatus('Sincronizzazione…');
  try {
    await pull();
    await push();
    setStatus('Ultima sincronizzazione alle ' + timeNow() + '.');
  } catch (e) {
    const c = codeOf(e);
    setStatus('Sincronizzazione non riuscita (' + c + '). ' + hintFor(c));
  }
}

async function pushQuiet() {
  if (!user) return;
  try {
    await push();
    setStatus('Ultima sincronizzazione alle ' + timeNow() + '.');
  } catch (e) {
    const c = codeOf(e);
    setStatus('Salvataggio online non riuscito (' + c + '). ' + hintFor(c));
  }
}

// ---------- Accesso ----------
async function login() {
  const provider = new fb.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  setStatus('Apro la finestra di accesso di Google…');
  try {
    // solo finestra popup: il reindirizzamento non funziona sui siti GitHub Pages con i browser moderni
    await fb.signInWithPopup(auth, provider);
  } catch (e) {
    const c = codeOf(e);
    if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') setStatus('');
    else setStatus('Accesso non riuscito (' + c + '). ' + hintFor(c));
  }
}

// ---------- Verifica guidata ----------
async function runDiagnostics() {
  if (busy) return;
  busy = true;
  const steps = [];
  const add = (label) => { const s = { ok: null, label, detail: '' }; steps.push(s); diag = steps; render(); return s; };
  const done = (s, ok, detail) => { s.ok = ok; s.detail = detail || ''; render(); };
  try {
    let s = add('Connessione a internet');
    done(s, navigator.onLine, navigator.onLine ? '' : 'il dispositivo risulta offline');
    if (!navigator.onLine) return;

    s = add('Componenti di Firebase');
    if (!fb) { done(s, false, sdkError ? hintFor(codeOf(sdkError)) : 'non ancora caricati, riprova tra poco'); return; }
    done(s, true, 'progetto ' + (config && config.projectId));

    s = add('Sito autorizzato');
    done(s, true, location.hostname + ' (se manca dai domini autorizzati, l\'accesso darà "auth/unauthorized-domain")');

    s = add('Accesso Google');
    if (!user) { done(s, false, 'non hai ancora effettuato l\'accesso su questo dispositivo: tocca Accedi con Google'); return; }
    done(s, true, user.email || user.displayName || user.uid);

    s = add('Lettura del database');
    try {
      await pull();
      done(s, true, remoteCount === 0 ? 'nessun progresso ancora salvato online' : remoteCount + ' livelli superati salvati online');
    } catch (e) {
      const c = codeOf(e);
      done(s, false, c + ': ' + hintFor(c));
      return;
    }

    s = add('Scrittura del database');
    try {
      await push();
      done(s, true, 'ora online risultano ' + remoteCount + ' livelli, su questo dispositivo ' + localCount());
    } catch (e) {
      const c = codeOf(e);
      done(s, false, c + ': ' + hintFor(c));
      return;
    }

    s = add('Tutto a posto');
    done(s, true, 'su un altro dispositivo accedi con lo stesso account (' + (user.email || 'Google') + ') e tocca Sincronizza ora');
  } finally {
    busy = false;
    render();
  }
}

async function copyDiag() {
  if (!diag) return;
  const text = 'Verifica sincronizzazione Nailcap ' + (window.NAILCAP_VERSION || '') + ' — ' + navigator.userAgent + '\n' +
    diag.map((d) => (d.ok ? '[OK] ' : d.ok === false ? '[NO] ' : '[..] ') + d.label + (d.detail ? ' — ' + d.detail : '')).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    setStatus('Verifica copiata: incollala nella chat.');
  } catch (e) {
    setStatus('Non riesco a copiare: fai uno screenshot di questa finestra.');
  }
}

// ---------- Avvio ----------
async function start() {
  if (!config) return;   // sincronizzazione non configurata: nessun pulsante
  window.addEventListener('nailcap:levels-open', render);
  window.addEventListener('nailcap:title-open', renderTitleChip);
  render();
  try {
    const [app, a, f] = await Promise.all([
      import(SDK + 'firebase-app.js'),
      import(SDK + 'firebase-auth.js'),
      import(SDK + 'firebase-firestore.js')
    ]);
    fb = Object.assign({}, a, f);
    const firebaseApp = app.initializeApp(config);
    auth = a.getAuth(firebaseApp);
    // ricerca automatica del "long polling": aiuta con reti e proxy che bloccano le connessioni in streaming
    db = f.initializeFirestore(firebaseApp, { experimentalAutoDetectLongPolling: true });
  } catch (e) {
    sdkError = navigator.onLine ? e : { code: 'auth/network-request-failed' };
    render();
    return;
  }

  fb.onAuthStateChanged(auth, (u) => {
    user = u;
    status = '';
    remoteCount = null;
    render();
    if (user) syncNow();
  });

  // un livello superato: si carica online (raggruppando salvataggi ravvicinati)
  window.addEventListener('nailcap:progress', () => {
    if (!user) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushQuiet, 1000);
  });

  // tornando sul gioco (es. dopo aver giocato su un altro dispositivo) si riallinea
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && user) syncNow();
  });
}

start();
