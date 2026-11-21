'use strict';
// ─── Mod: guerreros jugables nuevos, sus hojas de sprites y su regeneración por raza ───
// Se carga después de enemigos.js. Lo que la base ya tenía no se duplica.
// Para agregar un guerrero: su técnica en tecnicas.js, su ficha aquí (FUSION_CHARS…) y su hoja con fusionSheet().

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

CHARACTERS.vegetto.start = 'gkame';   // su técnica de la película (el Kamehameha lo sigue pudiendo aprender)
CHARACTERS.a17p.start = 'barrera';

// ─── Fase 5: más jugables con los sprites que ya teníamos de DB Survivors ───

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
  // Freezer y Cell empiezan en su primera forma y suben con cada transformación (formas en js/mods/formas.js)
  freezerp: fusionSheet('freezerp1', 32, 32, true), 'freezerp:ssj': fusionSheet('freezerp2', 34, 42),
  cellp: fusionSheet('cellp1', 54, 49, true), 'cellp:ssj': fusionSheet('cellp', 54, 54, true),
});
CHARACTERS.freezerp.transform = '2.ª forma';
CHARACTERS.freezerp.title = 'El emperador del universo, en todas sus formas';
CHARACTERS.cellp.transform = 'Cell Semi-perfecto';
CHARACTERS.cellp.title = 'De Imperfecto a la forma de vida perfecta';

// ─── Fase 6: jefes que ya tenían hoja completa, ahora también jugables ───
// Usan la misma hoja que su versión de jefe (los jefes no se tocan).

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

// ─── Fase 7: guerreros de las hojas GBA de Legacy of Goku II y Buu's Fury ───
// (hojas convertidas al formato del juego: assets/sprites/fusion/<id>.png)

const FUSION_CHARS4 = {
  spopovichp: { name: 'Spopovich', title: 'El luchador controlado por Babidi', hp: 165, speed: 2.3, start: 'embestida', transform: 'Poder de Babidi',
                perk: 'Cuerpo de Majin: recupera salud con el tiempo', regen: 0.5, cost: 2000, aura: '#c46bff' },
  yamup:      { name: 'Yamu', title: 'El ladrón de energía de Babidi', hp: 110, speed: 2.6, start: 'extractor', transform: 'Poder de Babidi',
                perk: 'Energía robada: el Ki se carga un 40% más rápido', kiBonus: 0.4, cost: 2000, aura: '#c46bff' },
  a13p:       { name: 'Androide 13 Super', title: 'El androide que absorbió a sus compañeros', hp: 145, speed: 2.5, start: 'deadlybomber', transform: 'Energía infinita',
                perk: 'Tres androides en uno: +20% de daño', dmgBonus: 0.2, cost: 4000, aura: '#ff4d4d' },
  bulmap:     { name: 'Bulma', title: 'La genio de Capsule Corp', hp: 75, speed: 2.75, start: 'pistolaray', transform: 'Inventos al máximo',
                perk: 'Fortuna de Capsule Corp: +50% de Zeni y +20% de experiencia', zeniBonus: 0.5, xpBonus: 0.2, cost: 1500, aura: '#7dffea' },
  dendep:     { name: 'Dende', title: 'El Dios de la Tierra', hp: 85, speed: 2.7, start: 'ondanamek', transform: 'Poder sanador',
                perk: 'Curación namekiana: recupera mucha salud con el tiempo', regen: 1.0, cost: 2000, aura: '#9dff8a' },
  popop:      { name: 'Mr. Popo', title: 'El guardián del Templo Sagrado', hp: 120, speed: 2.6, start: 'alfombra', transform: 'Poder milenario',
                perk: 'Maestro de entrenamiento: +30% de experiencia', xpBonus: 0.3, cost: 1800, aura: '#ffffff' },
};
for (const [id, d] of Object.entries(FUSION_CHARS4)) {
  const { cost, ...c } = d;
  c.look = { ...CHARACTERS.goku.look, id, ssjHair: null };
  c.ssjHair = null;
  c.unlock = { kind: 'zeni', cost, text: 'Cómpralo con Zeni' };
  c.fusion = true;
  CHARACTERS[id] = c;
}
Object.assign(SPRITE_OVERRIDES, {
  spopovichp: fusionSheet('spopovichp', 68, 66, true), yamup: fusionSheet('yamup', 72, 64, true), a13p: fusionSheet('a13p', 68, 67),
  bulmap: fusionSheet('bulmap', 32, 32), dendep: fusionSheet('dendep', 32, 32), popop: fusionSheet('popop', 32, 32),
});
SPRITE_OVERRIDES.yamup.scale = 0.72;   // Yamu es de tamaño humano: que no se vea tan grande como Spopovich

