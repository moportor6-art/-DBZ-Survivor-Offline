'use strict';
// ─── Fusión: efecto e ícono de la mejora Kiai (se carga después de js/game.js) ───
// Envuelve damageEnemy: el daño es el mismo; solo crece el empujón (+35% por nivel, y un empujón mínimo
// desde el guerrero para las técnicas que no empujaban). damageEnemy ya reduce el empujón a los jefes.
(() => {
  const hit = damageEnemy;
  damageEnemy = function (e, amount, src, kb, owner, aid) {   // eslint-disable-line no-global-assign
    const l = owner && owner.passives ? owner.passives.kiai || 0 : 0;
    if (l > 0 && e && !e.dead) {
      kb = (kb || 0) * (1 + 0.35 * l) + 2.5 * l;
      src = src || owner;
    }
    return hit.call(this, e, amount, src, kb, owner, aid);
  };

  // Textos de la carta y de la ayuda (la base no conoce esta mejora)
  const lines = passiveStatLines;
  passiveStatLines = function (P, id) {   // eslint-disable-line no-global-assign
    if (id !== 'kiai') return lines.apply(this, arguments);
    const l = P.passives.kiai || 0;
    return [`Empuje: +${35 * l}% → +${35 * (l + 1)}%`];
  };
  const tip = passiveTip;
  passiveTip = function (P, id) {   // eslint-disable-line no-global-assign
    const s = tip.apply(this, arguments);
    return id === 'kiai' ? s.replace('undefined', `+${35 * (P.passives.kiai || 0)}% de empuje`) : s;
  };

  const icon = drawPassiveIcon;
  drawPassiveIcon = function (id, x, y, s, c = ctx) {   // eslint-disable-line no-global-assign
    if (id !== 'kiai') return icon.apply(this, arguments);
    const cx = x + s / 2, cy = y + s / 2, u = s / 16;
    c.strokeStyle = PASSIVES.kiai.color; c.lineWidth = Math.max(1.5, u * 1.6);
    for (const r of [2.5, 5, 7.5]) { c.beginPath(); c.arc(cx - 3 * u, cy, r * u, -0.9, 0.9); c.stroke(); }   // ondas del grito
  };
})();
