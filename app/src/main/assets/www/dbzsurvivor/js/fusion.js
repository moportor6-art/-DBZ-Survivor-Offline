'use strict';
// ─── Fusión: contenido de DB Survivors (dbsurvivors.xyz) que DBZ Survivor no tenía ───
// Se carga justo después de js/data.js y no cambia nada de lo original: solo agrega guerreros,
// técnicas y sus hojas de sprites. Lo que ya existía en la base no se duplica.
const FUSION_SHEETS = {
  'yamcha': [34, 32, 1], 'tien': [32, 32, 1], 'gotenks': [32, 32, 1], 'gotenks-ssj': [32, 32, 0], 'majinbuu': [58, 52, 0],
  'majinbuu-ssj': [34, 57, 0], 'gohanf': [34, 32, 1], 'gohanf-ssj': [32, 32, 0], 'vegetto': [32, 32, 1], 'vegetto-ssj': [32, 32, 0],
  'black': [34, 33, 1], 'black-ssj': [32, 32, 0], 'saiyaman': [34, 32, 1], 'saiyaman-ssj': [32, 32, 0], 'videl': [32, 32, 1],
  'broly': [50, 64, 0], 'olibu': [32, 32, 0], 'gogetap': [32, 32, 0], 'gogetap-ssj': [32, 32, 0], 'a16p': [32, 32, 1],
  'a17p': [32, 32, 1], 'a18p': [32, 32, 1], 'cellp': [54, 54, 1], 'cellp-ssj': [42, 58, 0], 'pan': [32, 32, 1],
  'freezerp': [32, 32, 1], 'freezerp-ssj': [32, 32, 0], 'zamasu': [34, 33, 1], 'zamasu-ssj': [32, 37, 0], 'raditzp': [32, 32, 1],
  'nappap': [32, 32, 1], 'ginyup': [32, 32, 1], 'coolerp': [48, 52, 1], 'kidbuup': [32, 32, 1], 'taop': [32, 32, 1],
  'babidip': [32, 32, 1], 'roshi': [32, 32, 1], 'yajirobe': [34, 32, 1],
};

// ─── Técnicas nuevas (de DB Survivors), armadas con los tipos que ya tiene el motor ───
// Solo las que la base no tenía: las repetidas (Kamehameha, Galick Ho, Big Bang, Burning, Taiyoken,
// Genkidama, Megaton, Dynamite Kick, Bomba de regalo, Granada...) siguen siendo las originales.
Object.assign(ATTACKS, {
  espada: {
    name: 'Corte de Espada', color: '#dff3ff', type: 'nova', punch: true, users: ['yajirobe', 'ftrunks'],
    desc: 'Un corte en círculo con la espada a todos los enemigos que tienes cerca.',
    stats: l => ({ cd: 1.3 - l * 0.08, dmg: 13 + l * 6, radius: 58 + l * 7 }),
  },
  kikoho: {
    name: 'Kikoho', color: '#ffe36b', type: 'rain', kind: 'big', users: ['tien', 'kidbuup'],
    desc: 'Una descarga de ki cae sobre los enemigos cercanos y estalla en un área grande.',
    stats: l => ({ cd: 3.2 - l * 0.2, dmg: 30 + l * 13, count: 1 + Math.floor(l / 3), explode: 62 + l * 9, r: 9 }),
  },
  guadana: {
    name: 'Guadaña de Ki', color: '#ff5ec8', type: 'nova', users: ['black', 'zamasu'],
    desc: 'Una guadaña de ki da una vuelta a tu alrededor y corta a todos los que toca.',
    stats: l => ({ cd: 2.4 - l * 0.15, dmg: 16 + l * 8, radius: 85 + l * 10 }),
  },
  fantasmas: {
    name: 'Ataque Kamikaze Fantasma', color: '#e9f1ff', type: 'projectile', kind: 'ball', users: ['gotenks', 'babidip'],
    desc: 'Fantasmas que persiguen al enemigo más cercano y explotan al tocarlo.',
    stats: l => ({ cd: 2.6 - l * 0.15, dmg: 20 + l * 9, count: 1 + Math.floor(l / 2), speed: 3, r: 7, pierce: 0, life: 4,
      spread: 0.6, home: 3.5, explode: 38 + l * 6 }),
  },
  caramelo: {
    name: 'Rayo de Caramelo', color: '#ff8fd0', core: '#fff0fa', type: 'beam', users: ['majinbuu', 'kidbuup'],
    desc: 'Un rayo rosa que atraviesa a los enemigos en línea.',
    stats: l => ({ cd: 2.8 - l * 0.18, dmg: 9 + l * 4, len: 170 + l * 25, width: 14 + l * 3, dur: 0.45 + l * 0.04 }),
  },
  lobo: {
    name: 'Puño del Lobo', color: '#ffb070', type: 'nova', punch: true, users: ['yamcha'],
    desc: 'Una ráfaga de zarpazos al estilo del lobo sobre los enemigos que tienes cerca. Muy rápida.',
    stats: l => ({ cd: 1.0 - l * 0.05, dmg: 11 + l * 5, radius: 52 + l * 6 }),
  },
  hellflash: {
    name: "Hell's Flash", color: '#ff9a3c', core: '#fff3d6', type: 'beam', users: ['a16p'],
    desc: 'Un rayo enorme desde los cañones de los brazos contra el enemigo más cercano.',
    stats: l => ({ cd: 3.8 - l * 0.25, dmg: 11 + l * 5, len: 250 + l * 30, width: 22 + l * 5, dur: 0.6 + l * 0.05 }),
  },
  rocketpunch: {
    name: 'Puño Cohete', color: '#c9c9d6', type: 'projectile', kind: 'big', users: ['a16p'],
    desc: 'Lanzas el puño como un cohete: atraviesa a todos los enemigos en línea.',
    stats: l => ({ cd: 2.2 - l * 0.12, dmg: 22 + l * 9, count: 1 + (l >= 3 ? 1 : 0), speed: 8, r: 8, pierce: 99, life: 0.8,
      spread: 0.3, explode: 0 }),
  },
  mafuba: {
    name: 'Mafuba', color: '#9ff0c0', type: 'nova', users: ['roshi'],
    desc: 'Un torbellino atrapa a los enemigos cercanos: quedan quietos un momento y reciben daño (los jefes, menos).',
    stats: l => ({ cd: 6.5 - l * 0.45, dmg: 8 + l * 4, radius: 100 + l * 12, stun: 1 + l * 0.2 }),
  },
});

