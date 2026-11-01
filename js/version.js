// Versione: V.maior.minor.patch — aggiornare a ogni rilascio insieme a CHANGELOG.md
window.NAILCAP_VERSION = 'V.0.11.0';

window.NAILCAP_CHANGELOG = [
  {
    version: 'V.0.11.0',
    date: '2026-11-01',
    items: [
      '10 livelli nuovi: ogni mondo ha ora 5 livelli, 25 in tutto',
      'I livelli 4 e 5 di ogni mondo sono Sfide facoltative: più difficili, mescolano ruoli di mondi diversi e non servono per aprire il mondo successivo',
      'Mondo 1: Scava e plana, Dietro front · Mondo 2: Scala e ponte, Tre gradini · Mondo 3: Planata, Tempesta',
      'Mondo 4: Scavare al buio, Due lampade · Mondo 5: Salto e ponte, Notte nel micelio',
      'I livelli già superati restano sempre aperti, anche dopo l\'aggiunta di livelli nuovi',
      'Continua propone prima il percorso principale, poi le sfide'
    ]
  },
  {
    version: 'V.0.10.0',
    date: '2026-11-01',
    items: [
      'Sonoro: effetti per ogni evento, sintetizzati in tempo reale e posizionati a destra o a sinistra come sullo schermo',
      'Ogni ruolo ha la sua nota; i salvataggi salgono di nota a ogni Nailcap salvato',
      'Musica d\'ambiente generativa: un tema per la schermata iniziale e uno per ogni mondo',
      'Fruscio del vento nei livelli ventosi, più forte con le raffiche',
      'Conto alla rovescia della Fioritura udibile, jingle di vittoria e di sconfitta',
      'Pulsante audio in alto e nella schermata iniziale: musica ed effetti, solo effetti, spento'
    ]
  },
  {
    version: 'V.0.9.0',
    date: '2026-10-31',
    items: [
      'Nuova schermata iniziale con il logo GPverse, il titolo NAILCAP a neon e una parata animata di Nailcap',
      'Continua riparte dall\'ultimo livello giocato, o dal primo ancora da superare',
      'Dalla schermata iniziale: Livelli e Novità; dal menu Livelli si torna alla schermata iniziale',
      'In basso il riepilogo dei livelli superati e il numero di versione'
    ]
  },
  {
    version: 'V.0.8.0',
    date: '2026-10-31',
    items: [
      'Nuovo ruolo Sprout: si pianta e cresce in un trampolino, chi ci passa sopra salta muri e fossi',
      'Nuovo ruolo Mycelink: due nodi di micelio collegano due punti, chi tocca un nodo riemerge dall\'altro',
      'Mondo 5 "Il micelio" con 3 livelli: Il trampolino, Il filo di micelio, Andata e ritorno',
      'Fioritura: due tocchi e dopo 5 s di conto alla rovescia tutti i Nailcap rimasti fioriscono e il livello finisce',
      'La Fioritura è una mossa come le altre: riavvolgendo prima del tocco si annulla',
      'Il pulsante Ricomincia si trova ora nel menu Livelli e nella schermata di fine livello'
    ]
  },
  {
    version: 'V.0.7.1',
    date: '2026-10-31',
    items: [
      'Corretto: con uno Stump in campo il livello non finiva mai; ora si chiude quando restano solo Nailcap piantati',
      'Sradica uno Stump: con Stump selezionato tocca un Nailcap già piantato, torna a camminare e ti restituisce il ruolo'
    ]
  },
  {
    version: 'V.0.7.0',
    date: '2026-10-29',
    items: [
      'Progressi sincronizzati su tutti i dispositivi: accesso con Google dal menu Livelli',
      'Unione dei progressi senza perdite: un livello superato vale ovunque e per ogni livello si tiene il record più alto',
      'Riallineamento automatico quando torni sul gioco dopo aver giocato su un altro dispositivo'
    ]
  },
  {
    version: 'V.0.6.1',
    date: '2026-10-28',
    items: [
      'Nel menu Livelli si vede il record di Nailcap salvati per ogni livello superato',
      'Predisposta la sincronizzazione dei progressi con Firebase (si attiva con la configurazione)'
    ]
  },
  {
    version: 'V.0.6.0',
    date: '2026-10-28',
    items: [
      'Livelli al buio: si vede solo attorno ai Nailcap e alle luci; le zone già viste restano in penombra',
      'Nuovo ruolo Glow: il cappello si accende e illumina il buio (tratto permanente)',
      'Mensole di luce: reggono solo se un Glow o una lampada accesa sono vicini',
      'Funghi-lampada: un Glow che passa li accende per 10 secondi, con un anello che mostra il tempo rimasto',
      'Mondo 4 "Le grotte buie" con 3 livelli: Al buio, Lampade, La caverna'
    ]
  },
  {
    version: 'V.0.5.0',
    date: '2026-10-25',
    items: [
      'Vento a raffiche: cambia forza e direzione, indicatore in alto e raffiche visibili sullo sfondo',
      'Nuovo ruolo Puff: scoppia in una spora che il vento trasporta; dove atterra germoglia un nuovo Nailcap',
      'Lo scoppio di Puff rompe pareti e soffitti vicini, mai il terreno sotto i piedi',
      'Il Parasol aperto si fa portare dal vento',
      'Mondo 3 "La valle del vento" con 3 livelli: Raffica, Controvento, Raffiche',
      'Vento e spore sono deterministici: il riavvolgimento ripete la partita identica'
    ]
  },
  {
    version: 'V.0.4.0',
    date: '2026-10-25',
    items: [
      'Riavvolgi il tempo: timeline trascinabile e pulsante −5 s',
      'Dopo un riavvolgimento le mosse registrate si rigiocano da sole; una mossa nuova cambia il futuro',
      'Tacche colorate sulla timeline nei momenti in cui hai assegnato un ruolo',
      'Riavvolgi 10 s anche dalla schermata di sconfitta',
      'Nuovo ruolo Stretch: il gambo si allunga in una rampa',
      'Nuovo ruolo Clinger: scala le pareti (tratto permanente)',
      'Mondo 2 "Le radici alte" con 3 livelli',
      'Selezione livelli divisa per mondo; i ruoli nuovi sono presentati all\'inizio del livello'
    ]
  },
  {
    version: 'V.0.3.0',
    date: '2026-10-24',
    items: [
      'Nuova ambientazione: sottobosco notturno bioluminescente',
      'Sfondo con funghi giganti, radici pendenti e spore che fluttuano',
      'Terreno di roccia con venature di micelio e bordi luminosi al posto di terra e prato',
      'Ingresso a baccello di spore e uscita con cerchio delle fate'
    ]
  },
  {
    version: 'V.0.2.0',
    date: '2026-10-24',
    items: [
      'Primo prototipo giocabile nel browser',
      'Mondo 1 con 3 livelli e i ruoli Stump, Rooter, Parasol e Ram',
      'Terreno distruttibile e cadute mortali da troppo in alto',
      'Barra dei ruoli sottile che si espande al tocco',
      'Pausa, ricomincia, velocità 1×/2× e scelta dei livelli',
      'Progressi salvati sul dispositivo',
      'Avviso "ruota il telefono" in verticale'
    ]
  },
  {
    version: 'V.0.1.0',
    date: '2026-10-24',
    items: [
      'Concept: la creatura Nailcap (Chiodino)',
      'Ruoli come mutazioni del fungo, introdotti in modo graduale',
      'Meccanica spore + vento (in arrivo)',
      'Orientamento orizzontale di default'
    ]
  }
];
