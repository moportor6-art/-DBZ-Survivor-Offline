// ─── Cooperativo: lo que agregan los mods también se ve en los invitados ─────
// La instantánea del anfitrión (js/net.js) solo lleva lo del juego base. Sin tocar net.js, el anfitrión manda
// cada 0,3 s un aviso de texto "invisible" (evento 't' con el texto MARCA) cuyos parámetros traen el estado
// de los mods; en el invitado, localText lo intercepta y lo aplica en vez de dibujarlo:
//   p: [id, forma, banderas (1 cargando Ki · 2 Ozaru · 4 Ki infinito), nid marcado por Raditz]
//   a: aliados invocados / compañero [id, guerrero, nombre, etiqueta]  (el invitado crea su copia para dibujarlos)
//   e: enemigos cambiados por los mods [nid, marca, Majin, nombre, aspecto, escala]
//   b: cuentas atrás de jefes [nid, Namek, autodestrucción]
(() => {
  const MARCA = '\u0001mods';
  const defOrig = e => (e.boss ? BOSSES.find(b => b.id === e.id) : ENEMIES[e.id]) || e.def;
  const r1 = v => Math.round(v * 10) / 10;

  function estado() {
    const p = [], a = [], e = [], b = [];
    for (const P of G.players) {
      if (P.gone) continue;
      p.push([P.id, P.formN || 1, (P.charging ? 1 : 0) | (P.ozaru ? 2 : 0) | (P.freeKi > 0 ? 4 : 0), P.mark && !P.mark.dead ? P.mark.nid : 0]);
      if (P.ally && P.summon) a.push([P.id, P.charId, P.name, P.summon.tag || '']);
    }
    for (const q of G.enemies) {
      if (q.dead) continue;
      const d0 = defOrig(q), cambia = q.def !== d0;
      if (!q.friend && !q.majin && !cambia) continue;
      e.push([q.nid, q.friend ? q.friend.mark || '' : '', q.majin ? 1 : 0, cambia && q.def.name !== d0.name ? q.def.name : '',
        cambia && q.def.look !== d0.look ? (q.def.look && q.def.look.id) || '' : '', r1(q.scale)]);
      if (q.jf && (q.jf.doom > 0 || q.jf.sd > 0)) b.push([q.nid, r1(q.jf.doom || 0), r1(q.jf.sd || 0)]);
    }
    return { p, a, e, b };
  }

  let acc = 0;
  const up = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    const r = up.apply(this, arguments);
    if (G && G.net && G.net.role === 'host' && (acc += dt) >= 0.3) { acc = 0; emit(['t', 0, 0, MARCA, '#000', 0, estado()]); }
    return r;
  };

  function aplicar(s) {
    if (!G || !s) return;
    for (const [id, charId, name, tag] of s.a || []) {   // aliados que el invitado todavía no tiene
      if (G.players.some(P => P.id === id) || !CHARACTERS[charId]) continue;
      try {
        const A = makePlayer(id, name, charId, {});
        A.ally = true; A.summon = { t: 1e9, tag, keep: true };
        if (G.me) { A.x = G.me.x; A.y = G.me.y; }
        G.players.push(A);
      } catch (err) { /* sin copia: no se dibuja */ }
    }
    for (const [id, n, f, mark] of s.p || []) {
      const P = G.players.find(q => q.id === id);
      if (!P) continue;
      if ((P.formN || 1) !== n && window.KiForms && 1 + ((window.FUSION_FORMS || {})[P.charId] || []).length >= n) window.KiForms.set(P, n);   // (sin la maestría: esa es del anfitrión)
      P.charging = !!(f & 1); P.ozaru = !!(f & 2); P.freeKi = f & 4 ? 1 : 0;
      P.mark = mark ? G.enemies.find(q => q.nid === mark) || null : null;
    }
    const byNid = new Map(G.enemies.map(q => [q.nid, q]));
    for (const [nid, mark, majin, name, look, scale] of s.e || []) {
      const q = byNid.get(nid);
      if (!q) continue;
      q.friend = mark ? { mark } : null; q.majin = !!majin;
      if (name && q.def.name !== name) q.def = { ...q.def, name };
      if (look && (!q.def.look || q.def.look.id !== look)) {
        const L = (ENEMIES[look] && ENEMIES[look].look) || ((BOSSES.find(x => x.id === look) || {}).look);
        if (L) q.def = { ...q.def, look: L };
      }
      q.scale = scale;
    }
    for (const q of G.enemies) if (q.jf) q.jf.doom = q.jf.sd = 0;
    for (const [nid, doom, sd] of s.b || []) { const q = byNid.get(nid); if (q) q.jf = { doom, sd }; }
  }

  const lt = localText;
  localText = function (x, y, text, color, big, params) {   // eslint-disable-line no-global-assign
    if (text === MARCA) { try { aplicar(params); } catch (err) { /* estado incompleto: se ignora */ } return; }
    return lt.apply(this, arguments);
  };
})();