// Técnicas que ya existían y que los guerreros nuevos también usan en la serie
// (las evoluciones comparten la misma lista, así que también las aprenden)
for (const [atk, ids] of Object.entries({
  kamehameha: ['roshi', 'yamcha', 'vegetto', 'cellp', 'gohanf'],
  masenko: ['gohanf', 'saiyaman', 'pan'],
  galick: ['raditzp'],
  bigbangatk: ['broly', 'gogetap', 'coolerp'],
  kienzan: ['a18p', 'freezerp'],
  dynamite: ['videl'],
})) ATTACKS[atk].users.push(...ids);

// ─── Guerreros nuevos (de DB Survivors) ───
// Los que la base ya tenía (Goku, Vegeta, Piccolo, Gohan, Krilin, Goten, Trunks niño, Trunks del Futuro
// y Mr. Satán) no se repiten.
const FUSION_CHARS = {
  yamcha:   { name: 'Yamcha', title: 'El lobo del desierto', hp: 90, speed: 2.7, start: 'lobo', transform: 'Potencial liberado',
              perk: 'Reflejos de beisbolista: +15% de velocidad de recarga', cdBonus: 0.15, cost: 1200, aura: '#ffffff' },
  tien:     { name: 'Ten Shin Han', title: 'El guerrero de tres ojos', hp: 100, speed: 2.6, start: 'kikoho', transform: 'Potencial liberado',
              perk: 'Tercer ojo: +20% de daño a los jefes', bossBonus: 0.2, cost: 1300, aura: '#ffffff' },
  roshi:    { name: 'Maestro Roshi', title: 'El ermitaño tortuga', hp: 100, speed: 2.5, start: 'kamehameha', transform: 'Máxima potencia',
              perk: 'Sabiduría: +30% de experiencia', xpBonus: 0.3, cost: 1200, aura: '#ffffff' },
  yajirobe: { name: 'Yajirobe', title: 'El samurái glotón', hp: 120, speed: 2.55, start: 'espada', transform: 'Potencial liberado',
              perk: 'Suerte de cobarde: 1 de cada 8 golpes no le hace daño', dodge: 0.12, cost: 1200, aura: '#ffffff' },
  videl:    { name: 'Videl', title: 'La hija del campeón', hp: 95, speed: 2.75, start: 'dynamite', transform: 'Potencial liberado',
              perk: 'Artista marcial: +25% de Zeni', zeniBonus: 0.25, cost: 2000, aura: '#ffffff' },
  saiyaman: { name: 'Gran Saiyaman', title: 'El justiciero de Ciudad Satán', hp: 105, speed: 2.7, start: 'masenko', transform: 'Super Saiyajin',
              perk: 'Héroe de la ciudad: +20% de experiencia', xpBonus: 0.2, cost: 2500, ssj: true, aura: '#ffe14d' },
  pan:      { name: 'Pan', title: 'La nieta de Goku', hp: 85, speed: 2.85, start: 'masenko', transform: 'Potencial liberado',
              perk: 'Energía de nieta: el Ki se carga un 30% más rápido', kiBonus: 0.3, cost: 2000, aura: '#ffffff' },
  gohanf:   { name: 'Gohan del Futuro', title: 'El último guerrero de su época', hp: 100, speed: 2.65, start: 'masenko', transform: 'Super Saiyajin',
              perk: 'Furia del futuro: la transformación dura un 40% más', transformTime: 0.4, cost: 3500, ssj: true, aura: '#ffe14d' },
  gotenks:  { name: 'Gotenks', title: 'La fusión de Goten y Trunks', hp: 90, speed: 2.85, start: 'fantasmas', transform: 'Super Saiyajin',
              perk: 'Fusión traviesa: el Ki se carga un 40% más rápido', kiBonus: 0.4, cost: 3000, ssj: true, aura: '#ffe14d' },
  vegetto:  { name: 'Vegetto', title: 'La fusión de los Pothala', hp: 110, speed: 2.7, start: 'kamehameha', transform: 'Super Saiyajin',
              perk: 'Fusión perfecta: +10% de daño y +10% de velocidad de recarga', dmgBonus: 0.1, cdBonus: 0.1, cost: 4500, ssj: true, aura: '#ffe14d' },
  gogetap:  { name: 'Gogeta', title: 'La fusión por la danza', hp: 110, speed: 2.7, start: 'bigbangatk', transform: 'Super Saiyajin',
              perk: 'Danza de la fusión: +20% de daño', dmgBonus: 0.2, cost: 4500, ssj: true, aura: '#ffe14d' },
  black:    { name: 'Goku Black', title: 'El impostor del futuro', hp: 100, speed: 2.7, start: 'guadana', transform: 'Super Saiyajin Rosé',
              perk: 'Cuerpo robado: +15% de daño', dmgBonus: 0.15, cost: 5000, ssj: true, aura: '#ff6ec7' },
  zamasu:   { name: 'Zamasu', title: 'El Kaioshin inmortal', hp: 110, speed: 2.6, start: 'guadana', transform: 'Fusión con Black',
              perk: 'Inmortal: recupera salud con el tiempo', regen: 0.4, cost: 4500, ssj: true, aura: '#c5ff8a' },
  majinbuu: { name: 'Majin Buu', title: 'El Buu bueno', hp: 145, speed: 2.4, start: 'caramelo', transform: 'Buu malo',
              perk: 'Cuerpo de goma: recupera salud con el tiempo', regen: 0.6, cost: 3500, ssj: true, aura: '#ff8fd0' },
  broly:    { name: 'Broly', title: 'El Super Saiyajin Legendario', hp: 150, speed: 2.4, start: 'bigbangatk', transform: 'Furia legendaria',
              perk: 'Poder legendario: +30% de daño', dmgBonus: 0.3, cost: 4000, aura: '#9dff5c' },
  olibu:    { name: 'Olibu', title: 'El héroe del Más Allá', hp: 130, speed: 2.5, start: 'wave', transform: 'Espíritu de campeón',
              perk: 'Campeón eterno: la transformación es un 30% más poderosa', transformBonus: 0.3, cost: 2000, aura: '#ffd93b' },
  a16p:     { name: 'Androide 16', title: 'El gigante pacífico', hp: 135, speed: 2.4, start: 'hellflash', transform: 'Energía infinita',
              perk: 'Blindaje: 1 de cada 5 golpes no le hace daño', dodge: 0.2, cost: 3000, aura: '#ffb070' },
  a17p:     { name: 'Androide 17', title: 'El guardabosques', hp: 100, speed: 2.75, start: 'kiblast', transform: 'Energía infinita',
              perk: 'Energía infinita: el Ki se carga un 50% más rápido', kiBonus: 0.5, cost: 2500, aura: '#8fe3ff' },
  a18p:     { name: 'Androide 18', title: 'La androide más fuerte', hp: 95, speed: 2.8, start: 'kienzan', transform: 'Energía infinita',
              perk: 'Calculadora: +30% de Zeni', zeniBonus: 0.3, cost: 2500, aura: '#ffe36b' },
  cellp:    { name: 'Cell', title: 'La forma de vida perfecta', hp: 120, speed: 2.55, start: 'kamehameha', transform: 'Cell Perfecto',
              perk: 'Células de Piccolo: recupera salud con el tiempo', regen: 0.5, cost: 4000, ssj: true, aura: '#b4ff8a' },
  freezerp: { name: 'Freezer', title: 'El emperador del universo', hp: 100, speed: 2.7, start: 'kienzan', transform: 'Golden Freezer',
              perk: 'Emperador: +25% de daño a los jefes', bossBonus: 0.25, cost: 4000, ssj: true, aura: '#ffd93b' },
  coolerp:  { name: 'Cooler', title: 'El hermano mayor de Freezer', hp: 105, speed: 2.55, start: 'bigbangatk', transform: 'Potencial liberado',
              perk: 'Orgullo de la familia: +30% de daño', dmgBonus: 0.3, cost: 4500, aura: '#c46bff' },
  raditzp:  { name: 'Raditz', title: 'El hermano de Goku', hp: 90, speed: 2.75, start: 'galick', transform: 'Potencial liberado',
              perk: 'Saiyajin de clase baja: +10% de daño', dmgBonus: 0.1, cost: 1500, aura: '#c46bff' },
  nappap:   { name: 'Nappa', title: 'El general saiyajin', hp: 150, speed: 2.35, start: 'kigrenade', transform: 'Potencial liberado',
              perk: 'Cabeza dura: 1 de cada 7 golpes no le hace daño', dodge: 0.15, cost: 1800, aura: '#ffd93b' },
  ginyup:   { name: 'Capitán Ginyu', title: 'El líder de las Fuerzas Especiales', hp: 110, speed: 2.6, start: 'kiblast', transform: 'Pose especial',
              perk: 'Poses de combate: +25% de experiencia', xpBonus: 0.25, cost: 2500, aura: '#c46bff' },
  kidbuup:  { name: 'Kid Buu', title: 'Buu en su forma pura', hp: 110, speed: 2.75, start: 'kikoho', transform: 'Furia pura',
              perk: 'Regeneración de Majin: recupera salud con el tiempo', regen: 0.5, cost: 4000, aura: '#ff8fd0' },
  taop:     { name: 'Tao Pai Pai', title: 'El asesino mercenario', hp: 90, speed: 2.8, start: 'kiblast', transform: 'Potencial liberado',
              perk: 'Asesino a sueldo: +15% de velocidad de recarga', cdBonus: 0.15, cost: 1500, aura: '#ffffff' },
  babidip:  { name: 'Babidi', title: 'El mago malvado', hp: 85, speed: 2.45, start: 'fantasmas', transform: 'Magia de Babidi',
              perk: 'Magia: +50% de Zeni', zeniBonus: 0.5, cost: 1500, aura: '#c5ff8a' },
};

