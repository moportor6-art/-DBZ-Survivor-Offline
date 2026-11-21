// ─── Nivel 8 · Torneo del Poder: el ring que se encoge ──────────────────────
// El ring es un círculo alrededor del punto de partida: empieza con radio 1700 y se achica 2,2 por segundo
// hasta 380 (minuto 10, cuando llega Jiren). Fuera de él está el vacío: quita 6% de la vida máxima por
// segundo y te empuja hacia adentro. Los enemigos y jefes que quedan fuera vuelven caminando (o flotando).
// Los datos del nivel (Toppo, Jiren, oleadas) están en js/mods/datos/enemigos.js; el suelo, en js/mods/mapas.js.
(() => {
  const R0 = 1700, R_MIN = 380, ENCOGE = 2.2;
  const enPoder = () => G && G.lv && G.lv.id === 'poder';
  const radio = () => Math.max(R_MIN, R0 - ENCOGE * G.t);
  window.poderRadio = radio;

  const up = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    const r = up.apply(this, arguments);
    if (!enPoder() || G.mode !== 'play') return r;
    const R = radio();
    if (!G.poderAviso && G.t > 2) { G.poderAviso = true; announce('¡Empieza el Torneo del Poder! No salgas del ring', '#7fe6ff'); }
    if (R <= R_MIN && !G.poderMin) { G.poderMin = true; announce('¡El ring ya no se achica más!', '#7fe6ff'); }
    for (const P of G.players) {
      if (P.gone || P.dead || P.hidden) continue;
      const d = Math.hypot(P.x, P.y);
      if (d <= R) { P.vacio = 0; continue; }
      P.vacio = (P.vacio || 0) + dt;
      if (!G.testGod && !(P.koT > 0)) P.hp -= P.maxHp * 0.06 * dt;
      const k = Math.min(d - R, 260 * dt);   // te tira hacia el ring
      P.x -= P.x / d * k; P.y -= P.y / d * k;
      if (P === G.me && Math.random() < dt * 2) addText(P.x, P.y - 30, '¡Fuera del ring!', '#ff5c5c');
    }
    for (const e of G.enemies) {   // los jefes nunca se quedan afuera esperando
      if (!e.boss || e.dead) continue;
      const d = Math.hypot(e.x, e.y);
      if (d > R + 40) { const k = Math.min(d - R, 180 * dt); e.x -= e.x / d * k; e.y -= e.y / d * k; }
    }
    return r;
  };

  // El vacío: todo lo que está fuera del ring se oscurece, con el borde brillante
  const dg = drawGround;
  drawGround = function (c) {   // eslint-disable-line no-global-assign
    const props = dg.apply(this, arguments);
    if (!enPoder()) return props;
    const R = radio(), t = G.t;
    c.save();
    c.beginPath();
    c.rect(-1e5, -1e5, 2e5, 2e5);
    c.ellipse(0, 0, R, R, 0, 0, Math.PI * 2, true);   // agujero: el ring
    c.fillStyle = 'rgba(6,6,18,0.88)'; c.fill('evenodd');
    c.lineWidth = 6; c.strokeStyle = `rgba(127,230,255,${0.55 + 0.25 * Math.sin(t * 4)})`;
    c.beginPath(); c.ellipse(0, 0, R, R, 0, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.6)';
    c.beginPath(); c.ellipse(0, 0, R - 8, R - 8, 0, 0, Math.PI * 2); c.stroke();
    c.restore();
    return props;
  };

  const hud = drawHUD;
  drawHUD = function () {   // eslint-disable-line no-global-assign
    const r = hud.apply(this, arguments);
    if (!enPoder() || G.mode !== 'play' || !G.me) return r;
    const P = G.me;
    if (P.vacio > 0 && !P.dead) {   // aviso grande y borde rojo
      ctx.save(); ctx.strokeStyle = `rgba(255,60,60,${0.4 + 0.3 * Math.sin(G.t * 10)})`; ctx.lineWidth = 14; ctx.strokeRect(0, 0, W, H); ctx.restore();
      hudText('¡VUELVE AL RING!', W / 2, H / 2 - 80, 22, '#ff5c5c', 'center');
    }
    return r;
  };
})();
