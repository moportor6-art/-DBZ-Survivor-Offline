// ─── Guardar partida y continuar ────────────────────────────────────────────
// · Pausa → "💾 Guardar y salir": guarda la partida y vuelve al menú.
// · Si la app se cierra o pasa a segundo plano en medio de una partida, se guarda sola (y cada 20 s de juego).
// · En el menú aparece "▶ Continuar" con el guerrero, el nivel y el tiempo; al continuar, la partida arranca en pausa.
// La partida guardada se borra al continuarla, al empezar otra o cuando termina (así no se puede repetir un final).
// Se guarda lo que es dato (jugador, enemigos, jefes, objetos, tiempo, niveles, esferas…); lo que se vuelve a armar
// solo (el compañero, los dibujos, los proyectiles en el aire) no. No se puede en línea, en el desafío semanal ni
// en el Camino de la Serpiente. localStorage 'fusion.partida'.
(() => {
  const KEY = 'fusion.partida', VER = 1;
  const SKIP = new Set(['c', 'skinC', 'summon', 'mark', 'owner', 'target', 'def', 'friend', 'tx', 'ty', 'sx', 'sy']);
  const SKIP_G = new Set(['players', 'enemies', 'projs', 'beams', 'ebeams', 'zones', 'decoys', 'helpers', 'novas', 'shots', 'hazards', 'lanes',
    'fx', 'texts', 'out', 'emitted', 'lv', 'weekly', 'net', 'me', 'round', 'fusion', 'banner', 'snake', 'mode', 'menuOpen', 'shake', 'blind', 'hitStop', 'slowmo', 'flashT']);
  const puede = () => G && G.me && !G.net && !G.weekly && !G.lv.bonus && !G.snake && G.mode !== 'over' && !G.quit;

  // Copia solo los datos (nada de referencias a otros jugadores o enemigos, ni objetos con clase)
  function datos(obj, skip) {
    const refs = new Set([...(G.players || []), ...(G.enemies || [])]);
    const seen = new WeakSet();
    return JSON.parse(JSON.stringify(obj, function (k, v) {
      if (k && skip.has(k)) return undefined;
      if (v && typeof v === 'object') {
        if (k !== '' && refs.has(v)) return undefined;
        if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype) return undefined;
        if (seen.has(v)) return undefined;
        seen.add(v);
      }
      if (typeof v === 'number' && !isFinite(v)) return v > 0 ? 1e9 : -1e9;
      return v;
    }));
  }

  function foto() {
    const g = {};
    for (const k in G) if (!SKIP_G.has(k)) g[k] = G[k];
    const P = G.me;
    const enemigos = G.enemies.filter(e => !e.dead && !e.friend).map(e => {
      const d = datos(e, SKIP), d0 = e.boss ? BOSSES.find(b => b.id === e.id) : ENEMIES[e.id];
      d.defName = e.def && d0 && e.def.name !== d0.name ? e.def.name : null;
      d.defLook = e.def && d0 && e.def.look !== d0.look ? (e.def.look && e.def.look.id) || null : null;
      return d;
    });
    return {
      v: VER, fecha: Date.now(), nivel: G.lv.id, speed: G.speed,
      g: datos(g, new Set()), yo: datos(P, SKIP), enemigos,
      resumen: { guerrero: P.c.name, charId: P.charId, nivelNum: G.lv.num, t: Math.floor(G.t), lvl: G.level },
    };
  }
  function guardar() {
    if (!puede()) return false;
    try { localStorage.setItem(KEY, JSON.stringify(foto())); return true; } catch (e) { return false; }
  }
  const leer = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.v === VER ? s : null; } catch (e) { return null; } };
  const borrar = () => { try { localStorage.removeItem(KEY); } catch (e) { /* nada */ } syncMenu(); };

  function continuar() {
    const s = leer();
    if (!s || !levelDef(s.nivel) || !CHARACTERS[s.yo.charId]) { borrar(); return; }
    restaurando = true;
    try {
      newGame([{ id: 0, name: s.yo.name || myName(), charId: s.yo.charId, perks: s.yo.perks || myPerks() }], null, 0, s.speed || 1, s.nivel);
    } finally { restaurando = false; }
    Object.assign(G, s.g);
    G.round = null; G.mode = 'play'; G.banner = null;
    const P = G.me;
    Object.assign(P, s.yo);
    P.hidden = false; P.charging = false; P.fuseReq = 0;
    if (window.KiForms && window.KiForms.count(P.charId) > 1) window.KiForms.set(P, P.transformed > 0 ? Math.min(P.formN || 1, window.KiForms.count(P.charId)) : 1);
    G.enemies = [];
    for (const d of s.enemigos) {
      const def0 = d.boss ? (typeof bossDef === 'function' && bossDef(d.id)) || BOSSES.find(b => b.id === d.id) : ENEMIES[d.id];
      if (!def0) continue;
      let def = def0;
      if (d.defName) def = { ...def, name: d.defName };
      if (d.defLook) { const L = (ENEMIES[d.defLook] && ENEMIES[d.defLook].look) || ((BOSSES.find(b => b.id === d.defLook) || {}).look); if (L) def = { ...def, look: L }; }
      const e = { ...d, def };
      delete e.defName; delete e.defLook;
      G.enemies.push(e);
    }
    borrar();   // ya se usó: si vuelves a salir, se guarda de nuevo
    announce('¡Partida recuperada! Toca continuar cuando estés listo', '#7dff6a');
    togglePause();
  }
  let restaurando = false;
  window.Partida = { guardar, leer, borrar, continuar };

  // Una partida nueva o terminada borra la guardada
  const ng = newGame;
  newGame = function () { if (!restaurando) borrar(); return ng.apply(this, arguments); };   // eslint-disable-line no-global-assign
  const er = endRun;
  endRun = function () { if (G && G.mode !== 'over') borrar(); return er.apply(this, arguments); };   // eslint-disable-line no-global-assign

  // Autoguardado al cerrar la app o mandarla a segundo plano
  const auto = () => { if (puede()) guardar(); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') auto(); });
  addEventListener('pagehide', auto);

  // y cada 20 s de juego, por si la app se cierra de golpe (o el teléfono la mata en segundo plano)
  let cada = 0;
  const up = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    const r = up.apply(this, arguments);
    if ((cada += dt) >= 20) { cada = 0; auto(); }
    return r;
  };

  // ─── Botones ───
  const st = document.createElement('style');
  st.textContent = `#btnContinue { background: linear-gradient(#7dff6a, #3dbf3a); color: #0a0f2e; } #btnContinue small { display: block; font-size: 12px; font-weight: 600; }
    #btnSaveQuit { background: #3d8bff; color: #fff; }`;
  document.head.appendChild(st);
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function syncMenu() {
    const b = document.getElementById('btnContinue');
    if (!b) return;
    const s = leer();
    b.classList.toggle('hidden', !s);
    if (s) b.innerHTML = `▶ Continuar<small>${s.resumen.guerrero} · Nivel ${s.resumen.nivelNum} · ${fmt(s.resumen.t)} · Nv ${s.resumen.lvl}</small>`;
  }
  try {
    const solo = $('btnSolo');
    const b = document.createElement('button');
    b.id = 'btnContinue'; b.className = 'btn btn-play hidden';
    b.addEventListener('click', () => { SFX.unlock(); continuar(); });
    solo.parentNode.insertBefore(b, solo);
    const q = document.createElement('button');
    q.id = 'btnSaveQuit'; q.className = 'btn';
    q.textContent = '💾 Guardar y salir';
    q.addEventListener('click', () => {
      if (!guardar()) { q.textContent = 'No se puede guardar aquí'; setTimeout(() => { q.textContent = '💾 Guardar y salir'; }, 2000); return; }
      toMenu();
    });
    $('btnQuit').parentNode.insertBefore(q, $('btnQuit'));
    const bm = buildMenu;
    buildMenu = function () { const r = bm.apply(this, arguments); syncMenu(); return r; };   // eslint-disable-line no-global-assign
    const tp = togglePause;
    togglePause = function () { const r = tp.apply(this, arguments); q.classList.toggle('hidden', !puede()); return r; };   // eslint-disable-line no-global-assign
    syncMenu();
  } catch (e) { /* sin botones */ }
})();
