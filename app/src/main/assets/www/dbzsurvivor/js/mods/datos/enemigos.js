'use strict';
// ─── Mod: enemigos, jefes y niveles nuevos (Otro Mundo, Leyendas, gigantes, saga de Buu) ───
// Se carga después de tecnicas.js. Va ANTES que guerreros.js: los jugables de la fase 6 reusan
// las hojas de sprites de estos jefes (SPRITE_OVERRIDES.pikkon, janemba, yakon).

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
      { id: 'janemba', at: 600, hp: 19000, final: true }] },   // (2.36.7: se cura un 20% a la mitad)
  { id: 'leyendas', num: 7, openAfter: 'otromundo', desc: 'Los villanos de las películas vuelven por venganza.', theme: 'yermo',
    hp: 2.3, dmg: 1.4, zeni: 2.5,
    spawns: [{ id: 'bandit', from: 0, weight: 10 }, { id: 'ninja', from: 0, weight: 8 }, { id: 'ptero', from: 60, weight: 5 },
      { id: 'gunman', from: 120, weight: 5 }, { id: 'samurai', from: 180, weight: 6 }, { id: 'bearthief', from: 240, weight: 4 },
      { id: 'trex', from: 360, weight: 2 }],
    swarm: 'ninja', swarmText: '¡Un clan de ninjas os rodea!',
    bosses: [{ id: 'coldb', at: 105, hp: 6000 }, { id: 'mechafz', at: 210, hp: 7000 }, { id: 'coolerb', at: 330, hp: 11000 },
      { id: 'goldenfz', at: 450, hp: 15000 }, { id: 'brolyb', at: 510, hp: 17000 }, { id: 'bills', at: 600, hp: 28000, final: true }] },
);

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

// ─── Tanda Harukanaru (hojas de Harukanaru Goku Densetsu, ripeadas por Metal-Franky) ───
// Namek: Appule y los mercenarios de Freezer. Otro Mundo: Gozu y Mezu, los guardianes del Infierno.
Object.assign(ENEMIES, {
  appulee: { name: 'Appule', hp: 70, speed: 1.15, r: 12, dmg: 11, xp: 4, scale: 1, shooter: true, shootChance: 0.6, look: FL('#c46bff', '#2a2a33', '#2a2a33') },
  suie: { name: 'Mercenario de Freezer', hp: 55, speed: 1.0, r: 12, dmg: 10, xp: 3, scale: 1, lunge: true, look: FL('#5a9adf', '#2a2a33', '#2a2a33') },
  gozue: { name: 'Gozu', hp: 110, speed: 0.95, r: 14, dmg: 15, xp: 6, scale: 1.1, look: FL('#4fd8c8', '#ffffff', '#ffffff') },
  mezue: { name: 'Mezu', hp: 110, speed: 1.05, r: 14, dmg: 14, xp: 6, scale: 1.1, lunge: true, look: FL('#e84a30', '#ffffff', '#ffffff') },
});
for (const [id, w, h] of [['appulee', 33, 45], ['suie', 33, 42], ['gozue', 34, 45], ['mezue', 34, 43]]) {
  ENEMIES[id].look.id = id;
  SPRITE_OVERRIDES[id] = { src: `assets/sprites/fusion/${id}.png`, frameW: w, frameH: h, footY: h, fps: 10, scale: 1.25 * Math.min(1, 44 / h),
    anims: { idle: { row: 0, col: 0, count: 1 }, walk: { row: 0, col: 1, count: 4 }, cast: { row: 0, col: 5, count: 2 } }, dirs: DIRS_PLAIN };
}
LEVELS.find(L => L.id === 'namek').spawns.push({ id: 'suie', from: 90, weight: 4 }, { id: 'appulee', from: 200, weight: 3 });
LEVELS.find(L => L.id === 'otromundo').spawns.push({ id: 'gozue', from: 150, weight: 3 }, { id: 'mezue', from: 150, weight: 3 });
// Mecha Freezer con su hoja de Harukanaru (la reconstrucción cibernética, antes era la de DB Survivors)
SPRITE_OVERRIDES.mechafz = { ...SPRITE_OVERRIDES.mechafz, src: 'assets/sprites/fusion/mechafz.png', frameW: 27, frameH: 37, footY: 37, scale: 1.25 * Math.min(1, 44 / 37) };

