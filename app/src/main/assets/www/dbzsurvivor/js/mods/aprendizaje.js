'use strict';
// ─── Mejoras de aprendizaje (2.36.4): Magnetismo y Aumento de experiencia ───
// Salen en las cartas al subir de nivel, como las demás mejoras, pero tienen sus dos casillas propias
// (free: no ocupan las de las otras mejoras; data.js passiveFree / usedPassives). Hasta 10 niveles cada una.
// No dan poder: solo atraen la experiencia desde más lejos (game.js magnetRange) y dan más (game.js, al recogerla).
(() => {
  PASSIVES.magnetismo = { name: 'Magnetismo', color: '#5ce0ff', max: 10, free: true,
    desc: 'Atraes la experiencia desde más lejos: +15% de radio de atracción por nivel. Tiene su propia casilla.' };
  PASSIVES.xpup = { name: 'Aumento de experiencia', color: '#b4ff6a', max: 10, free: true,
    desc: '+6% de experiencia por nivel (+60% al máximo). Tiene su propia casilla.' };

  const icon = drawPassiveIcon;
  drawPassiveIcon = function (id, x, y, s, c = ctx) {   // eslint-disable-line no-global-assign
    if (id !== 'magnetismo' && id !== 'xpup') return icon.apply(this, arguments);
    const cx = x + s / 2, cy = y + s / 2, u = s / 16, col = PASSIVES[id].color;
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = Math.max(1.5, u * 2);
    if (id === 'magnetismo') {   // imán en U con las puntas blancas
      c.beginPath(); c.arc(cx, cy - 1 * u, 5 * u, Math.PI, 0, true); c.stroke();
      c.beginPath(); c.moveTo(cx - 5 * u, cy - 1 * u); c.lineTo(cx - 5 * u, cy + 5 * u); c.moveTo(cx + 5 * u, cy - 1 * u); c.lineTo(cx + 5 * u, cy + 5 * u); c.stroke();
      c.fillStyle = '#ffffff'; c.fillRect(cx - 6.5 * u, cy + 3.5 * u, 3 * u, 2.5 * u); c.fillRect(cx + 3.5 * u, cy + 3.5 * u, 3 * u, 2.5 * u);
    } else {   // gema de experiencia con una flecha hacia arriba
      c.beginPath(); c.moveTo(cx, cy - 6 * u); c.lineTo(cx + 5 * u, cy); c.lineTo(cx, cy + 6 * u); c.lineTo(cx - 5 * u, cy); c.closePath(); c.fill();
      c.strokeStyle = '#0d1436'; c.lineWidth = Math.max(1.2, u * 1.4);
      c.beginPath(); c.moveTo(cx, cy + 3 * u); c.lineTo(cx, cy - 3 * u); c.moveTo(cx - 2.5 * u, cy - 0.5 * u); c.lineTo(cx, cy - 3 * u); c.lineTo(cx + 2.5 * u, cy - 0.5 * u); c.stroke();
    }
  };

  // Inglés
  if (typeof LANG !== 'undefined' && LANG === 'en') {
    Object.assign(PASSIVES.magnetismo, { name: 'Magnetism', desc: 'You pull experience from farther away: +15% pickup radius per level. It has its own slot.' });
    Object.assign(PASSIVES.xpup, { name: 'Experience Boost', desc: '+6% experience per level (+60% at max). It has its own slot.' });
  }
})();
