'use strict';
// ─── Fusión: trajes (sprites de DB Survivors) ───
// Algunos guerreros pueden elegir traje antes de jugar. Es solo la apariencia: técnicas, ventajas y formas son las
// mismas. Si el traje trae su versión transformada se usa; si no, al transformarse se ve como siempre.
// Se carga después de js/mods/formas.js (las formas de Goku/Vegeta/Gohan respetan el traje).
(() => {
  const KEY = 'fusion.skins';
  const SKINS = {
    gohan: [{ id: 'naranja', name: 'Traje naranja', file: 'skin-gohan-def' }, { id: 'escuela', name: 'Uniforme escolar', file: 'skin-gohan-escuela' }],
    vegeta: [{ id: 'armadura', name: 'Armadura Saiyajin', file: 'skin-vegeta-arm', ssj: 'skin-vegeta-arm-ssj' },
      // Con rastreador, como llegó a la Tierra (hoja de Harukanaru Goku Densetsu, Metal-Franky)
      { id: 'scouter', name: 'Armadura con rastreador', file: 'skin-vegeta-scouter', w: 27, h: 40, noKo: true }],
    ftrunks: [{ id: 'armadura', name: 'Armadura Saiyajin', file: 'skin-ftrunks-arm', ssj: 'skin-ftrunks-arm-ssj' }],
  };
  let chosen = {};
  try { chosen = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { chosen = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(chosen)); } catch (e) { /* sin almacenamiento */ } };

  // Hojas: <guerrero>@<traje>; transformado, la del traje o la de siempre; con formas, la forma de siempre
  const sheet = (file, ko, s = {}) => fusionSheet(file, s.w || (file.includes('escuela') ? 34 : 32), s.h || 32, ko && !s.noKo);
  for (const [id, list] of Object.entries(SKINS)) {
    for (const s of list) {
      const key = `${id}@${s.id}`;
      SPRITE_OVERRIDES[key] = sheet(s.file, true, s);
      SPRITE_OVERRIDES[`${key}:ssj`] = s.ssj ? sheet(s.ssj, false) : SPRITE_OVERRIDES[`${id}:ssj`];
      const forms = (window.FUSION_FORMS || {})[id] || [];
      forms.forEach((f, i) => {
        SPRITE_OVERRIDES[`${key}~${i + 2}`] = SPRITE_OVERRIDES[key];
        SPRITE_OVERRIDES[`${key}~${i + 2}:ssj`] = SPRITE_OVERRIDES[`${id}~${i + 2}:ssj`];
      });
    }
  }
  const skinOf = id => (SKINS[id] || []).find(s => s.id === chosen[id]) || null;

  // En la partida: el guerrero con su traje (una copia del jugador; el original no se toca)
  const mk = makePlayer;
  makePlayer = function (id, name, charId) {   // eslint-disable-line no-global-assign
    const P = mk.apply(this, arguments), s = P && skinOf(P.charId);
    if (s) { P.c = { ...P.c, look: { ...P.c.look, id: `${P.charId}@${s.id}` } }; P.skinC = P.c; }
    return P;
  };

  // Elegir traje: una fila bajo el detalle del guerrero, con un dibujo de cada traje
  const row = document.createElement('div');
  row.id = 'skinRow';
  const anchor = $('charList');   // arriba de la lista (y de sus pestañas): se ve sin bajar
  if (anchor) anchor.before(row);
  function render() {
    const id = myChar(), list = SKINS[id];
    if (!list || !isUnlocked(id)) { row.innerHTML = ''; row.style.display = 'none'; return; }
    row.style.display = 'flex';
    const opts = [{ id: '', name: 'Normal' }, ...list];
    row.innerHTML = `<b>Traje de ${CHARACTERS[id].name}:</b>` + opts.map(o => `<button type="button" class="sk-opt${(chosen[id] || '') === o.id ? ' on' : ''}" data-s="${o.id}">
      <canvas width="40" height="44"></canvas><span>${o.name}</span></button>`).join('');
    [...row.querySelectorAll('.sk-opt')].forEach((b, i) => {
      const o = opts[i], cx = b.querySelector('canvas').getContext('2d');
      cx.imageSmoothingEnabled = false;
      try { drawActor(cx, { ...CHARACTERS[id].look, id: o.id ? `${id}@${o.id}` : id }, 20, 30, { anim: 'idle', t: 0, noShadow: true }); } catch (e) { /* sin dibujo */ }
      b.onclick = () => { if (o.id) chosen[id] = o.id; else delete chosen[id]; save(); render(); if (typeof SFX !== 'undefined' && SFX.unlock) SFX.unlock(); };
    });
  }
  const detail = updateCharDetail;
  updateCharDetail = function () {   // eslint-disable-line no-global-assign
    const r = detail.apply(this, arguments);
    render();
    return r;
  };
  // Los dibujos necesitan las hojas: se vuelve a dibujar cuando ya cargaron
  addEventListener('load', () => setTimeout(render, 800));

  const css = document.createElement('style');
  css.textContent = `#skinRow{display:none;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;margin:6px 0}
    .sk-opt{display:flex;flex-direction:column;align-items:center;gap:2px;font:inherit;font-size:12px;padding:4px 8px;border-radius:8px;
      border:2px solid rgba(255,255,255,.25);background:rgba(10,15,46,.6);color:#fff;cursor:pointer}
    .sk-opt.on{border-color:var(--gold,#ffd93b);color:var(--gold,#ffd93b)}.sk-opt canvas{width:30px;height:33px;image-rendering:pixelated}`;
  document.head.appendChild(css);
})();
