// ─── Gohan Bestia y Black Freezer: técnicas propias de sus formas ───
// Solo cuando Gohan está transformado en su 3.ª forma (js/mods/formas.js):
//   · Despertar de la Bestia: al entrar en la forma, una onda de furia empuja y daña a todo lo que está cerca.
//   · Makankosappo de la Bestia: cada pocos segundos, sin ocupar casilla, dispara el rayo en espiral (el que
//     usó contra Cell Max) hacia el enemigo más cercano. Atraviesa todo y escala con el nivel de sus técnicas.
// Envuelve fireAttacks (se llama una vez por jugador y cuadro, solo donde corre la partida: en el
// cooperativo, el anfitrión; el invitado lo ve llegar en la instantánea).
(() => {
  const FORMA = 3;                      // gohan~3 = Gohan Bestia
  const COLOR = '#ff6ad5';              // morado rosado del aura de la Bestia
  const CD = 2.6, ALCANCE = 480;
  const esBestia = P => P && P.charId === 'gohan' && P.formN === FORMA && P.transformed > 0 && !P.dead;
  // Nivel de referencia: el de su técnica más subida (1 a 8)
  const nivel = P => Math.max(1, Math.min(8, ...P.attacks.map(a => a.lvl || 1), 1));

  function despertar(P) {
    const l = nivel(P), radio = 170, dmg = 30 + l * 10;
    burst(P.x, P.y - 14, COLOR, 30, 6, 4);
    burst(P.x, P.y - 14, '#e0c8ff', 20, 4, 3);
    try { playAnim('wring', P.x, P.y, 3); } catch (e) { /* sin anillo */ }
    G.shake = Math.max(G.shake || 0, 0.7);
    sfx('beam', 0.1);
    addText(P.x, P.y - 46, '¡Despertar de la Bestia!', COLOR, true);
    for (const e of G.enemies) {
      if (e.dead || e.friend) continue;
      if (Math.hypot(e.x - P.x, e.y - P.y) < radio + (e.r || 0)) damageEnemy(e, dmg, P, 40, P, 'Despertar de la Bestia');
    }
  }

  function makankosappo(P) {
    const tgt = nearestEnemy(P, ALCANCE);
    if (!tgt) return false;
    const s = attackStats(P, 'makanko', nivel(P));
    const ang = P.aim != null && !P.aimSemi ? P.aim : Math.atan2(tgt.y - P.y, tgt.x - P.x);
    G.projs.push({
      x: P.x, y: P.y - 4, vx: Math.cos(ang) * 16, vy: Math.sin(ang) * 16, r: s.r + 1, dmg: Math.round(s.dmg * 1.25),
      aid: 'Makankosappo de la Bestia', pierce: 99, life: 1, hit: new Set(), color: COLOR, kind: 'spiral', explode: 0, spin: 0, owner: P,
      bounce: 0, speed: 16, home: 0,
    });
    if (Math.abs(Math.cos(ang)) > 0.2 && !P.moving) P.facing = Math.sign(Math.cos(ang));
    P.castT = Math.max(P.castT || 0, 0.3);
    sfx('shot');
    return true;
  }

  const orig = fireAttacks;
  fireAttacks = function (P, dt) {   // eslint-disable-line no-global-assign
    const r = orig.apply(this, arguments);
    try {
      const b = esBestia(P);
      if (b && !P.bestia) { P.bestia = { cd: 0.8 }; despertar(P); }
      else if (!b && P.bestia) P.bestia = null;
      if (b && G.mode === 'play') {
        P.bestia.cd -= dt;
        if (P.bestia.cd <= 0) P.bestia.cd = makankosappo(P) ? CD * cdMult(P) : 0.3;
      }
    } catch (e) { /* nunca rompe la partida */ }
    return r;
  };
})();

// ─── Black Freezer: técnicas propias de su última forma (js/mods/formas.js, freezerp~6) ───
//   · Poder Black: al entrar en la forma, una onda oscura daña y empuja a todo lo que está cerca.
//   · Rayo Mortal Negro: cada pocos segundos, sin ocupar casilla, tres rayos finos que lo atraviesan todo.
(() => {
  const FORMA = 6;
  const COLOR = '#c0307a';
  const CD = 2.2, ALCANCE = 520;
  const esBlack = P => P && P.charId === 'freezerp' && P.formN === FORMA && P.transformed > 0 && !P.dead;
  const nivel = P => Math.max(1, Math.min(8, ...P.attacks.map(a => a.lvl || 1), 1));

  function onda(P) {
    const l = nivel(P), radio = 190, dmg = 35 + l * 12;
    burst(P.x, P.y - 14, '#2a0a20', 30, 6, 4);
    burst(P.x, P.y - 14, COLOR, 22, 4, 3);
    try { playAnim('wring', P.x, P.y, 3); } catch (e) { /* sin anillo */ }
    G.shake = Math.max(G.shake || 0, 0.8);
    sfx('beam', 0.1);
    addText(P.x, P.y - 46, '¡Black Freezer!', COLOR, true);
    for (const e of G.enemies) {
      if (e.dead || e.friend) continue;
      if (Math.hypot(e.x - P.x, e.y - P.y) < radio + (e.r || 0)) damageEnemy(e, dmg, P, 45, P, 'Poder Black');
    }
  }

  function rayo(P) {
    const tgt = nearestEnemy(P, ALCANCE);
    if (!tgt) return false;
    const s = attackStats(P, 'deathbeam', nivel(P));
    const base = P.aim != null && !P.aimSemi ? P.aim : Math.atan2(tgt.y - P.y, tgt.x - P.x);
    for (const d of [-0.12, 0, 0.12]) {
      const ang = base + d;
      G.projs.push({
        x: P.x, y: P.y - 6, vx: Math.cos(ang) * 18, vy: Math.sin(ang) * 18, r: s.r + 1, dmg: Math.round(s.dmg * 1.2),
        aid: 'Rayo Mortal Negro', pierce: 99, life: 1, hit: new Set(), color: COLOR, kind: 'spiral', explode: 0, spin: 0, owner: P,
        bounce: 0, speed: 18, home: 0,
      });
    }
    if (Math.abs(Math.cos(base)) > 0.2 && !P.moving) P.facing = Math.sign(Math.cos(base));
    P.castT = Math.max(P.castT || 0, 0.3);
    sfx('shot');
    return true;
  }

  const orig = fireAttacks;
  fireAttacks = function (P, dt) {   // eslint-disable-line no-global-assign
    const r = orig.apply(this, arguments);
    try {
      const b = esBlack(P);
      if (b && !P.blackFz) { P.blackFz = { cd: 0.8 }; onda(P); }
      else if (!b && P.blackFz) P.blackFz = null;
      if (b && G.mode === 'play') {
        P.blackFz.cd -= dt;
        if (P.blackFz.cd <= 0) P.blackFz.cd = rayo(P) ? CD * cdMult(P) : 0.3;
      }
    } catch (e) { /* nunca rompe la partida */ }
    return r;
  };
})();
