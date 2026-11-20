'use strict';
// ─── Fusión: pestañas para filtrar la lista de guerreros (con 37 la lista se volvió muy larga) ───
// Solo oculta tarjetas con CSS: las tarjetas, su diseño y su lógica son las de siempre. Se carga después de js/game.js.
(() => {
  const KEY = 'fusion.charFilter';
  let filter = 'all';
  try { filter = localStorage.getItem(KEY) || 'all'; } catch (e) { /* sin almacenamiento */ }

  const list = $('charList');
  if (!list) return;
  const bar = document.createElement('div');
  bar.className = 'fc-tabs';
  list.before(bar);

  const TABS = [['all', 'Todos'], ['classic', 'Clásicos'], ['fusion', 'Fusión'], ['own', 'Disponibles']];
  function apply() {
    const cards = [...list.children], n = { all: 0, classic: 0, fusion: 0, own: 0 };
    for (const card of cards) {
      const c = CHARACTERS[card._id];
      if (!c) continue;
      const fusion = !!c.fusion, own = !card.classList.contains('locked');
      n.all++; n[fusion ? 'fusion' : 'classic']++; if (own) n.own++;
      const show = filter === 'all' || (filter === 'fusion' ? fusion : filter === 'classic' ? !fusion : own);
      card.classList.toggle('fc-hide', !show);
    }
    bar.innerHTML = TABS.map(([id, label]) => `<button type="button" class="fc-tab${id === filter ? ' on' : ''}" data-f="${id}">${label} (${n[id]})</button>`).join('');
    for (const b of bar.children) b.onclick = () => {
      filter = b.dataset.f;
      try { localStorage.setItem(KEY, filter); } catch (e) { /* sin almacenamiento */ }
      apply();
    };
  }

  const build = buildMenu;
  buildMenu = function () {   // eslint-disable-line no-global-assign
    const r = build.apply(this, arguments);
    apply();
    return r;
  };

  const css = document.createElement('style');
  css.textContent = `.fc-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px}
    .fc-tab{font:inherit;font-size:13px;padding:5px 12px;border-radius:999px;border:2px solid rgba(255,255,255,.25);
      background:rgba(10,15,46,.6);color:#fff;cursor:pointer}
    .fc-tab.on{border-color:var(--gold,#ffd93b);color:var(--gold,#ffd93b)}
    .char-card.fc-hide{display:none!important}`;
  document.head.appendChild(css);
})();
