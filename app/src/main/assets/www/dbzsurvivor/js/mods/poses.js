'use strict';
// ─── Poses de DB Survivors (sus sprites, actualización del 25/11/2026; tools/hojas/dbs_poses.py) ───
// Unas 50 hojas del juego salen de los sprites de DB Survivors. Esa actualización les sumó poses, y aquí se usan
// en lugar del cuadro de la hoja, con el mismo tamaño y los pies en el mismo lugar:
//   · disparo (shoot): al lanzar una técnica, de perfil
//   · golpe recibido (hurt): un instante al recibir daño (y los jefes, cuando les pegas)
//   · carga de Ki (charge): mientras cargas Ki con el botón (trae su propia aura)
//   · victoria (win): quieto, un rato después de derrotar a un jefe
// assets/sprites/poses/dbs_poses.json: qué hoja es qué personaje y los cuadros de cada pose (x, y, ancho, alto, pie x, pie y).
(() => {
  let D = null;
  const IMG = new Image();
  IMG.src = 'assets/sprites/poses/dbs_poses.png';
  fetch('assets/sprites/poses/dbs_poses.json').then(r => r.json()).then(j => { D = j; }).catch(() => {});
  const listo = () => D && IMG.complete && IMG.naturalWidth > 0;
  const limpio = src => String(src || '').replace(/^.*?(assets\/sprites\/)/, '$1').replace(/\?.*$/, '');

  // Qué pose pide el que se está dibujando ahora (lo pone drawPlayer / drawEnemy; drawActor lo usa)
  let pide = null;

  const da = drawActor;
  drawActor = function (ctx, L, x, y, o = {}) {   // eslint-disable-line no-global-assign
    if (!listo() || !L) return da.apply(this, arguments);
    let pose = pide && pide.id === L.id ? pide.pose : null;
    if (!pose && (o.anim === 'cast' || o.anim === 'punch') && (!o.dir || o.dir === 'side')) pose = 'shoot';
    if (!pose) return da.apply(this, arguments);
    const ext = EXTERNAL.get(L.id + (o.ssj ? ':ssj' : '')) || (!o.ssj && EXTERNAL.get(L.id));
    const pers = ext && D.hojas[limpio(ext.src || (ext.img && ext.img.src))];
    const seq = pers && D.poses[pers] && (D.poses[pers][pose] || (pose === 'hurt' && D.poses[pers].hurts));
    if (!seq || !seq.length) return da.apply(this, arguments);
    const s = o.scale || 1, es = s * (ext.scale || 1);
    const fps = pose === 'charge' ? 10 : pose === 'win' ? 3 : 8;
    const [sx, sy, w, h, ax, ay] = seq[Math.floor((o.t || 0) * fps) % seq.length];
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + 12 * s));
    if (!o.noShadow) {
      ctx.fillStyle = 'rgba(40,20,10,0.28)';
      ctx.fillRect(Math.round(-7 * s), -1, Math.round(14 * s), 2);
      ctx.fillRect(Math.round(-9 * s), 0, Math.round(18 * s), 1);
    }
    ctx.scale(o.facing || 1, 1);   // sus cuadros miran a la derecha
    if (o.flash) ctx.filter = 'brightness(2.6)';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(IMG, sx, sy, w, h, Math.round(-ax * es), Math.round(-ay * es), Math.round(w * es), Math.round(h * es));
    ctx.restore();
  };

  // Jugadores: golpe, carga de Ki y victoria
  const hp = hurtPlayer;
  hurtPlayer = function (P) {   // eslint-disable-line no-global-assign
    const antes = P && P.hp, r = hp.apply(this, arguments);
    if (P && P.hp < antes) P._poseHurt = 0.28;
    return r;
  };
  const ke = killEnemy;
  killEnemy = function (e) {   // eslint-disable-line no-global-assign
    const r = ke.apply(this, arguments);
    if (e && e.boss && G) for (const P of G.players) if (!P.dead) P._poseWin = 1.6;
    return r;
  };
  const up = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    const r = up.apply(this, arguments);
    if (G && G.players) for (const P of G.players) { if (P._poseHurt > 0) P._poseHurt -= dt; if (P._poseWin > 0) P._poseWin -= dt; }
    return r;
  };
  const dp = drawPlayer;
  drawPlayer = function (c, P) {   // eslint-disable-line no-global-assign
    const pose = !P || P.dead || P.koT > 0 || P.ozaru ? null
      : P._poseHurt > 0 ? 'hurt'
      : P.charging ? 'charge'
      : P._poseWin > 0 && !P.moving && !(P.castT > 0) ? 'win' : null;
    if (!pose) return dp.apply(this, arguments);
    const { ch } = fighterLook(P, typeof isFusedBody === 'function' && isFusedBody(P));
    pide = { id: ch.look && ch.look.id, pose };
    try { return dp.apply(this, arguments); } finally { pide = null; }
  };
  // Jefes: el golpe recibido mientras destellan
  const de = drawEnemy;
  drawEnemy = function (c, e) {   // eslint-disable-line no-global-assign
    if (!(e && e.boss && e.flash > 0 && e.def)) return de.apply(this, arguments);
    pide = { id: e.def.look && e.def.look.id, pose: 'hurt' };
    try { return de.apply(this, arguments); } finally { pide = null; }
  };
})();
