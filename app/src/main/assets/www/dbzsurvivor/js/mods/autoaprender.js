// ─── Auto-aprender: elige solo las cartas al subir de nivel ─────────────────
// Con la opción encendida (botón 🤖 de la partida, pausa → Opciones, o el botón en la pantalla de subir de nivel), la carta se elige
// sola a los 0,45 s. Cómo puntúa cada carta:
//   · Evolución (fusión de técnica + mejora): siempre primero.
//   · Técnicas: la inicial y las propias del guerrero (las que casi nadie más tiene) primero; después las que
//     tienen evolución, sobre todo si ya tienes la mejora que piden. Subir de nivel lo que ya tienes vale más
//     cuanto más cerca está del máximo (para llegar a la evolución).
//   · Mejoras: la que le falta a una de tus técnicas para evolucionar vale mucho (más cuanto más subida esté la
//     técnica); el resto según el estilo de cada guerrero (tanque, crítico, rayos, velocidad, furia, invocador…).
//   · Relleno (curarse, Ki, Zeni…): casi nunca, salvo curarse con poca vida.
// Guarda la opción en localStorage 'fusion.auto'. Los deseos de Shenlong siguen siendo a mano.
(() => {
  const KEY = 'fusion.auto';
  const on = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const set = v => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* nada */ } syncUi(); };

  // Estilos: qué mejoras prefiere cada tipo de guerrero (en orden)
  const ESTILO = {
    base: ['power', 'focus', 'crit', 'area', 'multi', 'vital', 'tracker', 'kictl', 'speed', 'armor', 'sustain', 'regen', 'sense', 'fury', 'absorb', 'instinct', 'meditate', 'gravity', 'kiai', 'senzubag', 'aura', 'luck'],
    tanque: ['vital', 'armor', 'regen', 'power', 'aura', 'focus', 'absorb', 'area', 'crit', 'senzubag'],
    critico: ['crit', 'power', 'focus', 'tracker', 'multi', 'speed', 'vital'],
    rayos: ['power', 'focus', 'sustain', 'area', 'multi', 'kictl', 'crit', 'vital'],
    veloz: ['speed', 'power', 'crit', 'focus', 'instinct', 'vital'],
    furia: ['fury', 'power', 'vital', 'crit', 'focus', 'regen'],
    invocador: ['vital', 'focus', 'armor', 'regen', 'power', 'area', 'sense'],
    jefes: ['tracker', 'power', 'crit', 'focus', 'vital'],
    ki: ['kictl', 'power', 'focus', 'crit', 'vital', 'area'],
  };
  const QUIEN = {
    tanque: ['piccolo', 'recoomep', 'spopovichp', 'a17p', 'a16p', 'olibu', 'majinbuu', 'dendep', 'popop', 'zamasu', 'yajirobe', 'a13p', 'coolerp'],
    critico: ['tien', 'a18p', 'black', 'videl', 'yamup', 'daburap'],
    rayos: ['goku', 'roshi', 'gohanf', 'pan', 'gogetap', 'vegetto', 'cellp', 'freezerp', 'kidbuup', 'a19p', 'gerop'],
    veloz: ['burterp', 'goten', 'gotenks', 'yamcha', 'janembap', 'pikkonp'],
    furia: ['gohan', 'gohanc', 'vegeta', 'broly'],
    invocador: ['babidip', 'bulmap', 'nappap', 'jeicep', 'puipuip', 'yakonp'],
    jefes: ['trunks', 'ftrunks', 'saiyaman', 'raditzp', 'taop', 'krilin'],
    ki: ['ginyup'],
  };
  const estiloDe = id => { for (const k in QUIEN) if (QUIEN[k].includes(id)) return [...ESTILO[k], ...ESTILO.base.filter(x => !ESTILO[k].includes(x))]; return ESTILO.base; };

  const lvlOf = (P, id) => { const a = P.attacks.find(x => x.id === id); return a ? a.lvl : 0; };
  const propia = (P, id) => { const u = ATTACKS[id] && ATTACKS[id].users; return !!u && u.includes(P.charId) && u.length <= 3; };
  const evoDe = (P, id) => { const e = EVOLUTION_OF[id]; return e && canLearn(P.charId, e) ? e : null; };
  // Mejoras que le faltan a tus técnicas para evolucionar → peso según el nivel de la técnica
  function faltan(P) {
    const m = {};
    for (const a of P.attacks) {
      const e = evoDe(P, a.id);
      if (e && !(P.passives[ATTACKS[e].needs] > 0)) m[ATTACKS[e].needs] = Math.max(m[ATTACKS[e].needs] || 0, a.lvl);
    }
    return m;
  }

  function puntaje(P, o) {
    const start = P.c.start || (CHARACTERS[P.charId] || {}).start;
    switch (o.kind) {
      case 'evolve': return 1000;
      case 'new': {
        let s = 58 - P.attacks.length * 7 - (ATTACKS[o.id].users ? 0 : 6);   // las genéricas (de todos) valen un poco menos
        if (o.id === start) s += 40;
        if (propia(P, o.id)) s += 25;
        const e = evoDe(P, o.id);
        if (e) s += 18 + (P.passives[ATTACKS[e].needs] > 0 ? 22 : 0);
        return s;
      }
      case 'up': {
        const lvl = lvlOf(P, o.id), e = evoDe(P, o.id);
        let s = 52 + lvl * 6;
        if (e) s += P.passives[ATTACKS[e].needs] > 0 ? 28 : 10;
        if (o.id === start || propia(P, o.id)) s += 8;
        return s;
      }
      case 'passive': {
        const est = estiloDe(P.charId), rank = est.indexOf(o.id), need = faltan(P)[o.id];
        let s = rank < 0 ? 6 : Math.max(8, 46 - rank * 4);
        if (need !== undefined) s += 40 + need * 6;
        if (P.passives[o.id] > 0) s += 3;   // subir lo que ya tienes antes que abrir casilla
        if (o.id === 'multi' && P.attacks.some(a => /count/.test(JSON.stringify(ATTACKS[a.id].stats ? ATTACKS[a.id].stats(1) : {})))) s += 10;
        return s;
      }
      case 'heal': return P.hp < P.maxHp * 0.45 ? 85 : 4;
      case 'ki': return P.transformed > 0 || P.ki > 70 ? 3 : 10;
      case 'zeni': return 2;
      default: return 7;   // train, body
    }
  }
  function mejor(P, opts) {
    let bi = 0, bs = -1;
    opts.forEach((o, i) => { const s = puntaje(P, o); if (s > bs) { bs = s; bi = i; } });
    return bi;
  }
  window.AutoAprender = { on, set, puntaje, mejor };

  // ─── Elegir solo ───
  const show = showLevelChoices;
  showLevelChoices = function (r) {   // eslint-disable-line no-global-assign
    const res = show.apply(this, arguments);
    addToggle();
    if (on() && G && G.me && !G.me.dead) {
      const opts = levelOpts.slice(), i = mejor(G.me, opts), rid = r.id;
      const btn = document.querySelectorAll('#choices .choice')[i];
      if (btn) btn.classList.add('auto-pick');
      setTimeout(() => {
        if (!on() || !G || !G.round || G.round.id !== rid || $('levelup').classList.contains('hidden') || levelOpts[i] !== opts[i]) return;
        pickChoice(rid, opts[i]);
      }, 450);
    }
    return res;
  };

  // ─── Botones para encenderlo ───
  const st = document.createElement('style');
  st.textContent = `#choices .choice.auto-pick { outline: 4px solid #7dff6a; outline-offset: 2px; }
    #autoBtn { margin: 8px auto 0; display: block; } .auto-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; }`;
  document.head.appendChild(st);
  function addToggle() {
    let b = $('autoBtn');
    if (!b) {
      b = document.createElement('button');
      b.id = 'autoBtn'; b.className = 'btn small ghost';
      b.onclick = () => {
        set(!on());
        const r = G && G.round;   // al encenderlo con las cartas a la vista, elige ya
        if (on() && r && r.kind === 'level' && !$('levelup').classList.contains('hidden')) showLevelChoices(r, levelOpts);
      };
    }
    $('levelup').appendChild(b);
    syncUi();
  }
  let row = null;
  try {
    const host = document.querySelector('.pause-opts');
    if (host) {
      row = document.createElement('label');
      row.className = 'vol-row auto-row';
      row.innerHTML = '🤖 Auto-aprender mejoras <input type="checkbox" id="autoChk">';
      row.querySelector('input').addEventListener('change', e => set(e.target.checked));
      host.appendChild(row);
    }
  } catch (e) { /* sin opción en la pausa */ }
  // Botón 🤖 en la partida (junto a mapa, música y pausa; se puede mover con el editor del HUD)
  const fab = document.createElement('button');
  fab.id = 'btnAuto'; fab.className = 'btn-music btn-auto';
  fab.textContent = '🤖';
  fab.title = 'Auto-aprender mejoras (toca para encender o apagar)';
  fab.onclick = e => {
    set(!on());
    if (typeof sayHud === 'function') sayHud(on());
    e.currentTarget.blur();
  };
  document.body.appendChild(fab);
  // Aviso corto al tocarlo (usa el anuncio del juego si hay partida)
  function sayHud(v) { try { if (G && G.me) announce(v ? '🤖 Auto-aprender: SÍ' : '🤖 Auto-aprender: NO', v ? '#7dff6a' : '#ffb0bc'); } catch (e) { /* nada */ } }
  const st2 = document.createElement('style');
  st2.textContent = `.btn-music.btn-auto { display: none; font-size: 18px; padding: 0; }
    body.playing .btn-music.btn-auto { display: block; right: calc(196px + var(--sb, 0px)); }
    @media (max-width: 599px) { body.playing .btn-music.btn-auto { top: auto; bottom: 96px; right: auto; left: 12px; } }`;
  document.head.appendChild(st2);

  function syncUi() {
    const f = $('btnAuto');
    if (f) f.classList.toggle('off', !on());
    const b = $('autoBtn');
    if (b) b.textContent = on() ? '🤖 Auto-aprender: SÍ (toca para elegir tú)' : '🤖 Auto-aprender: NO';
    const c = $('autoChk');
    if (c) c.checked = on();
  }
  syncUi();
})();