// ─── Soldados Majin de Buu's Fury (tools/hojas/majin_soldier.py): 3 variantes, normal, élite y súper ───
// Los invoca Babidi (js/mods/identidad.js) y aparecen en la saga de Buu.
ENEMIES.msoldado = { name: 'Soldado Majin', hp: 80, speed: 0.95, r: 14, dmg: 12, xp: 5, scale: 1.1,
  look: { style: 'bald', skin: '#e8b88a', top: '#3a3a3a', pants: '#3030b2', belt: '#222', boots: '#222', majin: true, id: 'msoldado' } };
SPRITE_OVERRIDES.msoldado = { src: 'assets/sprites/fusion/majinsoldado.png', frameW: 32, frameH: 32, footY: 32, fps: 10, scale: 1.25,
  anims: { idle: { row: 0, col: 0, count: 1 }, walk: { row: 0, col: 1, count: 4 }, cast: { row: 0, col: 5, count: 2 } },
  dirs: DIRS_PLAIN, variants: 3, variantRows: 3 };
LEVELS.find(L => L.id === 'buu').spawns.push({ id: 'msoldado', from: 60, weight: 5 });

// ─── Nivel 8 · Torneo del Poder (js/mods/poder.js): el ring se encoge y fuera de él te consume el vacío ───
// Jiren y Toppo: hojas armadas con tools/hojas/u11.py del paquete "Dragon Ball Sagas" (sprites de Exigeek y Keegixe /
// thekrillmaster, estilo Legendary Super Warriors).
for (const [id, w, h] of [['jiren', 36, 41], ['toppo', 69, 53]]) {
  SPRITE_OVERRIDES[id] = { src: `assets/sprites/fusion/${id}.png`, frameW: w, frameH: h, footY: h, fps: 8, scale: 1.25 * Math.min(1, 44 / h),
    anims: { idle: { row: 0, col: 0, count: 1 }, walk: { row: 0, col: 1, count: 4 }, cast: { row: 0, col: 5, count: 2 } }, dirs: DIRS_PLAIN };
}
BOSSES.push(
  { id: 'toppo', name: 'Toppo', hp: 16000, speed: 1.3, r: 24, dmg: 28, scale: 1.4, every: 1.9, patterns: ['slam', 'aimed', 'dash', 'ring'], look: { ...FB('#c03030'), id: 'toppo' } },
  // Hit: su Salto en el tiempo está en js/mods/hit.js (la hoja, hitp, se arma en guerreros.js)
  { id: 'hit', name: 'Hit', hp: 22000, speed: 1.75, r: 18, dmg: 30, scale: 1.3, every: 1.7, patterns: ['dash', 'aimed', 'dash', 'slam'], look: { ...FB('#b46bff'), id: 'hitp' } },
  { id: 'jiren', name: 'Jiren', hp: 34000, speed: 1.8, r: 20, dmg: 32, scale: 1.45, every: 1.5, patterns: ['aimed', 'dash', 'ring', 'slam', 'aimed', 'ring'], look: { ...FB('#c0c0c8'), id: 'jiren' } },
);
LEVELS.push({ id: 'poder', num: 8, openAfter: 'leyendas', theme: 'poder',
  desc: 'El Torneo del Poder: el ring se encoge cada vez más y salir de él es quedar eliminado. Al final te espera Jiren.',
  hp: 2.6, dmg: 1.5, zeni: 3,
  spawns: [{ id: 'soldier', from: 0, weight: 10 }, { id: 'ninja', from: 0, weight: 6 }, { id: 'samurai', from: 60, weight: 6 },
    { id: 'msoldado', from: 90, weight: 6 }, { id: 'gunman', from: 120, weight: 5 }, { id: 'vampire', from: 180, weight: 4 }, { id: 'trex', from: 360, weight: 2 }],
  swarm: 'soldier', swarmText: '¡Las Tropas del Orgullo te rodean!',
  bosses: [{ id: 'toppo', at: 240, hp: 16000 }, { id: 'hit', at: 420, hp: 22000 }, { id: 'jiren', at: 600, hp: 34000, final: true }] });