for (const [id, d] of Object.entries(FUSION_CHARS)) {
  const { cost, ssj, ...c } = d;
  // look: solo de respaldo (los sprites de GBA lo tapan); el id lo usa el dibujo para encontrar su hoja
  c.look = { ...CHARACTERS.goku.look, id, ssjHair: null };
  c.ssjHair = null;
  if (ssj) c.transformSprite = true;   // al transformarse usa su hoja <id>:ssj (como Piccolo)
  c.unlock = { kind: 'zeni', cost, text: 'Cómpralo con Zeni' };
  c.fusion = true;   // viene de DB Survivors
  CHARACTERS[id] = c;
}

// ─── Hojas de sprites (assets/sprites/fusion, convertidas del atlas de DB Survivors) ───
// Formato igual que las de GBA: filas perfil / frente / espaldas; columnas 0 reposo, 1-4 caminar,
// 5-6 lanzar ki, 7-9 golpe, tirado y levantándose (solo si la hoja trae la caída)
for (const [sheet, [w, h, ko]] of Object.entries(FUSION_SHEETS)) {
  const [id, form] = sheet.split('-');
  const anims = { idle: { row: 0, col: 0, count: 1 }, walk: { row: 0, col: 1, count: 4 }, cast: { row: 0, col: 5, count: 2 } };
  if (ko) Object.assign(anims, { kohit: { row: 0, col: 7, count: 1 }, kolie: { row: 0, col: 8, count: 1 }, koup: { row: 0, col: 9, count: 1 } });
  SPRITE_OVERRIDES[form ? `${id}:ssj` : id] = {
    src: `assets/sprites/fusion/${sheet}.png`, frameW: w, frameH: h, footY: h, fps: 10,
    scale: 1.25 * Math.min(1, 44 / h),   // los grandotes (Broly, Buu, Cell, Cooler) se achican un poco
    anims, dirs: DIRS_PLAIN,
  };
}
const FUSION_SHEETS2 = {
  'skeleton': [32, 32], 'mummy': [34, 32], 'vampire': [34, 32], 'phantom': [34, 32], 'ninja': [32, 32], 'samurai': [32, 32],
  'bandit': [32, 32], 'gunman': [32, 32], 'ptero': [66, 64], 'trex': [66, 64], 'bearthief': [32, 32], 'coldb': [62, 64],
  'mechafz': [32, 32], 'coolerb': [48, 52], 'goldenfz': [32, 32], 'taob': [32, 32], 'brolyb': [52, 64], 'janemba': [50, 60],
  'yakon': [34, 32], 'pikkon': [32, 32], 'bills': [34, 46], 'babidib': [32, 32], 'superbuu': [42, 59],
};

