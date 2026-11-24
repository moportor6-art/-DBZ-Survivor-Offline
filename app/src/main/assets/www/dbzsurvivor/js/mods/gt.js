'use strict';
// ─── Dragon Ball GT: guerreros, jefes y la historia (Saga de Baby, Super 17 y los Dragones Oscuros) ─────────────
// Hojas armadas con tools/swl/gt (armar.py, specs.py y soldados.py) desde las originales de tools/swl/gt/hojas:
//   Goku niño, Goku SSJ4, Vegeta SSJ y Super Baby Vegeta: Dragon Ball GT: Transformation (GBA), ripeadas por Darkbolt99
//   General Rildo: ripeado por Nemu · Super 17: Vairen Morningstar · Syn y Omega Shenron: AlquimistaSK (ULSW)
//   Nova, Eis y Haze Shenron: «Mr. Satan» (Rage, Oceanus y Naturon son recoloreados suyos: no tienen hoja)
//   Pan, Uub (ULSW) y Majuub (Mr.Drk, ULSW)
//   Gogeta SSJ4: YoshidaMitooBR (SWL+) · Gogeta Xeno SSJ4: Black Vinas (ULSW) · Baby Ozaru dorado: el Ozaru del juego, dorado
// Las hojas de juego de pelea solo traen el perfil (miran a la derecha y el juego las voltea).
// Va antes que capitulos.js: deja los capítulos en window.GT_CAPS y capitulos.js los pone antes de «La batalla final».
(() => {
  // [ancho, alto del cuadro, alto del cuerpo de pie, { animación: [columna, cuadros] }] (de gt.json)
  const INFO = {
    'babyv': [74, 95, 90, { cast: [8, 2], idle: [0, 4], walk: [4, 4] }],
    'eisshen': [60, 42, 38, { cast: [4, 2], idle: [0, 2], walk: [2, 2] }],
    'gogetagt': [65, 59, 57, { cast: [6, 2], idle: [0, 4], kohit: [11, 1], kolie: [12, 1], koup: [13, 1], punch: [8, 3], walk: [4, 2] }],
    'gogetaxeno': [77, 60, 58, { cast: [6, 2], idle: [0, 4], punch: [8, 3], walk: [4, 2] }],
    'gokugt': [54, 51, 40, { cast: [8, 2], idle: [0, 4], kohit: [13, 1], kolie: [14, 1], koup: [15, 1], punch: [10, 3], walk: [4, 4] }],
    'gokugt-ssj': [105, 88, 81, { cast: [8, 2], idle: [0, 4], kohit: [12, 1], kolie: [13, 1], koup: [14, 1], punch: [10, 2], walk: [4, 4] }],
    'hazeshen': [42, 48, 42, { cast: [4, 2], idle: [0, 2], walk: [2, 2] }],
    'naturshen': [60, 42, 38, { cast: [4, 2], idle: [0, 2], walk: [2, 2] }],
    'novashen': [60, 42, 38, { cast: [4, 2], idle: [0, 2], walk: [2, 2] }],
    'oceanshen': [60, 42, 38, { cast: [4, 2], idle: [0, 2], walk: [2, 2] }],
    'omegashen': [62, 70, 68, { cast: [5, 2], idle: [0, 3], walk: [3, 2] }],
    'pangt': [49, 42, 40, { cast: [5, 2], idle: [0, 3], kohit: [10, 1], kolie: [11, 1], koup: [12, 1], punch: [7, 3], walk: [3, 2] }],
    'rageshen': [42, 48, 42, { cast: [4, 2], idle: [0, 2], walk: [2, 2] }],
    'rildo': [219, 99, 96, { cast: [7, 2], idle: [0, 3], walk: [3, 4] }],
    'super17': [43, 47, 42, { cast: [7, 2], idle: [0, 3], walk: [3, 4] }],
    'synshen': [61, 68, 65, { cast: [4, 2], idle: [0, 2], walk: [2, 2] }],
    'uubgt': [51, 48, 46, { cast: [4, 2], idle: [0, 2], kohit: [9, 1], kolie: [10, 1], koup: [11, 1], punch: [6, 3], walk: [2, 2] }],
    'uubgt-ssj': [51, 56, 50, { cast: [4, 2], idle: [0, 2], kohit: [9, 1], kolie: [10, 1], koup: [11, 1], punch: [6, 3], walk: [2, 2] }],
    'vegetagt': [78, 78, 72, { cast: [7, 2], idle: [0, 3], kohit: [11, 1], kolie: [12, 1], koup: [13, 1], punch: [9, 2], walk: [3, 4] }],
  };
  const hoja = (file, cuerpo) => {   // cuerpo: alto en el juego (los de GBA y los SWL quedan parejos)
    const [w, h, alto, an] = INFO[file];
    const anims = {};
    for (const [k, [col, count]] of Object.entries(an)) anims[k] = { row: 0, col, count };
    return { src: `assets/sprites/fusion/gt/${file}.png`, frameW: w, frameH: h, footY: h - 1, fps: 8, scale: cuerpo / alto, anims };
  };

  // ─── Técnicas nuevas ───
  Object.assign(ATTACKS, {
    kamex10: { name: 'Kamehameha x10', color: '#ff7a5c', core: '#fff1ea', type: 'beam', users: ['gokugt'],
      desc: 'El Kamehameha del Super Saiyajin 4: un rayo rojo y azul enorme que lo atraviesa todo.',
      stats: l => ({ cd: 3.6 - l * 0.22, dmg: 11 + l * 5, len: 300 + l * 40, width: 24 + l * 5, dur: 0.7 + l * 0.06 }) },
    bigbangkame: { name: 'Big Bang Kamehameha', color: '#6fd8ff', core: '#ffffff', type: 'beam', users: ['gogetagt'],
      desc: 'Gogeta junta el Big Bang de Vegeta y el Kamehameha de Goku: el rayo más ancho de todos.',
      stats: l => ({ cd: 3.8 - l * 0.25, dmg: 13 + l * 6, len: 320 + l * 45, width: 30 + l * 6, dur: 0.8 + l * 0.07 }) },
    ryuken: { name: 'Puño del Dragón', color: '#ffcf3d', type: 'projectile', kind: 'big', users: ['gogetaxeno', 'gokugt'],
      desc: 'Un dragón dorado sale del puño y atraviesa a todos los enemigos de la línea.',
      stats: l => ({ cd: 4 - l * 0.25, dmg: 45 + l * 20, count: 1, speed: 6, r: 14 + l * 2, pierce: 99, life: 1.6, spread: 0, explode: 0 }) },
    rayodulce: { name: 'Rayo dulce', color: '#ff8ad8', core: '#ffe6f6', type: 'beam', users: ['uubgt'],
      desc: 'El rayo de Majin Buu en manos de Uub: atraviesa la fila de enemigos con energía rosada.',
      stats: l => ({ cd: 3.2 - l * 0.2, dmg: 9 + l * 4, len: 260 + l * 35, width: 18 + l * 4, dur: 0.6 + l * 0.05 }) },
  });
  const usa = (tec, ...ids) => { if (ATTACKS[tec]) ATTACKS[tec].users = [...(ATTACKS[tec].users || []), ...ids]; };
  usa('kamehameha', 'gokugt'); usa('galick', 'vegetagt'); usa('bigbangatk', 'vegetagt', 'gogetagt', 'gogetaxeno');
  usa('finalflash', 'vegetagt'); usa('masenko', 'pangt'); usa('kamehameha', 'uubgt'); usa('soulpunisher', 'gogetagt', 'gogetaxeno'); usa('kiblast', 'gokugt', 'vegetagt', 'pangt', 'uubgt');

  // ─── Guerreros jugables ───
  // Los dos Gogeta: el de la serie (GT) y el de Dragon Ball Heroes (Xeno), con técnicas y números distintos
  const GT_CHARS = {
    gokugt: { name: 'Goku (GT)', title: 'El niño que volvió a ser Super Saiyajin 4', hp: 95, speed: 2.85, start: 'kamehameha',
      transform: 'Super Saiyajin 4', perk: 'Cola de Saiyajin: la transformación es un 40% más poderosa', transformBonus: 0.4,
      cost: 4000, aura: '#ff5a3c', sprite: ['gokugt', 40], ssj: ['gokugt-ssj', 54] },
    vegetagt: { name: 'Vegeta (GT)', title: 'El príncipe que se liberó de Baby', hp: 110, speed: 2.7, start: 'galick',
      transform: 'Super Saiyajin', perk: 'Orgullo Saiyajin: +20% de daño a los jefes', bossBonus: 0.2,
      cost: 3500, aura: '#ffe14d', sprite: ['vegetagt', 52], ssj: ['vegetagt', 52] },
    pangt: { name: 'Pan (GT)', title: 'La nieta de Goku que viajó por el espacio', hp: 90, speed: 2.95, start: 'masenko',
      transform: 'Potencial liberado', perk: 'Valiente: +15% de daño y el Ki se carga un 20% más rápido', dmgBonus: 0.15, kiBonus: 0.2,
      cost: 3000, aura: '#ffffff', sprite: ['pangt', 42] },
    uubgt: { name: 'Uub (GT)', title: 'La reencarnación de Kid Buu', hp: 115, speed: 2.75, start: 'rayodulce',
      transform: 'Majuub', perk: 'Fusión con Buu: la transformación es un 35% más poderosa y regenera salud', transformBonus: 0.35, regen: 0.3,
      cost: 4000, aura: '#ff8ad8', sprite: ['uubgt', 48], ssj: ['uubgt-ssj', 50] },
    gogetagt: { name: 'Gogeta SSJ4', title: 'La fusión que derrotó a Omega Shenron', hp: 140, speed: 2.75, start: 'bigbangkame',
      transform: 'Poder de la fusión', perk: 'Fusión de Super Saiyajin 4: +25% de daño', dmgBonus: 0.25,
      cost: 9000, aura: '#ff3c3c', sprite: ['gogetagt', 52] },
    gogetaxeno: { name: 'Gogeta Xeno SSJ4', title: 'El Gogeta de la Patrulla del Tiempo', hp: 120, speed: 2.95, start: 'ryuken',
      transform: 'Poder Xeno', perk: 'Patrulla del Tiempo: las técnicas se recargan un 20% más rápido', cdBonus: 0.2,
      cost: 9000, aura: '#ff6ab4', sprite: ['gogetaxeno', 52] },
  };
  for (const [id, d] of Object.entries(GT_CHARS)) {
    const { cost, sprite, ssj, ...c } = d;
    c.look = { ...CHARACTERS.goku.look, id, ssjHair: null };
    c.ssjHair = null;
    c.unlock = { kind: 'zeni', cost, text: 'Cómpralo con Zeni' };
    c.fusion = true;
    CHARACTERS[id] = c;
    SPRITE_OVERRIDES[id] = hoja(...sprite);
    if (ssj) { SPRITE_OVERRIDES[`${id}:ssj`] = hoja(...ssj); c.transformSprite = true; }
  }

  // ─── Enemigos comunes: los esbirros de los Dragones Oscuros (3 colores, 4 direcciones) ───
  ENEMIES.gtsoldado = { name: 'Esbirro oscuro', hp: 95, speed: 1.05, r: 12, dmg: 13, xp: 5, scale: 1, look: { ...FB('#d0a040'), id: 'gtsoldado' } };
  SPRITE_OVERRIDES.gtsoldado = { src: 'assets/sprites/fusion/gt/gtsoldado.png', frameW: 24, frameH: 32, footY: 32, fps: 10, scale: 1.3,
    anims: { idle: { row: 0, col: 0, count: 1 }, walk: { row: 0, col: 1, count: 4 }, cast: { row: 0, col: 5, count: 1 } },
    dirs: DIRS_PLAIN, variants: 3, variantRows: 3 };

  // ─── Jefes ───
  // (2.36.7: vidas ordenadas para que suban capítulo a capítulo: Rildo < Baby < Ozaru < Super 17 < los dragones < Syn < Omega)
  const J = (id, name, hp, speed, r, dmg, scale, every, patterns, file, cuerpo, color) => {
    SPRITE_OVERRIDES[id] = hoja(file, cuerpo);
    BOSSES.push({ id, name, hp, speed, r, dmg, scale, every, patterns, look: { ...FB(color), id } });
  };
  J('rildob', 'General Rildo', 9000, 1.2, 24, 22, 1.4, 2.2, ['aimed', 'slam', 'aimed', 'ring'], 'rildo', 52, '#c8d0e0');
  J('babyb', 'Super Baby Vegeta', 14000, 1.8, 18, 26, 1.4, 1.9, ['aimed', 'dash', 'ring', 'aimed'], 'babyv', 52, '#e8e8f0');
  J('super17b', 'Super 17', 20000, 1.7, 18, 28, 1.45, 1.8, ['aimed', 'dash', 'ring', 'slam'], 'super17', 46, '#3a5aa0');
  J('hazeb', 'Haze Shenron', 20000, 1.3, 20, 24, 1.6, 2.1, ['aimed', 'slam', 'ring'], 'hazeshen', 40, '#6a9a3a');
  J('rageb', 'Rage Shenron', 21000, 1.7, 18, 26, 1.5, 1.9, ['dash', 'aimed', 'ring'], 'rageshen', 40, '#c0302a');
  J('oceanb', 'Oceanus Shenron', 22000, 1.8, 18, 27, 1.5, 1.8, ['aimed', 'ring', 'dash'], 'oceanshen', 44, '#3ab09a');
  J('naturb', 'Naturon Shenron', 23000, 1.3, 22, 30, 1.6, 2.0, ['slam', 'aimed', 'ring'], 'naturshen', 44, '#7a5a30');
  J('eisb', 'Eis Shenron', 22000, 1.9, 18, 26, 1.5, 1.8, ['aimed', 'dash', 'ring'], 'eisshen', 44, '#5ab8d8');
  J('novab', 'Nova Shenron', 25000, 1.7, 18, 30, 1.55, 1.8, ['dash', 'aimed', 'ring', 'slam'], 'novashen', 44, '#e0a030');
  J('synb', 'Syn Shenron', 30000, 1.7, 20, 32, 1.45, 1.7, ['aimed', 'ring', 'dash', 'slam'], 'synshen', 50, '#e8e8e0');
  J('omegab', 'Omega Shenron', 40000, 1.8, 22, 36, 1.55, 1.5, ['aimed', 'ring', 'dash', 'slam', 'aimed'], 'omegashen', 50, '#f0f0e8');
  SPRITE_OVERRIDES.babyozaru = { src: 'assets/sprites/fusion/gt/babyozaru.png', frameW: 34, frameH: 64, footY: 64, fps: 10, scale: 1.25 * 44 / 64,
    anims: { idle: { row: 0, col: 0, count: 1 }, walk: { row: 0, col: 1, count: 4 }, cast: { row: 0, col: 5, count: 2 } }, dirs: DIRS_PLAIN };
  BOSSES.push({ id: 'babyozaru', name: 'Baby Ozaru dorado', hp: 24000, speed: 0.9, r: 30, dmg: 34, scale: 2.2, every: 2.0,
    patterns: ['slam', 'aimed', 'ring', 'slam'], look: { ...FB('#e8c040'), id: 'babyozaru' } });

  // Técnicas especiales de cada jefe (cada «every» segundos; usan las piezas del motor de jefes)
  const zonas = (n, r, dmg, extra = {}) => {
    const ps = G.players.filter(P => !P.dead && !P.gone && !P.hidden);
    for (let i = 0; i < n && ps.length; i++) {
      const P = ps[i % ps.length];
      G.hazards.push({ x: P.x + rand(-60, 60), y: P.y + rand(-50, 50), r, t: 1.5, dur: 1.5, dmg, ...extra });
    }
  };
  const dice = (e, t, c) => { addText(e.x, e.y - 40 * e.scale, t, c, true); sfx('power', 0.2); };
  const bola = (e, P, r, dmg, t = 2.4) => G.hazards.push({ x: P.x, y: P.y, r, t, dur: t, dmg, ball: { x: e.x, y: e.y - 30 * e.scale, r: Math.round(r / 4) } });
  Object.assign(BOSS_SPECIAL, {
    rildob: { every: 9, first: 5, color: '#c8d0e0', fn: (e, P, ang) => bossBeams(e, { windup: 1.1, dur: 0.5, color: '#c8d0e0', core: '#ffffff',
      dmg: e.dmg * 2, name: '¡Brazos de metal!', beams: [{ ang: ang - 0.22, len: 440, w: 30 }, { ang: ang + 0.22, len: 440, w: 30 }] }) },
    babyb: { every: 9, first: 5, color: '#6a2a8a', fn: (e, P) => { bola(e, P, 115, e.dmg * 2.6); dice(e, '¡Revenge Death Ball!', '#b46aff'); } },
    babyozaru: { every: 7, first: 4, color: '#ffd23d', fn: (e, P, ang) => bossBeams(e, { windup: 1.2, dur: 0.8, color: '#c46bff', core: '#f6e8ff',
      dmg: e.dmg * 2.4, name: '¡Rayo de la boca!', beams: [{ ang, len: 620, w: 56 }] }) },
    super17b: { every: 10, first: 5, color: '#ffe066', fn: e => {
      if ((e.spN = (e.spN || 0) + 1) % 2) { barrier(e); dice(e, '¡Absorbe la energía!', '#7fe6ff'); } else energyStream(e);
    } },
    hazeb: { every: 8, first: 4, color: '#8adf4a', fn: e => { zonas(4, 75, e.dmg * 1.5, { drain: e.nid }); dice(e, '¡Nube venenosa!', '#8adf4a'); } },
    rageb: { every: 7, first: 4, color: '#fff27a', fn: e => { zonas(5, 55, e.dmg * 2, {}); dice(e, '¡Descarga del trueno!', '#fff27a'); } },
    oceanb: { every: 8, first: 4, color: '#7ff0d8', fn: e => bossCharge(e, 0.6, '¡Tornado del océano!', '#7ff0d8', () => {
      for (let i = 0; i < 6; i++) homingShot(e, i * Math.PI / 3, 3.2, 10, 1, e.dmg * 1.3, 1.4, 4.5);
    }) },
    naturb: { every: 9, first: 5, color: '#c8a060', fn: e => { absorbEnergy(e); zonas(2, 90, e.dmg * 1.8); } },
    eisb: { every: 8, first: 4, color: '#bff4ff', fn: (e, P, ang) => bossBeams(e, { windup: 0.8, dur: 0.4, color: '#9fe8ff', core: '#ffffff',
      dmg: e.dmg * 1.9, name: '¡Rayo congelante!', beams: [{ ang, len: 560, w: 20 }] }) },
    novab: { every: 9, first: 5, color: '#ff8a2a', fn: e => bossCharge(e, 0.9, '¡Nova Star!', '#ff8a2a', () => {
      G.hazards.push({ x: e.x, y: e.y, r: 150, t: 0.6, dur: 0.6, dmg: e.dmg * 2.6 }); ring(e.x, e.y, 150, 0.6, '#ff8a2a');
    }) },
    synb: { every: 8, first: 4, color: '#ff6a6a', fn: (e, P, ang) => {
      if ((e.spN = (e.spN || 0) + 1) % 2) { zonas(4, 65, e.dmg * 2.2); dice(e, '¡Trueno del dragón!', '#ff6a6a'); }
      else bossBeams(e, { windup: 1.0, dur: 0.6, color: '#ff4d4d', core: '#ffe6e6', dmg: e.dmg * 2.2, name: '¡Rayo del dragón!', beams: [{ ang, len: 560, w: 34 }] });
    } },
    // Omega usa los poderes de sus hermanos, uno tras otro, y al final la Bola de energía negativa
    omegab: { every: 6, first: 4, color: '#ffffff', fn: (e, P, ang) => {
      const k = (e.spN = (e.spN || 0) + 1) % 4;
      if (k === 1) bossBeams(e, { windup: 0.8, dur: 0.4, color: '#9fe8ff', core: '#ffffff', dmg: e.dmg * 2, name: '¡Hielo de Eis!', beams: [{ ang: ang - 0.15, len: 560, w: 20 }, { ang: ang + 0.15, len: 560, w: 20 }] });
      else if (k === 2) { zonas(5, 60, e.dmg * 2.2); dice(e, '¡Trueno de Rage!', '#fff27a'); }
      else if (k === 3) { G.hazards.push({ x: e.x, y: e.y, r: 160, t: 0.8, dur: 0.8, dmg: e.dmg * 2.5 }); dice(e, '¡Fuego de Nova!', '#ff8a2a'); }
      else { zonas(4, 75, e.dmg * 1.6, { drain: e.nid }); dice(e, '¡Veneno de Haze!', '#8adf4a'); }
    } },
  });

  // Momentos de la serie (como js/mods/jefes.js): transformaciones a mitad de vida y la Bola de energía negativa
  const once = (e, k) => (e.gt[k] ? false : (e.gt[k] = true));
  const subir = (e, { name, spd = 1, dmg = 1, scale = 1, cura = 0, color = '#ffd93b', text }) => {
    if (name) e.def = { ...e.def, name };
    e.speed *= spd; e.dmg *= dmg; e.scale *= scale;
    if (cura) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * cura); burst(e.x, e.y, '#6aff8a', 22, 4, 3); }
    ring(e.x, e.y, 90 * e.scale, 0.6, color); burst(e.x, e.y, color, 40, 6, 4);
    G.shake = Math.max(G.shake, 0.5); sfx('power', 0.6);
    if (text) announce(text, color);
  };
  const MECH = {
    rildob(e) { if (e.hp < e.maxHp * 0.5 && once(e, 'meta')) subir(e, { name: 'Hyper Meta-Rildo', spd: 1.2, dmg: 1.3, cura: 0.1, color: '#c8d0e0', text: '¡Rildo se convierte en Hyper Meta-Rildo!' }); },
    babyb(e) { if (e.hp < e.maxHp * 0.4 && once(e, 'super')) subir(e, { name: 'Super Baby Vegeta 2', spd: 1.15, dmg: 1.3, cura: 0.1, color: '#b46aff', text: '¡Baby absorbe la energía de los terrícolas!' }); },
    super17b(e) { if (e.hp < e.maxHp * 0.5 && once(e, 'fusion')) subir(e, { dmg: 1.25, cura: 0.12, color: '#7fe6ff', text: '¡Super 17 absorbe toda la energía que le lanzaste!' }); },
    rageb(e) { if (e.hp < e.maxHp * 0.5 && once(e, 'super')) subir(e, { name: 'Super Rage Shenron', scale: 1.25, dmg: 1.3, spd: 0.9, color: '#fff27a', text: '¡Rage absorbe la electricidad de la ciudad y crece!' }); },
    naturb(e) { if (e.hp < e.maxHp * 0.5 && once(e, 'tierra')) subir(e, { scale: 1.15, dmg: 1.25, cura: 0.1, color: '#c8a060', text: '¡Naturon se funde con la tierra!' }); },
    novab(e) { if (e.hp < e.maxHp * 0.4 && once(e, 'super')) subir(e, { name: 'Super Nova Shenron', spd: 1.2, dmg: 1.3, color: '#ff8a2a', text: '¡Nova Shenron arde a su máximo poder!' }); },
    synb(e) { if (e.hp < e.maxHp * 0.4 && once(e, 'esferas')) subir(e, { dmg: 1.3, cura: 0.15, color: '#ff6a6a', text: '¡Syn Shenron se traga las Esferas del Dragón!' }); },
    omegab(e, dt) {
      if (e.hp < e.maxHp * 0.25 && once(e, 'negativa')) { e.gt.neg = 6; announce('¡Bola de energía negativa! Golpéalo antes de que caiga', '#ffffff'); }
      if (e.gt.neg > 0 && (e.gt.neg -= dt) <= 0) {
        const P = nearestPlayer(e.x, e.y);
        if (P) bola(e, P, 230, e.dmg * 3.5, 2.6);
        e.gt.neg = 14;
      }
    },
  };
  const up = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    const r = up.apply(this, arguments);
    if (!G || G.mode !== 'play') return r;
    for (const e of G.enemies) {
      if (!e.boss || e.dead || !MECH[e.id]) continue;
      e.gt = e.gt || {};
      try { MECH[e.id](e, dt); } catch (err) { /* una mecánica rota no frena la partida */ }
    }
    return r;
  };
  // En los capítulos de GT, 4 de cada 10 enemigos comunes son esbirros de los Dragones Oscuros
  const se = spawnEnemy;
  spawnEnemy = function (id, opts) {   // eslint-disable-line no-global-assign
    const C = G && G.historia && (window.CAPITULOS || []).find(c => c.id === G.historia);
    if (C && C.gt && id !== 'gtsoldado' && ENEMIES[id] && Math.random() < 0.4) return se.call(this, 'gtsoldado', opts);
    return se.apply(this, arguments);
  };

  // ─── Capítulos ───
  // b: jefes [id, segundo, final] · reto: rapido / vida / bajas (como en capitulos.js) · gt: aparecen los esbirros
  window.GT_CAPS = [
    { id: 'gtrildo', gt: true, saga: 'Dragon Ball GT · Saga de Baby', titulo: 'El planeta de las máquinas', char: 'gokugt', nivel: 'cell',
      b: [['rildob', 200, 1]], reto: { t: 'bajas', n: 300 },
      intro: [['yo', 'Por culpa de las Esferas de estrellas negras volví a ser un niño… ¡pero sigo siendo fuerte!'], ['rildob', 'Este planeta pertenece al Dr. Myuu. Ningún mono saldrá de aquí.']],
      final: [['rildob', 'Mi cuerpo es de metal vivo. No puedes romperlo.']],
      medio: [{ jefe: 'rildob', hp: 0.5, lines: [['rildob', '¡Contempla al Hyper Meta-Rildo!'], ['yo', '¿Cambias de forma? Yo también sé hacer eso.']] }],
      fin: [['yo', 'Rildo ya no molestará. Pero algo está creciendo dentro de las máquinas del Dr. Myuu…']] },
    { id: 'gtbaby', gt: true, saga: 'Dragon Ball GT · Saga de Baby', titulo: 'Vegeta poseído', char: 'uubgt', nivel: 'leyendas',
      b: [['babyb', 230, 1]], reto: { t: 'rapido', s: 120 },
      intro: [['babyb', 'Los Saiyajin destruyeron a los Tsufur. Ahora toda la Tierra me obedece… y el cuerpo de Vegeta también.'], ['yo', 'Goku me pidió que aguantara hasta que llegue. ¡Buu, préstame tu poder!']],
      final: [['babyb', 'Un terrícola con el poder de Majin Buu. Interesante… pero inútil.']],
      medio: [{ jefe: 'babyb', hp: 0.4, lines: [['babyb', 'La energía de los terrícolas es mía. ¡Super Baby 2!'], ['yo', 'No importa. Soy Majuub y no voy a retroceder.']] }],
      fin: [['babyb', 'Esto no termina aquí. La luna… necesito la luna.'], ['gokugt', 'Gracias, Uub. Ahora me toca a mí.']] },
    { id: 'gtozaru', gt: true, saga: 'Dragon Ball GT · Saga de Baby', titulo: 'El Ozaru dorado', char: 'gokugt', nivel: 'leyendas',
      b: [['babyb', 110], ['babyozaru', 280, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['vegetagt', 'Kakarotto… Baby usa mi cuerpo. Si se vuelve Ozaru dorado, nadie podrá con él.'], ['yo', 'Entonces tendré que despertar el poder de mi cola.']],
      final: [['babyozaru', '¡¡GRAAAHH!!'], ['yo', '¡Es mi turno! ¡Super Saiyajin 4!']],
      fin: [['vegetagt', 'Ese desgraciado salió de mi cuerpo… Esta vez te debo una, Kakarotto.'], ['yo', 'Todos ayudaron. La Tierra vuelve a ser libre.']] },
    { id: 'gt17', gt: true, saga: 'Dragon Ball GT · Saga de Super 17', titulo: 'Las puertas del Infierno', char: 'gokugt', nivel: 'otromundo',
      b: [['super17b', 260, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['yo', 'Las puertas del Infierno se abrieron y todos los villanos volvieron a la Tierra.'], ['super17b', 'Dos Androides 17 en uno. Somos perfectos.']],
      final: [['super17b', 'Lánzame toda tu energía. Me la voy a comer.']],
      medio: [{ jefe: 'super17b', hp: 0.5, lines: [['super17b', 'Cada ataque de energía me hace más fuerte.'], ['yo', 'Entonces habrá que pegarle con todo… y con los puños.']] }],
      fin: [['yo', 'Se acabó Super 17. Usemos las esferas para arreglar todo esto.']] },
    { id: 'gthaze', gt: true, saga: 'Dragon Ball GT · Los Dragones Oscuros', titulo: 'El dragón del veneno', char: 'gokugt', nivel: 'cell',
      b: [['hazeb', 210, 1]], reto: { t: 'bajas', n: 320 },
      intro: [['yo', 'Abusamos tanto de las esferas que de ellas salieron siete dragones malignos.'], ['hazeb', 'Ji, ji… el aire de esta ciudad ya es mío. Respira, Saiyajin, respira.']],
      final: [['hazeb', 'Mi veneno se te mete hasta los huesos.']],
      fin: [['yo', 'Uno menos. Quedan seis dragones… y seis esferas.']] },
    { id: 'gtrage', gt: true, saga: 'Dragon Ball GT · Los Dragones Oscuros', titulo: 'El dragón del rayo', char: 'gokugt', nivel: 'cell',
      b: [['rageb', 220, 1]], reto: { t: 'rapido', s: 120 },
      intro: [['rageb', '¡Ja! ¿Te parezco pequeño? Espera a que me coma la electricidad de la ciudad.'], ['yo', 'Cuidado, Pan. Si lo tocas con las manos mojadas, te electrocuta.']],
      final: [['rageb', '¡Mil voltios para el mono!']],
      medio: [{ jefe: 'rageb', hp: 0.5, lines: [['rageb', '¡Más energía! ¡Más grande!'], ['yo', 'Cuanto más crece, más fácil es pegarle.']] }],
      fin: [['yo', 'Era fuerte, pero le gustaba presumir demasiado.']] },
    { id: 'gtoceanus', gt: true, saga: 'Dragon Ball GT · Los Dragones Oscuros', titulo: 'La dragona del viento', char: 'pangt', nivel: 'saiyan',
      b: [['oceanb', 220, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['oceanb', 'Mis tornados borrarán este planeta y nadie sabrá quién fui.'], ['yo', '¡Abuelito, este me toca a mí!']],
      final: [['oceanb', 'No puedes pelear contra el viento, niña.']],
      fin: [['yo', '¡Lo logré sola! Bueno… casi sola.'], ['gokugt', 'Lo hiciste muy bien, Pan.']] },
    { id: 'gtnaturon', gt: true, saga: 'Dragon Ball GT · Los Dragones Oscuros', titulo: 'El dragón de la tierra', char: 'gokugt', nivel: 'saiyan',
      b: [['naturb', 230, 1]], reto: { t: 'bajas', n: 350 },
      intro: [['naturb', 'Me escondo en la tierra y me como a quien camina encima.'], ['yo', 'Entonces no pisaré el suelo. ¡A volar!']],
      final: [['naturb', 'Tu energía tiene buen sabor.']],
      medio: [{ jefe: 'naturb', hp: 0.5, lines: [['naturb', 'La tierra entera es mi cuerpo.'], ['yo', 'Pues sal de ahí y pelea de frente.']] }],
      fin: [['yo', 'Ya solo quedan los hermanos del fuego y del hielo… y el más fuerte.']] },
    { id: 'gtnova', gt: true, saga: 'Dragon Ball GT · Los Dragones Oscuros', titulo: 'Fuego y hielo', char: 'gokugt', nivel: 'leyendas',
      b: [['eisb', 120], ['novab', 270, 1]], reto: { t: 'rapido', s: 130 },
      intro: [['eisb', 'Juego sucio es mi especialidad. Te congelaré por la espalda.'], ['novab', 'Eis, detente. Peleemos con honor.']],
      final: [['novab', 'Te mostraré el verdadero calor de una estrella.']],
      medio: [{ jefe: 'novab', hp: 0.4, lines: [['novab', 'Peleas con el corazón limpio… Por eso daré todo lo que tengo.'], ['yo', '¡Así me gusta!']] }],
      fin: [['novab', 'Fue una gran pelea, Goku. Ten cuidado con el último.']] },
    { id: 'gtsyn', gt: true, saga: 'Dragon Ball GT · Los Dragones Oscuros', titulo: 'El dragón de una estrella', char: 'vegetagt', nivel: 'leyendas',
      b: [['synb', 280, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['synb', 'Mis hermanos fueron débiles. Yo nací del deseo más grande de todos.'], ['yo', 'Kakarotto está agotado. Esta vez el príncipe de los Saiyajin pelea primero.']],
      final: [['synb', 'Siete esferas, siete poderes. Todos son míos.']],
      medio: [{ jefe: 'synb', hp: 0.4, lines: [['synb', '¡Me tragaré las Esferas del Dragón!'], ['yo', 'Maldición… se está transformando.']] }],
      fin: [['synb', 'Ya tengo las siete esferas. Ahora soy… Omega Shenron.'], ['yo', 'Kakarotto, no hay otra opción. La danza.']] },
    { id: 'gtomega', gt: true, saga: 'Dragon Ball GT · Los Dragones Oscuros', titulo: 'Gogeta Super Saiyajin 4', char: 'gogetagt', nivel: 'leyendas',
      b: [['omegab', 300, 1]], reto: { t: 'vida', min: 0.25 },
      intro: [['gokugt', '¡Fu…!'], ['vegetagt', '¡…sión!'], ['yo', 'Soy Gogeta. Y vengo a hacer pagar a Omega Shenron.']],
      final: [['omegab', 'Una fusión no cambia nada. Tengo el poder de las siete esferas.']],
      medio: [{ jefe: 'omegab', hp: 0.25, lines: [['omegab', '¡Bola de energía negativa! ¡Desaparece con el planeta!'], ['yo', 'Te la devuelvo con todo. ¡Big Bang Kamehameha!']] }],
      fin: [['yo', 'Se acabó. Ningún deseo más se usará para mal.'], ['gokugt', 'Shenlong me pide que lo acompañe… Adiós, amigos. Nos veremos.']] },
  ];
})();
