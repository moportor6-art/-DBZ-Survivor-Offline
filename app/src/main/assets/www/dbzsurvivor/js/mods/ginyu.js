// ─── Ginyu: Cambio de cuerpo permanente, dos filas de técnicas y Adaptación del cuerpo ───
// · Botón "Cambio de cuerpo" (táctil 👤, tecla B), recarga 60 s: con el élite o jefe más cercano (nunca el final)
//   Ginyu toma su cuerpo PARA SIEMPRE: su aspecto y las técnicas del guerrero equivalente (tabla MAJIN de
//   js/mods/identidad.js). El cuerpo que deja se queda como enemigo débil y lento.
// · Conserva su nivel, mejoras, objetos, pasivas y Ki; el Ki se carga como siempre (js/mods/ki.js) y las
//   transformaciones son las del cuerpo robado.
// · Fila 1: sus técnicas. Fila 2: las del cuerpo (3 huecos). Disparan las dos. Al cambiar de cuerpo, las técnicas
//   nuevas heredan el nivel de las anteriores, hueco por hueco. Las cartas ofrecen técnicas de las dos filas.
// · Adaptación del cuerpo (hueco propio, no es carta ni cuenta para las pasivas): +1 grado cada 5 niveles del
//   jugador con un cuerpo puesto (máximo 6). La fila 2 también evoluciona (técnica al máximo + la mejora que pide). Cada grado: +0,3%/s de vida, +10% de carga de Ki, +8% de daño de la
//   fila 2. Grado 3: +1 proyectil (y un rayo más en abanico) en TODAS las técnicas; grado 6: +2, y además la firma
//   completa del dueño original (daño, defensa, velocidad, críticos, rematar, al golpear, al recibir, al derrotar,
//   al transformarse, cada cuadro y lo de una sola vez, como la vida extra de Cell). Al cambiar de cuerpo se queda la mitad de los grados.
// Estado en el jugador: cuerpo { id, c, name, lookId, enemy }, atk2 [{ id, lvl, cd }], adapt, adaptHit, cuerpoCd.
// Se guarda (js/mods/guardar.js lo copia por ser dato) y se manda a los invitados (js/mods/red.js).
(() => {
  const CD = 60, SLOTS2 = 3, MAXG = 6, OP = 1010;
  const esGinyu = P => !!P && P.charId === 'ginyup';
  const grado = P => (esGinyu(P) && P.cuerpo ? P.adapt || 0 : 0);
  const extra = P => { const g = grado(P); return g >= 6 ? 2 : g >= 3 ? 1 : 0; };
  const MAJ = () => window.MAJIN_TABLA || {};

  // ─── El cuerpo: aspecto y forma base (P.skinC: lo usan las formas y los trajes como base) ───
  function cuerpoBase(P) {
    const B = P.cuerpo, ch = B.c && CHARACTERS[B.c];
    const base = ch ? { ...ch } : { ...CHARACTERS.ginyup, look: (ENEMIES[B.enemy] || BOSSES.find(b => b.id === B.enemy) || {}).look || CHARACTERS.ginyup.look, ssjHair: null };
    base.name = `Ginyu (${B.name})`;
    base.kiBonus = (base.kiBonus || 0) + 0.1 * (P.adapt || 0);   // la Adaptación carga el Ki más rápido
    return base;
  }
  function vestir(P) {
    if (!P.cuerpo) return;
    P.skinC = cuerpoBase(P); P.skinC._k = claveDe(P);
    const n = P.transformed > 0 ? Math.min(P.formN || 1, formas(P)) : 1;
    window.KiForms ? window.KiForms.set(P, n) : (P.c = P.skinC);
  }
  const claveDe = P => P.cuerpo.name + '|' + (P.adapt || 0);
  const formas = P => 1 + ((window.FUSION_FORMS || {})[P.cuerpo && P.cuerpo.c] || []).length;

  // Las formas del cuerpo robado: KiForms trabaja con el id del guerrero; para Ginyu con cuerpo, el del cuerpo
  // Con dos Ginyu en el cooperativo, KiForms.count/list (que reciben solo 'ginyup') usan el que está pidiendo Ki
  // ahora (handleKi lo marca); si no, el propio
  let pidiendo = null;
  const ginyuActual = () => {
    const ok = q => q && esGinyu(q) && q.cuerpo;
    if (ok(pidiendo)) return pidiendo;
    if (ok(G.me)) return G.me;
    return G.players.find(q => ok(q) && !q.ally) || null;
  };
  if (window.KiForms) {
    const K = window.KiForms, set0 = K.set, count0 = K.count;
    K.set = function (P, n) {
      if (!(esGinyu(P) && P.cuerpo && P.cuerpo.c)) return set0.apply(this, arguments);
      const skin = P.skinC, id = P.charId;
      P.charId = P.cuerpo.c; P.skinC = null;
      try { set0.call(this, P, Math.min(n, formas(P))); } finally { P.charId = id; P.skinC = skin; }
      if (n <= 1) P.c = P.skinC;
      else P.c = { ...P.c, name: P.skinC.name, kiBonus: P.skinC.kiBonus };
    };
    const list0 = K.list;
    K.list = function (id) {
      if (id === 'ginyup' && G && G.players) { const P = ginyuActual(); if (P && P.cuerpo.c) return list0.call(this, P.cuerpo.c); }
      return list0.apply(this, arguments);
    };
    K.count = function (id) {
      if (id === 'ginyup' && G && G.players) { const P = ginyuActual(); if (P) return formas(P); }
      return count0.apply(this, arguments);
    };
  }

  // ─── Cambiar de cuerpo (en el anfitrión o jugando solo) ───
  function tecnicasDe(m, B) {
    const ids = [];
    if (B.c && CHARACTERS[B.c]) ids.push(CHARACTERS[B.c].start);
    for (const id of m.atk || []) ids.push(id);
    if (B.c) for (const id in ATTACKS) if (!ATTACKS[id].evolved && ATTACKS[id].users && ATTACKS[id].users.includes(B.c)) ids.push(id);
    return [...new Set(ids)].filter(id => ATTACKS[id]);
  }
  function cambiar(P) {
    if (!esGinyu(P) || P.dead || (P.cuerpoCd || 0) > 0 || G.mode !== 'play') return false;
    let e = null, bd = 320;
    for (const q of G.enemies) {
      if (q.dead || q.friend || q.final || !(q.elite || q.boss)) continue;
      const d = Math.hypot(q.x - P.x, q.y - P.y);
      if (d < bd) { bd = d; e = q; }
    }
    if (!e) { if (P === G.me) addText(P.x, P.y - 40, 'Ningún élite o jefe cerca', '#c27aff'); return false; }
    const m = MAJ()[e.id] || (e.def && MAJ()[e.def.id]) || { atk: ['kiblast'] };
    // El cuerpo que deja: un enemigo débil y lento con su aspecto actual
    const viejo = { look: (P.skinC || CHARACTERS.ginyup).look, name: P.cuerpo ? P.cuerpo.name : 'Ginyu' };
    try {
      spawnEnemy('soldier', { pos: { x: P.x, y: P.y } });
      const q = G.enemies[G.enemies.length - 1];
      if (q && q.id === 'soldier') { q.def = { ...q.def, name: viejo.name, look: viejo.look }; q.hp = q.maxHp = Math.max(30, q.maxHp * 0.6); q.speed *= 0.5; q.dmg *= 0.5; }
    } catch (err) { /* sin cuerpo viejo */ }
    // Ginyu toma el lugar y el cuerpo del élite o jefe
    P.x = e.x; P.y = e.y;
    e.dead = true; e.hp = 0; e.ginyuSwap = true;
    const name = (e.def && e.def.name) || 'Élite';
    const antes = P.atk2 || [];
    P.cuerpo = { id: e.id, c: m.c && CHARACTERS[m.c] ? m.c : null, name, enemy: e.id };
    const ids = tecnicasDe(m, P.cuerpo).filter(id => !P.attacks.some(a => a.id === id)).slice(0, SLOTS2);
    P.atk2 = ids.map((id, i) => ({ id, lvl: antes[i] ? antes[i].lvl : 1, cd: 0.5 + i * 0.2 }));   // heredan el nivel, hueco por hueco
    P.adapt = Math.floor((P.adapt || 0) / 2);   // cambiar cuesta: se queda la mitad
    P.cuerpoCd = CD;
    P.transformed = 0; P.charging = false;
    vestir(P);
    burst(P.x, P.y, '#c27aff', 40, 6, 4); ring(P.x, P.y, 120, 0.5, '#c27aff'); G.shake = Math.max(G.shake, 0.6); sfx('power', 0.4);
    addText(P.x, P.y - 44, '¡Cambio de cuerpo!', '#c27aff', true);
    announce(`¡Ginyu tomó el cuerpo de ${name}!`, '#c27aff');
    return true;
  }
  window.GinyuCuerpo = { cambiar, vestir, claveDe };

  // El botón llega al anfitrión como una orden de Ki (como las de js/mods/ki.js)
  const hk = handleKi;
  handleKi = function (P, ang) {   // eslint-disable-line no-global-assign
    if (ang === OP) { if (P) cambiar(P); return; }
    pidiendo = P;
    try { return hk.apply(this, arguments); } finally { pidiendo = null; }
  };
  function pedir() {
    const P = G && G.me;
    if (!esGinyu(P) || G.mode !== 'play') return;
    if (G.net && G.net.role === 'client') { try { Net.send({ t: 'tr', a: OP }); } catch (e) { /* sin red */ } }
    else cambiar(P);
  }

  // ─── Cada cuadro: recarga, Adaptación y la firma del dueño en grado máximo ───
  const up = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    const r = up.apply(this, arguments);
    if (!G || G.mode !== 'play') return r;
    for (const P of G.players) {
      if (!esGinyu(P) || P.gone) continue;
      if (P.cuerpoCd > 0) P.cuerpoCd -= dt;
      const hits = Math.floor((G.level || 1) / 5);
      if (P.adaptHit === undefined) P.adaptHit = hits;
      if (hits > P.adaptHit) {
        const n = hits - P.adaptHit; P.adaptHit = hits;
        if (P.cuerpo && (P.adapt || 0) < MAXG) {
          P.adapt = Math.min(MAXG, (P.adapt || 0) + n);
          if (P === G.me || !G.net) announce(`¡Adaptación grado ${P.adapt}!`, '#c27aff');
          if (P.adapt === MAXG && P === G.me) setTimeout(() => announce(`¡Ginyu domina el cuerpo de ${P.cuerpo.name}: su firma es tuya!`, '#ffd93b'), 1400);
        }
      }
      if (P.cuerpo && (!P.skinC || P.skinC._k !== claveDe(P))) vestir(P);   // al continuar, al llegar del anfitrión o al subir de grado
      const g = grado(P);
      if (g && !P.dead) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.003 * g * dt);
      const F = g >= MAXG && dueño(P);
      if (F && F.tick) { try { F.tick(P, dt); } catch (e) { /* nada */ } }
    }
    return r;
  };
  // Lo que la firma del dueño hace una sola vez (vida extra…) y al transformarse
  const up2 = update;
  update = function () {   // eslint-disable-line no-global-assign
    const r = up2.apply(this, arguments);
    if (!G || G.mode !== 'play') return r;
    for (const P of G.players) {
      if (!esGinyu(P) || P.gone || P.dead) continue;
      const F = grado(P) >= MAXG && dueño(P);
      if (F && F.setup && P._setupDe !== P.cuerpo.name) { P._setupDe = P.cuerpo.name; try { F.setup(P); } catch (e) { /* nada */ } }
      const tr = P.transformed > 0;
      if (F && F.transform && tr && !P._gTr) { try { F.transform(P); } catch (e) { /* nada */ } }
      P._gTr = tr;
    }
    return r;
  };
  const ps = playerSpeed;
  playerSpeed = function (P) {   // eslint-disable-line no-global-assign
    const F = grado(P) >= MAXG && dueño(P);
    return ps.apply(this, arguments) * (F && F.spd ? 1 + F.spd(P) : 1);
  };
  const de = damageEnemy;
  damageEnemy = function (e, amount, src, kb, owner, aid) {   // eslint-disable-line no-global-assign
    const F = owner && e && !e.dead && grado(owner) >= MAXG && dueño(owner);
    if (F) {
      if (F.vs) amount *= F.vs(owner, e, aid) || 1;
      if (F.crit && Math.random() < F.crit) amount *= 2;
      if (F.exec && !e.boss && e.hp - amount < e.maxHp * F.exec) amount = Math.max(amount, e.hp + 1);
      arguments[1] = amount;
    }
    const r = de.apply(this, arguments);
    if (F && F.hit) { try { F.hit(owner, e, aid); } catch (err) { /* nada */ } }
    return r;
  };
  const dueño = P => { const id = P.cuerpo && P.cuerpo.c; return id && id !== 'ginyup' && window.IDENTIDAD ? window.IDENTIDAD[id] : null; };

  // Firma del dueño en grado 6: daño, defensa y al derrotar
  const dm = dmgMult;
  dmgMult = function (P) {   // eslint-disable-line no-global-assign
    let r = dm.apply(this, arguments);
    const F = grado(P) >= MAXG && dueño(P);
    if (F && F.dmg) { try { r *= F.dmg(P) || 1; } catch (e) { /* nada */ } }
    return r;
  };
  const hp = hurtPlayer;
  hurtPlayer = function (P, amount) {   // eslint-disable-line no-global-assign
    const F = grado(P) >= MAXG && dueño(P);
    if (F && F.def) arguments[1] = amount * (1 - F.def);
    const antes = P ? P.hp : 0, r = hp.apply(this, arguments);
    if (F && F.hurt && P.hp < antes) { try { F.hurt(P, antes - P.hp); } catch (e) { /* nada */ } }
    return r;
  };
  const ke = killEnemy;
  killEnemy = function (e, owner) {   // eslint-disable-line no-global-assign
    const r = ke.apply(this, arguments);
    const F = owner && grado(owner) >= MAXG && dueño(owner);
    if (F && F.kill) { try { F.kill(owner, e); } catch (err) { /* nada */ } }
    return r;
  };

  // ─── Disparar las dos filas ───
  const fa = fireAttacks;
  fireAttacks = function (P, dt) {   // eslint-disable-line no-global-assign
    const r = fa.apply(this, arguments);
    if (esGinyu(P) && P.atk2 && P.atk2.length) {
      const a1 = P.attacks;
      P.attacks = P.atk2; P._fila2 = true;
      try { fa.call(this, P, dt); } finally { P.attacks = a1; P._fila2 = false; }
    }
    return r;
  };
  // Daño de la fila 2 y proyectiles extra por la Adaptación
  const as = attackStats;
  attackStats = function (P, id) {   // eslint-disable-line no-global-assign
    const s = as.apply(this, arguments);
    if (!esGinyu(P)) return s;
    if (P._fila2) s.dmg = (s.dmg || 0) * (1 + 0.08 * grado(P));
    const x = extra(P);
    if (x && s.count >= 1 && ATTACKS[id].type !== 'decoy' && ATTACKS[id].type !== 'buff') s.count += x;
    return s;
  };
  const ba = beamAngles;
  beamAngles = function (P) {   // eslint-disable-line no-global-assign
    const r = ba.apply(this, arguments), x = extra(P);
    if (!x) return r;
    const out = [...r];
    for (let i = 1; i <= x; i++) out.push(r[0] - 0.3 * i);   // rayos extra en abanico, del otro lado de los de Multiplicación
    return out;
  };

  // ─── Cartas: también las técnicas del cuerpo ───
  // Evolución de la fila 2: técnica al máximo + la mejora que pide (y que el cuerpo pueda aprenderla)
  const evoFila2 = (P, a) => {
    const evo = EVOLUTION_OF[a.id];
    return !!evo && !ATTACKS[a.id].evolved && a.lvl >= MAX_ATTACK_LEVEL && P.passives[ATTACKS[evo].needs] > 0 && canLearn(P.cuerpo.c || 'ginyup', evo);
  };
  const cp = cardPool;
  cardPool = function (P) {   // eslint-disable-line no-global-assign
    const opts = cp.apply(this, arguments);
    if (!esGinyu(P) || !P.cuerpo) return opts;
    const atk2 = P.atk2 || [];
    for (const a of atk2) if (a.lvl < MAX_ATTACK_LEVEL) opts.push({ kind: 'up', id: a.id, fila: 2 });
    for (const a of atk2) if (evoFila2(P, a)) opts.unshift({ kind: 'evolve', id: a.id, fila: 2 });   // las evoluciones, primero
    if (atk2.length < SLOTS2) {
      const m = MAJ()[P.cuerpo.id] || {};
      for (const id of tecnicasDe(m, P.cuerpo)) if (!atk2.some(a => a.id === id) && !P.attacks.some(a => a.id === id)) opts.push({ kind: 'new', id, fila: 2 });
    }
    const banned = new Set(P.banned || []);
    return opts.filter(o => !banned.has(optKey(o)));
  };
  const oc = optionCard;
  optionCard = function (P, o) {   // eslint-disable-line no-global-assign
    if (!(o && o.fila === 2 && esGinyu(P))) return oc.apply(this, arguments);
    const a1 = P.attacks;
    P.attacks = P.atk2 || [];
    try { const c = oc.apply(this, arguments); c.name = `${c.name} · cuerpo`; return c; } finally { P.attacks = a1; }
  };
  const ao = applyOption;
  applyOption = function (P, o) {   // eslint-disable-line no-global-assign
    if (!(o && o.fila === 2 && esGinyu(P))) return ao.apply(this, arguments);
    P.atk2 = P.atk2 || [];
    if (o.kind === 'up') { const a = P.atk2.find(x => x.id === o.id); if (a && a.lvl < MAX_ATTACK_LEVEL) a.lvl++; }
    else if (o.kind === 'evolve') {
      const a = P.atk2.find(x => x.id === o.id);
      if (a && evoFila2(P, a)) {
        const evo = ATTACKS[EVOLUTION_OF[a.id]];
        a.id = EVOLUTION_OF[a.id]; a.lvl = MAX_ATTACK_LEVEL; a.cd = 0.3;
        addText(P.x, P.y - 34, '¡{name}!', evo.color, true, { name: evo.name });
        if (P === G.me) announce('¡{name} evolucionó a {evo}!', '#ffd93b', { name: ATTACKS[o.id].name, evo: evo.name });
        sfx('power');
      }
    }
    else if (o.kind === 'new' && P.atk2.length < SLOTS2 && ATTACKS[o.id] && !P.atk2.some(x => x.id === o.id)) P.atk2.push({ id: o.id, lvl: 1, cd: 0.3 });
  };

  // ─── HUD: fila 2 con el hueco de la Adaptación ───
  const dl = drawLoadout;
  drawLoadout = function (P, top, compact) {   // eslint-disable-line no-global-assign
    const end = dl.apply(this, arguments);
    if (!esGinyu(P)) return end;
    const s = compact ? 26 : 30, gap = 3, y = end + gap + 1;
    // hueco propio de la Adaptación
    ctx.fillStyle = 'rgba(60,20,90,0.85)'; ctx.fillRect(8, y, s, s);
    ctx.strokeStyle = '#c27aff'; ctx.lineWidth = 2; ctx.strokeRect(9, y + 1, s - 2, s - 2);
    hudText('A', 8 + s / 2, y + s / 2 - 1, 12, '#e8c8ff', 'center');
    hudText(`${grado(P)}/${MAXG}`, 8 + s / 2, y + s - 3, 9, P.cuerpo ? '#ffd93b' : '#8a7aa0', 'center');
    hudSlots.push({ x: 8, y, s, kind: 'effect', tip: P.cuerpo ? `Adaptación al cuerpo de ${P.cuerpo.name}: grado ${grado(P)}/${MAXG}` : 'Adaptación: Ginyu todavía no tomó ningún cuerpo' });
    const atk2 = P.atk2 || [];
    for (let i = 0; i < SLOTS2; i++) {
      const x = 8 + (i + 1) * (s + gap), a = atk2[i];
      if (!a) { emptySlot(x, y, s); continue; }
      hudSlots.push({ x, y, s, kind: 'attack', id: a.id });
      const ev = !!ATTACKS[a.id].evolved;
      hudSlot(x, y, s, ev ? MAX_ATTACK_LEVEL : a.lvl, MAX_ATTACK_LEVEL, ev);
      if (ev) hudText('★', x + s - 6, y + 10, 10, '#ffd93b', 'center');
      drawAttackIcon(a.id, x + 3, y + 1, s - 6);
      if (!ev) hudSlotLevel(x, y, s, a.lvl, MAX_ATTACK_LEVEL);
      ctx.fillStyle = '#c27aff'; ctx.fillRect(x + 2, y + 2, 4, 4);
    }
    return y + s;
  };

  // ─── Botón táctil y tecla B ───
  const st = document.createElement('style');
  st.textContent = `#btnCuerpo { position: fixed; right: 18px; bottom: 150px; width: 62px; height: 62px; border-radius: 50%; z-index: 30;
      background: radial-gradient(#c27aff, #5a2a8a); color: #fff; border: 3px solid #0a0f2e; font: 700 11px sans-serif; line-height: 1.1; }
    #btnCuerpo.hidden { display: none; } #btnCuerpo[disabled] { filter: grayscale(0.8); opacity: 0.7; }`;
  document.head.appendChild(st);
  const btn = document.createElement('button');
  btn.id = 'btnCuerpo'; btn.className = 'hidden'; btn.type = 'button';
  btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); pedir(); });
  document.body.appendChild(btn);
  addEventListener('keydown', e => { if ((e.key === 'b' || e.key === 'B') && !e.repeat) pedir(); });
  setInterval(() => {
    const P = G && G.me, show = !!P && esGinyu(P) && document.body.classList.contains('playing') && G.mode !== 'over';
    btn.classList.toggle('hidden', !show);
    if (!show) return;
    const cd = Math.ceil(P.cuerpoCd || 0);
    btn.disabled = cd > 0;
    btn.innerHTML = cd > 0 ? `👤<br>${cd}s` : '👤<br>Cambio';
  }, 250);

  // ─── Firma nueva (la vieja se cambiaba al transformarse) ───
  if (window.IDENTIDAD && window.IDENTIDAD.ginyup) {
    const I = window.IDENTIDAD.ginyup;
    delete I.transform;
    I.dmg = P => (P.poseB > 0 ? 1.2 : 1);
    I.firma = 'Cambio de cuerpo (botón 👤 o tecla B, cada 60 s): toma para siempre el cuerpo del élite o jefe más cercano (no el final) con sus técnicas en una segunda fila de 3 huecos y sus transformaciones. Adaptación: +1 grado cada 5 niveles (máx. 6): más vida, Ki y daño del cuerpo; proyectiles extra en el grado 3 y 6, y en el 6 la firma del dueño original. Cada 20 s, pose de combate: +20% de daño 6 s.';
  }
})();
