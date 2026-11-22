'use strict';
// ─── Mod: identidad de cada guerrero (tandas 2-8) ───
// Cada guerrero tiene una "firma": una mecánica propia que cambia cómo se juega (no solo un porcentaje).
// Todo se arma con ganchos sobre funciones de la base, sin tocar game.js:
//   setup(P)              al crear al guerrero (revivir extra, valores iniciales)
//   tick(P, dt)           cada paso de la partida (invocaciones, auras, Ki...)
//   dmg(P)                multiplicador de todo su daño
//   vs(P, e, aid)         multiplicador de daño contra un enemigo concreto
//   hit(P, e, aid)        efecto al golpear (petrificar, purificar...)
//   hurt(P, dmg)          después de recibir daño
//   kill(P, e)            al derrotar a un enemigo
//   transform(P)          al transformarse
//   revive(P)             al levantarse con una semilla / revivir
//   def                   daño recibido −x · spd: velocidad +x · crit: probabilidad de ×2 · exec: remata comunes con menos de x de vida
// Herramientas: aliados guerreros (summonAlly: pelean con sus técnicas de verdad), enemigos aliados (friend: soldados,
// Saibaimans, Cell Jr., robots, poseídos por Babidi) y efectos de las formas (bleed, ego, crit) de js/mods/formas.js.
// Se carga después de js/mods/ki.js (envuelve a todos).
(() => {
  const ID = {};
  const inPlay = () => typeof G !== 'undefined' && G && G.mode === 'play' && !G.snake;
  const solo = P => P && !P.ally;
  const lvlOf = P => Math.max(1, ...((P && P.attacks) || []).map(a => a.lvl || 1));
  const near = (a, b, r) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < r * r;
  const hostile = () => G.enemies.filter(e => !e.dead && !e.friend);
  function nearestHostile(x, y, maxD = 400, filter) {
    let best = null, bd = maxD * maxD;
    for (const e of G.enemies) {
      if (e.dead || e.friend || (filter && !filter(e))) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  const say = (P, text, color = '#ffd93b') => addText(P.x, P.y - 38, text, color, true);
  const fxOf = P => (P && P.transformed > 0 && P.c && P.c.formFx) || {};

  // ─── Enemigos aliados: soldados, Saibaimans, Cell Jr., robots y poseídos ───
  // Durante el paso de la base se sacan de G.enemies (nadie los ataca ni ellos a ti) y se mueven aquí; después vuelven
  // a la lista para dibujarse y viajar por la red. kind: 'summon' (desaparece), 'kamikaze' (explota al final),
  // 'possess' (Babidi: los comunes explotan al final, los jefes vuelven a ser enemigos).
  let FR = [], inUpdate = false;
  function spawnFriend(owner, id, secs, kind = 'summon', opts = {}) {
    if (!ENEMIES[id]) return null;
    const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 25;
    let [x, y] = [owner.x + Math.cos(a) * r, owner.y + Math.sin(a) * r];
    if (typeof walkableSpot === 'function') [x, y] = walkableSpot(x, y);
    spawnEnemy(id, { pos: { x, y } });
    const e = G.enemies.pop();
    makeFriend(e, owner, secs, kind, opts.mark || '★');
    if (inUpdate) FR.push(e); else G.enemies.push(e);   // fuera del paso (al transformarse): queda en la lista
    poof(e.x, e.y);
    return e;
  }
  function makeFriend(e, owner, secs, kind, mark) {
    e.friend = { owner, t: secs, kind, mark, cd: 0.3, power: e.boss ? 4 : e.elite ? 2.5 : 1 };
    e.stun = 0;
  }
  function friendDmg(e) {
    const o = e.friend.owner;
    return (7 + 1.4 * G.level) * e.friend.power * Math.max(0.6, dmgMult(o) * 0.55) * (e.friend.buff > 0 ? 1.6 : 1);
  }
  function tickFriends(dt) {
    const k = dt * 60;
    for (const e of FR) {
      if (e.dead) continue;
      const f = e.friend;
      f.t -= dt; f.cd -= dt;
      if (f.buff > 0) { f.buff -= dt; if (Math.random() < dt * 6) G.fx.push({ type: 'spark', x: e.x + rand(-8, 8), y: e.y - rand(4, 24), vx: 0, vy: -0.6, t: 0.4, color: '#ff9bd6', size: 2 }); }
      if (e.flash > 0) e.flash -= dt;
      if (e.stun > 0) e.stun -= dt;
      if (f.t <= 0 || !f.owner || f.owner.dead || f.owner.gone) { endFriend(e); continue; }
      const t = nearestHostile(e.x, e.y, 420);
      const tx = t ? t.x : f.owner.x + 40, ty = t ? t.y : f.owner.y + 10;
      const d = Math.hypot(tx - e.x, ty - e.y) || 1, reach = t ? e.r + t.r + 6 : 50;
      if (d > reach) { const sp = Math.max(1.2, e.speed * 1.25) * (f.buff > 0 ? 1.3 : 1) * k; e.x += (tx - e.x) / d * Math.min(sp, d - reach + 1); e.y += (ty - e.y) / d * Math.min(sp, d - reach + 1); }
      if (Math.abs(tx - e.x) > 2) e.facing = tx > e.x ? 1 : -1;
      if (t && f.cd <= 0) {
        const ranged = (e.def.shooter || e.boss) && d < 230;
        if (d <= reach + 4 || ranged) {
          f.cd = ranged && d > reach + 4 ? 1.1 : 0.5;
          if (d > reach + 4) for (let i = 1; i <= 4; i++) G.fx.push({ type: 'spark', x: e.x + (t.x - e.x) * i / 4, y: e.y + (t.y - e.y) * i / 4, vx: 0, vy: 0, t: 0.2, color: '#ffd0f0', size: 2 });
          damageEnemy(t, friendDmg(e), e, 6, f.owner, 'ki');
          e.flash = 0.06;
        }
      }
    }
  }
  function endFriend(e) {
    const f = e.friend;
    if (f.perm && f.t > 0 && f.owner && !f.owner.dead && !f.owner.gone) return;   // permanente: solo termina si Babidi cae
    if (f.kind === 'possess' && e.boss && !e.dead) { delete e.friend; addText(e.x, e.y - 30, '¡Se liberó de la magia!', '#ff9bd6', true); G.enemies.push(e); FR = FR.filter(x => x !== e); return; }
    if ((f.kind === 'kamikaze' || f.kind === 'possess') && f.owner) {   // se lanzan contra los enemigos y explotan
      G.novas.push({ x: e.x, y: e.y, r: 0, maxR: 80, dmg: friendDmg(e) * 3, hit: new Set(), color: '#ff9b3d', kb: 20, owner: f.owner, aid: 'ki' });
      burst(e.x, e.y, '#ff9b3d', 14, 4, 3);
    } else poof(e.x, e.y);
    e.dead = true;
  }
  // Babidi: posesión permanente. Un jefe o élite que iba a morir (y no es el jefe final) se queda con Babidi
  // para siempre: primero se cuenta como derrotado (experiencia, Zeni, cofres, bajas…) y después vuelve a la
  // pelea como aliado Majin. Deja de ser "jefe" (no tiene barra arriba ni pausa el nivel) pero pega como uno.
  // Hasta 6 a la vez: si llega otro, el más viejo se lanza contra los enemigos y explota.
  const babidiVivo = () => G.players.find(Q => Q.charId === 'babidip' && !Q.ally && !Q.dead && !Q.gone);
  const keBab = killEnemy;
  killEnemy = function (e, owner) {   // eslint-disable-line no-global-assign
    const B = (e.boss || e.elite) && !e.final && !e.friend && !e.vanish && !e.possessed && G.mode === 'play' && babidiVivo();
    const r = keBab.apply(this, arguments);
    if (!B) return r;
    try {
      const mios = alliesOf(B, 'majin').filter(A => A.summon.perm);
      if (mios.length >= 6) { mios[0].summon.perm = false; mios[0].summon.host = null; dismissAlly(mios[0]); }
      e.dead = false; e.possessed = true; e.wasBoss = e.boss;
      e.hp = e.maxHp = Math.max(1, Math.round((e.maxHp || 100) * 0.6));
      if (possessAsAlly(B, e, Infinity, true)) {
        e.boss = false; e.elite = false; e.final = false;
        say(B, `¡${(e.def && e.def.name) || 'Tú'}, ahora eres mío para siempre!`, '#ff4da6');
        return r;
      }
      const mios2 = [...FR, ...G.enemies].filter(x => x.friend && x.friend.perm && x.friend.owner === B && !x.dead);
      if (mios2.length >= 6) endFriend(mios2[0]);
      e.hp = e.maxHp = Math.max(1, Math.round((e.maxHp || 100) * 0.6));
      const power = e.boss ? 4 : 2.5;
      e.wasBoss = e.boss; e.boss = false; e.elite = false; e.final = false;
      G.enemies = G.enemies.filter(x => x !== e);
      makeFriend(e, B, Infinity, 'possess', 'M');
      e.friend.perm = true; e.friend.power = power;
      if (inUpdate) FR.push(e); else G.enemies.push(e);
      burst(e.x, e.y, '#ff4da6', 26, 5, 3);
      try { playAnim('wring', e.x, e.y, 2); } catch (err) { /* sin anillo */ }
      addText(e.x, e.y - 40, '¡M! Ahora sirve a Babidi', '#ff4da6', true);
      say(B, `¡${(e.def && e.def.name) || 'Tú'}, ahora eres mío para siempre!`, '#ff4da6');
    } catch (err) { /* nunca rompe la partida */ }
    return r;
  };

  // Babidi: la marca Majin. Los jefes finales no se pueden controlar
  function possess(P, e) {
    const secs = e.boss ? 6 : e.elite ? 9 : 10;
    if (possessAsAlly(P, e, secs, false)) return;
    G.enemies = G.enemies.filter(x => x !== e);
    makeFriend(e, P, secs, 'possess', 'M');
    FR.push(e);
    burst(e.x, e.y, '#ff4da6', 18, 4, 3);
    addText(e.x, e.y - 34, '¡M!', '#ff4da6', true);
  }

  // ─── Los poseídos por Babidi pelean con su identidad ───
  // En vez de un "zombi" que solo pega, el poseído se vuelve un guerrero aliado (como Dabura o Pui Pui) con su
  // aspecto y sus técnicas de siempre: los jefes que también son jugables usan las del guerrero (Raditz, los
  // androides, la Fuerza Ginyu, Cell…), y los demás, una técnica que les queda (Saibaman: explosión, soldados:
  // pistola de rayos, Cell Jr.: ráfagas…). Pueden recibir daño y el Hechizo de poder los cura.
  // Al terminar la posesión temporal, el jefe o élite vuelve a ser enemigo (con la vida que le quedó) y los
  // comunes se lanzan contra los enemigos y explotan, como antes.
  const MAJIN = {
    // jefes → guerrero jugable (técnicas extra además de la inicial)
    raditz: { c: 'raditzp', atk: ['doublesunday'] }, nappa: { c: 'nappap', atk: ['bomberdx'] }, freezer: { c: 'freezerp', atk: ['deathbeam'] },
    cell: { c: 'cellp', atk: ['kamehameha'] }, cellimp: { c: 'cellp', atk: ['absorcion'] }, cellsemi: { c: 'cellp', atk: ['kiburst'] },
    buu: { c: 'kidbuup', atk: ['planetburst'] }, fatbuu: { c: 'majinbuu', atk: ['caramelo'] }, superbuu: { c: 'majinbuu', atk: ['caramelo', 'vaporbuu'] },
    recoome: { c: 'recoomep', atk: ['recoomekick'] }, burter: { c: 'burterp', atk: ['machattack'] }, jeice: { c: 'jeicep', atk: ['crusher'] },
    ginyu: { c: 'ginyup', atk: ['milkycannon'] }, a19: { c: 'a19p', atk: ['absorcion'] }, gero: { c: 'gerop', atk: ['absorcion'] },
    a16: { c: 'a16p', atk: ['hellflash', 'rocketpunch'] }, a17: { c: 'a17p', atk: ['disparo17', 'barrera'] }, a18: { c: 'a18p', atk: ['disparo18'] },
    puipui: { c: 'puipuip', atk: ['disparozoon'] }, dabura: { c: 'daburap', atk: ['escupitajo', 'espadainfernal'] }, vegetas: { c: 'vegeta', atk: ['bigbangatk'] },
    yakon: { c: 'yakonp', atk: ['garras'] }, taob: { c: 'taop', atk: ['dodonray', 'columna'] }, pikkon: { c: 'pikkonp', atk: ['huracan'] },
    janemba: { c: 'janembap', atk: ['ilusion'] }, mechafz: { c: 'freezerp', atk: ['deathbeam', 'supernova'] }, goldenfz: { c: 'freezerp', atk: ['deathball', 'supernova'] },
    coolerb: { c: 'coolerp', atk: ['supernova'] }, coldb: { c: 'coldp', atk: ['rayocold', 'supernova'] }, brolyb: { c: 'broly', atk: ['erasercannon', 'gigameteor'] },
    // jefes sin guerrero jugable: sus técnicas
    bills: { atk: ['planetburst', 'deathball'] }, toppo: { atk: ['thunderflash', 'kiexplosion'] },
    jiren: { atk: ['megaton', 'kiexplosion', 'kiburst'] },
    // enemigos comunes y élites
    saibaman: { atk: ['kiexplosion'] }, celljr: { atk: ['kiburst', 'gotenfist'] }, soldier: { atk: ['pistolaray'] }, esoldier: { atk: ['pistolaray', 'kiblast'] },
    mercenary: { atk: ['pistolaray'] }, criminal: { atk: ['pistolaray'] }, gunman: { atk: ['pistolaray'] }, bandit: { atk: ['pistolaray'] },
    eggbot: { atk: ['rayosojos'] }, cyborg: { atk: ['kigrenade'] }, destroyer: { atk: ['buster'] }, bomber: { atk: ['capsulabomba'] },
    appulee: { atk: ['kiblast'] }, suie: { atk: ['pistolaray', 'kiblast'] }, gozue: { atk: ['kiblast'] }, mezue: { atk: ['kiblast'] },
    msoldier: { atk: ['rafagamajin'] }, msoldado: { atk: ['rafagamajin'] }, majin: { atk: ['rafagamajin', 'kiblast'] },
    ninja: { atk: ['kienzan'] }, samurai: { atk: ['cortesamurai'] }, skeleton: { atk: ['espada'] }, phantom: { atk: ['fantasmas'] },
    vampire: { atk: ['absorcion'] }, mummy: { atk: ['embestida'] }, ozaru: { atk: ['rugido', 'kiblast'] }, annihil: { atk: ['buster', 'rocketpunch'] },
    deathm: { atk: ['buster', 'rocketpunch'] }, wolf: { atk: ['lobo'] }, bearthief: { atk: ['espada'] },
  };
  const majinDe = e => MAJIN[e.id] || (e.def && MAJIN[e.def.id]) || { atk: ['embestida'] };   // animales: embestida
  function possessAsAlly(P, e, secs, perm) {
    try {
      if (!e || !e.def || !e.def.look) return null;
      const m = majinDe(e), donor = m.c && CHARACTERS[m.c] ? m.c : 'goku';
      const big = e.boss || e.wasBoss;
      const A = summonAlly(P, donor, secs, { tag: 'majin', attacks: m.atk || [], name: e.def.name || 'Majin',
        hp: big ? 1.8 : e.elite ? 1.3 : 0.7, c: { name: e.def.name, aura: '#ff4da6', look: e.def.look, ssjHair: null } });
      if (!A) return null;
      if (!m.c) {   // sin guerrero jugable: solo sus técnicas (no las del donante)
        const lv = A.attacks[0] ? A.attacks[0].lvl : 1;
        A.attacks = (m.atk || ['kiblast']).filter(id => ATTACKS[id]).slice(0, 3).map(id => ({ id, lvl: lv, cd: 0.5 + Math.random() }));
      }
      A.x = e.x; A.y = e.y;
      Object.assign(A.summon, { host: e, perm, majin: true });
      G.enemies = G.enemies.filter(x => x !== e); FR = FR.filter(x => x !== e);
      e.possAlly = A;
      burst(e.x, e.y, '#ff4da6', 18, 4, 3);
      addText(e.x, e.y - 34, '¡M!', '#ff4da6', true);
      return A;
    } catch (err) { return null; }
  }

  // ─── Aliados guerreros: pelean con sus técnicas de verdad (Dabura, Majin Vegeta, Burter, Androide 16...) ───
  let creatingAlly = false;
  function summonAlly(owner, charId, secs, opts = {}) {
    if (!CHARACTERS[charId]) return null;
    G.allyN = (G.allyN || 0) + 1;
    creatingAlly = true;
    let A;
    try {
      const pk = owner.perks || {};
      A = makePlayer(200 + G.allyN, opts.name || CHARACTERS[charId].name, charId, { atk: pk.atk || 0, hp: pk.hp || 0, cd: pk.cd || 0 });
    } finally { creatingAlly = false; }
    A.ally = true;
    A.summon = { owner, t: secs, tag: opts.tag || charId };
    if (opts.c) A.c = { ...A.c, ...opts.c };
    const lv = Math.min(MAX_ATTACK_LEVEL, lvlOf(owner));
    const ids = [A.c.start, ...(opts.attacks || [])].filter((x, i, a) => ATTACKS[x] && a.indexOf(x) === i).slice(0, 3);
    A.attacks = ids.map(id => ({ id, lvl: lv, cd: 0.5 }));
    A.passives = { ...owner.passives };
    A.maxHp = A.hp = Math.round(Math.max(A.maxHp, owner.maxHp) * (opts.hp || 1.2));
    if (opts.transformed) A.transformed = secs + 5;
    const [x, y] = typeof walkableSpot === 'function' ? walkableSpot(owner.x + 36, owner.y) : [owner.x + 36, owner.y];
    A.x = x; A.y = y;
    G.players.push(A);
    burst(A.x, A.y, A.c.aura || '#ffffff', 24, 5, 3);
    ring(A.x, A.y, 60, 0.4, A.c.aura || '#ffffff');
    sfx('power', 0.5);
    return A;
  }
  function dismissAlly(A) {
    if (!A || A.gone) return;
    A.gone = true;
    const S = A.summon, e = S && S.host;
    if (e && !S.released) {
      S.released = true;
      if (!S.perm && (e.boss || e.elite) && !e.dead) {   // la magia se acaba: vuelve a ser enemigo con la vida que le quedó
        e.x = A.x; e.y = A.y; e.possAlly = null; delete e.friend;
        e.hp = Math.max(1, e.hp * Math.max(0.15, A.dead ? 0.15 : A.hp / A.maxHp));
        G.enemies.push(e);
        addText(e.x, e.y - 30, '¡Se liberó de la magia!', '#ff9bd6', true);
        poof(A.x, A.y); A.hp = Math.max(1, A.hp); return;
      }
      if (!A.dead && S.owner) {   // los comunes (o si Babidi cae): se lanzan y explotan
        G.novas.push({ x: A.x, y: A.y, r: 0, maxR: 80, dmg: (7 + 1.4 * G.level) * (S.perm ? 6 : 3), hit: new Set(), color: '#ff9b3d', kb: 20, owner: S.owner, aid: 'ki' });
        burst(A.x, A.y, '#ff9b3d', 14, 4, 3);
        A.hp = Math.max(1, A.hp); return;
      }
    }
    A.hp = Math.max(1, A.hp);
    poof(A.x, A.y);
  }
  const alliesOf = (P, tag) => G.players.filter(A => A.summon && A.summon.owner === P && !A.gone && (!tag || A.summon.tag === tag));
  function tickAllies(dt) {
    const k = dt * 60;
    for (const A of G.players) {
      if (!A.summon || A.gone) continue;
      const o = A.summon.owner;
      A.summon.t -= dt;
      if (A.summon.t <= 0 || !o || o.dead || o.gone || A.dead) { dismissAlly(A); continue; }
      const t = nearestHostile(A.x, A.y, 360);
      const tx = t ? t.x : o.x + 40, ty = t ? t.y : o.y, keep = t ? 55 : 45;
      const d = Math.hypot(tx - A.x, ty - A.y) || 1;
      A.moving = d > keep;
      if (A.moving) {
        const sp = playerSpeed(A) * k;
        A.x += (tx - A.x) / d * Math.min(sp, d - keep); A.y += (ty - A.y) / d * Math.min(sp, d - keep);
        if (typeof pushOutOfSolids === 'function') pushOutOfSolids(A, 12, 6);
      }
      A.dirX = (tx - A.x) / d; A.dirY = (ty - A.y) / d;
      if (Math.abs(tx - A.x) > 2) A.facing = tx > A.x ? 1 : -1;
      A.dir = 'side'; A.tx = undefined;
      if (o.dead) dismissAlly(A);
    }
  }

  // Hechizo de poder de Babidi: sus guerreros invocados pegan un 50% más mientras dura
  const dmB = dmgMult;
  dmgMult = function (P) {   // eslint-disable-line no-global-assign
    const m = dmB.apply(this, arguments);
    return P && P.babBuff > 0 ? m * 1.5 : m;
  };

  // ─── Firmas ───
  const every = (P, key, secs, dt) => { P[key] = (P[key] ?? secs * 0.5) - dt; if (P[key] <= 0) { P[key] = secs; return true; } return false; };
  const extraLife = (P, text) => { P.senzuLeft = (P.senzuLeft || 0) + 1; P.reviveText = text; };

  // Tanda 2: guerreros Z
  ID.goku = { firma: 'Ganas de pelear: +25% de daño contra élites y jefes. Sus formas suben hasta el Ultra Instinto Dominado.',
    vs: (P, e) => (e.boss || e.elite ? 1.25 : 1) };
  ID.vegeta = { firma: 'Zenkai: cada vez que sobrevive con menos del 25% de vida, sube su daño un 7% por el resto de la partida (hasta 5 veces).',
    tick(P, dt) {
      if (P.zkCd > 0) P.zkCd -= dt;
      if (P.hp < P.maxHp * 0.25 && !P.zkLow && !(P.zkCd > 0)) { P.zkLow = 4; }
      if (P.zkLow > 0) { P.zkLow -= dt; if (P.zkLow <= 0) { P.zkLow = 0; if (!P.dead && (P.zk || 0) < 5) { P.zk = (P.zk || 0) + 1; P.zkCd = 15; say(P, `¡Zenkai! +${P.zk * 7}%`, '#7fe6ff'); burst(P.x, P.y, '#7fe6ff', 20, 4, 3); } } }
    },
    dmg: P => 1 + 0.07 * (P.zk || 0) };
  ID.gohan = { firma: 'Ira contenida: recibir golpes llena su ira (+1% de daño por cada 1% de vida perdida, hasta +40%; baja con el tiempo).',
    tick(P, dt) { if (P.ira > 0) P.ira = Math.max(0, P.ira - 1.5 * dt); },
    hurt(P, d) { P.ira = Math.min(40, (P.ira || 0) + d / P.maxHp * 100); },
    dmg: P => 1 + (P.ira || 0) / 100 };
  ID.gohanc = { firma: 'Padre e hijo: sus rayos pegan hasta un 60% más cuanta menos vida le queda.',
    vs: (P, e, aid) => (ATTACKS[aid] && ATTACKS[aid].type === 'beam' ? 1 + 0.6 * (1 - P.hp / P.maxHp) : 1) };
  ID.gohanf = { firma: 'Último guerrero: +4% de daño por cada enemigo a su alrededor (hasta +40%).',
    tick(P) { let n = 0; for (const e of G.enemies) if (!e.dead && !e.friend && near(e, P, 120)) n++; P.crowd = Math.min(10, n); },
    dmg: P => 1 + 0.04 * (P.crowd || 0) };
  ID.trunks = { firma: 'Sin miedo: +30% de daño contra élites, jefes y enemigos grandes. Con Goten en el equipo, los dos pegan +15%.',
    vs: (P, e) => (e.boss || e.elite || e.r >= 20 ? 1.3 : 1), dmg: P => (G.players.some(Q => Q.charId === 'goten' && !Q.gone && Q !== P) ? 1.15 : 1) };
  ID.ftrunks = { firma: 'Espada del futuro: remata a los enemigos comunes con menos del 15% de vida.', exec: 0.15 };
  ID.goten = { firma: 'Energía de niño: carga Ki solo con moverse. Con Trunks en el equipo, los dos pegan +15%.',
    tick(P, dt) { if (P.moving && !(P.transformed > 0) && P.ki < 100) P.ki = Math.min(100, P.ki + 2.5 * dt); },
    dmg: P => (G.players.some(Q => Q.charId === 'trunks' && !Q.gone && Q !== P) ? 1.15 : 1) };
  ID.pan = { firma: 'Heredera: con el Kamehameha y el Masenko a la vez, +15% de daño.',
    dmg: P => (P.attacks.some(a => a.id === 'kamehameha' || a.id === 'kame10') && P.attacks.some(a => a.id === 'masenko' || a.id === 'supermasenko') ? 1.15 : 1) };
  ID.piccolo = { firma: 'Ropa con peso: la primera vez que se transforma se quita la capa y el turbante: +15% de velocidad toda la partida.',
    transform(P) { if (!P.capeOff) { P.capeOff = true; say(P, '¡Se quita la capa con peso!', '#b4ff8a'); } }, spd: P => (P.capeOff ? 0.15 : 0) };

  // Tanda 3: fusiones, dioses y legendarios
  ID.gogetap = { firma: 'Fusión de la danza: aprende técnicas de Goku y de Vegeta. Su Soul Punisher purifica a los comunes debilitados.',
    hit(P, e, aid) { if (aid === 'soulpunisher' && !e.dead && !e.boss && e.hp < e.maxHp * 0.3) damageRaw(e, e.hp + 1, P, 'soulpunisher'); } };
  ID.vegetto = { firma: 'Burla: recibe −20% de daño y cada 10 s se burla de los enemigos cercanos, que se quedan quietos 1 s.', def: 0.2,
    tick(P, dt) { if (every(P, 'tauntT', 10, dt)) { let n = 0; for (const e of G.enemies) if (!e.dead && !e.friend && !e.boss && near(e, P, 130)) { e.stun = Math.max(e.stun || 0, 1); n++; } if (n) say(P, '¡Vamos, atácame!', '#9fd8ff'); } } };
  ID.gotenks = { firma: 'Travieso: cada 8 s le pasa algo al azar: más daño, más velocidad o Ki extra.',
    tick(P, dt) {
      if (P.gtBuff > 0) P.gtBuff -= dt;
      if (every(P, 'gtT', 8, dt)) {
        const r = Math.floor(Math.random() * 3);
        if (r === 0) { P.gtKind = 'dmg'; P.gtBuff = 4; say(P, '¡Ataque Kamikaze Fantasma sorpresa! +40% daño', '#ffd0f0'); }
        else if (r === 1) { P.gtKind = 'spd'; P.gtBuff = 4; say(P, '¡Súper velocidad! +40%', '#ffd0f0'); }
        else { P.ki = Math.min(100, P.ki + 25); say(P, '¡+25 de Ki!', '#ffd0f0'); }
      }
    },
    dmg: P => (P.gtBuff > 0 && P.gtKind === 'dmg' ? 1.4 : 1), spd: P => (P.gtBuff > 0 && P.gtKind === 'spd' ? 0.4 : 0) };
  ID.broly = { firma: 'Furia legendaria: cada enemigo derrotado sube su daño un 0,4% por el resto de la partida (hasta +150%).',
    kill(P) { P.fury = (P.fury || 0) + 1; if (P.fury % 50 === 0 && P.fury <= 375) say(P, `¡Furia legendaria! +${Math.round(Math.min(1.5, P.fury * 0.004) * 100)}%`, '#7dff6a'); },
    dmg: P => 1 + Math.min(1.5, (P.fury || 0) * 0.004) };
  ID.black = { firma: 'Corte divino: 15% de probabilidad de que cada golpe corte y haga un 50% más de daño.',
    vs: () => (Math.random() < 0.15 ? 1.5 : 1) };
  ID.zamasu = { firma: 'Inmortal: si un golpe lo dejaría en 0, se queda con 1 de vida y es inmune 3 s (cada 60 s).',
    tick(P, dt) { if (P.immoCd > 0) P.immoCd -= dt; },
    hurt(P) { if (P.hp <= 0 && !(P.immoCd > 0)) { P.hp = 1; P.immortal = 3; P.immoCd = 60; say(P, '¡Soy inmortal!', '#ffe9a0'); burst(P.x, P.y, '#ffe9a0', 24, 4, 3); } } };

  // Tanda 4: imperio de Freezer y Saiyajin del espacio
  ID.freezerp = { firma: 'Ejército de Freezer: cada 22 s llegan 2 soldados que pelean por él 14 s.',
    tick(P, dt) { if (every(P, 'armyT', 22, dt)) { for (let i = 0; i < 2; i++) spawnFriend(P, 'soldier', 14); say(P, '¡Soldados, a mí!', '#c46bff'); } } };
  ID.coolerp = { firma: 'Metal Cooler: revive una vez por partida reconstruido en metal.',
    setup: P => extraLife(P, '¡Metal Cooler!') };
  ID.raditzp = { firma: 'Rastreador: marca al enemigo más fuerte cerca y le hace +40% de daño.',
    tick(P, dt) {
      if (every(P, 'scanT', 1, dt) || (P.mark && P.mark.dead)) {
        let best = null;
        for (const e of G.enemies) if (!e.dead && !e.friend && near(e, P, 360) && (!best || e.maxHp > best.maxHp)) best = e;
        P.mark = best;
      }
    },
    vs: (P, e) => (P.mark === e ? 1.4 : 1) };
  ID.nappap = { firma: 'Saibaimans: cada 16 s planta 3 Saibaimans que pelean por él y explotan al final.',
    tick(P, dt) { if (every(P, 'saiT', 16, dt)) { for (let i = 0; i < 3; i++) spawnFriend(P, 'saibaman', 12, 'kamikaze'); say(P, '¡Salgan, Saibaimans!', '#9dff8a'); } } };
  ID.ginyup = { firma: 'Cambio de cuerpo: al transformarse cambia de lugar con el élite o jefe más cercano, le roba la mitad de su vida (un 20% a los jefes) y pega +30% mientras dure. Cada 20 s, pose de combate: +20% de daño 6 s.',
    transform(P) {
      const e = nearestHostile(P.x, P.y, 300, x => (x.elite || x.boss) && !x.final);
      if (!e) return;
      const steal = e.boss ? e.maxHp * 0.2 : e.hp * 0.5;
      [P.x, P.y, e.x, e.y] = [e.x, e.y, P.x, P.y];
      damageRaw(e, steal, P, 'ki');
      healPlayer(P, P.maxHp * 0.3);
      P.swapOn = true;
      say(P, '¡Cambio de cuerpo!', '#c27aff'); burst(P.x, P.y, '#c27aff', 30, 5, 3); G.shake = Math.max(G.shake, 0.5);
    },
    tick(P, dt) {
      if (!(P.transformed > 0)) P.swapOn = false;
      if (P.poseB > 0) P.poseB -= dt;
      if (every(P, 'poseT2', 20, dt)) { P.poseB = 6; say(P, '¡Fuerzas Especiales Ginyu!', '#c27aff'); }
    },
    dmg: P => (P.swapOn ? 1.3 : 1) * (P.poseB > 0 ? 1.2 : 1) };
  ID.recoomep = { firma: 'Cuerpo de hierro: recibe −25% de daño.', def: 0.25 };
  ID.burterp = { firma: 'El más rápido del universo: +20% de daño mientras se mueve.', dmg: P => (P.moving ? 1.2 : 1) };
  ID.jeicep = { firma: 'Purple Comet: cada 30 s llama a Burter, que pelea a su lado 12 s.',
    tick(P, dt) { if (every(P, 'burT', 30, dt) && !alliesOf(P, 'burter').length) { summonAlly(P, 'burterp', 12, { tag: 'burter' }); say(P, '¡Purple Comet Attack!', '#ff5c5c'); } } };

  // Tanda 5: androides y Cell
  ID.cellp = { firma: 'Absorción: cada jefe derrotado le da +15% de daño y +10% de vida máxima; cada élite, +2% de daño (hasta +20%). Al transformarse nacen 3 Cell Jr. Revive una vez como Súper Cell Perfecto (+25% de daño).',
    setup: P => extraLife(P, '¡Súper Cell Perfecto!'),
    kill(P, e) {
      if (e.boss) { P.absB = (P.absB || 0) + 1; P.maxHp = Math.round(P.maxHp * 1.1); healPlayer(P, P.maxHp * 0.1); say(P, `¡Absorbido! +${P.absB * 15}%`, '#b4ff8a'); }
      else if (e.elite) P.absE = Math.min(10, (P.absE || 0) + 1);
    },
    transform(P) { for (let i = 0; i < 3; i++) spawnFriend(P, 'celljr', 20); },
    revive(P) { P.superCell = true; },
    dmg: P => (1 + 0.15 * (P.absB || 0) + 0.02 * (P.absE || 0)) * (P.superCell ? 1.25 : 1) };
  ID.a17p = { firma: 'Energía infinita: su Ki se carga solo (+6 por segundo) y recibe −15% de daño.', def: 0.15,
    tick(P, dt) { if (!(P.transformed > 0)) P.ki = Math.min(100, P.ki + 6 * dt); } };
  ID.a18p = { firma: 'Energía infinita: su Ki se carga solo (+6 por segundo) y tiene 15% de golpes críticos (×2).', crit: 0.15,
    tick(P, dt) { if (!(P.transformed > 0)) P.ki = Math.min(100, P.ki + 6 * dt); } };
  ID.a16p = { firma: 'Autodestrucción: la primera vez que cae, explota con todo su poder y sigue peleando.',
    setup: P => extraLife(P, '¡Autodestrucción!'),
    revive(P) { G.novas.push({ x: P.x, y: P.y, r: 0, maxR: 190, dmg: 300 + G.level * 40, hit: new Set(), color: '#ffb84a', kb: 30, owner: P, aid: 'ki' }); G.shake = 1; sfx('boom'); } };
  const absorbShots = (P, dt, r, heal, ki) => {
    for (const s of G.shots) if (!s.dead && near(s, P, r)) { s.dead = true; healPlayer(P, P.maxHp * heal); P.ki = Math.min(100, P.ki + ki); G.fx.push({ type: 'spark', x: s.x, y: s.y, vx: (P.x - s.x) / 10, vy: (P.y - s.y) / 10, t: 0.3, color: '#ff7a3d', size: 2 }); }
  };
  ID.a19p = { firma: 'Absorbe energía: los disparos enemigos que lo tocan lo curan y le dan Ki en vez de dañarlo.',
    tick: (P, dt) => absorbShots(P, dt, 26, 0.02, 4) };
  ID.gerop = { firma: 'Creador de androides: absorbe los disparos (lo curan) y cada 30 s activa al Androide 16, que pelea 15 s.',
    tick(P, dt) { absorbShots(P, dt, 26, 0.02, 4); if (every(P, 'andT', 30, dt) && !alliesOf(P, 'a16').length) { summonAlly(P, 'a16p', 15, { tag: 'a16' }); say(P, '¡Androide 16, actívate!', '#ff7a3d'); } } };
  ID.a13p = { firma: 'Súper 13: la primera vez que baja de la mitad de la vida, absorbe los chips de 14 y 15: +40% de daño y se cura un 30%.',
    tick(P) { if (!P.super13 && P.hp < P.maxHp * 0.5 && !P.dead) { P.super13 = true; healPlayer(P, P.maxHp * 0.3); say(P, '¡Súper Androide 13!', '#7de0ff'); burst(P.x, P.y, '#7de0ff', 30, 5, 3); G.shake = Math.max(G.shake, 0.5); } },
    dmg: P => (P.super13 ? 1.4 : 1) };

  // Tanda 6: saga de Majin Buu
  const BABIDI_FORMS = { 1: [['puipuip', 'puipui'], ['yakonp', 'yakon']], 2: [['daburap', 'dabura']], 3: [['vegeta', 'majinvegeta']], 4: [['majinbuu', 'buu']] };
  ID.babidip = { firma: 'Mago malvado: pega poco, pero cada 14 s invoca 2 soldados Majin, cada 10 s pone la marca Majin al enemigo más fuerte cerca (los jefes, 6 s; los finales no) y cada forma de su transformación invoca a un guerrero: Pui Pui y Yakon → Dabura → Majin Vegeta → Majin Buu. Cada 9 s, Hechizo de poder: cura a sus guerreros (30%) y a los compañeros cercanos (8%), y sus aliados pegan un 50-60% más por 6 s. Los jefes y élites que iban a morir (menos el final) se quedan con él para siempre. Sus poseídos pelean con sus propias técnicas (Recoome con su Eraser Gun, los androides con las suyas, los Saibaman explotan…).',
    dmg: () => 0.8,
    tick(P, dt) {
      // Hechizo de poder: cura y potencia a todos sus aliados
      for (const A of alliesOf(P)) if (A.babBuff > 0) A.babBuff -= dt;
      if (every(P, 'hechT', 9, dt)) {
        const mis = alliesOf(P), amigos = [...FR, ...G.enemies].filter(x => x.friend && x.friend.owner === P && !x.dead);
        const cerca = G.players.filter(Q => Q !== P && !Q.ally && !Q.dead && !Q.gone && Math.hypot(Q.x - P.x, Q.y - P.y) < 240);
        if (mis.length || amigos.length || cerca.length) {
          for (const A of mis) { A.hp = Math.min(A.maxHp, A.hp + A.maxHp * 0.3); A.babBuff = 6; burst(A.x, A.y - 10, '#ff9bd6', 10, 3, 2); }
          for (const x of amigos) { x.friend.buff = 6; if (!x.friend.perm) x.friend.t += 2; burst(x.x, x.y - 10, '#ff9bd6', 8, 3, 2); }
          for (const Q of cerca) { healPlayer(Q, Q.maxHp * 0.08); burst(Q.x, Q.y - 10, '#ff9bd6', 8, 3, 2); }
          ring(P.x, P.y, 90, 0.4, '#ff4da6');
          say(P, '¡Hechizo de poder!', '#ff9bd6');
        }
      }
      if (every(P, 'majT', 14, dt)) { for (let i = 0; i < 2; i++) spawnFriend(P, 'msoldado', 14, 'summon', { mark: 'M' }); say(P, '¡Pa-pa-ra-pa!', '#ff9bd6'); }
      if (every(P, 'posT', 10, dt)) {
        const e = nearestHostile(P.x, P.y, 280, x => !x.final && (x.boss || x.elite)) || nearestHostile(P.x, P.y, 220, x => !x.final);
        if (e) { possess(P, e); if (e.boss || e.elite) say(P, `¡${e.def.name || 'Tú'}, ahora me obedeces!`, '#ff4da6'); }
      }
      // Invocaciones de la transformación: cada forma suma su guerrero; al bajar o terminar, se van
      const n = P.transformed > 0 ? (P.formN || 1) : 0;
      if (n !== P.babN) {
        for (const A of alliesOf(P)) if (A.summon.form > n) dismissAlly(A);
        for (let f = 1; f <= n; f++) for (const [cid, tag] of BABIDI_FORMS[f] || []) if (!alliesOf(P, tag).length) {
          const opts = { tag, attacks: [] };
          if (tag === 'majinvegeta') Object.assign(opts, { name: 'Majin Vegeta', transformed: true, attacks: ['bigbangatk', 'explosionfinal'],
            c: { name: 'Majin Vegeta', transform: 'Majin Vegeta', aura: '#ff4da6' }, hp: 1.5 });
          if (tag === 'buu') Object.assign(opts, { hp: 2, attacks: ['caramelo'] });
          const A = summonAlly(P, cid, 999, opts);
          if (A) A.summon.form = f;
          const lines = { puipui: '¡Pui Pui, Yakon, peleen!', dabura: '¡Dabura, acaba con ellos!', majinvegeta: '¡Vegeta, ahora eres mío!', buu: '¡Despierta, Majin Buu!' };
          if (lines[tag]) say(P, lines[tag], '#ff9bd6');
        }
        P.babN = n;
      }
    } };
  ID.majinbuu = { firma: '¡Te convierto en dulce!: un 30% de los enemigos que derrota se vuelven dulces y se los come (cura un 2% de su vida).',
    kill(P, e) { if (Math.random() < 0.3) { healPlayer(P, P.maxHp * 0.02); burst(e.x, e.y, '#ff9bd6', 6, 2, 2); } } };
  ID.kidbuup = { firma: 'Caos puro: cada 6 s hace algo al azar: una explosión a su alrededor, explosiones sobre varios enemigos o se regenera un 10%.',
    tick(P, dt) {
      if (!every(P, 'chaosT', 6, dt)) return;
      const r = Math.floor(Math.random() * 3), d = (30 + G.level * 6) * dmgMult(P);
      if (r === 0) { G.novas.push({ x: P.x, y: P.y, r: 0, maxR: 150, dmg: d, hit: new Set(), color: '#ff8fd0', kb: 20, owner: P, aid: 'ki' }); say(P, '¡Jajaja!', '#ff8fd0'); }
      else if (r === 1) { hostile().sort(() => Math.random() - 0.5).slice(0, 4).forEach(e => G.novas.push({ x: e.x, y: e.y, r: 0, maxR: 60, dmg: d, hit: new Set(), color: '#ff8fd0', kb: 10, owner: P, aid: 'ki' })); }
      else { healPlayer(P, P.maxHp * 0.1); say(P, '¡Regeneración!', '#ff8fd0'); }
    } };
  ID.daburap = { firma: 'Rey del Inframundo: su escupitajo petrifica, y cada golpe tiene 8% de probabilidad de convertir en piedra (2,5 s; los jefes, menos).',
    hit(P, e, aid) { if (!e.dead && (aid === 'escupitajo' || Math.random() < 0.08)) { e.stun = Math.max(e.stun || 0, e.boss ? 0.8 : 2.5); e.flash = 0.2; } } };
  ID.puipuip = { firma: 'Gravedad x10: los enemigos a su alrededor se mueven un 40% más lento.', slowAura: 150 };
  ID.yakonp = { firma: 'Come energía: se traga los disparos enemigos que lo tocan (lo curan y le dan Ki).',
    tick: (P, dt) => absorbShots(P, dt, 34, 0.015, 3) };
  ID.spopovichp = { firma: 'No siente dolor: recibe −30% de daño.', def: 0.3 };
  ID.yamup = { firma: 'Ladrón de energía: cada golpe tiene 15% de probabilidad de robarle 3 de Ki al enemigo.',
    hit(P) { if (Math.random() < 0.15) P.ki = Math.min(100, P.ki + 3); } };

  // Tanda 7: terrícolas y artistas marciales
  ID.krilin = { firma: 'Semillas del Ermitaño: siempre lleva una de más (revive una vez extra).', setup: P => extraLife(P, '¡Semilla del Ermitaño!') };
  ID.yamcha = { firma: 'Reflejos de beisbolista: batea los disparos enemigos que lo tocan contra el enemigo más cercano.',
    tick(P) {
      for (const s of G.shots) if (!s.dead && near(s, P, 28)) {
        s.dead = true;
        const e = nearestHostile(P.x, P.y, 300);
        if (e) { damageRaw(e, (12 + G.level * 3) * dmgMult(P), P, 'ki'); burst(e.x, e.y, '#7ad8ff', 6, 3, 2); }
        if (Math.random() < 0.3) say(P, '¡Jonrón!', '#7ad8ff');
      }
    } };
  ID.tien = { firma: 'Tercer ojo: 15% de golpes críticos (×2). Su Multiforma lo divide en copias.', crit: 0.15 };
  ID.roshi = { firma: 'Creador del Kamehameha: sus rayos pegan +20%.', vs: (P, e, aid) => (ATTACKS[aid] && ATTACKS[aid].type === 'beam' ? 1.2 : 1) };
  ID.taop = { firma: 'Asesino a sueldo: remata a los comunes con menos del 25% de vida y cobra 25 Zeni por cada élite.', exec: 0.25,
    kill(P, e) { if (e.elite) { P.bonusZeni = (P.bonusZeni || 0) + 25; say(P, '+25 Z', '#ffe27a'); } } };
  ID.yajirobe = { firma: 'Cobarde con suerte: tras recibir un golpe corre un 40% más rápido 2 s, y cada 60 s se come una semilla (cura 30%).',
    hurt(P) { P.runT = 2; },
    tick(P, dt) { if (P.runT > 0) P.runT -= dt; if (every(P, 'senzT', 60, dt) && P.hp < P.maxHp * 0.8) { healPlayer(P, P.maxHp * 0.3); say(P, '¡Ñam! Una semilla', '#6cff7a'); } },
    spd: P => (P.runT > 0 ? 0.4 : 0) };
  ID.videl = { firma: 'Combo: cada golpe seguido (menos de 1 s entre uno y otro) suma +3% de daño, hasta +30%.',
    tick(P, dt) { if (P.comboT > 0) { P.comboT -= dt; if (P.comboT <= 0) P.combo = 0; } },
    hit(P) { P.combo = Math.min(10, (P.combo || 0) + 1); P.comboT = 1; },
    dmg: P => 1 + 0.03 * (P.combo || 0) };
  ID.saiyaman = { firma: 'Héroe de la justicia: +30% de daño a los jefes, y cada 25 s una pose heroica que aturde a los comunes cercanos.',
    vs: (P, e) => (e.boss ? 1.3 : 1),
    tick(P, dt) { if (every(P, 'heroT', 25, dt)) { for (const e of G.enemies) if (!e.dead && !e.friend && !e.boss && near(e, P, 140)) e.stun = Math.max(e.stun || 0, 1.5); say(P, '¡El Gran Saiyaman ha llegado!', '#ffe14d'); } } };
  ID.bulmap = { firma: 'Inventos de Capsule Corp: cada 20 s saca 2 robots que pelean por ella 15 s.',
    tick(P, dt) { if (every(P, 'botT', 20, dt)) { for (let i = 0; i < 2; i++) spawnFriend(P, 'eggbot', 15); say(P, '¡Cápsula de robots!', '#8fe3ff'); } } };
  ID.dendep = { firma: 'Curandero: cada 10 s cura un 12% de vida a él y a los compañeros cercanos.',
    tick(P, dt) { if (every(P, 'healT', 10, dt)) { for (const Q of G.players) if (!Q.dead && !Q.gone && near(Q, P, 170)) { healPlayer(Q, Q.maxHp * 0.12); burst(Q.x, Q.y, '#9dff8a', 8, 2, 2); } } } };
  ID.popop = { firma: 'Maestro del templo: su alfombra le da +15% de velocidad y cada vez que sube de nivel se cura un 20%.',
    spd: () => 0.15,
    tick(P) { if (P.lastLvl !== undefined && G.level > P.lastLvl) healPlayer(P, P.maxHp * 0.2); P.lastLvl = G.level; } };

  // Tanda 8: Otro Mundo
  ID.pikkonp = { firma: 'Campeón del torneo: 30% de probabilidad de contraatacar con una onda cuando lo golpean.',
    hurt(P) { if (Math.random() < 0.3 && !P.dead) G.novas.push({ x: P.x, y: P.y, r: 0, maxR: 90, dmg: (25 + G.level * 5) * dmgMult(P), hit: new Set(), color: '#bff5ff', kb: 22, owner: P, aid: 'ki' }); } };
  ID.janembap = { firma: 'Distorsión: cada 7 s, si un enemigo lo toca, se teletransporta lejos y deja una explosión.',
    tick(P, dt) {
      if (!every(P, 'blinkT', 7, dt)) return;
      const e = nearestHostile(P.x, P.y, 50);
      if (!e) { P.blinkT = 0.5; return; }
      G.novas.push({ x: P.x, y: P.y, r: 0, maxR: 80, dmg: (30 + G.level * 6) * dmgMult(P), hit: new Set(), color: '#ff5ad0', kb: 20, owner: P, aid: 'ki' });
      const a = Math.atan2(P.y - e.y, P.x - e.x);
      let [x, y] = [P.x + Math.cos(a) * 110, P.y + Math.sin(a) * 110];
      if (typeof walkableSpot === 'function') [x, y] = walkableSpot(x, y);
      burst(P.x, P.y, '#ff5ad0', 14, 4, 2); P.x = x; P.y = y; burst(x, y, '#ff5ad0', 14, 4, 2);
    } };
  ID.olibu = { firma: 'Campeón eterno: tiene una aureola de más (revive una vez extra).', setup: P => extraLife(P, '¡El campeón vuelve!') };
  ID.hercule = { firma: 'Sigue siendo el campeón: no usa Ki, se aguanta los golpes de suerte y su amigo Buu pelea por él.' };

  // ─── Ganchos a la base ───
  const mk = makePlayer;
  makePlayer = function () {   // eslint-disable-line no-global-assign
    const P = mk.apply(this, arguments);
    if (P && !creatingAlly && ID[P.charId] && ID[P.charId].setup) ID[P.charId].setup(P);
    return P;
  };
  const dm = dmgMult;
  dmgMult = function (P) {   // eslint-disable-line no-global-assign
    let m = dm.apply(this, arguments);
    if (!P) return m;
    const d = ID[P.charId];
    if (d && d.dmg && !P.summon) m *= d.dmg(P);
    const f = fxOf(P);
    if (f.ego && P.egoN) m *= 1 + f.ego * Math.min(1, P.egoN / 20);
    return m;
  };
  const sp = playerSpeed;
  playerSpeed = function (P) {   // eslint-disable-line no-global-assign
    const d = P && ID[P.charId];
    return sp.apply(this, arguments) * (d && d.spd && !P.summon ? 1 + d.spd(P) : 1);
  };
  // Daño directo, sin volver a pasar por las firmas (para remates, robos y rebotes)
  let raw = false;
  function damageRaw(e, amount, owner, aid) {
    raw = true;
    try { damageEnemy(e, amount, owner, 0, owner, aid); } finally { raw = false; }
  }
  const de = damageEnemy;
  damageEnemy = function (e, amount, src, kb, owner, aid) {   // eslint-disable-line no-global-assign
    if (raw || !e || e.friend || !owner || !owner.charId) return de.apply(this, arguments);
    const d = ID[owner.charId] && !owner.summon ? ID[owner.charId] : null;
    if (d) {
      if (d.vs) amount *= d.vs(owner, e, aid);
      if (d.crit && Math.random() < d.crit) amount *= 2;
      if (d.exec && !e.boss && e.hp - amount < e.maxHp * d.exec) amount = Math.max(amount, e.hp + 1);
    }
    const f = fxOf(owner);
    if (f.crit && Math.random() < f.crit) amount *= 2;
    const r = de.call(this, e, amount, src, kb, owner, aid);
    if (d && d.hit) d.hit(owner, e, aid);
    return r;
  };
  const hp0 = hurtPlayer;
  hurtPlayer = function (P, amount, kind) {   // eslint-disable-line no-global-assign
    const d = P && ID[P.charId] && !P.summon ? ID[P.charId] : null;
    if (d && d.def) amount *= 1 - d.def;
    const before = P ? P.hp : 0;
    const r = hp0.call(this, P, amount, kind);
    if (!P) return r;
    const lost = before - P.hp;
    if (lost > 0) {
      if (d && d.hurt) d.hurt(P, lost);
      const f = fxOf(P);
      if (f.ego) { P.egoN = Math.min(20, (P.egoN || 0) + 1); }
    }
    if (P.summon && P.hp <= 0) { P.hp = 1; dismissAlly(P); }
    return r;
  };
  const ke = killEnemy;
  killEnemy = function (e, owner) {   // eslint-disable-line no-global-assign
    const r = ke.apply(this, arguments);
    const d = owner && owner.charId && !owner.summon && ID[owner.charId];
    if (d && d.kill) d.kill(owner, e);
    return r;
  };
  const dt0 = doTransform;
  doTransform = function (P) {   // eslint-disable-line no-global-assign
    const was = P && P.transformed > 0;
    const r = dt0.apply(this, arguments);
    if (P && !was && P.transformed > 0 && !P.summon && inPlay()) { const d = ID[P.charId]; if (d && d.transform) d.transform(P); }
    return r;
  };

  // Cada paso: firmas, aliados y enemigos aliados
  const up = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    if (!(typeof G !== 'undefined' && G)) return up.apply(this, arguments);
    FR = G.enemies.filter(e => e.friend && !e.dead);
    if (FR.length) G.enemies = G.enemies.filter(e => !e.friend);
    const slowed = [];
    inUpdate = true;
    try {
      if (inPlay()) {
        for (const P of G.players) {
          if (P.gone || P.dead || P.summon) continue;
          const d = ID[P.charId];
          if (d && d.tick) d.tick(P, dt);
          const f = fxOf(P);
          if (f.bleed) P.hp = Math.max(1, P.hp - f.bleed * P.maxHp * dt);   // Majin Vegeta: el poder le cuesta vida
          if (!(P.transformed > 0)) P.egoN = 0;
          if (d && d.slowAura) for (const e of G.enemies) if (!e.dead && near(e, P, d.slowAura)) slowed.push([e, e.x, e.y]);
        }
        tickAllies(dt);
        tickFriends(dt);
        // Congelar el Tiempo (Babidi): sus disparos desaparecen dentro del hechizo
        for (const n of G.novas) if (n.aid === 'congelartiempo' && !n._frz) { n._frz = true; for (const s of G.shots) if (near(s, n, n.maxR)) s.dead = true; }
      }
      return up.apply(this, arguments);
    } finally {
      inUpdate = false;
      for (const [e, x, y] of slowed) if (!e.dead) { e.x = x + (e.x - x) * 0.6; e.y = y + (e.y - y) * 0.6; }   // Gravedad x10
      if (G && G.enemies) G.enemies.push(...FR.filter(e => !e.dead));
      FR = [];
      if (G && G.players) {
        for (const P of G.players) {   // revivir con sabor propio (Metal Cooler, Súper Cell, Autodestrucción...)
          if (P.koT > 0 && !P._ko) {
            P._ko = true;
            const d = ID[P.charId];
            if (!P.summon && d && (d.revive || P.reviveText)) { if (P.reviveText) announce(P.reviveText, '#ffe14d'); if (d.revive) d.revive(P); }
          } else if (!(P.koT > 0)) P._ko = false;
          if (P.summon && P.summon.owner && (P.summon.owner.dead || P.summon.owner.gone)) dismissAlly(P);
        }
        if (G.players.some(P => P.summon && P.gone)) G.players = G.players.filter(P => !(P.summon && P.gone));
      }
    }
  };

  // Las técnicas propias salen más en las cartas (si hay una que todavía no tiene, 65% de que reemplace a una común)
  const bo = buildOptions;
  buildOptions = function (P) {   // eslint-disable-line no-global-assign
    const opts = bo.apply(this, arguments);
    try {
      if (!P || P.attacks.length >= MAX_ATTACKS || Math.random() > 0.65) return opts;
      const own = cardPool(P).filter(o => o.kind === 'new' && ATTACKS[o.id].users && ATTACKS[o.id].users.includes(P.charId));
      if (!own.length || opts.some(o => o.kind === 'new' && own.some(x => x.id === o.id))) return opts;
      const lockKey = P.locked ? optKey(P.locked) : null;
      const i = opts.findIndex(o => o.kind !== 'evolve' && optKey(o) !== lockKey && (o.kind !== 'new' || !ATTACKS[o.id].users));
      if (i >= 0) opts[i] = own[Math.floor(Math.random() * own.length)];
    } catch (e) { /* si algo falla, las cartas de siempre */ }
    return opts;
  };

  // Marcas sobre los aliados (★ invocados, M de Babidi) y el objetivo del rastreador de Raditz
  const dn = drawNames;
  drawNames = function () {   // eslint-disable-line no-global-assign
    const r = dn.apply(this, arguments);
    try {
      for (const e of G.enemies) {
        if (!e.friend || e.dead) continue;
        const [x, y] = toScreen(e.x, e.y - e.r * 2 - 6);
        hudText(e.friend.mark, x, y, e.friend.mark === 'M' ? 14 : 12, e.friend.mark === 'M' ? '#ff4da6' : '#9dff8a', 'center');
      }
      for (const A of G.players) {
        if (!A.summon || A.gone) continue;
        const [x, y] = toScreen(A.x, A.y - 42);
        hudText(A.name, x, y, 11, A.c.aura || '#ffffff', 'center');
      }
      const M = G.me;
      if (M && M.mark && !M.mark.dead && M.charId === 'raditzp') {
        const [x, y] = toScreen(M.mark.x, M.mark.y - M.mark.r * 2 - 10);
        hudText('▼', x, y, 16, '#ff5c5c', 'center');
      }
    } catch (e) { /* sin marcas */ }
    return r;
  };

  // Ficha del guerrero: su firma
  const line = document.createElement('p');
  line.id = 'firmaLine';
  const anchor = $('charDetail');
  if (anchor) anchor.after(line);
  const ucd = updateCharDetail;
  updateCharDetail = function () {   // eslint-disable-line no-global-assign
    const r = ucd.apply(this, arguments);
    const d = ID[myChar()];
    line.textContent = d && d.firma ? `★ Firma: ${d.firma}` : '';
    line.style.display = d && d.firma ? '' : 'none';
    return r;
  };
  const css = document.createElement('style');
  css.textContent = '#firmaLine{max-width:620px;margin:4px auto;font-size:13px;color:#ffe9a8;text-align:center}';
  document.head.appendChild(css);

  window.IDENTIDAD = ID;   // (para la prueba automática)
  window.summonAlly = summonAlly; window.dismissAlly = dismissAlly;   // (para js/mods/companero.js)
})();
