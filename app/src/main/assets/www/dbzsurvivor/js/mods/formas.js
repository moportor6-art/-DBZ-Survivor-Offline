'use strict';
// ─── Mod: escalera de formas de transformación (efectos propios y lore) ───
// La base tiene una sola forma por guerrero. Aquí cada guerrero puede tener varias: al transformarte entras en la 1.ª
// (la de siempre) y desde ahí subes o bajas con el botón de Ki (js/mods/ki.js). Cada forma pega más fuerte, gasta más
// Ki y además tiene su propio efecto (fx), así ninguna se siente igual:
//   spd: +velocidad · cd: −recarga de técnicas · def: −daño recibido · regen: % de salud por segundo
//   dodge: probabilidad de esquivar solo · counter: contragolpe al esquivar · shock: probabilidad de descarga eléctrica
//   drain: multiplicador del gasto de Ki de esa forma (1 = el normal de su escalón)
// Se carga después de js/game.js: envuelve doTransform y updateCharDetail. Los efectos los aplica js/mods/ki.js.
(() => {
  // Lore de la forma de siempre (la 1.ª) de los guerreros con escalera
  const FIRST = {
    goku: 'Despertó en Namek, furioso al ver caer a Krilin ante Freezer.',
    vegeta: 'La alcanzó a fuerza de orgullo, entrenando en el espacio para no quedarse atrás de Kakaroto.',
    gohan: 'Su ira contra Cell rompió el límite: el primer Super Saiyajin 2 de la historia.',
    gogetap: 'Goku y Vegeta, fusionados con la danza: cada técnica es de los dos.',
    vegetto: 'Goku y Vegeta, fusionados con los pendientes Potara.',
    gotenks: 'Goten y Trunks, fusionados con la danza: fuerza de niño y travesura de sobra.',
    gohanc: 'Entrenó un año en la Habitación del Tiempo junto a su padre para enfrentar a Cell.',
    freezerp: 'Más grande y brutal: la forma que dejó helado a Vegeta en Namek.',
    cellp: 'Absorbió al Androide 17 y dejó atrás su forma de larva.',
    majinbuu: 'La parte malvada de Buu se separó y se tragó a la buena.',
  };
  // bonus: lo que se suma al transformBonus del guerrero (la base ya da ×1.5 al transformarse)
  const FORMS = {
    goku: [
      { name: 'Super Saiyajin 3', aura: '#ffe14d', bonus: 0.45, fx: { spd: -0.08 }, drain: 1.15,
        lore: 'La alcanzó entrenando en el Otro Mundo. Su poder es enorme, pero devora el Ki como ninguna otra.' },
      { name: 'Super Saiyajin Blue', aura: '#4fd8ff', bonus: 0.35, fx: { cd: 0.25, def: 0.1 },
        lore: 'El Ki divino dentro del Super Saiyajin: control perfecto, las técnicas salen casi sin pausa.' },
      { name: 'Ultra Instinto (Presagio)', aura: '#cfe0ff', bonus: 0.3, fx: { dodge: 0.6, spd: 0.15 },
        lore: 'Rompió su límite contra Jiren: el cuerpo se mueve solo y esquiva sin pensar.' },
      { name: 'Ultra Instinto Dominado', aura: '#f2f6ff', bonus: 0.6, fx: { dodge: 0.85, counter: true, spd: 0.25 },
        lore: 'El dominio completo: esquiva casi todo y responde cada ataque con un contragolpe.' },
    ],
    vegeta: [
      { name: 'Super Saiyajin Dios', aura: '#ff5a5a', bonus: 0.2, fx: { regen: 0.012 },
        lore: 'El Ki divino lo envuelve: su cuerpo se recupera mientras pelea.' },
      { name: 'Super Saiyajin Blue', aura: '#4fd8ff', bonus: 0.45, fx: { def: 0.25 },
        lore: 'El Blue con el orgullo de un príncipe: aguanta golpes que tumbarían a cualquiera.' },
    ],
    gohan: [{ name: 'Gohan Místico', aura: '#f2f2ff', bonus: 0.35, fx: { cd: 0.15 }, drain: 0.55,
      lore: 'El Supremo Kaiosama Anciano liberó todo su potencial: mucho poder sin el desgaste de una transformación.' }],
    gogetap: [{ name: 'Super Saiyajin Blue', aura: '#4fd8ff', bonus: 0.4, fx: { cd: 0.15, def: 0.2 },
      lore: 'La danza de la fusión con el Ki divino: la técnica más fuerte de dos Saiyajin.' }],
    vegetto: [{ name: 'Super Saiyajin Blue', aura: '#4fd8ff', bonus: 0.4, fx: { cd: 0.15, def: 0.2 },
      lore: 'Los pendientes Potara y el Ki divino: una fusión casi sin límites.' }],
    gotenks: [{ name: 'Super Saiyajin 3', aura: '#ffe14d', bonus: 0.5, fx: { spd: 0.15 }, drain: 1.25,
      lore: 'Una fusión de niños en Super Saiyajin 3: fortísimo y travieso, pero el tiempo se le escapa volando.' }],
    gohanc: [{ name: 'Super Saiyajin 2', aura: '#fff07a', bonus: 0.3, fx: { shock: 0.18, spd: 0.1 },
      lore: 'Despertó contra Cell al ver caer al Androide 16: los rayos de energía chisporrotean a su alrededor.' }],
    freezerp: [
      { name: '3.ª forma', aura: '#c46bff', bonus: 0.15, fx: { spd: 0.2, cd: 0.1 },
        lore: 'Cabeza alargada y movimientos veloces: un monstruo mucho más rápido.' },
      { name: 'Forma final', aura: '#e8e0ff', bonus: 0.35, fx: { def: 0.15 }, drain: 0.9,
        lore: 'Su verdadera forma, compacta: todo el poder concentrado y sin desperdiciar energía.' },
      { name: 'Golden Freezer', aura: '#ffd93b', bonus: 0.65, fx: { spd: 0.1 }, drain: 1.4,
        lore: 'Cuatro meses de entrenamiento: poder abrumador, pero su resistencia se agota muy rápido.' },
    ],
    cellp: [{ name: 'Cell Perfecto', aura: '#b4ff8a', bonus: 0.35, fx: { regen: 0.01, def: 0.1 },
      lore: 'Con la Androide 18 alcanzó la perfección: sus células de Piccolo lo regeneran sin parar.' }],
    majinbuu: [
      { name: 'Super Buu', aura: '#ff8fd0', bonus: 0.25, fx: { regen: 0.01 },
        lore: 'Más fuerte y con un cuerpo que se rehace solo.' },
      { name: 'Super Buu (absorbe a Gotenks)', aura: '#ffb0e0', bonus: 0.45, fx: { spd: 0.15 },
        lore: 'Absorbió a Gotenks: su velocidad y sus técnicas traviesas.' },
      { name: 'Super Buu (absorbe a Gohan)', aura: '#ffd0f0', bonus: 0.65, fx: { cd: 0.2 },
        lore: 'Absorbió a Gohan Místico: su forma más poderosa.' },
    ],
  };
  // hoja: [ancho, alto, archivo (si no es <hoja>-ssj)]
  const SHEETS = { 'goku~2': [32, 32], 'goku~3': [32, 32], 'goku~4': [32, 32], 'goku~5': [32, 32, 'goku~4-ssj'],
    'vegeta~2': [32, 32], 'vegeta~3': [32, 32], 'gohan~2': [34, 32],
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

  const baseChar = (P, id) => P.skinC || CHARACTERS[id];
  // El guerrero en su forma n (1 = la de siempre): una copia propia del jugador, el original no se toca
  // Con traje (js/mods/trajes.js), la forma se apoya en el traje: sin transformar se sigue viendo con él
  function formChar(P, id, n) {
    const base = baseChar(P, id), f = FORMS[id][n - 2];
    return { ...base, transform: f.name, aura: f.aura, transformBonus: (base.transformBonus || 0) + f.bonus,
      transformSprite: true, look: { ...base.look, id: `${base.look.id}~${n}` }, formOf: id, formFx: f.fx || {}, formDrain: f.drain || 1 };
  }
  window.FUSION_FORMS = FORMS;   // los trajes arman sus alias con esto

  // Para js/mods/ki.js: cuántas formas tiene, ponerlo en una forma y la lista completa (con la 1.ª)
  window.KiForms = {
    count: id => 1 + ((FORMS[id] || []).length),
    set(P, n) {
      const id = P.charId;
      P.formN = n;
      P.c = n <= 1 ? baseChar(P, id) : formChar(P, id, n);
    },
    list(id) {
      const c = CHARACTERS[id];
      return [{ name: c.transform, aura: c.aura, fx: {}, lore: FIRST[id] || '' }, ...(FORMS[id] || [])];
    },
  };

  // Transformarse desde el estado base siempre empieza en la 1.ª forma (después se sube con el botón de Ki)
  const orig = doTransform;
  doTransform = function (P, secs, force) {   // eslint-disable-line no-global-assign
    const id = P && P.charId;
    const will = P && !P.dead && !P.gone && !(P.c && P.c.buddy) && (force || (P.ki >= 100 && !(P.transformed > 0)));
    if (id && FORMS[id] && will && !(typeof G !== 'undefined' && G && G.fusion && G.fusion.ids && G.fusion.ids.includes(P.id))) window.KiForms.set(P, 1);
    return orig.apply(this, arguments);
  };

  // ─── Ficha del guerrero: sus formas, qué hace cada una y su historia ───
  const FX_TEXT = { spd: v => `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}% velocidad`, cd: v => `−${Math.round(v * 100)}% recarga`,
    def: v => `−${Math.round(v * 100)}% daño recibido`, regen: v => `cura ${(v * 100).toFixed(1)}% de vida/s`,
    dodge: v => `esquiva ${Math.round(v * 100)}%`, counter: () => 'contragolpe', shock: v => `descargas (${Math.round(v * 100)}%)` };
  const fxText = f => {
    const parts = [];
    if (f.bonus) parts.push(`+${Math.round(f.bonus * 100)}% daño extra`);
    for (const [k, v] of Object.entries(f.fx || {})) if (FX_TEXT[k]) parts.push(FX_TEXT[k](v));
    if (f.drain && f.drain !== 1) parts.push(f.drain < 1 ? 'gasta menos Ki' : 'gasta más Ki');
    return parts.join(' · ');
  };
  const box = document.createElement('details');
  box.id = 'formLore';
  const anchor = $('charDetail');
  if (anchor) anchor.after(box);
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const detail = updateCharDetail;
  updateCharDetail = function () {   // eslint-disable-line no-global-assign
    const r = detail.apply(this, arguments);
    const id = myChar(), c = CHARACTERS[id];
    if (!c || c.buddy) { box.style.display = 'none'; return r; }
    const list = window.KiForms.list(id), open = box.open;
    box.style.display = '';
    box.innerHTML = `<summary>${list.length > 1 ? `Formas de ${esc(c.name)} (${list.length})` : `Transformación de ${esc(c.name)}`} · cómo funciona el Ki</summary>`
      + '<ol>' + list.map((f, i) => `<li><b style="color:${f.aura}">${esc(f.name)}</b>${i ? ` <small>(${esc(fxText(f))})</small>` : ' <small>(+50% daño, técnicas más seguidas, +20% velocidad)</small>'}`
        + (f.lore ? `<br><i>${esc(f.lore)}</i>` : '') + '</li>').join('') + '</ol>'
      + '<p class="fl-help">Mantén el botón de Ki para cargarlo · con el Ki lleno, tócalo para transformarte · transformado gastas Ki: '
      + (list.length > 1 ? 'toca Ki para subir de forma (con 50% de Ki o más) y mantenlo para bajar · ' : 'mantén Ki para volver a tu estado base · ')
      + 'las formas altas gastan más y dan más.</p>';
    box.open = open;
    return r;
  };
  const css = document.createElement('style');
  css.textContent = `#formLore{max-width:620px;margin:4px auto;font-size:13px;text-align:left;background:rgba(10,15,46,.55);
      border:2px solid rgba(155,184,255,.35);border-radius:8px;padding:4px 10px}
    #formLore summary{cursor:pointer;color:var(--gold,#ffd93b);font-weight:700}
    #formLore ol{margin:6px 0 4px 18px;padding:0}#formLore li{margin:3px 0}#formLore i{color:#c9d6ff}
    #formLore small{color:#ffe9a8}.fl-help{margin:4px 0;color:#9fd8ff;font-size:12px}`;
  document.head.appendChild(css);
})();
