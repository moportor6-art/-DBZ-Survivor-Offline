'use strict';
// ─── Todo en local ─────────────────────────────────────────────────────────────
// La app no tiene cuentas, donaciones ni enlaces hacia afuera:
//  · Se quitan los pedidos de donación (menú, créditos y fin de partida) y la meta del mes.
//  · Ningún enlace ni window.open sale del juego: los créditos quedan como texto.
//  · El ranking es local: tus mejores partidas en este teléfono (localStorage 'fusion.ranking').
//  · Lo que necesitaba el servidor del autor (reportes, tablón, cartel del menú, desafío semanal) no se muestra.
(() => {
  const EN = () => typeof LANG !== 'undefined' && LANG === 'en';

  // 1) Donaciones: sin contenido y sin pedidos
  if (typeof Support !== 'undefined') { Support.render = () => {}; Support.setGoal = () => {}; Support.endAsk = () => {}; }

  // 2) Afuera no se va: los enlaces externos y window.open no hacen nada
  const externo = href => { try { const u = new URL(href, location.href); return u.origin !== location.origin && !/^(blob|data):/.test(u.protocol); } catch (e) { return false; } };
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a && externo(a.getAttribute('href'))) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  const abrir = window.open;
  window.open = (url, ...r) => (url && externo(url) ? null : abrir.call(window, url, ...r));

  function limpiar() {
    // Bloques de donación
    for (const id of ['support', 'goSupport']) { const el = document.getElementById(id); if (el) el.remove(); }
    const cr = document.getElementById('creditsSupport'); if (cr && cr.closest('section')) cr.closest('section').remove();
    // Enlaces de los créditos → texto
    for (const a of document.querySelectorAll('a[href]')) {
      if (!externo(a.getAttribute('href'))) continue;
      const s = document.createElement('span'); s.className = a.className; s.innerHTML = a.innerHTML; a.replaceWith(s);
    }
    // Rastros de la web en la cabecera
    for (const el of document.querySelectorAll('link[rel="canonical"],link[rel="alternate"],meta[property^="og:"],meta[name^="twitter:"],script[type="application/ld+json"]')) el.remove();
  }
  limpiar();
  // El nombre del autor (game.js le pone href a .author-link) queda como texto aunque se vuelva a armar
  for (const a of document.querySelectorAll('.author-link')) a.removeAttribute('href');

  // 3) Lo que dependía del servidor, oculto
  const st = document.createElement('style');
  st.textContent = '#btnBoard,#btnReport,#btnReportPause,#btnBoardReport,#motd,.rk-beta,.rk-view[data-view="weekly"],#support,#goSupport,.support{display:none!important}';
  document.head.appendChild(st);

  // 4) Ranking local, con la misma forma que la API del juego
  const KEY = 'fusion.ranking', TOPE = 100;
  const leer = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const guardar = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
  // Primero las victorias (menos tiempo), después las derrotas (más tiempo aguantado)
  const orden = (a, b) => (b.won - a.won) || (a.won ? a.cs - b.cs : b.cs - a.cs) || a.date - b.date;
  const resp = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
  const lista = (d, level, char) => (d[level] || []).filter(e => !char || e.char === char).sort(orden).map((e, i) => ({ ...e, pos: i + 1 }));

  const fetchBase = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return fetchBase(input, init);
    if (url.pathname !== '/api/ranking') return resp({ error: 'offline' }, 404);   // reportes, tablón, cartel: no hay
    const q = url.searchParams;
    if (q.get('weekly')) return resp({ error: 'offline' }, 404);                       // el desafío semanal lo daba el servidor
    const d = leer();
    if ((init.method || 'GET').toUpperCase() === 'POST') {
      let e; try { e = JSON.parse(init.body); } catch (err) { return resp({ error: 'bad' }, 400); }
      if (!e || !e.level || !e.char) return resp({ error: 'bad' }, 400);
      e.date = Date.now(); e.cs = Number.isFinite(e.cs) ? e.cs : (e.secs || 0) * 100;
      const arr = (d[e.level] || []).concat(e).sort(orden).slice(0, TOPE);
      d[e.level] = arr; guardar(d);
      const todos = lista(d, e.level), conChar = lista(d, e.level, e.char);
      const pos = (todos.find(x => x.date === e.date) || {}).pos, charPos = (conChar.find(x => x.date === e.date) || {}).pos;
      return resp({ pos: pos || 0, total: todos.length, charPos: charPos || 0, charTotal: conChar.length });
    }
    const all = lista(d, q.get('level'), q.get('char'));
    return resp({ entries: all.slice(0, +q.get('limit') || 10), total: all.length });
  };

  // Textos del ranking: ahora son tus partidas en este teléfono
  const avisos = () => {
    const rk = document.getElementById('rankContent');
    if (rk && !rk.querySelector('.rk-local')) {
      const p = document.createElement('p'); p.className = 'hint rk-local';
      p.textContent = EN() ? 'Local ranking: your best runs on this device.' : 'Ranking local: tus mejores partidas en este dispositivo.';
      rk.prepend(p);
    }
  };
  const rkBox = document.getElementById('rankContent');
  if (rkBox) new MutationObserver(avisos).observe(rkBox, { childList: true });

  // La pregunta del final habla de "publicar": se guarda en tu ranking local
  if (typeof rankSubmit === 'function') {
    const base = rankSubmit;
    rankSubmit = function (entry) {
      base.apply(this, arguments);
      const b = document.querySelector('#goRank .rk-ask b');
      if (b) b.textContent = EN() ? 'Save this run in your local ranking?' : '¿Guardar esta partida en tu ranking local?';
      const s = document.getElementById('goRankSend'); if (s) s.textContent = EN() ? 'Save' : 'Guardar';
    };
  }
})();