// ─── Fase 2: enemigos y jefes de DB Survivors que la base no tenía ───
const FL = (skin, top, pants) => ({ style: 'bald', skin, top, pants, boots: '#333' });   // respaldo dibujado
Object.assign(ENEMIES, {
  // Otro Mundo / Infierno
  skeleton: { name: 'Esqueleto', hp: 30, speed: 1.2, r: 11, dmg: 10, xp: 2, scale: 1, look: FL('#e8e4d4', '#4a6aa0', '#4a6aa0') },
  phantom: { name: 'Fantasma', hp: 22, speed: 1.75, r: 10, dmg: 8, xp: 2, scale: 1, lunge: true, look: FL('#d8e8ff', '#d8e8ff', '#d8e8ff') },
  vampire: { name: 'Vampiro', hp: 40, speed: 1.6, r: 11, dmg: 11, xp: 3, scale: 1, lunge: true, look: FL('#d8c8d8', '#2a1a2a', '#2a1a2a') },
  mummy: { name: 'Momia', hp: 90, speed: 0.75, r: 14, dmg: 14, xp: 5, scale: 1.15, look: FL('#e0d6b0', '#e0d6b0', '#e0d6b0') },
  // Películas: bandidos, ninjas y dinosaurios
  bandit: { name: 'Bandido', hp: 28, speed: 1.2, r: 11, dmg: 9, xp: 2, scale: 1, look: FL('#e8b88a', '#7a5a3a', '#4a4a6a') },
  ninja: { name: 'Ninja', hp: 35, speed: 1.8, r: 11, dmg: 11, xp: 3, scale: 1, lunge: true, look: FL('#e8b88a', '#2a2a3a', '#2a2a3a') },
  samurai: { name: 'Samurái', hp: 60, speed: 1.3, r: 12, dmg: 13, xp: 4, scale: 1, lunge: true, look: FL('#e8b88a', '#b03030', '#3a3a5a') },
  gunman: { name: 'Pistolero', hp: 34, speed: 1.0, r: 11, dmg: 10, xp: 3, scale: 1, shooter: true, shootChance: 1, look: FL('#e8b88a', '#5a3a2a', '#3a3a3a') },
  bearthief: { name: 'Ladrón oso', hp: 45, speed: 1.0, r: 12, dmg: 11, xp: 3, scale: 1, shooter: true, shootChance: 0.6, look: FL('#8a5a3a', '#4a6a3a', '#4a6a3a') },
  ptero: { name: 'Pterodáctilo', hp: 40, speed: 1.7, r: 14, dmg: 10, xp: 3, scale: 0.75, lunge: true, look: FL('#8a9a5a', '#8a9a5a', '#8a9a5a') },
  trex: { name: 'Tiranosaurio', hp: 180, speed: 0.6, r: 20, dmg: 18, xp: 9, scale: 1.1, stomp: 65, look: FL('#9a6a3a', '#9a6a3a', '#9a6a3a') },
});