// ─── Identidad de los regeneradores ───
// Antes era una cantidad fija (0,4-1 de salud por segundo), casi nada frente al daño de los enemigos.
// Ahora cada raza se cura con un % de su salud máxima (sube con su vida) y algunos se rehacen más
// rápido cuando están malheridos. regenLow: multiplicador con menos del 35% de salud.
// game.js lo lee con charRegen(P) (salud por segundo); la Meditación de la tienda y la mejora
// Regeneración namekiana se siguen sumando aparte, igual que antes.
const REGEN_IDENTITY = {
  // Namekianos: se regeneran de verdad, y aún más rápido cuando están graves (Piccolo se rehace el brazo)
  piccolo:    { pct: 0.012, low: 2,   perk: 'Regeneración namekiana: recupera un 1,2% de su salud por segundo, el doble con poca vida' },
  dendep:     { pct: 0.015, low: 2,   perk: 'Curación namekiana: recupera un 1,5% de su salud por segundo, el doble con poca vida' },
  // Majin: el cuerpo de goma se rehace solo, sobre todo cuando lo destrozan
  majinbuu:   { pct: 0.018, low: 2.5, perk: 'Cuerpo de goma: recupera un 1,8% de su salud por segundo, y 2,5 veces más con poca vida' },
  kidbuup:    { pct: 0.016, low: 2.5, perk: 'Regeneración de Majin: recupera un 1,6% de su salud por segundo, y 2,5 veces más con poca vida' },
  spopovichp: { pct: 0.008, low: 2,   perk: 'Cuerpo de Majin: recupera un 0,8% de su salud por segundo, el doble con poca vida' },
  // Cell: hereda la regeneración de Piccolo
  cellp:      { pct: 0.01,  low: 2,   perk: 'Células de Piccolo: recupera un 1% de su salud por segundo, el doble con poca vida' },
  // Zamasu: inmortal, se cura siempre al mismo ritmo pase lo que pase
  zamasu:     { pct: 0.015, low: 1,   perk: 'Inmortal: recupera un 1,5% de su salud por segundo, siempre' },
  // Absorben energía: curación más modesta
  a19p:       { pct: 0.007, low: 1.5, perk: 'Absorción de energía: recupera un 0,7% de su salud por segundo (un 50% más con poca vida)' },
  yakonp:     { pct: 0.007, low: 1.5, perk: 'Come energía: recupera un 0,7% de su salud por segundo (un 50% más con poca vida)' },
};
for (const [id, r] of Object.entries(REGEN_IDENTITY)) {
  const c = CHARACTERS[id];
  if (!c) continue;
  Object.assign(c, { regenPct: r.pct, regenLow: r.low, perk: r.perk });
  delete c.regen;   // se reemplaza por el % (no se suman los dos)
}
// Salud por segundo que recupera el guerrero por su raza (los que no tienen, la de siempre: c.regen o nada)
function charRegen(P) {
  const c = P.c;
  if (!c.regenPct) return c.regen || 0;
  return c.regenPct * P.maxHp * (P.hp < P.maxHp * 0.35 ? (c.regenLow || 1) : 1);
}

// ─── Identidad (js/mods/identidad.js): los que empezaban con una técnica común ahora empiezan con una suya ───
for (const [id, atk] of Object.entries({ olibu: 'rugido', ginyup: 'milkycannon', taop: 'dodonray', a19p: 'rayosojos', puipuip: 'disparozoon', nappap: 'breakcannon' })) {
  if (CHARACTERS[id] && ATTACKS[atk]) CHARACTERS[id].start = atk;
}
