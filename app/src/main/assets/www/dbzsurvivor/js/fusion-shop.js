'use strict';
// ─── Fusión: efectos de los artículos nuevos de la Tienda de Zeni (definidos en js/fusion.js) ───
// Se carga después de js/game.js y envuelve funciones de la base sin cambiar su lógica:
//   Deseo de Shenlong: perk() suma el bono a cada estadística; makePlayer() sube la salud máxima;
//                      updateSpawning() recibe más tiempo de aparición (= más enemigos comunes; jefes, élites y hordas igual)
//   Dominio de la transformación: doTransform() alarga la transformación recién hecha
// (Casilla de mejora extra la usa maxPassives() en game.js y combos.js.)
(() => {
  const STATS = new Set(['atk', 'spd', 'cd', 'def', 'xp', 'magnet']);   // las que la base lee como porcentaje
  const wish = P => (P && P.perks ? Math.min(6, Math.floor(P.perks.shenwish || 0)) : 0);

  const basePerk = perk;
  perk = function (P, id) {   // eslint-disable-line no-global-assign
    const v = basePerk.apply(this, arguments);
    if (id === 'regen') return v + wish(P) * 0.1;   // +0,1 de salud por segundo por nivel
    return STATS.has(id) ? v + wish(P) * SHENLONG_STAT : v;
  };

  const mk = makePlayer;
  makePlayer = function () {   // eslint-disable-line no-global-assign
    const P = mk.apply(this, arguments);
    const w = wish(P);
    if (P && w) { P.maxHp = Math.round(P.maxHp * (1 + w * SHENLONG_STAT)); P.hp = P.maxHp; }
    return P;
  };

  const spawn = updateSpawning;
  updateSpawning = function (dt) {   // eslint-disable-line no-global-assign
    // El deseo más alto entre los jugadores de la partida (en solitario, el tuyo)
    const w = typeof G !== 'undefined' && G && G.players ? Math.max(0, ...G.players.filter(p => !p.ally).map(wish)) : 0;
    return spawn.call(this, dt * (1 + w * SHENLONG_ENEMIES));
  };

  // Carga de Ki: el Ki que ganas en cada paso del juego (golpes, meditación...) sube un 5% por nivel
  const upd = update;
  update = function () {   // eslint-disable-line no-global-assign
    const ps = typeof G !== 'undefined' && G && G.players ? G.players : [], before = ps.map(p => p.ki);
    const r = upd.apply(this, arguments);
    ps.forEach((p, i) => {
      const w = wish(p), d = p.ki - before[i];
      if (w && d > 0 && p.ki < 100 && !(p.transformed > 0)) p.ki = Math.min(100, p.ki + d * w * SHENLONG_STAT);
    });
    return r;
  };

  const tr = doTransform;
  doTransform = function (P) {   // eslint-disable-line no-global-assign
    const before = P ? P.transformed || 0 : 0;
    const r = tr.apply(this, arguments);
    if (P && !P.c.buddy && P.transformed > before && before <= 0) P.transformed *= 1 + perk(P, 'transtime');
    return r;
  };
})();