const FB = look => ({ style: 'bald', skin: look, top: look, pants: look, boots: '#333' });
BOSSES.push(
  { id: 'babidib', name: 'Babidi', hp: 4500, speed: 1.2, r: 16, dmg: 16, scale: 1.35, every: 2.4, patterns: ['aimed', 'ring', 'aimed', 'dash'], look: FB('#e8d8a0') },
  { id: 'superbuu', name: 'Super Buu', hp: 16000, speed: 1.9, r: 22, dmg: 26, scale: 1.4, every: 1.9, patterns: ['dash', 'ring', 'aimed', 'slam', 'ring'], look: FB('#ff9ac8') },
  { id: 'yakon', name: 'Yakon', hp: 5000, speed: 1.4, r: 20, dmg: 20, scale: 1.5, every: 2.4, patterns: ['dash', 'aimed', 'slam', 'dash'], look: FB('#e0d050') },
  { id: 'taob', name: 'Tao Pai Pai', hp: 6000, speed: 1.7, r: 18, dmg: 20, scale: 1.4, every: 2.2, patterns: ['aimed', 'dash', 'aimed', 'ring'], look: FB('#e8b88a') },
  { id: 'pikkon', name: 'Paikuhan', hp: 10000, speed: 1.8, r: 18, dmg: 22, scale: 1.4, every: 2.0, patterns: ['dash', 'ring', 'aimed', 'dash', 'slam'], look: FB('#6fbf6a') },
  { id: 'janemba', name: 'Janemba', hp: 22000, speed: 1.7, r: 22, dmg: 26, scale: 1.4, every: 1.9, patterns: ['ring', 'dash', 'aimed', 'slam', 'ring'], look: FB('#c46bff') },
  { id: 'coldb', name: 'Rey Cold', hp: 6000, speed: 1.2, r: 22, dmg: 22, scale: 1.4, every: 2.4, patterns: ['aimed', 'slam', 'aimed', 'ring'], look: FB('#e8e0f0') },
  { id: 'mechafz', name: 'Mecha Freezer', hp: 7000, speed: 1.7, r: 18, dmg: 22, scale: 1.4, every: 2.1, patterns: ['aimed', 'dash', 'ring', 'aimed'], look: FB('#c8c8d8') },
  { id: 'coolerb', name: 'Cooler', hp: 11000, speed: 1.8, r: 20, dmg: 24, scale: 1.4, every: 2.0, patterns: ['aimed', 'ring', 'dash', 'slam', 'aimed'], look: FB('#c46bff') },
  { id: 'goldenfz', name: 'Golden Freezer', hp: 15000, speed: 1.9, r: 18, dmg: 26, scale: 1.45, every: 1.8, patterns: ['aimed', 'dash', 'ring', 'aimed', 'slam'], look: FB('#ffd93b') },
  { id: 'brolyb', name: 'Broly', hp: 17000, speed: 1.4, r: 24, dmg: 28, scale: 1.45, every: 1.9, patterns: ['slam', 'dash', 'ring', 'slam', 'aimed'], look: FB('#9dff5c') },
  { id: 'bills', name: 'Bills', hp: 28000, speed: 1.9, r: 20, dmg: 30, scale: 1.45, every: 1.7, patterns: ['ring', 'aimed', 'dash', 'ring', 'slam', 'aimed'], look: FB('#a88cd8') },
);

// Como hace data.js con los originales: cada look lleva el id de su hoja de sprites
for (const id in ENEMIES) ENEMIES[id].look.id = id;
for (const b of BOSSES) b.look.id = b.id;

for (const [id, [w, h]] of Object.entries(FUSION_SHEETS2)) {
  SPRITE_OVERRIDES[id] = {
    src: `assets/sprites/fusion/${id}.png`, frameW: w, frameH: h, footY: h, fps: 10,
    scale: 1.25 * Math.min(1, 44 / h),
    anims: { idle: { row: 0, col: 0, count: 1 }, walk: { row: 0, col: 1, count: 4 }, cast: { row: 0, col: 5, count: 2 } },
    dirs: DIRS_PLAIN,
  };
}

// Saga de Majin Buu: Babidi y Super Buu, como en la serie (antes y después de Buu gordo).
// Se suman a lo que ya tenía el Nivel 4; no se quita ni se mueve nada.
{
  const L4 = LEVELS.find(L => L.id === 'buu');
  L4.bosses.push({ id: 'babidib', at: 180, hp: 4500 }, { id: 'superbuu', at: 510, hp: 16000 });
  L4.bosses.sort((a, b) => a.at - b.at);
}

// Niveles nuevos (después del Nivel 5): se abren al ganar el Nivel 4 y luego el 6.
// openAfter lo lee isLevelOpen (game.js); el Nivel 5 sigue igual.
LEVELS.push(
  { id: 'otromundo', num: 6, openAfter: 'buu', desc: 'El Otro Mundo: Janemba rompe la barrera del Infierno.', theme: 'infierno',
    hp: 2.1, dmg: 1.35, zeni: 2.2,
    spawns: [{ id: 'skeleton', from: 0, weight: 10 }, { id: 'phantom', from: 0, weight: 7 },
      { id: 'vampire', from: 90, weight: 6 }, { id: 'mummy', from: 180, weight: 5 }],
    swarm: 'skeleton', swarmText: '¡Los muertos del Infierno os rodean!',
    bosses: [{ id: 'yakon', at: 120, hp: 5000 }, { id: 'taob', at: 240, hp: 6000 }, { id: 'pikkon', at: 390, hp: 10000 },
      { id: 'janemba', at: 600, hp: 22000, final: true }] },
  { id: 'leyendas', num: 7, openAfter: 'otromundo', desc: 'Los villanos de las películas vuelven por venganza.', theme: 'yermo',
    hp: 2.3, dmg: 1.4, zeni: 2.5,
    spawns: [{ id: 'bandit', from: 0, weight: 10 }, { id: 'ninja', from: 0, weight: 8 }, { id: 'ptero', from: 60, weight: 5 },
      { id: 'gunman', from: 120, weight: 5 }, { id: 'samurai', from: 180, weight: 6 }, { id: 'bearthief', from: 240, weight: 4 },
      { id: 'trex', from: 360, weight: 2 }],
    swarm: 'ninja', swarmText: '¡Un clan de ninjas os rodea!',
    bosses: [{ id: 'coldb', at: 105, hp: 6000 }, { id: 'mechafz', at: 210, hp: 7000 }, { id: 'coolerb', at: 330, hp: 11000 },
      { id: 'goldenfz', at: 450, hp: 15000 }, { id: 'brolyb', at: 510, hp: 17000 }, { id: 'bills', at: 600, hp: 28000, final: true }] },
);

