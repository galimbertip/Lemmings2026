# Nailcap — GPverse

Rivisitazione 2026 dei puzzle game "a folla" come Lemmings, parte dell'universo **GPverse**.
Non controlli i Nailcap direttamente: assegni loro dei ruoli e li guidi fino all'uscita.

**Gioca:** https://galimbertip.github.io/Lemmings2026/

Versione attuale e changelog: pulsante della versione in alto a destra nel gioco, oppure [CHANGELOG.md](CHANGELOG.md).

## La creatura

I **Nailcap** (in italiano *Chiodini*) sono piccoli funghi slanciati che marciano in fila.
Occupano poco spazio, quindi su uno smartphone in orizzontale se ne vedono tanti e restano leggibili.
I ruoli sono **mutazioni del fungo**: il cappello cambia forma e colore, così il ruolo si legge a colpo d'occhio.

## Ruoli

| Ruolo | Effetto | Colore cappello | Stato |
|---|---|---|---|
| Stump | Si pianta e fa girare la folla | grigio | ✅ |
| Rooter | Scava verso il basso | marrone | ✅ |
| Parasol | Plana senza farsi male (tratto permanente) | turchese | ✅ |
| Ram | Sfonda in orizzontale | rosso | ✅ |
| Stretch | Il gambo diventa una rampa | — | in arrivo |
| Clinger | Scala le pareti (tratto permanente) | — | in arrivo |
| Puff | Esplode in spore che il vento trasporta | — | in arrivo |
| Glow | Illumina le zone buie | — | in arrivo |
| Mycelink | Collega due punti sotto terra (avanzato) | — | in arrivo |
| Sprout | Diventa una piattaforma (avanzato) | — | in arrivo |

I ruoli si introducono **gradualmente**: ogni livello mette a disposizione solo quelli che servono.

| Mondo | Ruoli nuovi |
|---|---|
| 1 | Stump, Rooter, Parasol, Ram (prototipo) |
| 2 | Stretch, Clinger |
| 3 | Puff + vento |
| 4 | Glow + livelli bui |
| Avanzato | Mycelink, Sprout |

## Pilastri di design (roadmap)

- **Riavvolgi il tempo**: timeline da scorrere avanti e indietro (simulazione deterministica).
- **Spore e vento**: chi muore lascia spore; raffiche variabili in intensità e direzione decidono dove cadono.
- **Terreno distruttibile** condiviso con il motore del remake di Gorilla.
- **Progressi sincronizzati** tra dispositivi (oggi salvati solo sul dispositivo).
- **Replay condivisibili, editor di livelli, livello del giorno, modalità versus.**

## Interfaccia

- Orizzontale di default; in verticale compare l'avviso "ruota il telefono".
- Ruoli in una **striscia sottile a sinistra**: tocca un cappello per scegliere il ruolo, la freccia per vedere i nomi.
- Tocco con raggio ampio: non serve centrare il singolo pixel.
- A destra: pausa, ricomincia, velocità 1×/2×, livelli.

## Struttura

```
index.html          pagina e interfaccia
css/style.css       stile (palette GPverse)
js/version.js       numero di versione + changelog mostrato nell'app
js/levels.js        definizione dei livelli
js/game.js          motore: terreno, Nailcap, ruoli, disegno, input
```

Nessuna dipendenza né build: è un sito statico servito da GitHub Pages.

## Versioni

Formato **V.maior.minor.patch**. A ogni rilascio aggiornare `js/version.js` e `CHANGELOG.md`.
La **V.1.0.0** arriverà con un gioco completo dall'inizio alla fine.
