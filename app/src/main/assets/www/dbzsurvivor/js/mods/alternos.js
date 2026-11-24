'use strict';
// ─── Universos alternativos: guerreros y jefes de otros universos, mangas y fan-series ─────────────
// Hojas armadas con tools/swl/gt (ALT=1 armar.py y specs_alt.py) desde las originales de tools/swl/gt/hojas/alt_*:
//   Bra y Bra SSJ: Dragon Ball Multiverse (Andrés gamer animations) · Caulifla y Cabba: Nightmarex07 (ULSW)
//   Black Gogeta y su Super Saiyajin Rosé: Black Vinas (ULSW) · Hero: Vairen Morningstar (Dragon Legend Z Lite)
//   Vegeta SSJ4 y Goku de Dragon Ball AF · Frost: AlquimistaSK (ULSW) · Dr. Willow: Arisrad
//   Cell Max y Super Li Shenron: Vairen Morningstar (ULSW, Dragon Legend Z)
// Como gt.js: solo traen el perfil (miran a la derecha y el juego las voltea).
// Va antes que capitulos.js: deja los capítulos en window.ALT_CAPS (van antes de «La batalla final», después de GT).
(() => {
  // [ancho, alto del cuadro, alto del cuerpo de pie, { animación: [columna, cuadros] }] (de alt.json)
  const INFO = {
    'bra': [56, 45, 42, { cast: [6, 2], idle: [0, 4], kohit: [11, 1], kolie: [12, 1], koup: [13, 1], punch: [8, 3], walk: [4, 2] }],
    'bra-ssj': [63, 56, 54, { cast: [5, 2], idle: [0, 3], kohit: [10, 1], kolie: [11, 1], koup: [12, 1], punch: [7, 3], walk: [3, 2] }],
    'cabba': [82, 45, 43, { cast: [5, 2], idle: [0, 3], kohit: [10, 1], kolie: [11, 1], koup: [12, 1], punch: [7, 3], walk: [3, 2] }],
    'caulifla': [54, 51, 48, { cast: [4, 2], idle: [0, 2], kohit: [9, 1], kolie: [10, 1], koup: [11, 1], punch: [6, 3], walk: [2, 2] }],
    'cellmaxb': [71, 74, 69, { cast: [5, 2], idle: [0, 3], punch: [7, 3], walk: [3, 2] }],
    'frostb': [78, 69, 63, { cast: [6, 2], idle: [0, 4], punch: [8, 3], walk: [4, 2] }],
    'gogetablack': [71, 58, 55, { cast: [6, 2], idle: [0, 4], kohit: [11, 1], kolie: [12, 1], koup: [13, 1], punch: [8, 3], walk: [4, 2] }],
    'gogetablack-ssj': [56, 58, 55, { cast: [6, 2], idle: [0, 4], kohit: [11, 1], kolie: [12, 1], koup: [13, 1], punch: [8, 3], walk: [4, 2] }],
    'gokuaf': [62, 54, 52, { cast: [6, 2], idle: [0, 4], kohit: [11, 1], kolie: [12, 1], koup: [13, 1], punch: [8, 3], walk: [4, 2] }],
    'hero': [52, 53, 51, { cast: [6, 2], idle: [0, 4], kohit: [11, 1], kolie: [12, 1], koup: [13, 1], punch: [8, 3], walk: [4, 2] }],
    'lishenb': [44, 47, 45, { cast: [7, 2], idle: [0, 5], punch: [9, 3], walk: [5, 2] }],
    'vegetaaf': [48, 57, 53, { cast: [6, 2], idle: [0, 4], kohit: [11, 1], kolie: [12, 1], koup: [13, 1], punch: [8, 3], walk: [4, 2] }],
    'willowb': [79, 68, 66, { cast: [6, 2], idle: [0, 4], punch: [8, 3], walk: [4, 2] }],
  };
  const hoja = (file, cuerpo) => {
    const [w, h, alto, an] = INFO[file];
    const anims = {};
    for (const [k, [col, count]] of Object.entries(an)) anims[k] = { row: 0, col, count };
    return { src: `assets/sprites/fusion/alt/${file}.png`, frameW: w, frameH: h, footY: h - 1, fps: 8, scale: cuerpo / alto, anims };
  };

  // ─── Técnicas nuevas ───
  Object.assign(ATTACKS, {
    crushcannon: { name: 'Crush Cannon', color: '#ff9ad8', core: '#fff0fa', type: 'projectile', kind: 'big', users: ['caulifla'],
      desc: 'La ráfaga salvaje de Caulifla: una esfera rosada que revienta entre los enemigos.',
      stats: l => ({ cd: 2.6 - l * 0.15, dmg: 28 + l * 12, count: 1, speed: 5, r: 12 + l * 2, pierce: 3 + l, life: 1.5, spread: 0, explode: 50 + l * 8 }) },
    kamerose: { name: 'Kamehameha Rosé', color: '#ff5aa8', core: '#ffe0f0', type: 'beam', users: ['gogetablack'],
      desc: 'El Kamehameha de Black Gogeta, teñido de rosa: un rayo que no deja nada en pie.',
      stats: l => ({ cd: 3.6 - l * 0.22, dmg: 12 + l * 6, len: 320 + l * 40, width: 26 + l * 5, dur: 0.75 + l * 0.06 }) },
    rafagabra: { name: 'Ráfaga de la princesa', color: '#c99aff', core: '#ffffff', type: 'projectile', users: ['bra'],
      desc: 'Bra dispara varias esferas de Ki seguidas, como su padre (pero con más estilo).',
      stats: l => ({ cd: 1.4 - l * 0.08, dmg: 8 + l * 3, count: 2 + Math.floor(l / 2), speed: 7, r: 6, pierce: 1, life: 1.2, spread: 0.25, explode: 0 }) },
  });
  const usa = (tec, ...ids) => { if (ATTACKS[tec]) ATTACKS[tec].users = [...(ATTACKS[tec].users || []), ...ids]; };
  usa('kiblast', 'bra', 'caulifla', 'cabba', 'gogetablack', 'hero', 'vegetaaf', 'gokuaf');
  usa('galick', 'cabba', 'vegetaaf', 'bra'); usa('finalflash', 'vegetaaf', 'cabba'); usa('bigbangatk', 'gogetablack', 'vegetaaf');
  usa('kamehameha', 'hero', 'gokuaf', 'gogetablack'); usa('masenko', 'hero');

  // ─── Guerreros jugables ───
  const ALT_CHARS = {
    bra: { name: 'Bra (Multiverso)', title: 'La hija de Vegeta, en el torneo de los 18 universos', hp: 90, speed: 3.0, start: 'rafagabra',
      transform: 'Super Saiyajin', perk: 'Princesa Saiyajin: +20% de daño a los jefes y el Ki se carga un 15% más rápido', bossBonus: 0.2, kiBonus: 0.15,
      cost: 4500, aura: '#ffe14d', sprite: ['bra', 42], ssj: ['bra-ssj', 46] },
    caulifla: { name: 'Caulifla', title: 'La Saiyajin salvaje del Universo 6', hp: 100, speed: 2.95, start: 'crushcannon',
      transform: 'Super Saiyajin', perk: 'Talento salvaje: la transformación es un 30% más poderosa', transformBonus: 0.3,
      cost: 4000, aura: '#ffe14d', sprite: ['caulifla', 42] },
    cabba: { name: 'Cabba', title: 'El Saiyajin orgulloso del Universo 6', hp: 105, speed: 2.8, start: 'galick',
      transform: 'Super Saiyajin', perk: 'Disciplina militar: +12% de daño y el Ki se carga un 15% más rápido', dmgBonus: 0.12, kiBonus: 0.15,
      cost: 3500, aura: '#ffe14d', sprite: ['cabba', 42] },
    gokuaf: { name: 'Goku (AF)', title: 'El Goku niño de Dragon Ball AF', hp: 95, speed: 3.0, start: 'kamehameha',
      transform: 'Super Saiyajin 5', perk: 'Cola salvaje: +15% de velocidad de recarga de las técnicas', cdBonus: 0.15,
      cost: 4500, aura: '#d8d8d8', sprite: ['gokuaf', 40] },
    hero: { name: 'Héroe Saiyajin', title: 'El avatar de Dragon Ball Heroes', hp: 115, speed: 2.8, start: 'masenko',
      transform: 'Despertar del héroe', perk: 'Avatar: +10% de daño y regenera salud', dmgBonus: 0.1, regen: 0.3,
      cost: 4000, aura: '#7fe6ff', sprite: ['hero', 46] },
    vegetaaf: { name: 'Vegeta SSJ4 (AF)', title: 'El príncipe de Dragon Ball AF', hp: 120, speed: 2.75, start: 'finalflash',
      transform: 'Poder Saiyajin definitivo', perk: 'Orgullo del príncipe: +25% de daño a los jefes y +10% de daño', bossBonus: 0.25, dmgBonus: 0.1,
      cost: 7000, aura: '#c0302a', sprite: ['vegetaaf', 50] },
    gogetablack: { name: 'Black Gogeta', title: 'La fusión de Goku Black y Vegeta de otra línea temporal', hp: 135, speed: 2.8, start: 'kamerose',
      transform: 'Super Saiyajin Rosé', perk: 'Fusión maligna: +20% de daño y la transformación un 30% más poderosa', dmgBonus: 0.2, transformBonus: 0.3,
      cost: 9500, aura: '#ff5aa8', sprite: ['gogetablack', 50], ssj: ['gogetablack-ssj', 50] },
  };
  for (const [id, d] of Object.entries(ALT_CHARS)) {
    const { cost, sprite, ssj, ...c } = d;
    c.look = { ...CHARACTERS.goku.look, id, ssjHair: null };
    c.ssjHair = null;
    c.unlock = { kind: 'zeni', cost, text: 'Cómpralo con Zeni' };
    c.fusion = true;
    CHARACTERS[id] = c;
    SPRITE_OVERRIDES[id] = hoja(...sprite);
    if (ssj) { SPRITE_OVERRIDES[`${id}:ssj`] = hoja(...ssj); c.transformSprite = true; }
  }

  // ─── Jefes ───
  const J = (id, name, hp, speed, r, dmg, scale, every, patterns, file, cuerpo, color) => {
    SPRITE_OVERRIDES[id] = hoja(file, cuerpo);
    BOSSES.push({ id, name, hp, speed, r, dmg, scale, every, patterns, look: { ...FB(color), id } });
  };
  J('frostb', 'Frost', 16000, 1.7, 18, 26, 1.45, 1.9, ['aimed', 'dash', 'ring', 'aimed'], 'frostb', 52, '#c8a0e8');
  J('willowb', 'Dr. Willow', 22000, 1.4, 22, 30, 1.5, 1.9, ['slam', 'aimed', 'ring', 'aimed'], 'willowb', 56, '#4a5a7a');
  J('cellmaxb', 'Cell Max', 34000, 1.2, 26, 36, 1.7, 1.8, ['slam', 'ring', 'aimed', 'slam'], 'cellmaxb', 62, '#c03a2a');
  J('lishenb', 'Super Li Shenron', 28000, 1.9, 18, 32, 1.5, 1.6, ['dash', 'aimed', 'ring', 'dash'], 'lishenb', 48, '#8a5ae0');

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
    // Frost: el «Frieza bueno» del Universo 6, con la aguja venenosa escondida
    frostb: { every: 8, first: 4, color: '#c8a0e8', fn: (e, P, ang) => {
      if ((e.spN = (e.spN || 0) + 1) % 2) { for (let i = -1; i <= 1; i++) homingShot(e, ang + i * 0.35, 4.2, 6, 1, e.dmg * 1.2, 1.2, 3.5); dice(e, '¡Aguja venenosa!', '#b06aff'); }
      else bossBeams(e, { windup: 1, dur: 0.5, color: '#c46bff', core: '#f6e8ff', dmg: e.dmg * 2, name: '¡Rayo mortal!', beams: [{ ang, len: 520, w: 28 }] });
    } },
    // Dr. Willow: el cerebro en el cuerpo de la máquina; lluvia de misiles y el gran cañón
    willowb: { every: 9, first: 5, color: '#ff8a3d', fn: (e, P, ang) => {
      if ((e.spN = (e.spN || 0) + 1) % 2) { zonas(6, 60, e.dmg * 1.6); dice(e, '¡Lluvia de misiles!', '#ff8a3d'); }
      else bossBeams(e, { windup: 1.3, dur: 0.9, color: '#ff6a2a', core: '#fff0c0', dmg: e.dmg * 2.6, name: '¡Cañón de energía!', beams: [{ ang, len: 640, w: 60 }] });
    } },
    // Cell Max: puro instinto, enorme y lento; aplasta y dispara el rayo rojo
    cellmaxb: { every: 8, first: 4, color: '#ff4a3a', fn: (e, P, ang) => {
      const n = (e.spN = (e.spN || 0) + 1) % 3;
      if (n === 1) { bola(e, P, 130, e.dmg * 2.6); dice(e, '¡Esfera de destrucción!', '#ff4a3a'); }
      else if (n === 2) bossBeams(e, { windup: 1.2, dur: 0.8, color: '#ff3a3a', core: '#ffe0e0', dmg: e.dmg * 2.4, name: '¡Rayo de Cell Max!',
        beams: [{ ang: ang - 0.3, len: 600, w: 48 }, { ang: ang + 0.3, len: 600, w: 48 }] });
      else { zonas(4, 85, e.dmg * 1.8); dice(e, '¡Pisotón!', '#ff9a6a'); }
    } },
    // Super Li Shenron: el dragón de una estrella con su forma final; rápido y con ráfagas que persiguen
    lishenb: { every: 7, first: 4, color: '#8a5ae0', fn: (e, P, ang) => {
      if ((e.spN = (e.spN || 0) + 1) % 2) bossCharge(e, 0.6, '¡Tormenta del dragón!', '#b48aff', () => {
        for (let i = 0; i < 8; i++) homingShot(e, i * Math.PI / 4, 3.4, 9, 1, e.dmg * 1.2, 1.3, 4.5);
      });
      else { energyStream(e); dice(e, '¡Llama de la estrella!', '#ff6a3a'); }
    } },
  });

  // ─── Los capítulos: el torneo de los universos ───
  const S = 'Universos alternativos';
  window.ALT_CAPS = [
    { id: 'altfrost', gt: true, saga: S, titulo: 'El emperador amable', char: 'cabba', nivel: 'namek',
      b: [['frostb', 200, 1]], reto: { t: 'bajas', n: 300 },
      intro: [['frostb', 'En el Universo 6 me llaman héroe. Qué fácil es engañar a los mortales.'], ['yo', '¡Sé lo que hiciste! Un Saiyajin del Universo 6 no se deja engañar.']],
      final: [['frostb', 'Te enseñaré lo que pasa cuando alguien descubre mis secretos.']],
      medio: [{ jefe: 'frostb', hp: 0.5, lines: [['frostb', 'Se acabó el teatro. Esta es mi verdadera forma.'], ['yo', '¡Por el orgullo de los Saiyajin!']] }],
      fin: [['yo', 'Frost ya no engañará a nadie. Mi maestro Vegeta estaría orgulloso.']] },
    { id: 'althit', gt: true, saga: S, titulo: 'Talento salvaje', char: 'caulifla', nivel: 'poder',
      b: [['hit', 220, 1]], reto: { t: 'rapido', s: 120 },
      intro: [['hit', 'Me contrataron para retirarte del torneo. Nada personal.'], ['yo', '¿El asesino del Universo 6? ¡Por fin alguien que vale la pena!']],
      final: [['hit', 'Detuve el tiempo medio segundo. No viste nada.']],
      medio: [{ jefe: 'hit', hp: 0.4, lines: [['hit', 'Eres más rápida que antes. Interesante.'], ['yo', '¡Y todavía no me pongo seria!']] }],
      fin: [['yo', '¡Ja! Ni el asesino más famoso pudo conmigo. Kale, ¿viste eso?']] },
    { id: 'altwillow', gt: true, saga: S, titulo: 'El cerebro en la máquina', char: 'gokuaf', nivel: 'cell',
      b: [['willowb', 230, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['willowb', 'Mi cerebro vive dentro del cuerpo más fuerte del mundo. Ningún niño me detendrá.'], ['yo', '¡Pues este niño tiene cola y unas ganas enormes de pelear!']],
      final: [['willowb', '¡Mi cañón puede borrar una montaña entera!']],
      medio: [{ jefe: 'willowb', hp: 0.5, lines: [['willowb', 'Mis sistemas se sobrecargan… ¡no importa, más potencia!'], ['yo', '¡Todavía me queda un Kamehameha!']] }],
      fin: [['yo', 'Listo. La próxima vez, que el doctor use su cerebro para algo bueno.']] },
    { id: 'altbra', gt: true, saga: S, titulo: 'La princesa del Multiverso', char: 'bra', nivel: 'leyendas',
      b: [['frostb', 150], ['cellmaxb', 260, 1]], reto: { t: 'rapido', s: 150 },
      intro: [['yo', 'Papá dice que soy demasiado mimada para pelear. ¡En el torneo de los 18 universos le demostraré lo contrario!'], ['frostb', 'Una niña de la familia real Saiyajin… será un buen trofeo.']],
      final: [['cellmaxb', '¡GRAAAAAH!']],
      medio: [{ jefe: 'cellmaxb', hp: 0.4, lines: [['yo', '¡Esa cosa no piensa, solo destruye! Bueno… tampoco pienso perder.'], ['cellmaxb', '¡GRRRRRR!']] }],
      fin: [['yo', '¿Lo vieron? ¡Super Saiyajin y con el peinado perfecto! Que papá lo grabe.']] },
    { id: 'altlishen', gt: true, saga: S, titulo: 'El dragón de una estrella', char: 'hero', nivel: 'otromundo',
      b: [['lishenb', 230, 1]], reto: { t: 'bajas', n: 350 },
      intro: [['lishenb', 'Soy el dragón de la esfera de una estrella, renacido más fuerte que nunca.'], ['yo', 'La Patrulla del Tiempo me mandó aquí por algo. ¡Vamos!']],
      final: [['lishenb', 'Mi llama negativa quemará esta línea temporal.']],
      medio: [{ jefe: 'lishenb', hp: 0.5, lines: [['lishenb', '¡Contempla a Super Li Shenron!'], ['yo', '¡Los héroes no se rinden!']] }],
      fin: [['yo', 'Misión cumplida. Esta línea temporal está a salvo… por ahora.']] },
    { id: 'altvegeta', gt: true, saga: S, titulo: 'El príncipe de otro futuro', char: 'vegetaaf', nivel: 'leyendas',
      b: [['willowb', 140], ['frostb', 220], ['lishenb', 290, 1]], reto: { t: 'vida', min: 0.25 },
      intro: [['yo', 'En mi universo superé al Super Saiyajin 4. Estos tres no son nada para el príncipe.'], ['lishenb', 'Un Saiyajin con cola otra vez… qué aburrido.']],
      final: [['lishenb', 'Esta vez no hay ningún Kakarotto que te ayude.']],
      medio: [{ jefe: 'lishenb', hp: 0.4, lines: [['yo', '¡No necesito a Kakarotto! ¡Final Flash!'], ['lishenb', 'Imposible… ¿ese poder?']] }],
      fin: [['yo', 'Hmph. En cualquier universo, el príncipe de los Saiyajin es el más fuerte.']] },
    { id: 'altblack', gt: true, saga: S, titulo: 'La fusión rosa', char: 'gogetablack', nivel: 'poder',
      b: [['lishenb', 170], ['cellmaxb', 300, 1]], reto: { t: 'rapido', s: 150 },
      intro: [['yo', 'Goku Black y Vegeta, unidos en una sola voluntad. Ningún universo escapará a nuestra justicia.'], ['cellmaxb', '¡GRAAAAAH!']],
      final: [['cellmaxb', '¡GRRRRRAAAAH!']],
      medio: [{ jefe: 'cellmaxb', hp: 0.35, lines: [['yo', 'Contempla la belleza del Super Saiyajin Rosé.'], ['cellmaxb', '¡GRRRR!']] }],
      fin: [['yo', 'Todos los universos alternativos tiemblan ante Black Gogeta… Y aún queda la batalla final.']] },
  ];
})();