// ─── Fase 3: técnicas propias que faltaban ───
Object.assign(ATTACKS, {
  gkame: {
    name: 'Final Kamehameha', color: '#7dd8ff', core: '#ffffff', type: 'beam', users: ['vegetto'],
    desc: 'El Kamehameha y el Final Flash juntos: un rayo enorme, largo y muy dañino.',
    stats: l => ({ cd: 3.6 - l * 0.22, dmg: 12 + l * 5, len: 260 + l * 32, width: 24 + l * 5, dur: 0.6 + l * 0.05 }),
  },
  barrera: {
    name: 'Barrera', color: '#8fe3ff', type: 'orbit', shield: true, users: ['a17p'],
    desc: 'Una barrera de energía gira a tu alrededor: golpea a quien se acerque y destruye los disparos enemigos.',
    stats: l => ({ count: 2 + l, dmg: 6 + l * 3, radius: 46 + l * 4, r: 8, spin: 3 + l * 0.2 }),
  },
});
CHARACTERS.vegetto.start = 'gkame';   // su técnica de la película (el Kamehameha lo sigue pudiendo aprender)
CHARACTERS.a17p.start = 'barrera';

// ─── Fase 4: gigantes de DB Survivors ───
Object.assign(ENEMIES, {
  // El Ozaru (un Saiyajin transformado en mono gigante) en la saga Saiyajin
  ozaru: { name: 'Ozaru', hp: 220, speed: 0.55, r: 22, dmg: 20, xp: 10, scale: 1, stomp: 70, look: FL('#7a4a2a', '#7a4a2a', '#7a4a2a') },
  // Los robots gigantes de Ciudad Satán
  annihil: { name: 'Robot aniquilador', hp: 200, speed: 0.6, r: 20, dmg: 19, xp: 9, scale: 0.95, stomp: 65, look: FL('#7fd0d0', '#8a8a9a', '#8a8a9a') },
  deathm: { name: 'Máquina de la muerte', hp: 200, speed: 0.6, r: 20, dmg: 19, xp: 9, scale: 0.95, stomp: 65, look: FL('#e8b030', '#c03030', '#c03030') },
});
for (const [id, w] of [['ozaru', 34], ['annihil', 66], ['deathm', 66]]) {
  ENEMIES[id].look.id = id;
  SPRITE_OVERRIDES[id] = {
    src: `assets/sprites/fusion/${id}.png`, frameW: w, frameH: 64, footY: 64, fps: 10, scale: 1.25 * 44 / 64,
    anims: { idle: { row: 0, col: 0, count: 1 }, walk: { row: 0, col: 1, count: 4 }, cast: { row: 0, col: 5, count: 2 } },
    dirs: DIRS_PLAIN,
  };
}
LEVELS.find(L => L.id === 'saiyan').spawns.push({ id: 'ozaru', from: 420, weight: 1 });   // se suma; lo demás queda igual
LEVELS.find(L => L.id === 'leyendas').spawns.push({ id: 'annihil', from: 300, weight: 1 }, { id: 'deathm', from: 300, weight: 1 });

// ─── Fase 4: mejora pasiva de DB Survivors que la base no tenía ───
// (La Aureola/vida extra no se agrega: la base ya tiene la Semilla de reserva con su aureola.)
PASSIVES.kiai = { name: 'Kiai', color: '#ffe0a0', desc: 'Tus golpes empujan más lejos a los enemigos (a los jefes casi no los mueven).' };

// ─── Tienda de Zeni: artículos nuevos (efectos en js/fusion-shop.js) ───
const FUSION_PSLOT_MAX = 3, SHENLONG_STAT = 0.05, SHENLONG_ENEMIES = 0.08;
SHOP_UPGRADES.push(
  { id: 'pslot', name: 'Casilla de mejora extra', icon: '⊞', color: '#ffb0f0', max: FUSION_PSLOT_MAX, base: 3000, grow: 2.5, per: 1,
    fmt: v => `+${v} casilla${v === 1 ? '' : 's'} de mejora pasiva (${MAX_PASSIVES + v} en total)` },
  { id: 'shenwish', name: 'Deseo de Shenlong', icon: '🐉', color: '#7dff9a', max: 6, base: 2500, grow: 1.6, per: SHENLONG_STAT,
    fmt: v => `+${Math.round(v * 100)}% a todo (salud, daño, velocidad, recarga de técnicas y del Ki, defensa, experiencia y recogida) y +${(v / SHENLONG_STAT * 0.1).toFixed(1)} de salud por segundo, pero salen un ${Math.round(v / SHENLONG_STAT * SHENLONG_ENEMIES * 100)}% más de enemigos` },
  { id: 'transtime', name: 'Dominio de la transformación', icon: '⚡', color: '#ffe14d', max: 8, base: 400, grow: 1.45, per: 0.08,
    fmt: v => `+${Math.round(v * 100)}% de duración de las transformaciones` },
);
// Casillas de mejoras pasivas de un guerrero: las de siempre más las compradas en la Tienda
function maxPassives(P) {
  const n = P && P.perks ? Math.min(FUSION_PSLOT_MAX, Math.floor(P.perks.pslot || 0)) : 0;
  return MAX_PASSIVES + n;
}

