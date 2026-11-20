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
  };
  const SHEETS = { 'goku~2': 32, 'goku~3': 32, 'goku~4': 32, 'vegeta~2': 32, 'vegeta~3': 32, 'gohan~2': 34, 'gogetap~2': 32, 'vegetto~2': 32 };
  const KO = { 'gohan~2': true };

  // Hojas: la forma transformada es nueva; sin transformar, el mismo sprite de siempre del guerrero
  for (const [sheet, w] of Object.entries(SHEETS)) {
    const id = sheet.split('~')[0];
    const anims = { idle: { row: 0, col: 0, count: 1 }, walk: { row: 0, col: 1, count: 4 }, cast: { row: 0, col: 5, count: 2 } };
    if (KO[sheet]) Object.assign(anims, { kohit: { row: 0, col: 7, count: 1 }, kolie: { row: 0, col: 8, count: 1 }, koup: { row: 0, col: 9, count: 1 } });
    SPRITE_OVERRIDES[`${sheet}:ssj`] = { src: `assets/sprites/fusion/${sheet}-ssj.png`, frameW: w, frameH: 32, footY: 32, fps: 10, scale: 1.25, anims, dirs: DIRS_PLAIN };
    SPRITE_OVERRIDES[sheet] = SPRITE_OVERRIDES[id];
  }

  // El guerrero en su forma n (1 = la de siempre): una copia propia del jugador, el original no se toca
  function formChar(id, n) {
    const base = CHARACTERS[id], f = FORMS[id][n - 2];
    return { ...base, transform: f.name, aura: f.aura, transformBonus: (base.transformBonus || 0) + f.bonus,
      transformSprite: true, look: { ...base.look, id: `${id}~${n}` }, formOf: id };
  }

  const orig = doTransform;
  doTransform = function (P, secs, force) {   // eslint-disable-line no-global-assign
    const id = P && P.charId, forms = id && FORMS[id];
    const will = P && !P.dead && !P.gone && !(P.c && P.c.buddy) && (force || (P.ki >= 100 && !(P.transformed > 0)));
    if (forms && will && !(typeof G !== 'undefined' && G && G.fusion && G.fusion.ids && G.fusion.ids.includes(P.id))) {
      P.formN = Math.min((P.formN || 0) + 1, forms.length + 1);
      P.c = P.formN === 1 ? CHARACTERS[id] : formChar(id, P.formN);
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
