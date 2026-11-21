'use strict';
// ─── Fusión: formas extra de transformación (sprites de DB Survivors) ───
// La base tiene una sola forma por guerrero y no carga Ki mientras estás transformado, así que las formas
// van por partida: la 1.ª vez que te transformas usas la forma de siempre, la 2.ª la siguiente, y así
// hasta la última (desde ahí te quedas en la más alta). Cada forma pega más fuerte que la anterior.
// Se carga después de js/game.js: envuelve doTransform y updateCharDetail sin cambiar su lógica.
(() => {
  // bonus: lo que se suma al transformBonus del guerrero (la base ya da ×1.5 al transformarse)
  const FORMS = {
    goku: [{ name: 'Super Saiyajin 3', aura: '#ffe14d', bonus: 0.25 }, { name: 'Super Saiyajin Blue', aura: '#4fd8ff', bonus: 0.5 },
      { name: 'Ultra Instinto', aura: '#e8f0ff', bonus: 0.75 }],
    vegeta: [{ name: 'Super Saiyajin Dios', aura: '#ff5a5a', bonus: 0.25 }, { name: 'Super Saiyajin Blue', aura: '#4fd8ff', bonus: 0.5 }],
    gohan: [{ name: 'Gohan Místico', aura: '#f2f2ff', bonus: 0.3 }],
    gogetap: [{ name: 'Super Saiyajin Blue', aura: '#4fd8ff', bonus: 0.4 }],
    vegetto: [{ name: 'Super Saiyajin Blue', aura: '#4fd8ff', bonus: 0.4 }],
    // Fase 5
    gotenks: [{ name: 'Super Saiyajin 3', aura: '#ffe14d', bonus: 0.35 }],
    gohanc: [{ name: 'Super Saiyajin 2', aura: '#fff07a', bonus: 0.3 }],
    freezerp: [{ name: '3.ª forma', aura: '#c46bff', bonus: 0.15 }, { name: 'Forma final', aura: '#e8e0ff', bonus: 0.35 },
      { name: 'Golden Freezer', aura: '#ffd93b', bonus: 0.6 }],
    cellp: [{ name: 'Cell Perfecto', aura: '#b4ff8a', bonus: 0.35 }],
    // Fase 6
    majinbuu: [{ name: 'Super Buu', aura: '#ff8fd0', bonus: 0.25 }, { name: 'Super Buu (absorbe a Gotenks)', aura: '#ffb0e0', bonus: 0.45 },
      { name: 'Super Buu (absorbe a Gohan)', aura: '#ffd0f0', bonus: 0.65 }],
  };
  // hoja: [ancho, alto, archivo (si no es <hoja>-ssj)]
  const SHEETS = { 'goku~2': [32, 32], 'goku~3': [32, 32], 'goku~4': [32, 32], 'vegeta~2': [32, 32], 'vegeta~3': [32, 32], 'gohan~2': [34, 32],
    'gogetap~2': [32, 32], 'vegetto~2': [32, 32], 'gotenks~2': [32, 32], 'gohanc~2': [32, 32],
    'freezerp~2': [34, 32], 'freezerp~3': [32, 32], 'freezerp~4': [32, 32], 'cellp~2': [42, 58, 'cellp-ssj'],
    'majinbuu~2': [42, 59, 'superbuu'], 'majinbuu~3': [42, 58], 'majinbuu~4': [42, 58] };
  const KO = { 'gohan~2': true, 'freezerp~3': true };

  // Hojas: la forma transformada es nueva; sin transformar, el mismo sprite de siempre del guerrero
  for (const [sheet, [w, h, file]] of Object.entries(SHEETS)) {
    const id = sheet.split('~')[0];
    const anims = { idle: { row: 0, col: 0, count: 1 }, walk: { row: 0, col: 1, count: 4 }, cast: { row: 0, col: 5, count: 2 } };
    if (KO[sheet]) Object.assign(anims, { kohit: { row: 0, col: 7, count: 1 }, kolie: { row: 0, col: 8, count: 1 }, koup: { row: 0, col: 9, count: 1 } });
    SPRITE_OVERRIDES[`${sheet}:ssj`] = { src: `assets/sprites/fusion/${file || sheet + '-ssj'}.png`, frameW: w, frameH: h, footY: h, fps: 10,
      scale: 1.25 * Math.min(1, 44 / h), anims, dirs: DIRS_PLAIN };
    SPRITE_OVERRIDES[sheet] = SPRITE_OVERRIDES[id];
  }

  // El guerrero en su forma n (1 = la de siempre): una copia propia del jugador, el original no se toca
  // Con traje (js/fusion-skins.js), la forma se apoya en el traje: sin transformar se sigue viendo con él
  function formChar(P, id, n) {
    const base = P.skinC || CHARACTERS[id], f = FORMS[id][n - 2];
    return { ...base, transform: f.name, aura: f.aura, transformBonus: (base.transformBonus || 0) + f.bonus,
      transformSprite: true, look: { ...base.look, id: `${base.look.id}~${n}` }, formOf: id };
  }
  window.FUSION_FORMS = FORMS;   // los trajes arman sus alias con esto

  const orig = doTransform;
  doTransform = function (P, secs, force) {   // eslint-disable-line no-global-assign
    const id = P && P.charId, forms = id && FORMS[id];
    const will = P && !P.dead && !P.gone && !(P.c && P.c.buddy) && (force || (P.ki >= 100 && !(P.transformed > 0)));
    if (forms && will && !(typeof G !== 'undefined' && G && G.fusion && G.fusion.ids && G.fusion.ids.includes(P.id))) {
      P.formN = Math.min((P.formN || 0) + 1, forms.length + 1);
      P.c = P.formN === 1 ? (P.skinC || CHARACTERS[id]) : formChar(P, id, P.formN);
    }
    return orig.apply(this, arguments);
  };

  // En el detalle del guerrero se ven todas sus formas
  const detail = updateCharDetail;
  updateCharDetail = function () {   // eslint-disable-line no-global-assign
    detail.apply(this, arguments);
    const id = myChar(), forms = FORMS[id];
    if (forms) $('charDetail').textContent += ` · Cada vez que te transformas en la partida subes de forma: ${CHARACTERS[id].transform} → ${forms.map(f => f.name).join(' → ')}`;
  };
})();