// ─── Multiplicación arreglada: también los rayos (un segundo rayo en abanico) ───
// La base solo sumaba un proyectil a técnicas que ya disparaban 2 o más (game.js, attackStats): ahora es desde 1.
PASSIVES.multi.desc = '+1 proyectil a tus técnicas que disparan, y un segundo rayo en abanico a tus rayos. Un solo nivel.';
function beamAngles(P, def, ang) {
  const base = def.both ? [ang, ang + Math.PI] : [ang];
  if (!(P && P.passives && P.passives.multi > 0)) return base;
  return base.flatMap(a => [a, a + 0.3]);
}

// ─── Fase 5: más jugables con los sprites que ya teníamos de DB Survivors ───
for (const [atk, ids] of Object.entries({ hellflash: ['gerop'], espada: ['daburap'], kamehameha: ['gohanc'] })) ATTACKS[atk].users.push(...ids);
const FUSION_CHARS2 = {
  a19p:    { name: 'Androide 19', title: 'El androide que absorbe energía', hp: 120, speed: 2.45, start: 'kiblast', transform: 'Absorción total',
             perk: 'Absorción de energía: recupera salud con el tiempo', regen: 0.5, cost: 2500, aura: '#ffb070' },
  gerop:   { name: 'Dr. Gero', title: 'El creador de los androides', hp: 100, speed: 2.5, start: 'hellflash', transform: 'Energía robada',
             perk: 'Genio científico: +30% de experiencia', xpBonus: 0.3, cost: 3000, aura: '#ffb070' },
  daburap: { name: 'Dabura', title: 'El Rey de los Demonios', hp: 135, speed: 2.5, start: 'espada', transform: 'Furia demoníaca',
             perk: 'Rey del Inframundo: +20% de daño', dmgBonus: 0.2, cost: 4000, aura: '#ff4d4d' },
  puipuip: { name: 'Pui Pui', title: 'El guerrero del planeta Zoon', hp: 105, speed: 2.75, start: 'kiblast', transform: 'Poder de Babidi',
             perk: 'Veterano de mil planetas: 1 de cada 8 golpes no le hace daño', dodge: 0.12, cost: 1800, aura: '#c46bff' },
  gohanc:  { name: 'Gohan joven', title: 'El niño que superó a Cell', hp: 95, speed: 2.75, start: 'kamehameha', transform: 'Super Saiyajin',
             perk: 'Poder oculto: la transformación es un 40% más poderosa', transformBonus: 0.4, cost: 3500, ssj: true, aura: '#ffe14d' },
};
for (const [id, d] of Object.entries(FUSION_CHARS2)) {
  const { cost, ssj, ...c } = d;
  c.look = { ...CHARACTERS.goku.look, id, ssjHair: null };
  c.ssjHair = null;
  if (ssj) c.transformSprite = true;
  c.unlock = { kind: 'zeni', cost, text: 'Cómpralo con Zeni' };
  c.fusion = true;
  CHARACTERS[id] = c;
}
const fusionSheet = (file, w, h, ko) => {
  const anims = { idle: { row: 0, col: 0, count: 1 }, walk: { row: 0, col: 1, count: 4 }, cast: { row: 0, col: 5, count: 2 } };
  if (ko) Object.assign(anims, { kohit: { row: 0, col: 7, count: 1 }, kolie: { row: 0, col: 8, count: 1 }, koup: { row: 0, col: 9, count: 1 } });
  return { src: `assets/sprites/fusion/${file}.png`, frameW: w, frameH: h, footY: h, fps: 10, scale: 1.25 * Math.min(1, 44 / h), anims, dirs: DIRS_PLAIN };
};
Object.assign(SPRITE_OVERRIDES, {
  a19p: fusionSheet('a19p', 32, 32), gerop: fusionSheet('gerop', 32, 32), daburap: fusionSheet('daburap', 64, 64),
  puipuip: fusionSheet('puipuip', 32, 45), gohanc: fusionSheet('gohanc', 32, 32, true), 'gohanc:ssj': fusionSheet('gohanc-ssj', 32, 32),
  // Freezer y Cell empiezan en su primera forma y suben con cada transformación (formas en js/fusion-forms.js)
  freezerp: fusionSheet('freezerp1', 32, 32, true), 'freezerp:ssj': fusionSheet('freezerp2', 34, 42),
  cellp: fusionSheet('cellp1', 54, 49, true), 'cellp:ssj': fusionSheet('cellp', 54, 54, true),
});
CHARACTERS.freezerp.transform = '2.ª forma';
CHARACTERS.freezerp.title = 'El emperador del universo, en todas sus formas';
CHARACTERS.cellp.transform = 'Cell Semi-perfecto';
CHARACTERS.cellp.title = 'De Imperfecto a la forma de vida perfecta';

