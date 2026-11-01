// Mondi e livelli. Mondo di gioco: 640×280 pixel.
// terrain: r = rettangolo [x, y, larghezza, altezza], e = ellisse [cx, cy, rx, ry]
// entrance/exit: coordinate dei piedi (exit.y = superficie del terreno)
// newRoles: ruoli presentati per la prima volta in quel livello
// wind: { base, gust, period } in px/tick · dark: livello al buio
// shelves: mensole di luce [x, y, larghezza, altezza], solide solo se illuminate
// bulbs: funghi-lampada { x, y } che un Glow accende per 10 s
// challenge: livello sfida facoltativo, non serve per aprire il mondo successivo
window.NAILCAP_WORLDS = [
  { id: 1, name: 'Il sottobosco' },
  { id: 2, name: 'Le radici alte' },
  { id: 3, name: 'La valle del vento' },
  { id: 4, name: 'Le grotte buie' },
  { id: 5, name: 'Il micelio' }
];

window.NAILCAP_LEVELS = [
  {
    world: 1,
    code: '1-1',
    name: 'Primi passi',
    newRoles: ['rooter'],
    hint: 'Il muro sbarra la strada. Scegli Rooter e tocca un Nailcap per scavare fino al tunnel di sotto.',
    total: 10,
    goal: 7,
    rate: 90,
    time: 240,
    entrance: { x: 70, y: 60 },
    exit: { x: 580, y: 155 },
    roles: { stump: 1, rooter: 2 },
    terrain: [
      { r: [0, 100, 400, 30] },
      { r: [400, 30, 24, 100] },
      { r: [0, 155, 640, 125] },
      { e: [200, 159, 60, 7] }
    ]
  },
  {
    world: 1,
    code: '1-2',
    name: 'Il muro di corteccia',
    newRoles: ['ram'],
    hint: 'Due muri di corteccia. Ram li sfonda a testate.',
    total: 10,
    goal: 8,
    rate: 80,
    time: 240,
    entrance: { x: 60, y: 150 },
    exit: { x: 590, y: 200 },
    roles: { stump: 1, ram: 3 },
    terrain: [
      { r: [0, 200, 640, 80] },
      { r: [260, 110, 36, 90] },
      { r: [440, 130, 20, 70] },
      { r: [0, 0, 640, 14] }
    ]
  },
  {
    world: 1,
    code: '1-3',
    name: 'Salto nel vuoto',
    newRoles: ['parasol'],
    hint: 'Il salto è troppo alto. Dai il Parasol ai Nailcap prima che cadano dal bordo.',
    total: 10,
    goal: 8,
    rate: 80,
    time: 240,
    entrance: { x: 50, y: 50 },
    exit: { x: 580, y: 250 },
    roles: { parasol: 10, rooter: 1 },
    terrain: [
      { r: [0, 90, 250, 22] },
      { r: [0, 250, 640, 30] },
      { r: [330, 190, 60, 8] }
    ]
  },
  {
    world: 1,
    code: '1-4',
    challenge: true,
    name: 'Scava e plana',
    hint: 'Il piano è alto e chiuso dal muro. Scava un buco, ma chi ci cade dentro deve avere già il Parasol.',
    total: 10,
    goal: 8,
    rate: 80,
    time: 240,
    entrance: { x: 60, y: 40 },
    exit: { x: 580, y: 250 },
    roles: { rooter: 1, parasol: 10 },
    terrain: [
      { r: [0, 90, 400, 30] },
      { r: [400, 20, 20, 70] },
      { r: [0, 250, 640, 30] }
    ]
  },
  {
    world: 1,
    code: '1-5',
    challenge: true,
    name: 'Dietro front',
    hint: 'Davanti c\'è lo strapiombo, l\'uscita è alle spalle oltre un muro. Ferma la folla e apri la strada.',
    total: 10,
    goal: 7,
    rate: 80,
    time: 240,
    entrance: { x: 250, y: 150 },
    exit: { x: 40, y: 200 },
    roles: { stump: 1, ram: 2 },
    terrain: [
      { r: [0, 200, 450, 80] },
      { r: [120, 140, 20, 60] }
    ]
  },
  {
    world: 2,
    code: '2-1',
    name: 'Il fosso',
    newRoles: ['stretch'],
    hint: 'Un fosso senza fondo. Stretch allunga il gambo in una rampa: usalo poco prima del bordo.',
    total: 10,
    goal: 8,
    rate: 80,
    time: 240,
    entrance: { x: 60, y: 150 },
    exit: { x: 590, y: 196 },
    roles: { stretch: 3 },
    terrain: [
      { r: [0, 200, 250, 80] },
      { r: [270, 196, 370, 84] }
    ]
  },
  {
    world: 2,
    code: '2-2',
    name: 'La parete',
    newRoles: ['clinger'],
    hint: 'Troppo alta da scavalcare. Con Clinger un Nailcap scala le pareti, per sempre.',
    total: 10,
    goal: 8,
    rate: 80,
    time: 240,
    entrance: { x: 60, y: 170 },
    exit: { x: 590, y: 110 },
    roles: { clinger: 10 },
    terrain: [
      { r: [0, 220, 300, 60] },
      { r: [300, 110, 340, 170] }
    ]
  },
  {
    world: 2,
    code: '2-3',
    name: 'Ponte e parete',
    hint: 'Prima il fosso, poi la parete. Puoi mettere in pausa e riavvolgere quando vuoi.',
    total: 10,
    goal: 7,
    rate: 80,
    time: 240,
    entrance: { x: 50, y: 150 },
    exit: { x: 590, y: 120 },
    roles: { stretch: 2, clinger: 10 },
    terrain: [
      { r: [0, 200, 210, 80] },
      { r: [230, 196, 180, 84] },
      { r: [410, 120, 230, 160] }
    ]
  },
  {
    world: 2,
    code: '2-4',
    challenge: true,
    name: 'Scala e ponte',
    hint: 'Prima la parete, poi un fosso sull\'altopiano. Una rampa sola basta, ma va costruita al momento giusto.',
    total: 10,
    goal: 7,
    rate: 80,
    time: 240,
    entrance: { x: 60, y: 170 },
    exit: { x: 600, y: 140 },
    roles: { clinger: 10, stretch: 2 },
    terrain: [
      { r: [0, 220, 260, 60] },
      { r: [260, 140, 180, 140] },
      { r: [464, 140, 176, 140] }
    ]
  },
  {
    world: 2,
    code: '2-5',
    challenge: true,
    name: 'Tre gradini',
    hint: 'Tre gradini troppo alti da scavalcare. Ogni rampa ne supera uno: costruiscila davanti al gradino.',
    total: 10,
    goal: 7,
    rate: 80,
    time: 240,
    entrance: { x: 50, y: 180 },
    exit: { x: 600, y: 194 },
    roles: { stretch: 4 },
    terrain: [
      { r: [0, 230, 640, 50] },
      { r: [200, 218, 440, 12] },
      { r: [340, 206, 300, 12] },
      { r: [480, 194, 160, 12] }
    ]
  },
  {
    world: 3,
    code: '3-1',
    name: 'Raffica',
    newRoles: ['puff'],
    hint: 'Il fosso è troppo largo. Puff scoppia in una spora: il vento la porta dall\'altra parte e lì rinasce un Nailcap.',
    total: 10,
    goal: 8,
    rate: 80,
    time: 240,
    entrance: { x: 60, y: 120 },
    exit: { x: 590, y: 180 },
    wind: { base: 0.75 },
    roles: { puff: 10 },
    terrain: [
      { r: [0, 160, 260, 120] },
      { r: [380, 180, 260, 100] }
    ]
  },
  {
    world: 3,
    code: '3-2',
    name: 'Controvento',
    hint: 'L\'uscita è alle tue spalle, oltre il fosso. Il vento soffia verso sinistra: sfruttalo.',
    total: 10,
    goal: 7,
    rate: 80,
    time: 240,
    entrance: { x: 300, y: 150 },
    exit: { x: 40, y: 240 },
    wind: { base: -0.75 },
    roles: { stump: 1, puff: 10 },
    terrain: [
      { r: [150, 200, 490, 80] },
      { r: [0, 240, 90, 40] }
    ]
  },
  {
    world: 3,
    code: '3-3',
    name: 'Raffiche',
    hint: 'Il vento va e viene. Guarda l\'indicatore in alto: con le raffiche deboli le spore cadono nel fosso.',
    total: 10,
    goal: 6,
    rate: 80,
    time: 240,
    entrance: { x: 60, y: 120 },
    exit: { x: 600, y: 210 },
    wind: { base: 0.35, gust: 0.6, period: 720 },
    roles: { stump: 1, puff: 10 },
    terrain: [
      { r: [0, 170, 240, 110] },
      { r: [360, 210, 280, 70] }
    ]
  },
  {
    world: 3,
    code: '3-4',
    challenge: true,
    name: 'Planata',
    hint: 'Il vento soffia forte verso destra. Con il Parasol aperto i Nailcap si fanno portare oltre il vuoto.',
    total: 10,
    goal: 8,
    rate: 80,
    time: 240,
    entrance: { x: 60, y: 0 },
    exit: { x: 590, y: 230 },
    wind: { base: 1.2 },
    roles: { parasol: 10 },
    terrain: [
      { r: [0, 40, 200, 20] },
      { r: [380, 230, 260, 50] }
    ]
  },
  {
    world: 3,
    code: '3-5',
    challenge: true,
    name: 'Tempesta',
    hint: 'Solo le raffiche forti portano fin laggiù. Pianta lo Stump sul bordo quando il vento cala, sradicalo quando cresce: puoi ripiantarlo quante volte vuoi.',
    total: 10,
    goal: 6,
    rate: 60,
    time: 300,
    entrance: { x: 60, y: 0 },
    exit: { x: 590, y: 230 },
    wind: { base: 0.6, gust: 0.9, period: 900 },
    roles: { stump: 1, parasol: 10 },
    terrain: [
      { r: [0, 40, 200, 20] },
      { r: [360, 230, 280, 50] }
    ]
  },
  {
    world: 4,
    code: '4-1',
    name: 'Al buio',
    newRoles: ['glow'],
    hint: 'Sul fosso c\'è una mensola di luce: regge solo se un Glow è vicino. Chi segue da poco un Glow passa al sicuro.',
    total: 10,
    goal: 8,
    rate: 80,
    time: 240,
    dark: true,
    entrance: { x: 60, y: 150 },
    exit: { x: 590, y: 200 },
    roles: { glow: 5 },
    terrain: [
      { r: [0, 200, 280, 80] },
      { r: [350, 200, 290, 80] },
      { r: [0, 0, 640, 30] }
    ],
    shelves: [[280, 200, 70, 4]]
  },
  {
    world: 4,
    code: '4-2',
    name: 'Lampade',
    hint: 'Un Glow che passa accanto al fungo-lampada lo accende per 10 secondi. Hai solo due Glow: scegli bene quando.',
    total: 10,
    goal: 8,
    rate: 80,
    time: 240,
    dark: true,
    entrance: { x: 60, y: 150 },
    exit: { x: 590, y: 200 },
    roles: { glow: 2 },
    terrain: [
      { r: [0, 200, 280, 80] },
      { r: [370, 200, 270, 80] },
      { r: [0, 0, 640, 30] }
    ],
    shelves: [[280, 200, 90, 4]],
    bulbs: [{ x: 250, y: 200 }]
  },
  {
    world: 4,
    code: '4-3',
    name: 'La caverna',
    hint: 'Nel buio c\'è un muro, poi un fosso con una lampada. Apri la strada prima di accendere la luce.',
    total: 10,
    goal: 7,
    rate: 80,
    time: 240,
    dark: true,
    entrance: { x: 60, y: 120 },
    exit: { x: 600, y: 160 },
    roles: { ram: 2, glow: 2 },
    terrain: [
      { r: [0, 160, 330, 120] },
      { r: [200, 70, 24, 90] },
      { r: [410, 160, 230, 120] },
      { r: [0, 0, 640, 40] }
    ],
    shelves: [[330, 160, 80, 4]],
    bulbs: [{ x: 305, y: 160 }]
  },
  {
    world: 4,
    code: '4-4',
    challenge: true,
    name: 'Scavare al buio',
    hint: 'L\'uscita è sotto di te, ma non dappertutto c\'è un pavimento. Esplora con il Glow prima di scavare.',
    total: 10,
    goal: 8,
    rate: 80,
    time: 240,
    dark: true,
    entrance: { x: 60, y: 70 },
    exit: { x: 520, y: 175 },
    roles: { glow: 2, rooter: 1 },
    terrain: [
      { r: [0, 120, 640, 30] },
      { r: [300, 175, 340, 105] },
      { r: [0, 0, 640, 20] }
    ]
  },
  {
    world: 4,
    code: '4-5',
    challenge: true,
    name: 'Due lampade',
    hint: 'Due ponti di luce, due lampade, due Glow. Ogni lampada resta accesa 10 secondi: dividi bene la luce nel tempo.',
    total: 10,
    goal: 8,
    rate: 80,
    time: 240,
    dark: true,
    entrance: { x: 50, y: 150 },
    exit: { x: 600, y: 200 },
    roles: { glow: 2 },
    terrain: [
      { r: [0, 200, 200, 80] },
      { r: [280, 200, 120, 80] },
      { r: [480, 200, 160, 80] },
      { r: [0, 0, 640, 30] }
    ],
    shelves: [[200, 200, 80, 4], [400, 200, 80, 4]],
    bulbs: [{ x: 180, y: 200 }, { x: 380, y: 200 }]
  },
  {
    world: 5,
    code: '5-1',
    name: 'Il trampolino',
    newRoles: ['sprout'],
    hint: 'Il muro è troppo alto. Sprout cresce in un trampolino: piantalo poco prima del muro e tutti salteranno oltre.',
    total: 10,
    goal: 8,
    rate: 80,
    time: 240,
    entrance: { x: 60, y: 150 },
    exit: { x: 590, y: 200 },
    roles: { sprout: 2 },
    terrain: [
      { r: [0, 200, 640, 80] },
      { r: [330, 164, 12, 36] }
    ]
  },
  {
    world: 5,
    code: '5-2',
    name: 'Il filo di micelio',
    newRoles: ['mycelink'],
    hint: 'Dalla fossa non si esce. Pianta un Mycelink sulla sporgenza e uno nella fossa, sotto la sporgenza: chi torna indietro dal muro risale dal micelio.',
    total: 10,
    goal: 7,
    rate: 80,
    time: 240,
    entrance: { x: 70, y: 60 },
    exit: { x: 25, y: 120 },
    roles: { mycelink: 2 },
    terrain: [
      { r: [0, 120, 200, 20] },
      { r: [0, 170, 420, 110] },
      { r: [420, 30, 30, 250] }
    ]
  },
  {
    world: 5,
    code: '5-3',
    name: 'Andata e ritorno',
    hint: 'L\'uscita è alle tue spalle, davanti c\'è il baratro. Salta sulla piattaforma lontana e torna indietro dal micelio: chi arriva al nodo deve andare verso sinistra.',
    total: 10,
    goal: 6,
    rate: 80,
    time: 240,
    entrance: { x: 60, y: 100 },
    exit: { x: 20, y: 150 },
    roles: { sprout: 1, mycelink: 2 },
    terrain: [
      { r: [0, 150, 250, 20] },
      { r: [290, 150, 350, 20] }
    ]
  },
  {
    world: 5,
    code: '5-4',
    challenge: true,
    name: 'Salto e ponte',
    hint: 'Prima un muro, poi un fosso. Il trampolino e la rampa vanno piantati nel punto giusto.',
    total: 10,
    goal: 8,
    rate: 80,
    time: 240,
    entrance: { x: 60, y: 150 },
    exit: { x: 600, y: 200 },
    roles: { sprout: 1, stretch: 2 },
    terrain: [
      { r: [0, 200, 380, 80] },
      { r: [200, 164, 12, 36] },
      { r: [404, 200, 236, 80] }
    ]
  },
  {
    world: 5,
    code: '5-5',
    challenge: true,
    name: 'Notte nel micelio',
    hint: 'Il gran finale, al buio. Accendi la lampada prima del salto: oltre il baratro c\'è un ponte di luce. Poi torna indietro dal micelio.',
    total: 10,
    goal: 5,
    rate: 80,
    time: 300,
    dark: true,
    entrance: { x: 60, y: 100 },
    exit: { x: 20, y: 150 },
    roles: { glow: 2, sprout: 1, mycelink: 2 },
    terrain: [
      { r: [0, 150, 250, 20] },
      { r: [370, 150, 270, 20] }
    ],
    shelves: [[290, 150, 80, 4]],
    bulbs: [{ x: 238, y: 150 }]
  }
];
