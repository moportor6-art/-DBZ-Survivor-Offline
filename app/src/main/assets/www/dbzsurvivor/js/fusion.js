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
