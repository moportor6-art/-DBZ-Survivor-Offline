'use strict';
// ─── Mundos de prueba de worldgen (repo moportor6-art/worldgen; js/mods/worldgen.js = dist/worldgen.js) ───
// Cuatro escenarios generados (Namek de los lagos, Tierra baldía, Ciudad destruida e Isla del Torneo) como temas de
// THEMES con terreno propio: lagos y mesetas que no se pisan (THEME.blocked, como las nubes del Planeta de Kaio-sama),
// cráteres, pasto, calles. Salen como tarjetas en la ventana de Niveles bonus; cada uno usa los enemigos y jefes del
// nivel en que se basa. No abren niveles ni cuentan para el ranking de la Serpiente.
(() => {
  const WG = window.WorldGen;
  if (!WG || !WG.adapters || !WG.adapters.dbz) return;
  const SEMILLA = 2026;
  const NIVEL = { namek: 'namek', saiyan: 'saiyan', rocky: 'cell', buu: 'buu' };   // escenario.base → nivel de enemigos
  const ICONO = { namek_lagos: '🌊', tierra_baldia: '🏜️', ciudad_destruida: '🏙️', isla_torneo: '🥋' };
  const MUNDOS = [];

  for (const e of Object.values(WG.biomas.dbz)) {
    const base = THEMES[e.base];
    if (!base) continue;
    const g = WG.adapters.dbz.tema(SEMILLA, e);
    const id = 'wg-' + e.id;
    // Mismo color de suelo que buildChunk (draw.js) cuando no hay agua ni meseta
    const pixel = (wx, wy, v, border) => {
      const x = g.pixelExtra(wx, wy);
      if (x) return x;
      const t = border ? (v === 2 ? 'gedge' : 'edge') : TYPE_NAMES[v];
      if (t === 'edge' || t === 'gedge') return GROUND[t];
      const pal = GROUND[t], h = hash2(wx * 7 + 3, wy * 13 - 5);
      let col = h < 0.07 ? pal[1] : h < 0.11 ? pal[2] : pal[0];
      if (vnoise(wx / 40, wy / 40) < 0.25 && hash2(wx, wy) < 0.5) col = pal[1];
      return col;
    };
    THEMES[id] = { ...base, ground: g.ground, pixel, blocked: g.blocked, keepProp: g.keepProp, margin: 1 };
    const L = LEVELS.find(q => q.id === NIVEL[e.base]) || LEVELS[0];
    const lv = { ...L, id, num: 1, theme: id, bonus: false, mundo: true, name: 'Prueba: ' + e.nombre,
      desc: 'Mundo de prueba generado (worldgen ' + WG.version + ') con los enemigos del nivel ' + L.num + '.' };
    if (!BONUS_LEVELS.some(q => q.id === id)) BONUS_LEVELS.push(lv);
    MUNDOS.push({ id, e, L });
  }

  // Tarjetas al final de la ventana de Niveles bonus
  if (typeof bonusSection === 'function') {
    const bs = bonusSection;
    bonusSection = function (sel) {   // eslint-disable-line no-global-assign
      const frag = bs.apply(this, arguments);
      for (const m of MUNDOS) {
        const card = document.createElement('button');
        card.className = 'level-card weekly bonus' + (sel === m.id ? ' selected' : '');
        card.innerHTML = `${levelPic(m.L.id)}<span class="wk-info"><b>${ICONO[m.e.id] || '🧪'} 🧪 ${esc(m.e.nombre)}</b>
          <small>${esc('Mundo de prueba generado: no se pisan el agua ni las mesetas.')}</small>
          <span class="lv-state">${esc('Enemigos y jefes del nivel ' + m.L.num)}</span></span>`;
        card.onclick = () => {
          SFX.unlock();
          SAVE.level = m.id; writeSave(); buildMenu();
          openSetup(m.id);
          $('setupBonusTitle').textContent = '🧪 ' + m.e.nombre;
        };
        frag.appendChild(card);
      }
      return frag;
    };
  }
  window.DBZ_MUNDOS = MUNDOS.map(m => m.id);
})();
