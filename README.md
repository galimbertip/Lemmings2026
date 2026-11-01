# Nailcap — GPverse

Rivisitazione 2026 dei puzzle game "a folla" come Lemmings, parte dell'universo **GPverse**.
Non controlli i Nailcap direttamente: assegni loro dei ruoli e li guidi fino all'uscita.

**Gioca:** https://galimbertip.github.io/Lemmings2026/

Versione attuale: **V.1.0.0** — changelog dal pulsante della versione in alto a destra nel gioco, oppure [CHANGELOG.md](CHANGELOG.md).

Si gioca nel browser di telefono, tablet e PC; si può installare sulla schermata Home e, dopo la prima apertura, funziona anche offline.

## La creatura

I **Nailcap** (in italiano *Chiodini*) sono piccoli funghi slanciati che marciano in fila.
Occupano poco spazio, quindi su uno smartphone in orizzontale se ne vedono tanti e restano leggibili.
I ruoli sono **mutazioni del fungo**: il cappello cambia forma e colore, così il ruolo si legge a colpo d'occhio.

## Ambientazione

Un **sottobosco notturno bioluminescente**, nei colori neon di GPverse: funghi giganti sullo sfondo,
roccia attraversata da venature di micelio, bordi che brillano di turchese e spore che fluttuano.
I Nailcap cadono da un **baccello di spore** e si salvano nel **cerchio delle fate** dell'uscita.

## Ruoli

| Ruolo | Effetto | Colore cappello | Stato |
|---|---|---|---|
| Stump | Si pianta e fa girare la folla; si può sradicare | grigio | ✅ |
| Rooter | Scava verso il basso | marrone | ✅ |
| Parasol | Plana senza farsi male (tratto permanente) | turchese | ✅ |
| Ram | Sfonda in orizzontale | rosso | ✅ |
| Stretch | Il gambo diventa una rampa | ambra | ✅ |
| Clinger | Scala le pareti (tratto permanente) | verde | ✅ |
| Puff | Scoppia in una spora che il vento trasporta; dove atterra rinasce | rosa | ✅ |
| Glow | Illumina il buio, accende mensole di luce e funghi-lampada (tratto permanente) | giallo | ✅ |
| Mycelink | Due nodi collegano due punti: chi tocca un nodo riemerge dall'altro | blu | ✅ |
| Sprout | Cresce in un trampolino che fa saltare chi ci passa | arancione | ✅ |

I ruoli si introducono **gradualmente**: ogni livello mette a disposizione solo quelli che servono.
Ogni mondo ha 5 livelli: i primi 3 sono il percorso principale, il 4° e il 5° sono **Sfide** facoltative che mescolano ruoli di mondi diversi.

| Mondo | Ruoli nuovi |
|---|---|
| 1 · Il sottobosco | Stump, Rooter, Parasol, Ram (prototipo) |
| 2 · Le radici alte | Stretch, Clinger |
| 3 · La valle del vento | Puff + vento |
| 4 · Le grotte buie | Glow + buio, mensole di luce, funghi-lampada |
| 5 · Il micelio | Sprout, Mycelink |

## Pilastri di design (roadmap)

- ✅ **Riavvolgi il tempo**: timeline da scorrere avanti e indietro. La simulazione è deterministica: si salva il log delle mosse più un'istantanea ogni 5 s, e per tornare a un istante si risimula dall'istantanea precedente. Una mossa nuova scarta il futuro registrato.
- ✅ **Spore e vento**: Puff scoppia in una spora, il vento la porta e dove atterra germoglia un nuovo Nailcap. Le raffiche sono un'onda triangolare senza numeri casuali, così la simulazione resta deterministica. Anche il Parasol aperto deriva col vento.
- ✅ **Buio e luce**: nei livelli bui si vede solo attorno ai Nailcap e alle luci. Le mensole di luce reggono solo se illuminate; i funghi-lampada restano accesi 10 s dopo il passaggio di un Glow.
- **Terreno distruttibile** condiviso con il motore del remake di Gorilla.
- ✅ **Progressi sincronizzati** tra dispositivi con accesso Google (Firebase).
- **Replay condivisibili, editor di livelli, livello del giorno, modalità versus.**

## Interfaccia

- **Schermata iniziale**: logo GPverse, titolo a neon e parata animata; Continua (ultimo livello o primo da superare), Livelli, Novità.
- Orizzontale di default; in verticale compare l'avviso "ruota il telefono".
- Ruoli in una **striscia sottile a sinistra**: tocca un cappello per scegliere il ruolo, la freccia per vedere i nomi.
- Tocco con raggio ampio: non serve centrare il singolo pixel.
- A destra: pausa, riavvolgi 5 s, Fioritura, velocità 1×/2×, livelli (con Ricomincia).
- **Fioritura**: due tocchi e, dopo 5 s di conto alla rovescia, tutti i Nailcap rimasti fioriscono in spore che non germogliano e il livello finisce. È registrata come una mossa, quindi riavvolgendo si annulla.
- In basso: la timeline, con una tacca colorata per ogni ruolo assegnato.
- **Audio**: pulsante in alto (e nella schermata iniziale) per scegliere tra musica ed effetti, solo effetti, spento.

## Struttura

```
index.html          pagina e interfaccia
css/style.css       stile (palette GPverse)
js/version.js       numero di versione + changelog mostrato nell'app
js/levels.js        mondi e livelli
js/game.js          motore: terreno, Nailcap, ruoli, riavvolgimento, disegno, input
js/firebase-config.js  configurazione Firebase (null = sincronizzazione spenta)
js/sync.js          accesso Google e sincronizzazione dei progressi su Firestore
js/audio.js         effetti, musica generativa e vento, sintetizzati con la Web Audio API
icons/              icone dell'app (svg, png, maskable, Apple) e logo GPverse
sw.js               service worker: gioco disponibile offline
manifest.webmanifest  installazione come app (orizzontale, schermo intero)
```

Nessuna build: è un sito statico servito da GitHub Pages. Il sonoro non usa file audio: è tutto generato nel browser. L'unica dipendenza esterna è l'SDK Firebase, caricato solo se la sincronizzazione è configurata.

## Sincronizzazione dei progressi

Con l'accesso Google i progressi vengono salvati su Firestore nel documento `nailcap/{uid}`.
L'unione tiene sempre il meglio: un livello superato su un dispositivo risulta superato ovunque, e per ogni livello vale il record più alto.
Regole Firestore richieste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /nailcap/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## Versioni

Formato **V.maior.minor.patch**. A ogni rilascio aggiornare `js/version.js` e `CHANGELOG.md`; per una versione maior o minor aggiornare anche il nome della cache in `sw.js`.
La **V.1.0.0** è la prima versione completa dall'inizio alla fine.
