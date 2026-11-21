'use strict';
// ─── Mod: Ki estilo Earth Special Forces ───
// Antes: el Ki solo subía derrotando enemigos y la transformación duraba 20 s fijos. Ahora:
//   · Cargar Ki: mantener el botón de Ki SIN estar transformado lo carga rápido (te mueves más lento mientras cargas).
//   · Transformado no hay tiempo fijo: cada forma gasta Ki por segundo y sigues transformado mientras te quede.
//     Derrotar enemigos transformado también da Ki (menos que en base), así que peleando se alarga.
//   · Escalera de formas (js/mods/formas.js): transformado, tocar Ki = subir de forma (con KI_UP_MIN o más de Ki),
//     mantener Ki = bajar una forma; en la 1.ª, mantener = volver al estado base sin perder el Ki que te quede.
//   · Cada forma tiene su efecto propio (formFx): velocidad, recarga, defensa, regeneración, esquiva (Ultra Instinto),
//     contragolpe y descargas.
//   · Gasto: Recarga de Ki (tienda, 20 niveles), Dominio de la transformación (tienda: formas altas),
//     Dominio del Ki (carta de mejora) y "dura más" de cada guerrero (transformTime) lo bajan.
// Mr. Satán (llama a Buu), la fusión Gogeta del cooperativo y el reto "sin transformación" siguen como en la base.
// Teclado: Espacio/Shift/E/K/Enter = botón de Ki (tocar o mantener) · C mantenida = cargar · Q = bajar forma.
// Mando: A/B/X/Y/gatillos = botón de Ki · RB mantenido = cargar · LB = bajar forma.
// En línea: el invitado manda sus órdenes al anfitrión por el mensaje 'tr' de la base, con el ángulo >= 1000 como código.
(() => {
  const HOLD_MS = 220;                 // más que esto apretado = "mantener"
  const CHARGE_RATE = 14;              // Ki por segundo cargando (sin mejoras: de 0 a 100 en ~7 s)
  const CHARGE_SPEED = 0.35;           // velocidad de movimiento mientras cargas
  const DRAIN = [4, 6.2, 9.6, 14.9, 23];   // Ki por segundo de la forma 1, 2, 3... (la 1.ª sin mejoras: ~25 s con el Ki lleno)
  const KI_UP_MIN = 50;                // Ki mínimo para subir de forma
  const KILL_KI_TRANS = 0.4;           // transformado, los enemigos derrotados dan el 40% del Ki de siempre
  const COUNTER_CD = 0.25;
  const OP = { chargeOn: 1001, chargeOff: 1002, up: 1003, down: 1004 };

  const kirec = P => Math.floor(perk(P, 'kirec'));
  const fx = P => (P && P.transformed > 0 && P.c && P.c.formFx) || {};
  const inFusion = P => !!(G && G.fusion && G.fusion.ids && G.fusion.ids.includes(P.id));
  // ¿Este guerrero usa el Ki nuevo? (Mr. Satán, la fusión del cooperativo y el reto sin transformación: no)
  const esf = P => !!P && !P.c.buddy && !inFusion(P) && !rule('notrans');
  const canCharge = P => !!P && !P.dead && !P.gone && !P.hidden && !inFusion(P) && !rule('notrans') && !(P.transformed > 0) && G.mode === 'play';

  function chargeRate(P) {
    const kib = Math.max(0.3, 1 + (P.c.kiBonus || 0));
    return CHARGE_RATE * (1 + 0.1 * kirec(P)) * kib;
  }
  function drainRate(P) {
    if (P.freeKi > 0) return 0;   // deseo de Ki infinito
    const n = P.formN || 1;
    let r = DRAIN[Math.min(n, DRAIN.length) - 1] * (P.c.formDrain || 1);
    r *= Math.max(0.2, 1 - 0.04 * kirec(P));                         // Recarga de Ki
    if (n >= 2) r *= 1 - Math.min(0.6, perk(P, 'transtime'));         // Dominio de la transformación
    r *= Math.max(0.5, 1 - 0.05 * ((P.passives && P.passives.kictl) || 0));   // Dominio del Ki (carta)
    r /= 1 + (P.c.transformTime || 0);                                 // guerreros que "duran más" (Trunks, Gohan del Futuro...)
    r *= P.focusDrain || 1;                                            // Ki concentrado al transformarse
    return Math.max(0.15, r);
  }
  window.kiDrainRate = drainRate;   // (para la prueba automática y el HUD)

  // Segundos que le quedan (para el HUD de la base, que muestra "forma · 37s" y llena la barra con transformed/trMax)
  function syncTimer(P) {
    const r = drainRate(P), nominal = r || DRAIN[0];
    P.transformed = Math.max(0.05, (P.freeKi || 0) + P.ki / nominal);
    P.trMax = Math.max(P.transformed, (P.freeKi || 0) + 100 / nominal);
  }

  function setForm(P, n, up) {
    window.KiForms.set(P, n);
    syncTimer(P);
    G.shake = Math.max(G.shake, up ? 0.5 : 0.2);
    burst(P.x, P.y, P.c.aura, up ? 36 : 14, up ? 6 : 3, up ? 4 : 3);
    if (up) {
      sfx('power');
      ring(P.x, P.y, 90, 0.5, P.c.aura);
      G.novas.push({ x: P.x, y: P.y, r: 0, maxR: 110, dmg: 18, hit: new Set(), color: P.c.aura, kb: 16, owner: P, aid: 'ki', noBoss: true });
    }
    const who = G.players.length > 1 ? `${P.name}: ` : '';
    announce(up ? `¡${who}${P.c.transform}!` : `${who}Bajas a ${P.c.transform}`, up ? P.c.aura : '#cccccc');
  }
  function formUp(P) {
    if (!P || !esf(P) || !(P.transformed > 0) || !P.esfOn || P.dead) return;
    const n = P.formN || 1, max = window.KiForms.count(P.charId);
    if (n >= max) { addText(P.x, P.y - 30, 'Forma máxima', '#cccccc'); return; }
    if (P.ki < KI_UP_MIN && !(P.freeKi > 0)) { addText(P.x, P.y - 30, `Necesitas ${KI_UP_MIN}% de Ki para subir`, '#ffb0a0'); sfx('hurt', 0.05); return; }
    setForm(P, n + 1, true);
  }
  function formDown(P) {
    if (!P || !esf(P) || !(P.transformed > 0) || !P.esfOn || P.dead) return;
    const n = P.formN || 1;
    if (n > 1) { setForm(P, n - 1, false); return; }
    // En la 1.ª forma: vuelve al estado base y se queda con el Ki que tenía
    P.transformed = 0; P.esfOn = false; P.freeKi = 0;
    if (window.KiForms) window.KiForms.set(P, 1);
    P.formN = 0;
    burst(P.x, P.y, '#ffffff', 10, 2, 2);
    announce(G.players.length > 1 ? `${P.name}: vuelve a su estado base` : 'Vuelves a tu estado base', '#cccccc');
  }
  function setCharging(P, on) { if (P) P.charging = !!on && canCharge(P); }

  // ─── Transformarse: entra con el Ki lleno y empieza a gastarlo ───
  const tr = doTransform;
  doTransform = function (P, secs, force) {   // eslint-disable-line no-global-assign
    const can = P && !P.dead && !P.gone && (force || (P.ki >= 100 && !(P.transformed > 0)));
    const focus = can && !force && typeof kiFocus === 'function' ? kiFocus(P) : 0;
    const r = tr.apply(this, arguments);
    if (can && P.transformed > 0 && esf(P)) {
      P.esfOn = true; P.charging = false;
      P.ki = 100;
      P.focusDrain = 1 / (1 + KI_FOCUS_DUR * focus);   // concentrado: dura un 50% más (gasta menos)
      P.freeKi = force ? (secs || 0) : 0;
      if (!P.formN) P.formN = 1;
      syncTimer(P);
    }
    return r;
  };

  // ─── Cada fotograma (anfitrión o solitario): cargar, gastar y efectos de las formas ───
  const upd = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    const ps = typeof G !== 'undefined' && G && G.players ? G.players : [];
    if (G && G.mode === 'play') for (const P of ps) {
      if (P.gone) continue;
      if (P.freeKi > 0) P.freeKi = Math.max(0, P.freeKi - dt);
      if (P.counterCd > 0) P.counterCd -= dt;
      if (P.charging && !canCharge(P)) P.charging = false;
      if (P.charging) {
        P.ki = Math.min(100, P.ki + chargeRate(P) * dt);
        if (Math.random() < dt * 14) G.fx.push({ type: 'spark', x: P.x + rand(-12, 12), y: P.y + rand(-4, 12), vx: 0, vy: -rand(1, 2.2), t: 0.45, color: P.c.aura || '#ffe14d', size: 2 });
      }
      if (P.transformed > 0 && P.esfOn && esf(P) && !P.dead) {
        P.ki -= drainRate(P) * dt;
        if (P.ki <= 0 && !(P.freeKi > 0)) {
          P.ki = 0; P.esfOn = false;
          P.transformed = 1e-4;   // la base la termina en este mismo paso y avisa "La transformación ha terminado"
        } else {
          P.ki = Math.max(0, P.ki);
          syncTimer(P);
          const f = fx(P);
          if (f.regen) healPlayer(P, f.regen * P.maxHp * dt);
        }
      }
    }
    const r = upd.apply(this, arguments);
    for (const P of ps) {   // al terminar la transformación, vuelve su ficha de siempre
      if (!(P.transformed > 0) && P.formN) { P.esfOn = false; if (window.KiForms && P.formN > 1) window.KiForms.set(P, 1); P.formN = 0; }
    }
    return r;
  };

  // Transformado, derrotar enemigos también da Ki (menos que en base)
  const kill = killEnemy;
  killEnemy = function (e, owner) {   // eslint-disable-line no-global-assign
    const r = kill.apply(this, arguments);
    if (owner && owner.transformed > 0 && owner.esfOn && !owner.dead) {
      const gain = (e.boss ? 50 : e.elite ? 15 : 1) * (1 + (owner.c.kiBonus || 0)) * (1 + 0.15 * (owner.passives.kictl || 0)) * KILL_KI_TRANS;
      owner.ki = Math.min(100, owner.ki + Math.max(0, gain));
    }
    return r;
  };

  // ─── Efectos de las formas ───
  const cdm = cdMult;
  cdMult = function (P) {   // eslint-disable-line no-global-assign
    const f = fx(P);
    return cdm.apply(this, arguments) * (1 - (f.cd || 0));
  };
  const spd = playerSpeed;
  playerSpeed = function (P) {   // eslint-disable-line no-global-assign
    const f = fx(P);
    return spd.apply(this, arguments) * (1 + (f.spd || 0)) * (P.charging && !(P.transformed > 0) ? CHARGE_SPEED : 1);
  };
  const hurt = hurtPlayer;
  hurtPlayer = function (P, amount, kind) {   // eslint-disable-line no-global-assign
    const f = fx(P);
    const open = P && !G.testGod && !(P.koT > 0) && !(P.inv > 0) && !(P.immortal > 0) && !P.dead && !P.hidden && G.mode === 'play';
    if (open && f.dodge && Math.random() < f.dodge) {   // Ultra Instinto: el cuerpo esquiva solo
      P.inv = Math.max(P.inv, 0.2);
      if (Math.random() < 0.3) addText(P.x, P.y - 26, '¡Esquivado!', '#e8f2ff');
      G.fx.push({ type: 'spark', x: P.x + rand(-14, 14), y: P.y + rand(-10, 6), vx: rand(-1.5, 1.5), vy: -1, t: 0.3, color: '#e8f2ff', size: 2 });
      if (f.counter && !(P.counterCd > 0)) {   // contragolpe al más cercano
        const e = nearestEnemy(P, 150);
        if (e) {
          P.counterCd = COUNTER_CD;
          burst(e.x, e.y, '#e8f2ff', 10, 4, 2);
          damageEnemy(e, 22 * dmgMult(P), P, 14, P, 'ki');
        }
      }
      return;
    }
    if (open && f.def) amount *= 1 - f.def;
    return hurt.call(this, P, amount, kind);
  };
  // Descargas eléctricas (Super Saiyajin 2): a veces el golpe salta a otro enemigo cercano
  let shocking = false;
  const dmgE = damageEnemy;
  damageEnemy = function (e, amount, src, kb, owner) {   // eslint-disable-line no-global-assign
    const r = dmgE.apply(this, arguments);
    const f = fx(owner);
    if (f.shock && !shocking && e && Math.random() < f.shock) {
      let best = null, bd = 85 * 85;
      for (const o of G.enemies) {
        if (o === e || o.dead) continue;
        const d = (o.x - e.x) ** 2 + (o.y - e.y) ** 2;
        if (d < bd) { bd = d; best = o; }
      }
      if (best) {
        shocking = true;
        try {
          for (let i = 0; i <= 4; i++) G.fx.push({ type: 'spark', x: e.x + (best.x - e.x) * i / 4 + rand(-3, 3), y: e.y + (best.y - e.y) * i / 4 + rand(-3, 3), vx: 0, vy: 0, t: 0.22, color: '#bfe8ff', size: 2 });
          dmgE.call(this, best, Math.max(1, amount * 0.5), e, 0, owner, 'ki');
        } finally { shocking = false; }
      }
    }
    return r;
  };

  // ─── En línea: el anfitrión recibe las órdenes del invitado por el mensaje 'tr' de la base ───
  const hk = handleKi;
  handleKi = function (P, ang) {   // eslint-disable-line no-global-assign
    if (P && ang >= 1000) {
      if (ang === OP.chargeOn) setCharging(P, true);
      else if (ang === OP.chargeOff) setCharging(P, false);
      else if (ang === OP.up) formUp(P);
      else if (ang === OP.down) formDown(P);
      return;
    }
    return hk.apply(this, arguments);
  };
  const isClient = () => !!(G && G.net && G.net.role === 'client');
  function order(code, local) {
    if (isClient()) Net.send({ t: 'tr', a: code });
    else local();
  }

  // ─── Entrada: tocar o mantener el botón de Ki ───
  const origRequest = requestTransform;
  const ready = () => typeof G !== 'undefined' && G && G.me && G.mode === 'play' && !(typeof TOUR !== 'undefined' && TOUR);
  // La base llama a requestTransform al apretar: ahora el botón lo maneja este mod (tocar / mantener)
  requestTransform = function () {   // eslint-disable-line no-global-assign
    if (!ready()) return origRequest.apply(this, arguments);
  };
  let press = null;   // { t0, held, src }
  function tap() {
    const P = G.me;
    if (esf(P) && P.transformed > 0) order(OP.up, () => formUp(P));
    else origRequest();   // transformarse, pedir la fusión, Big Bang, llamar a Buu...
  }
  function holdStart() {
    const P = G.me;
    if (esf(P) && P.transformed > 0) { order(OP.down, () => formDown(P)); return; }
    startCharge();
  }
  function startCharge() {
    const P = G.me;
    if (!canCharge(P)) return;
    P.charging = true;
    if (isClient()) Net.send({ t: 'tr', a: OP.chargeOn });
    sfx('power', 0.3);
  }
  function stopCharge() {
    const P = G && G.me;
    if (!P) return;
    if (P.charging && isClient()) Net.send({ t: 'tr', a: OP.chargeOff });
    P.charging = false;
  }
  function kiDown(src) {
    if (!ready() || press) return;
    press = { t0: performance.now(), held: false, src };
  }
  function kiUp(src) {
    if (!press || (src && press.src !== src)) return;
    const p = press;
    press = null;
    if (!ready()) { stopCharge(); return; }
    if (!p.held) tap(); else stopCharge();
  }
  // Teclas aparte: C mantenida = cargar, Q = bajar forma
  let chargeKey = false;
  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') || e.repeat) return;
    if (!ready()) return;
    if (KI_KEYS.has(e.code)) kiDown('key:' + e.code);
    else if (e.code === 'KeyC') { chargeKey = true; startCharge(); }
    else if (e.code === 'KeyQ') { const P = G.me; if (esf(P) && P.transformed > 0) order(OP.down, () => formDown(P)); }
  });
  addEventListener('keyup', e => {
    if (KI_KEYS.has(e.code)) kiUp('key:' + e.code);
    else if (e.code === 'KeyC') { chargeKey = false; stopCharge(); }
  });
  addEventListener('blur', () => { press = null; chargeKey = false; stopCharge(); });

  // Botón táctil: siempre a la vista en partida (para cargar); tocar o mantener
  const btn = $('btnTransform');
  if (btn) {
    btn.onclick = null;
    btn.addEventListener('pointerdown', e => { e.preventDefault(); SFX.unlock(); kiDown('btn'); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, () => kiUp('btn'));
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }
  const tfx = tickFx;
  tickFx = function () {   // eslint-disable-line no-global-assign
    const r = tfx.apply(this, arguments);
    const P = G && G.me;
    // En el celular el botón queda siempre a la vista (hace falta para cargar); en PC/mando, como en la base
    const show = btn && P && isTouch() && G.mode === 'play' && !P.dead && !inFusion(P) && !rule('notrans') && (esf(P) || !(P.transformed > 0));
    if (show) {
      const tr = P.transformed > 0 && esf(P), full = P.ki >= 100;
      btn.classList.remove('hidden');
      btn.classList.toggle('ki-low', !tr && !full);
      const label = tr ? '▲<small>mantén ▼</small>' : full ? '¡KI!' : P.charging ? 'CARGA<small>' + Math.floor(P.ki) + '%</small>' : 'KI<small>mantén</small>';
      if (btn._lbl !== label) { btn.innerHTML = label; btn._lbl = label; }
    } else if (btn && btn._lbl) { btn.innerHTML = '¡KI!'; btn._lbl = ''; btn.classList.remove('ki-low'); }
    return r;
  };

  // Mando: botones de Ki (A/B/X/Y/gatillos) tocar o mantener · RB mantenido = cargar · LB = bajar forma
  let padPrev = [], padCharge = false;
  function inputLoop() {
    requestAnimationFrame(inputLoop);
    if (press && !press.held && performance.now() - press.t0 >= HOLD_MS) {
      press.held = true;
      if (ready()) holdStart();
    }
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g => g && g.connected) : null;
    if (!gp) return;
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const ui = typeof padScreen === 'function' && padScreen();
    if (!ui && ready()) {
      const kiNow = [0, 1, 2, 3, 6, 7].some(b), kiPrev = [0, 1, 2, 3, 6, 7].some(i => padPrev[i]);
      if (kiNow && !kiPrev) kiDown('pad');
      if (!kiNow && kiPrev) kiUp('pad');
      if (b(5) && !padCharge) { padCharge = true; startCharge(); }
      if (!b(5) && padCharge) { padCharge = false; stopCharge(); }
      if (b(4) && !padPrev[4]) { const P = G.me; if (esf(P) && P.transformed > 0) order(OP.down, () => formDown(P)); }
    } else if (press && press.src === 'pad') { press = null; stopCharge(); }
    padPrev = gp.buttons.map(x => x.pressed);
  }
  requestAnimationFrame(inputLoop);

  // Cargando: aura blanca de Ki alrededor del guerrero (como en la serie)
  const dp = drawPlayer;
  drawPlayer = function (c, P, overlay) {   // eslint-disable-line no-global-assign
    if (P && P.charging && !overlay && !(P.transformed > 0) && !P.dead) {
      try { drawAura(c, '#dff4ff', P.x, P.y, G.t, 0.95 + 0.08 * Math.sin(G.t * 12)); } catch (e) { /* sin aura */ }
    }
    return dp.apply(this, arguments);
  };

  // ─── HUD: una línea sobre la barra de Ki con la forma y qué hacer ───
  const hud = drawHUD;
  drawHUD = function () {   // eslint-disable-line no-global-assign
    const r = hud.apply(this, arguments);
    const P = G && G.me;
    if (!P || P.dead || G.snake || !esf(P) || G.mode !== 'play') return r;
    const touchUi = isTouch() && W < 900;
    const kw = touchUi ? Math.min(360, W - 120) : Math.min(360, W - 40), kx = touchUi ? 12 : (W - kw) / 2;
    const kh = 14, ky = H - 26 - kh;
    const key = isTouch() ? 'KI' : 'Espacio';
    let text, color = '#9fd8ff';
    if (P.transformed > 0) {
      const n = P.formN || 1, max = window.KiForms ? window.KiForms.count(P.charId) : 1;
      // Marca del 50%: desde ahí puedes subir de forma
      if (n < max) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(Math.round(kx + 2 + (kw - 4) * KI_UP_MIN / 100), ky - 1, 2, kh + 2); }
      const rate = drainRate(P);
      text = `Forma ${n}/${max} · ${P.freeKi > 0 ? 'Ki infinito' : `−${rate.toFixed(1)} Ki/s`}`
        + (n < max ? (P.ki >= KI_UP_MIN || P.freeKi > 0 ? ` · ▲ toca ${key}` : ` · ▲ con ${KI_UP_MIN}%`) : '')
        + ` · ▼ mantén ${key}${n > 1 ? '' : ' (base)'}`;
      color = P.c.aura || color;
    } else if (P.charging) {
      text = `Cargando Ki… +${chargeRate(P).toFixed(0)}/s`; color = '#ffe27a';
    } else if (P.ki < 100) {
      text = isTouch() ? 'Mantén KI para cargar' : 'Mantén Espacio (o C) para cargar Ki';
    } else return r;
    let s = touchUi ? 13 : 14;
    for (; s > 8; s--) { ctx.font = `700 ${s}px ${FONT}`; if (ctx.measureText(text).width <= kw + 16) break; }
    hudText(text, kx + kw / 2, ky - 30, s, color, 'center');
    return r;
  };

  const css = document.createElement('style');
  css.textContent = `.btn-ki{touch-action:none;user-select:none;-webkit-user-select:none;line-height:1.05}
    .btn-ki small{display:block;font-size:11px;font-weight:700;opacity:.85}
    .btn-ki.ki-low{animation:none;filter:saturate(.55) brightness(.9);box-shadow:0 0 10px rgba(255,200,60,.5)}`;
  document.head.appendChild(css);

  // Dominio del Ki (carta): también baja el gasto de las transformaciones
  if (typeof passiveStatLines === 'function') {
    const psl = passiveStatLines;
    passiveStatLines = function (P, id) {   // eslint-disable-line no-global-assign
      const lines = psl.apply(this, arguments);
      if (id === 'kictl' && Array.isArray(lines)) {
        const l = P.passives.kictl || 0, n = l + 1;
        lines.push(`Gasto de las transformaciones: −${Math.min(50, 5 * l)}% → −${Math.min(50, 5 * n)}%`);
      }
      return lines;
    };
  }
})();
