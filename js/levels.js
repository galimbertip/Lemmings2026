// Mondi e livelli. Mondo di gioco: 640×280 pixel.
// terrain: r = rettangolo [x, y, larghezza, altezza], e = ellisse [cx, cy, rx, ry]
// entrance/exit: coordinate dei piedi (exit.y = superficie del terreno)
// newRoles: ruoli presentati per la prima volta in quel livello
window.NAILCAP_WORLDS = [
  { id: 1, name: 'Il sottobosco' },
  { id: 2, name: 'Le radici alte' },
  { id: 3, name: 'La valle del vento' }
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
  }
];
