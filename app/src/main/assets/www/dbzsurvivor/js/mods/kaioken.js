'use strict';
// ─── Kaio-ken para igualar a los guerreros (2.36.3) ─────────────
// Cada guerrero se compara con el más fuerte de los principales (Goku en su mejor forma): poder de jefe =
// (daño extra del guerrero) × (×1,5 de la transformación + bonos) × (bono contra jefes) ÷ (recarga).
// Al que no llega, se le suman escalones de Kaio-ken encima de su última forma (con el botón de Ki, como las formas),
// los justos para igualarlo: aura roja, más velocidad y, desde el 3.er escalón, el cuerpo quema vida (poderes.js).
// Va después de formas.js, gt.js y alternos.js (así también cuentan los guerreros nuevos).
(() => {
  const FORMS = window.FUSION_FORMS;
  if (!FORMS) return;
  const MULTS = [2, 3, 4, 10, 20], HUMANOS = [30, 40, 50, 70, 100];   // (los humanos ya llegan a x20)
  const poder = (c, bonus, fx = {}) => (1 + (c.dmgBonus || 0)) * (1.5 + (c.transformBonus || 0) + bonus) * (1 + (c.bossBonus || 0))
    / (Math.max(0.4, 1 - (c.cdBonus || 0)) * 0.75 * (1 - (fx.cd || 0)));
  const mejor = (c, list) => list.reduce((b, f, i) => { const p = poder(c, f.bonus, f.fx); return p > b.p ? { p, f, i } : b; },
    { p: poder(c, 0), f: null, i: -1 });
  const meta = mejor(CHARACTERS.goku, FORMS.goku || []).p;
  const sinKK = id => !CHARACTERS[id] || CHARACTERS[id].buddy || id === 'goku';   // (Mr. Satán no se transforma: llama a Buu)
  window.KAIOKEN_EXTRA = {};
  for (const id of Object.keys(CHARACTERS)) {
    if (sinKK(id)) continue;
    const c = CHARACTERS[id], list = FORMS[id] || [], top = mejor(c, list);
    if (top.p >= meta * 0.995) continue;   // (Trunks en la Ira queda a un 1% y también recibe su escalón)
    // bono que falta para igualar a Goku, repartido en escalones de +0,15 como mínimo (máximo 5)
    const factor = (1 + (c.dmgBonus || 0)) * (1 + (c.bossBonus || 0)) / (Math.max(0.4, 1 - (c.cdBonus || 0)) * 0.75 * (1 - ((top.f && top.f.fx.cd) || 0)));
    const base = top.f ? top.f.bonus : 0, falta = meta / factor - 1.5 - (c.transformBonus || 0) - base;
    const n = Math.max(1, Math.min(5, Math.ceil(falta / 0.15)));
    const ultima = list[list.length - 1], humano = ultima && ultima.kaioken;
    const prefijo = humano ? '' : `${top.f ? top.f.name : c.transform} + `;
    const fx0 = (top.f && top.f.fx) || {};
    const nuevas = [];
    for (let k = 1; k <= n; k++) {
      const x = humano ? HUMANOS[Math.min(k, HUMANOS.length) - 1] : MULTS[k - 1];
      const fx = { ...fx0, spd: (fx0.spd || 0) + 0.04 * k };
      delete fx.hpdrain;
      if (k >= 3 || humano) fx.hpdrain = 0.003 * k;
      nuevas.push({ name: `${prefijo}Kaio-ken x${x}`, aura: '#ff2a2a', bonus: base + Math.max(falta * k / n, 0.15 * k),   // (cada escalón, al menos +15%)
        fx, drain: 1.1 + 0.06 * k,
        kaioken: k, lore: k === n ? 'El Kaio-ken al máximo sobre su mejor forma: iguala a los más fuertes, pero el cuerpo lo paga.'
          : 'La técnica de Kaio-sama encima de su forma: el aura roja multiplica el poder.' });
    }
    // las hojas: la de su mejor forma (o la de transformado), con el aura roja del Kaio-ken
    const desde = top.i >= 0 ? `${id}~${top.i + 2}:ssj` : `${id}:ssj`;
    const hojaKK = SPRITE_OVERRIDES[desde] || SPRITE_OVERRIDES[`${id}:ssj`] || SPRITE_OVERRIDES[id];
    // (con traje de trajes.js, «<guerrero>@<traje>», la de esa misma forma con el traje)
    const trajes = Object.keys(SPRITE_OVERRIDES).filter(k => k.startsWith(`${id}@`) && !k.includes('~') && !k.endsWith(':ssj'));
    nuevas.forEach((f, j) => {
      const n = list.length + j + 2, key = `${id}~${n}`;
      if (SPRITE_OVERRIDES[id]) SPRITE_OVERRIDES[key] = SPRITE_OVERRIDES[id];
      if (hojaKK) SPRITE_OVERRIDES[`${key}:ssj`] = hojaKK;
      for (const tk of trajes) {
        SPRITE_OVERRIDES[`${tk}~${n}`] = SPRITE_OVERRIDES[tk];
        SPRITE_OVERRIDES[`${tk}~${n}:ssj`] = SPRITE_OVERRIDES[top.i >= 0 ? `${tk}~${top.i + 2}:ssj` : `${tk}:ssj`] || hojaKK;
      }
    });
    FORMS[id] = [...list, ...nuevas];
    window.KAIOKEN_EXTRA[id] = { antes: +top.p.toFixed(2), despues: +poder(c, nuevas[n - 1].bonus, nuevas[n - 1].fx).toFixed(2), escalones: n };
  }
  window.KAIOKEN_EXTRA.meta = +meta.toFixed(2);
})();
