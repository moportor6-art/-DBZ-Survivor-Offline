// ─── Jefes con mecánicas de la serie ────────────────────────────────────────
// Cada jefe tiene un momento propio de su saga (además de su técnica especial de BOSS_SPECIAL):
//   Raditz → Piccolo (o Goku) se une contra él        · Vegeta → se vuelve Ozaru a la mitad de la vida
//   Freezer → cuenta atrás para destruir el planeta     · Cell Imperfecto / Semi → absorbe a los Androides 17 y 18
//   Cell → se autodestruye al 20% y vuelve más fuerte    · Babidi → marca Majin a los enemigos cercanos
//   Super Buu → absorbe a tus aliados                    · Kid Buu → se regenera si no lo golpeas
//   Janemba → Super Janemba a la mitad                   · Broly → más furia cuanta menos vida
//   Golden Freezer → se agota al minuto                  · Bills / Toppo → zonas de Hakai
//   Jiren → "al límite" al 30%
// Todo corre en el anfitrión (o solo): G.enemies se sincroniza como siempre. El estado va en e.jf.
(() => {
  const once = (e, k) => (e.jf[k] ? false : (e.jf[k] = true));
  const alive = () => G.players.filter(P => !P.dead && !P.gone && !P.hidden);
  const heal = (e, f) => { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * f); burst(e.x, e.y, '#6aff8a', 22, 4, 3); };
  const powerUp = (e, { name, spd = 1, dmg = 1, scale = 1, color = '#ffd93b', text }) => {
    if (name) e.def = { ...e.def, name };
    e.speed *= spd; e.dmg *= dmg; e.scale *= scale;
    ring(e.x, e.y, 90 * e.scale, 0.6, color); burst(e.x, e.y, color, 40, 6, 4);
    G.shake = Math.max(G.shake, 0.5); sfx('power', 0.6);
    if (text) announce(text, color);
  };
  const hakai = (e, n, r, dmg) => {   // zonas marcadas que estallan: Hakai
    const ps = alive();
    for (let i = 0; i < n && ps.length; i++) {
      const P = ps[Math.floor(Math.random() * ps.length)];
      G.hazards.push({ x: P.x + rand(-50, 50), y: P.y + rand(-40, 40), r, t: 1.6, dur: 1.6, dmg });
    }
  };
  const near = (e, list, dist) => list.filter(q => Math.hypot(q.x - e.x, q.y - e.y) < dist);

  const MECH = {
    raditz(e) {
      if (!once(e, 'aliado') || G.net || typeof window.summonAlly !== 'function' || !G.me) return;
      const who = G.me.charId === 'piccolo' ? 'goku' : 'piccolo';
      const A = window.summonAlly(G.me, who, 75, { tag: 'jefes', hp: 1.1 });
      if (A) announce(`¡${A.name} se une contra Raditz!`, A.c.aura || '#b4ff8a');
    },
    vegetas(e, dt) {
      if (e.hp < e.maxHp * 0.5 && once(e, 'ozaru') && ENEMIES.ozaru) {
        e.def = { ...e.def, look: ENEMIES.ozaru.look };
        e.r *= 1.4; heal(e, 0.15);
        powerUp(e, { name: 'Vegeta Ozaru', spd: 0.75, dmg: 1.4, scale: 1.6, color: '#ffb35c', text: '¡Vegeta mira la luna artificial y se vuelve Ozaru!' });
      }
      if (e.jf.ozaru && (e.jf.pisa = (e.jf.pisa ?? 2) - dt) <= 0) {   // pisotones alrededor
        e.jf.pisa = 3.2;
        G.hazards.push({ x: e.x, y: e.y, r: 110, t: 0.9, dur: 0.9, dmg: e.dmg * 1.2 });
      }
    },
    freezer(e, dt) {
      if (e.hp < e.maxHp * 0.5 && once(e, 'planeta')) {
        e.jf.doom = 90;
        announce('¡Freezer lanzó su ataque al núcleo de Namek! Tienes 90 s', '#ff5c5c');
      }
      if (e.jf.doom > 0 && (e.jf.doom -= dt) <= 0) {
        for (const P of alive()) if (!G.testGod) { P.hp -= P.maxHp * 0.4; burst(P.x, P.y, '#ff7a3d', 20, 5, 3); }
        heal(e, 0.25); e.jf.doom = 90; G.shake = 1.2; sfx('boom', 0.6);
        announce('¡El planeta tiembla! Freezer se recupera… otros 90 s', '#ff5c5c');
      }
    },
    cellimp(e) { MECH._absorbe(e); },
    cellsemi(e) { MECH._absorbe(e); },
    _absorbe(e) {
      for (const q of near(e, G.enemies, 320)) {
        if (q.dead || q === e || (q.id !== 'a17' && q.id !== 'a18')) continue;
        q.dead = true; q.hp = 0; poof(q.x, q.y);
        heal(e, 0.3);
        powerUp(e, { dmg: 1.2, scale: 1.08, spd: 1.05, color: '#6aff8a', text: `¡Cell absorbió a ${q.def.name}!` });
      }
    },
    cell(e, dt) {
      if (e.hp < e.maxHp * 0.2 && !e.jf.revivio && once(e, 'auto')) {
        e.jf.sd = 6; e.jf.spd = e.speed; e.speed = 0;
        announce('¡Cell se va a autodestruir! Termínalo en 6 s', '#ff5c5c');
      }
      if (e.jf.sd > 0) {
        e.cd = Math.max(e.cd, 0.5); e.spCd = Math.max(e.spCd || 0, 1);   // inflándose: no ataca
        e.jf.sd -= dt; e.scale *= 1 + dt * 0.08;
        if (Math.random() < 0.3) burst(e.x, e.y - 20, '#ffd93b', 4, 3, 2);
        if (e.jf.sd <= 0) {
          for (const P of alive()) if (!G.testGod && Math.hypot(P.x - e.x, P.y - e.y) < 520) P.hp -= P.maxHp * 0.5;
          ring(e.x, e.y, 520, 0.8, '#ffd93b'); burst(e.x, e.y, '#ffffff', 80, 9, 5); G.shake = 1.5; sfx('boom', 0.8);
          e.jf.revivio = true; e.hp = e.maxHp * 0.4; e.scale = e.def.scale; e.speed = e.jf.spd;
          powerUp(e, { name: 'Súper Cell Perfecto', spd: 1.1, dmg: 1.25, color: '#7fe6ff', text: '¡Cell regresó de la explosión más fuerte que nunca!' });
        }
      }
    },
    babidib(e, dt) {
      if ((e.jf.marca = (e.jf.marca ?? 1) - dt) > 0) return;
      e.jf.marca = 1.5;
      for (const q of near(e, G.enemies, 240)) {
        if (q.dead || q.boss || q.majin || q.friend) continue;
        q.majin = true; q.dmg *= 1.3; q.speed *= 1.15; q.hp = q.maxHp = q.maxHp * 1.5;
        burst(q.x, q.y - 10, '#ff4da6', 6, 2, 2);
      }
    },
    superbuu(e, dt) {
      if ((e.jf.abs = (e.jf.abs ?? 8) - dt) > 0) return;
      e.jf.abs = 12;
      const A = near(e, G.players, 360).find(p => p.ally && !p.gone && !p.dead);
      if (!A || typeof window.dismissAlly !== 'function') return;
      window.dismissAlly(A); heal(e, 0.15);
      powerUp(e, { dmg: 1.15, color: '#ff8ad0', text: `¡Super Buu absorbió a ${A.name}!` });
    },
    buu(e, dt) {   // Kid Buu: si nadie lo golpea en 3 s, se regenera
      if (e.hp < (e.jf.last ?? e.hp)) e.jf.quieto = 0; else e.jf.quieto = (e.jf.quieto || 0) + dt;
      if (e.jf.quieto > 3 && e.hp < e.maxHp) {
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.025 * dt);
        if (Math.random() < 0.08) burst(e.x, e.y - 10, '#ff8ad0', 4, 2, 2);
        if (once(e, 'avisoRegen')) announce('¡Kid Buu se regenera! No dejes de golpearlo', '#ff8ad0');
      }
      e.jf.last = e.hp;
    },
    janemba(e) {
      if (e.hp < e.maxHp * 0.5 && once(e, 'super')) {
        heal(e, 0.2);
        powerUp(e, { name: 'Super Janemba', spd: 1.3, dmg: 1.25, scale: 1.1, color: '#c04dff', text: '¡Janemba muestra su verdadera forma: Super Janemba!' });
      }
    },
    brolyb(e) {
      if (!e.jf.base) e.jf.base = { dmg: e.dmg, speed: e.speed };
      const ira = 1 - e.hp / e.maxHp;
      e.dmg = e.jf.base.dmg * (1 + ira * 0.8); e.speed = e.jf.base.speed * (1 + ira * 0.4);
      if (ira > 0.5 && once(e, 'furia')) announce('¡La furia de Broly no deja de crecer!', '#6aff8a');
    },
    goldenfz(e) {
      if (G.t - e.spawnT > 60 && once(e, 'agotado')) {
        powerUp(e, { name: 'Golden Freezer (agotado)', spd: 0.6, dmg: 0.8, color: '#ffd93b', text: '¡Golden Freezer se quedó sin energía! Es tu momento' });
      }
    },
    bills(e, dt) {
      if ((e.jf.hk = (e.jf.hk ?? 5) - dt) > 0) return;
      e.jf.hk = 7; hakai(e, 3, 70, e.dmg * 3);
    },
    toppo(e, dt) {
      if (e.hp < e.maxHp * 0.5 && once(e, 'dios')) {
        heal(e, 0.1);
        powerUp(e, { name: 'Toppo (Dios de la Destrucción)', dmg: 1.3, color: '#b06aff', text: '¡Toppo despierta su poder de Dios de la Destrucción!' });
      }
      if (e.jf.dios && (e.jf.hk = (e.jf.hk ?? 2) - dt) <= 0) { e.jf.hk = 6; hakai(e, 2, 80, e.dmg * 2.5); }
    },
    jiren(e, dt) {
      if (e.hp < e.maxHp * 0.3 && once(e, 'limite')) {
        heal(e, 0.1);
        powerUp(e, { name: 'Jiren (al límite)', spd: 1.35, dmg: 1.35, scale: 1.08, color: '#ff5c5c', text: '¡Jiren rompe su límite!' });
      }
      if ((e.jf.puno = (e.jf.puno ?? 6) - dt) <= 0) { e.jf.puno = e.jf.limite ? 5 : 8; hakai(e, e.jf.limite ? 3 : 1, 85, e.dmg * 2.2); }
    },
  };

  const up = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    const r = up.apply(this, arguments);
    if (!G || G.mode !== 'play') return r;
    for (const e of G.enemies) {
      if (!e.boss || e.dead || !MECH[e.id] || e.id[0] === '_') continue;
      e.jf = e.jf || {};
      try { MECH[e.id](e, dt); } catch (err) { /* una mecánica rota no frena la partida */ }
    }
    return r;
  };

  // Cuentas atrás arriba de la pantalla (Freezer, Cell) y la "M" de Babidi
  const hud = drawHUD;
  drawHUD = function () {   // eslint-disable-line no-global-assign
    const r = hud.apply(this, arguments);
    if (!G || G.mode !== 'play') return r;
    let y = 92;
    for (const e of G.enemies) {
      if (!e.boss || e.dead || !e.jf) continue;
      if (e.jf.doom > 0) { hudText(`Namek explota en ${Math.ceil(e.jf.doom)} s`, W / 2, y, 16, '#ff7a3d', 'center'); y += 20; }
      if (e.jf.sd > 0) { hudText(`¡Autodestrucción en ${Math.ceil(e.jf.sd)}!`, W / 2, y, 18, '#ffd93b', 'center'); y += 22; }
    }
    return r;
  };
  const dn = drawNames;
  drawNames = function () {   // eslint-disable-line no-global-assign
    const r = dn.apply(this, arguments);
    try {
      let n = 0;
      for (const e of G.enemies) {
        if (!e.majin || e.dead || ++n > 60) continue;
        const [x, y] = toScreen(e.x, e.y - e.r * 2 - 4);
        if (x > -20 && x < W + 20 && y > -20 && y < H + 20) hudText('M', x, y, 11, '#ff4da6', 'center');
      }
    } catch (err) { /* sin marcas */ }
    return r;
  };
  window.JEFES = MECH;
})();
