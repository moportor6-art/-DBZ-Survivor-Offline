'use strict';
// ─── Rasgos de las formas que usan una hoja recoloreada ───
// Varias formas comparten las animaciones de otra con otros colores (tools/recolor). Para que se distingan
// de verdad, cada una suma lo que la caracteriza en la serie, dibujado alrededor del guerrero:
//   · Super Saiyajin 2 (Goku, Vegeta, Gohan niño) y Trunks de la Ira: rayos eléctricos que chisporrotean.
//   · Majin Vegeta: rayos oscuros, rojos y negros (además de su «M» en la frente, de animaciones.js).
//   · Super Saiyajin Dios (Goku y Vegeta): brasas rojas que suben.
//   · Super Trunks: más corpulento (+12%) y con vapor del esfuerzo.  · Orange Piccolo: un gigante (+28%) con vapor naranja.
// También Toppo como Dios de la Destrucción: la esfera de Hakai flotando sobre su mano (jefes.js hace el ataque).
// Va después de animaciones.js. Se ve igual en el cooperativo (sale de la forma, que ya se sincroniza).
(() => {
  const RAYOS = (color, nucleo) => ({ rayos: { color, nucleo } });
  const R = {
    'goku:2': RAYOS('#8fd6ff', '#ffffff'), 'vegeta:2': RAYOS('#8fd6ff', '#ffffff'), 'gohanc:2': RAYOS('#8fd6ff', '#ffffff'),
    'ftrunks:3': RAYOS('#5ec8ff', '#e8fbff'),
    'vegeta:3': RAYOS('#2a0010', '#ff2a6a'),
    'goku:4': { brasas: '#ff5a3a' }, 'vegeta:4': { brasas: '#ff6a4a' },
    'ftrunks:2': { escala: 1.12, vapor: 'rgba(255,250,220,' },
    'piccolo:2': { escala: 1.28, vapor: 'rgba(255,170,90,' },
  };
  const rasgo = P => (P && P.transformed > 0 && !P.ozaru && !P.skinC ? R[`${P.charId}:${P.formN || 1}`] : null);
  window.RasgosForma = R;

  // Escala: drawActor recibe el tamaño mientras se dibuja ese guerrero
  let esc = 1;
  const da = drawActor;
  drawActor = function (c, L, x, y, o) {   // eslint-disable-line no-global-assign
    if (esc !== 1) o = { ...(o || {}), scale: ((o && o.scale) || 1) * esc };
    return da.call(this, c, L, x, y, o);
  };

  // Rayos: zigzags cortos que aparecen y desaparecen alrededor del cuerpo
  function rayos(c, P, t, r) {
    const paso = Math.floor(t * 14);
    let s = (paso * 9301 + P.id * 49297) % 233280;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    for (let k = 0; k < 2; k++) {
      if (rnd() < 0.35) continue;
      const a = rnd() * Math.PI * 2, rad = 7 + rnd() * 7;
      let x = P.x + Math.cos(a) * rad, y = P.y - 14 + Math.sin(a) * 12;
      const pts = [[x, y]];
      for (let i = 0; i < 3; i++) { x += (rnd() - 0.5) * 9; y += (rnd() - 0.5) * 9; pts.push([x, y]); }
      for (const [w, col] of [[2.5, r.color], [1, r.nucleo]]) {
        c.strokeStyle = col; c.lineWidth = w; c.globalAlpha = w > 2 ? 0.75 : 1;
        c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(Math.round(px), Math.round(py)) : c.moveTo(Math.round(px), Math.round(py)))); c.stroke();
      }
    }
    c.restore();
  }
  function brasas(c, P, t, col) {
    c.save(); c.fillStyle = col;
    for (let i = 0; i < 8; i++) {
      const f = (t * 0.7 + i / 8) % 1;
      c.globalAlpha = 0.9 * (1 - f);
      const x = P.x + Math.sin(i * 2.3 + t * 2) * (6 + i % 3 * 3), y = P.y - 2 - f * 40;
      c.fillRect(Math.round(x), Math.round(y), f < 0.5 ? 2 : 1, f < 0.5 ? 2 : 1);
    }
    c.restore();
  }
  function vapor(c, P, t, rgba, k) {
    c.save();
    for (let i = 0; i < 4; i++) {
      const f = (t * 0.5 + i / 4) % 1;
      c.fillStyle = rgba + (0.28 * (1 - f)).toFixed(2) + ')';
      c.beginPath(); c.arc(P.x + (i % 2 ? 7 : -7) * k + Math.sin(t + i) * 2, P.y - 18 * k - f * 18, 2 + f * 4, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  const dp = drawPlayer;
  drawPlayer = function (c, P, overlay) {   // eslint-disable-line no-global-assign
    const r0 = rasgo(P);
    if (!r0) return dp.apply(this, arguments);
    esc = r0.escala || 1;
    let res;
    try { res = dp.apply(this, arguments); } finally { esc = 1; }
    if (!overlay && !P.dead && !P.gone && !P.hidden && G) {
      try {
        const t = G.t + P.id * 0.37;
        if (r0.rayos) rayos(c, P, t, r0.rayos);
        if (r0.brasas) brasas(c, P, t, r0.brasas);
        if (r0.vapor) vapor(c, P, t, r0.vapor, r0.escala || 1);
      } catch (e) { /* sin efectos */ }
    }
    return res;
  };

  // Toppo, Dios de la Destrucción: la esfera de Hakai sobre la mano
  const dE = drawEnemy;
  drawEnemy = function (c, e, t) {   // eslint-disable-line no-global-assign
    const r = dE.apply(this, arguments);
    if (e && e.id === 'toppo' && e.boss && !e.dead && ((e.jf && e.jf.dios) || /Dios|God/.test((e.def && e.def.name) || ''))) {
      const tt = (G && G.t) || 0, k = 1.25 * (e.scale || 1), x = e.x + 13 * k * (e.facing || 1), y = e.y - 26 * k + Math.sin(tt * 3) * 2;
      const rad = 5 + Math.sin(tt * 8) * 0.8;
      c.save();
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5; c.fillStyle = '#b06aff';
      c.beginPath(); c.arc(x, y, rad + 4, 0, Math.PI * 2); c.fill();
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.fillStyle = '#1a0526';
      c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#e0a8ff'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#ffffff'; c.fillRect(Math.round(x - rad * 0.4), Math.round(y - rad * 0.5), 1, 1);
      c.restore();
    }
    return r;
  };
})();