// ─── Fase 6: jefes que ya tenían hoja completa, ahora también jugables ───
// Usan la misma hoja que su versión de jefe (los jefes no se tocan).
Object.assign(ATTACKS, {
  huracan: {
    name: 'Huracán de Paikuhan', color: '#bff5ff', type: 'nova', users: ['pikkonp'],
    desc: 'Giras a toda velocidad y levantas un torbellino que golpea y empuja a todos los que tienes cerca.',
    stats: l => ({ cd: 2.0 - l * 0.12, dmg: 14 + l * 7, radius: 70 + l * 9 }),
  },
  ilusion: {
    name: 'Illusion Smash', color: '#ff6ec7', type: 'rain', kind: 'ball', users: ['janembap'],
    desc: 'Janemba se divide en ilusiones: llueven golpes de energía sobre enemigos al azar.',
    stats: l => ({ cd: 2.8 - l * 0.18, dmg: 15 + l * 7, count: 4 + l, explode: 30 + l * 3, r: 6 }),
  },
  garras: {
    name: 'Garras de Yakon', color: '#f0e070', type: 'nova', punch: true, users: ['yakonp'],
    desc: 'Zarpazos rapidísimos contra todos los enemigos que tienes cerca.',
    stats: l => ({ cd: 1.1 - l * 0.06, dmg: 12 + l * 5, radius: 55 + l * 6 }),
  },
  eraser: {
    name: 'Recoome Eraser Gun', color: '#ffe36b', core: '#fffbe0', type: 'beam', users: ['recoomep'],
    desc: 'Un rayo enorme disparado por la boca contra el enemigo más cercano.',
    stats: l => ({ cd: 3.6 - l * 0.22, dmg: 12 + l * 5, len: 220 + l * 28, width: 22 + l * 5, dur: 0.55 + l * 0.05 }),
  },
  cometa: {
    name: 'Cometa Azul', color: '#7aa8ff', type: 'projectile', kind: 'ball', users: ['burterp'],
    desc: 'Disparos veloces que persiguen a los enemigos: el estilo del más rápido del universo.',
    stats: l => ({ cd: 0.9 - l * 0.06, dmg: 8 + l * 4, count: 1 + Math.floor(l / 2), speed: 9, r: 5, pierce: 0, life: 1.6,
      spread: 0.25, home: 3 }),
  },
  crusher: {
    name: 'Crusher Ball', color: '#ff5a5a', type: 'projectile', kind: 'big', users: ['jeicep'],
    desc: 'Una bola de energía roja que estalla al tocar al enemigo.',
    stats: l => ({ cd: 2.4 - l * 0.14, dmg: 24 + l * 10, count: 1 + (l >= 4 ? 1 : 0), speed: 6, r: 8, pierce: 0, life: 1.6,
      spread: 0.3, explode: 48 + l * 7 }),
  },
});
const FUSION_CHARS3 = {
  pikkonp:  { name: 'Paikuhan', title: 'El campeón del Otro Mundo', hp: 120, speed: 2.7, start: 'huracan', transform: 'Sin pesas',
              perk: 'Entrenamiento del Gran Kaio: +20% de daño a los jefes', bossBonus: 0.2, cost: 3500, aura: '#bff5ff' },
  janembap: { name: 'Janemba', title: 'El demonio del Otro Mundo', hp: 140, speed: 2.55, start: 'ilusion', transform: 'Maldad pura',
              perk: 'Distorsión de la realidad: +20% de daño', dmgBonus: 0.2, cost: 5000, aura: '#c46bff' },
  yakonp:   { name: 'Yakon', title: 'El devorador de luz', hp: 130, speed: 2.5, start: 'garras', transform: 'Luz devorada',
              perk: 'Come energía: recupera salud con el tiempo', regen: 0.4, cost: 2500, aura: '#f0e070' },
  recoomep: { name: 'Recoome', title: 'El gigante de las Fuerzas Especiales', hp: 155, speed: 2.35, start: 'eraser', transform: 'Pose especial',
              perk: 'Cuerpo de hierro: 1 de cada 6 golpes no le hace daño', dodge: 0.17, cost: 2200, aura: '#ff8a5c' },
  burterp:  { name: 'Burter', title: 'El más rápido del universo', hp: 95, speed: 3.0, start: 'cometa', transform: 'Pose especial',
              perk: 'Velocidad cósmica: +15% de velocidad de recarga', cdBonus: 0.15, cost: 2200, aura: '#7aa8ff' },
  jeicep:   { name: 'Jeice', title: 'El guerrero rojo del Ginyu', hp: 100, speed: 2.7, start: 'crusher', transform: 'Pose especial',
              perk: 'Dúo con Burter: +20% de experiencia', xpBonus: 0.2, cost: 2200, aura: '#ff5a5a' },
};
for (const [id, d] of Object.entries(FUSION_CHARS3)) {
  const { cost, ...c } = d;
  c.look = { ...CHARACTERS.goku.look, id, ssjHair: null };
  c.ssjHair = null;
  c.unlock = { kind: 'zeni', cost, text: 'Cómpralo con Zeni' };
  c.fusion = true;
  CHARACTERS[id] = c;
}
Object.assign(SPRITE_OVERRIDES, {
  pikkonp: SPRITE_OVERRIDES.pikkon, janembap: SPRITE_OVERRIDES.janemba, yakonp: SPRITE_OVERRIDES.yakon,
  recoomep: SPRITE_OVERRIDES.recoome, burterp: SPRITE_OVERRIDES.burter, jeicep: SPRITE_OVERRIDES.jeice,
});
CHARACTERS.majinbuu.title = 'De Buu bueno a Super Buu, en todas sus formas';

// Recarga global (js/fusion-shop.js): la recarga también acelera el Ki para transformarte
PASSIVES.focus.desc = '-8% de tiempo de recarga de técnicas y del Ki para transformarte.';
SHOP_UPGRADES.find(u => u.id === 'cd').fmt = v => `-${Math.round(v * 100)}% de recarga (técnicas y Ki para transformarte)`;
