// ─── Luna llena y Ozaru ─────────────────────────────────────────────────────
// En la saga Saiyajin, del segundo 270 al 300 sale la luna llena: la pantalla se oscurece, aparecen Ozarus
// enemigos y los Saiyajin con cola (Vegeta, Raditz, Nappa, Broly, Gohan niño…) se vuelven Ozaru durante 30 s:
// el doble de grandes, +80% de daño, más lentos y con un pisotón que daña alrededor cada 1,2 s.
// Hay que estar vivo y no fusionado; los aliados con cola también se transforman.
(() => {
  const DESDE = 270, DURA = 30;
  const COLA = ['vegeta', 'raditzp', 'nappap', 'broly', 'brolyp', 'gohan', 'bardockp', 'turlesp', 'tarblep', 'kalep', 'cauliflap', 'cabbap'];
  const activo = () => G && G.lv && G.lv.id === 'saiyan' && !G.weekly && !G.snake && G.t >= DESDE && G.t < DESDE + DURA;
  const tieneCola = P => COLA.includes(P.charId) && !P.hidden && !(typeof isFusedBody === 'function' && isFusedBody(P));
  // 0..1: cuánto se ve la luna (aparece y se va suave). Sale de G.t, así también se ve igual en los invitados
  const lunaVis = () => {
    if (!G || !G.lv || G.lv.id !== 'saiyan' || G.weekly || G.snake) return 0;
    return Math.max(0, Math.min(1, (G.t - DESDE) / 1.25, (DESDE + DURA + 1.25 - G.t) / 1.25));
  };

  const up = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    const r = up.apply(this, arguments);
    if (!G || G.mode !== 'play') return r;
    const on = activo();
    if (on && !G.lunaVista) {
      G.lunaVista = true;
      announce('¡Salió la luna llena!', '#fff2b0');
      for (let i = 0; i < 2 + G.players.filter(p => !p.ally).length; i++) spawnEnemy('ozaru');
    }
    for (const P of G.players) {
      if (P.gone) continue;
      const debe = on && !P.dead && tieneCola(P);
      if (debe && !P.ozaru) {
        P.ozaru = true; P.ozaruPisa = 1.2;
        ring(P.x, P.y, 80, 0.6, '#ffb35c'); burst(P.x, P.y, '#ffb35c', 30, 5, 4); G.shake = Math.max(G.shake, 0.6); sfx('power', 0.6);
        if (P === G.me || (G.net && !P.ally)) announce(G.net ? `¡${P.name} mira la luna y se vuelve Ozaru!` : '¡Miras la luna… y te conviertes en Ozaru!', '#ffb35c');
      } else if (!debe && P.ozaru) {
        P.ozaru = false; poof(P.x, P.y);
        if (P === G.me && !G.net) announce('La luna se ocultó: vuelves a tu forma', '#c8e0ff');
      }
      if (P.ozaru && (P.ozaruPisa -= dt) <= 0) {   // pisotón
        P.ozaruPisa = 1.2;
        const dmg = 18 + 4 * (G.level || 1);
        for (const e of G.enemies) if (!e.dead && !e.friend && Math.hypot(e.x - P.x, e.y - P.y) < 95 + e.r) damageEnemy(e, dmg, P, 10, P);
        ring(P.x, P.y, 95, 0.3, '#ffb35c');
      }
    }
    return r;
  };

  const dm = dmgMult;
  dmgMult = function (P) { return dm.apply(this, arguments) * (P && P.ozaru ? 1.8 : 1); };   // eslint-disable-line no-global-assign
  const sp = playerSpeed;
  playerSpeed = function (P) { return sp.apply(this, arguments) * (P && P.ozaru ? 0.8 : 1); };   // eslint-disable-line no-global-assign

  // Aspecto: el sprite del Ozaru, más grande
  const fl = fighterLook;
  fighterLook = function (P) {   // eslint-disable-line no-global-assign
    const r = fl.apply(this, arguments);
    if (!P.ozaru || !ENEMIES.ozaru) return r;
    return { ch: { ...r.ch, look: ENEMIES.ozaru.look, ssjHair: null, transformSprite: false }, tr: false };
  };
  const dp = drawPlayer;
  drawPlayer = function (c, P) {   // eslint-disable-line no-global-assign
    if (!P || !P.ozaru) return dp.apply(this, arguments);
    c.save(); c.translate(P.x, P.y); c.scale(1.9, 1.9); c.translate(-P.x, -P.y);
    try { return dp.apply(this, arguments); } finally { c.restore(); }
  };

  // El cielo: azul oscuro y la luna arriba a la derecha (sobre el mundo, debajo de los nombres y el HUD)
  const dn = drawNames;
  drawNames = function () {   // eslint-disable-line no-global-assign
    const luna = lunaVis();
    if (luna > 0) {
      ctx.save();
      ctx.globalAlpha = 0.32 * luna; ctx.fillStyle = '#0a1040'; ctx.fillRect(0, 0, W, H);
      const x = W - 70, y = 70, g = ctx.createRadialGradient(x, y, 10, x, y, 80);
      g.addColorStop(0, 'rgba(255,248,200,0.55)'); g.addColorStop(1, 'rgba(255,248,200,0)');
      ctx.globalAlpha = luna; ctx.fillStyle = g; ctx.fillRect(x - 80, y - 80, 160, 160);
      ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(210,200,150,0.6)';
      for (const [dx, dy, r] of [[-9, -6, 6], [8, 7, 5], [6, -12, 3], [-4, 13, 3]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    return dn.apply(this, arguments);
  };
})();
