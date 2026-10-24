// Livelli: mondo 640×280 pixel.
// terrain: r = rettangolo [x, y, larghezza, altezza], e = ellisse [cx, cy, rx, ry]
// entrance/exit: coordinate dei piedi (exit.y = superficie del terreno)
window.NAILCAP_LEVELS = [
  {
    code: '1-1',
    name: 'Primi passi',
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
    code: '1-2',
    name: 'Il muro di corteccia',
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
    code: '1-3',
    name: 'Salto nel vuoto',
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
  }
];
