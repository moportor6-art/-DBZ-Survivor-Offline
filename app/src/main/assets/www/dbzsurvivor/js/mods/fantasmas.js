'use strict';
// ─── Ataque Kamikaze Fantasma: los fantasmas de Gotenks con su dibujo (2.36.6) ───
// Hoja: tools/swl/fantasmas (Gotenks SSJ3, editada por yuresu; créditos a Ryu22). Cuadros de 50×40:
// 0-1 volando (miran a la derecha; el juego los voltea según hacia dónde van) y 2-3 flotando (al frenar).
// Son proyectiles normales (técnica «fantasmas» de js/mods/datos/tecnicas.js): persiguen, explotan y la
// Multiplicación les suma un fantasma por nivel, como a cualquier técnica que dispara.
(() => {
  const img = new Image();
  img.src = 'assets/sprites/fusion/fantasma.png';
  const W = 50, H = 40, ESC = 0.75;
  window.drawGhostProj = (c, p, t) => {
    if (!img.complete || !img.naturalWidth) return false;
    const v = Math.hypot(p.vx, p.vy), lento = v < 1.2;
    const f = (lento ? 2 : 0) + (Math.floor((t || 0) * 8 + p.x * 0.01) & 1);
    const w = W * ESC, h = H * ESC, bob = Math.sin((t || 0) * 6 + p.y * 0.05) * 1.5;
    c.save();
    c.translate(Math.round(p.x), Math.round(p.y + bob));
    if (p.vx < 0) c.scale(-1, 1);
    c.globalAlpha = 0.92;
    c.drawImage(img, f * W, 0, W, H, -w / 2, -h / 2, w, h);
    c.restore();
    return true;
  };
})();
