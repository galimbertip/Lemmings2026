// Sincronizzazione dei progressi tra dispositivi con Firebase (accesso Google + Firestore).
// Documento per utente: nailcap/{uid} = { done: {codice: true}, best: {codice: n}, updatedAt }
// I progressi si uniscono sempre "al meglio": un livello superato su un dispositivo
// risulta superato ovunque, e per ogni livello si tiene il record più alto.

const config = window.NAILCAP_FIREBASE;
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

let auth = null;
let db = null;
let fb = null;          // funzioni dell'SDK caricate dinamicamente
let user = null;
let status = '';
let pushTimer = null;

function slot() {
  return document.getElementById('sync-slot');
}

function el(tag, attrs, text) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
  if (text) e.textContent = text;
  return e;
}

function render() {
  const box = slot();
  if (!box) return;
  box.hidden = false;
  box.innerHTML = '';
  if (!auth) {
    box.appendChild(el('p', {}, status || 'Caricamento dell\'accesso…'));
    return;
  }
  if (!user) {
    box.appendChild(el('p', {}, 'Accedi per ritrovare i progressi su tutti i dispositivi: telefono, PC, tablet.'));
    const b = el('button', { class: 'btn primary', type: 'button' }, 'Accedi con Google');
    b.addEventListener('click', login);
    box.appendChild(b);
    if (status) box.appendChild(el('p', { class: 'sync-status' }, status));
    return;
  }
  const p = el('p', {});
  p.appendChild(document.createTextNode('Progressi sincronizzati · '));
  p.appendChild(el('strong', {}, user.displayName || user.email || 'account Google'));
  box.appendChild(p);
  if (status) box.appendChild(el('p', { class: 'sync-status' }, status));
  const out = el('button', { class: 'btn', type: 'button' }, 'Esci');
  out.addEventListener('click', () => fb.signOut(auth));
  box.appendChild(out);
}

function setStatus(s) {
  status = s;
  render();
}

function timeNow() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function userDoc() {
  return fb.doc(db, 'nailcap', user.uid);
}

async function pull() {
  if (!user) return;
  try {
    const snap = await fb.getDoc(userDoc());
    if (snap.exists()) window.NailcapProgress.merge(snap.data());
  } catch (e) {
    setStatus('Non riesco a leggere i progressi online (' + (e.code || e.message) + ').');
    throw e;
  }
}

async function push() {
  if (!user) return;
  const p = window.NailcapProgress.get();
  try {
    await fb.setDoc(userDoc(), { done: p.done, best: p.best, updatedAt: fb.serverTimestamp() }, { merge: true });
    setStatus('Ultima sincronizzazione alle ' + timeNow() + '.');
  } catch (e) {
    setStatus('Non riesco a salvare online (' + (e.code || e.message) + '). Riprovo al prossimo livello.');
  }
}

async function syncNow() {
  if (!user) return;
  setStatus('Sincronizzazione…');
  try {
    await pull();
    await push();
  } catch (e) { /* stato già mostrato */ }
}

async function login() {
  const provider = new fb.GoogleAuthProvider();
  try {
    await fb.signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      // alcuni browser e le app installate bloccano i popup: si passa al reindirizzamento
      await fb.signInWithRedirect(auth, provider);
    } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      setStatus('Accesso non riuscito (' + (e.code || e.message) + ').');
    }
  }
}

async function start() {
  if (!config) return;   // sincronizzazione non configurata: nessun pulsante
  window.addEventListener('nailcap:levels-open', render);
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
    db = f.getFirestore(firebaseApp);
  } catch (e) {
    setStatus('Sincronizzazione non disponibile: controlla la connessione.');
    return;
  }

  fb.getRedirectResult(auth).catch((e) => setStatus('Accesso non riuscito (' + (e.code || e.message) + ').'));

  fb.onAuthStateChanged(auth, (u) => {
    user = u;
    status = '';
    render();
    if (user) syncNow();
  });

  // un livello superato: si carica online (raggruppando salvataggi ravvicinati)
  window.addEventListener('nailcap:progress', () => {
    if (!user) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 1000);
  });

  // tornando sul gioco (es. dopo aver giocato su un altro dispositivo) si riallinea
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && user) syncNow();
  });
}

start();
