'use strict';
// ─── Kaio-ken de los humanos, Regeneración de Majin Buu, Marca Majin y Reactor de energía infinita ───
// · Kaio-ken (escalera en formas.js): aura roja que late más fuerte en cada escalón; desde x4 quema vida (nunca te deja en 0).
// · Regeneración de Majin Buu (todos): 0,4% de la vida máxima por segundo y nivel.
// · Marca Majin (los más débiles): +10% de daño y +3% de velocidad por nivel; la M en la frente y el Ki y las técnicas
//   se oscurecen más cuanto más alta (los proyectiles toman el color al salir: se cambia mientras se disparan).
// · Reactor de energía infinita (androides): −15% de gasto de Ki por nivel y se recarga solo; al 5, nunca gastan Ki.
// Pasivas en datos/mejoras.js (users: quién puede aprenderla). Va después de js/mods/ki.js.
(() => {
  const lv = (P, id) => (P && P.passives && P.passives[id]) || 0;
  const kkLvl = P => { const m = P && P.transformed > 0 && P.c && /^Kaio-ken(?: x(\d+))?$/.exec(P.c.transform || ''); return m ? [1, 2, 4, 5, 10, 20].indexOf(+(m[1] || 1)) + 1 : 0; };

  // Cartas: las pasivas con users solo les salen a esos guerreros
  const cp = cardPool;
  cardPool = function (P) {   // eslint-disable-line no-global-assign
    return cp.apply(this, arguments).filter(o => o.kind !== 'passive' || !PASSIVES[o.id] || !PASSIVES[o.id].users || PASSIVES[o.id].users.includes(P.charId));
  };

  const up = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    const r = up.apply(this, arguments);
    if (!G || G.mode !== 'play' || (G.net && G.net.role === 'client')) return r;
    for (const P of G.players) {
      if (P.dead || P.gone) continue;
      // Kaio-ken: aura roja (la de animaciones.js, sin el poder extra de la técnica de Goku) y la vida que quema
      const k = kkLvl(P);
      if (k) {
        if (!(P.kaioken > 0.1) || P._kkForma) { P.kaioken = 0.25; P.kaiokenBoost = 0; P._kkForma = true; }
        P.kaiokenLvl = k;
        const q = (P.c.formFx && P.c.formFx.hpdrain) || 0;
        if (q) P.hp = Math.max(1, P.hp - P.maxHp * q * dt);
      } else if (P._kkForma) { P._kkForma = false; P.kaioken = 0; P.kaiokenLvl = 0; }
      // Regeneración de Majin Buu
      const b = lv(P, 'buuregen');
      if (b && P.hp < P.maxHp) healPlayer(P, P.maxHp * 0.004 * b * dt);
      // Reactor de energía infinita
      const re = lv(P, 'reactor');
      if (re) {
        if (P.transformed > 0) {
          if (re >= 5) P.freeKi = Math.max(P.freeKi || 0, 1);
          else if (window.kiDrainRate) P.ki = Math.min(100, P.ki + window.kiDrainRate(P) * 0.15 * re * dt);
        } else P.ki = Math.min(100, (P.ki || 0) + 1.5 * re * dt);
      }
    }
    return r;
  };

  // Marca Majin: más daño y velocidad
  const dm = dmgMult;
  dmgMult = function (P) { const m = lv(P, 'marcamajin'); return dm.apply(this, arguments) * (1 + 0.1 * m); };   // eslint-disable-line no-global-assign
  const ps = playerSpeed;
  playerSpeed = function (P) { const m = lv(P, 'marcamajin'); return ps.apply(this, arguments) * (1 + 0.03 * m); };   // eslint-disable-line no-global-assign

  // …y todo se oscurece: mezcla con un púrpura casi negro, más cuanto más alta
  const OSCURO = [42, 0, 24];
  const mezcla = (hex, k) => {
    const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return hex;
    const n = parseInt(m[1], 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v + (OSCURO[i] - v) * k));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  };
  const oscuro = P => Math.min(0.65, 0.13 * lv(P, 'marcamajin'));
  const fa = fireAttacks;
  fireAttacks = function (P) {   // eslint-disable-line no-global-assign
    const k = oscuro(P);
    if (!k) return fa.apply(this, arguments);
    const viejos = [];
    for (const a of P.attacks || []) {
      const d = ATTACKS[a.id];
      if (!d) continue;
      viejos.push([d, d.color, d.core]);
      d.color = mezcla(d.color, k); if (d.core) d.core = mezcla(d.core, k * 0.7);
    }
    try { return fa.apply(this, arguments); } finally { for (const [d, c, co] of viejos) { d.color = c; d.core = co; } }
  };
  const dp = drawPlayer;
  drawPlayer = function (c, P, overlay) {   // eslint-disable-line no-global-assign
    const k = oscuro(P);
    if (!k || !P.c) return dp.apply(this, arguments);
    const ch = P.c, aura = ch.aura;
    ch.aura = mezcla(aura || '#ffffff', k);
    let r;
    try { r = dp.apply(this, arguments); } finally { ch.aura = aura; }
    // la M de Babidi en la frente
    if (!overlay && !P.dead && !P.hidden && P.dir !== 'up' && !P.ozaru) {
      const fx = P.dir === 'side' ? (P.facing || 1) * 2 : 0, x = Math.round(P.x + fx - 3), y = Math.round(P.y - 13);
      c.save(); c.fillStyle = '#b0003a';
      for (const [dx, dy] of [[0, 0], [0, 1], [0, 2], [1, 0], [2, 1], [3, 0], [4, 0], [4, 1], [4, 2]]) c.fillRect(x + dx, y + dy, 1, 1);
      c.restore();
    }
    return r;
  };
})();
