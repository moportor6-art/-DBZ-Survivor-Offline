'use strict';
// ─── Cinturón de objetos ───
// Casillas para guardar objetos durante la partida. De momento solo las Semillas del Ermitaño:
//   · si recoges una con la vida al 100%, no se gasta: se guarda en el cinturón (sin límite de semillas)
//   · cuando estás en peligro (30% de vida o menos) te comes una sola, con 5 s de espera entre semilla y semilla
// El cinturón se dibuja sobre la barra de Ki y se puede mover y agrandar con el editor del HUD (pieza «cinturon»).
(() => {
  const CASILLAS = 4, PELIGRO = 0.3, ESPERA = 5, TAM = 34, SEP = 4;
  const cin = P => P.cint || (P.cint = { senzu: 0, cd: 0 });

  const col = collect;
  collect = function (p, P) {   // eslint-disable-line no-global-assign
    if (p && p.kind === 'senzu' && P && !p.cint && P.hp >= P.maxHp) {
      const c = cin(P);
      c.senzu++;
      addText(P.x, P.y - 26, `Semilla guardada (${c.senzu})`, '#6cff7a', true);
      sfx('pickup', 0.3);
      return;
    }
    return col.apply(this, arguments);
  };

  const upd = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    const r = upd.apply(this, arguments);
    if (typeof G === 'undefined' || !G || !G.players || (G.net && G.net.role === 'client')) return r;
    for (const P of G.players) {
      if (!P.cint || P.dead || P.gone || P.hidden) continue;
      const c = P.cint;
      if (c.cd > 0) c.cd -= dt;
      if (c.senzu > 0 && c.cd <= 0 && P.hp <= P.maxHp * PELIGRO) {
        c.senzu--; c.cd = ESPERA;
        col({ kind: 'senzu', cint: true }, P);   // cura como una semilla recogida (y cuenta para la Bolsa de Semillas)
      }
    }
    return r;
  };

  // ─── Dibujo ───
  function rect() {
    const touchUi = isTouch() && W < 900, w = CASILLAS * TAM + (CASILLAS - 1) * SEP;
    const kw = touchUi ? Math.min(360, W - 120) : Math.min(360, W - 40), kx = touchUi ? 12 : (W - kw) / 2;
    const x = touchUi ? kx : Math.round((W - w) / 2), y = H - 26 - 14 - 48 - TAM - 10;
    return [x - 4, y - 4, w + 8, TAM + 8];
  }
  window.cinturonRect = rect;
  function semilla(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.5);
    ctx.fillStyle = '#3fae3a'; ctx.beginPath(); ctx.ellipse(0, 0, 5 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9dff8a'; ctx.beginPath(); ctx.ellipse(-1.5 * s, -2.5 * s, 2 * s, 3.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  const hud = drawHUD;
  drawHUD = function () {   // eslint-disable-line no-global-assign
    const r = hud.apply(this, arguments);
    const P = G && G.me;
    if (!P || G.mode === 'over' || G.snake) return r;
    const c = cin(P), [bx, by] = rect(), x0 = bx + 4, y0 = by + 4;
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    hudPieza('cinturon');
    for (let i = 0; i < CASILLAS; i++) {
      const x = x0 + i * (TAM + SEP);
      ctx.fillStyle = 'rgba(10,15,46,0.6)'; ctx.fillRect(x, y0, TAM, TAM);
      ctx.strokeStyle = i === 0 && c.senzu ? '#6cff7a' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y0 + 1, TAM - 2, TAM - 2);
    }
    if (c.senzu) {
      semilla(x0 + TAM / 2, y0 + TAM / 2 - 2, 1.4);
      if (c.cd > 0) {   // espera: la casilla se oscurece y se va destapando
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, TAM, TAM); ctx.clip();
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.moveTo(x0 + TAM / 2, y0 + TAM / 2);
        ctx.arc(x0 + TAM / 2, y0 + TAM / 2, TAM * 0.72, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (c.cd / ESPERA)); ctx.closePath();
        ctx.fill(); ctx.restore();
      }
    } else { ctx.globalAlpha = 0.25; semilla(x0 + TAM / 2, y0 + TAM / 2 - 2, 1.4); ctx.globalAlpha = 1; }
    hudText(`${c.senzu}`, x0 + TAM - 3, y0 + TAM - 3, 12, c.senzu ? '#ffffff' : '#8a90b0', 'right');
    hudPiezaFin('cinturon');
    ctx.restore();
    return r;
  };
})();
