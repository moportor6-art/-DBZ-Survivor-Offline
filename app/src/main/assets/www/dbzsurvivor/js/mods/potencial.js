// ─── Identidad para los que solo subían números ─────────────────────────────
// · Recoome: cada 12 s hace una de sus poses (cada 6 s transformado): los enemigos cercanos se quedan mirando
//   1,5 s, y transformado además lanza su Recoome Bomber alrededor.
// · Spopovich: al bajar del 30% de vida se infla 2 s y explota (daño enorme alrededor y se cura 25%), cada 45 s.
// · Las Fuerzas Ginyu (Pose especial): al transformarse hacen la pose del grupo con un efecto propio.
// · "Potencial liberado" y parecidas: cada guerrero entra en su forma con un efecto suyo (onda, curación,
//   paralizar) y mientras dura tiene un bono propio (daño, defensa o velocidad), no solo más stats.
// Solo corre en el anfitrión o jugando solo (las ondas y curas se sincronizan como el resto).
(() => {
  const onda = (P, r, dmg, color, stun = 0) => {
    G.novas.push({ x: P.x, y: P.y, r: 0, maxR: r, dmg, hit: new Set(), color, kb: stun ? 0 : 16, owner: P, aid: 'ki', stun });
    burst(P.x, P.y, color, 30, 6, 4); G.shake = Math.max(G.shake, 0.3);
  };
  const cura = (P, f) => { P.hp = Math.min(P.maxHp, P.hp + P.maxHp * f); addText(P.x, P.y - 30, `+${Math.round(P.maxHp * f)}`, '#6aff8a'); };
  const nv = () => (G && G.level) || 1;
  const dice = (P, txt, col) => { if (P === G.me || !P.ally) addText(P.x, P.y - 44, txt, col, true); };

  // Al entrar en la forma: efecto · mientras dura: dmg (×), def (−daño), spd (+)
  const FORMA = {
    krilin: { txt: '¡El Gran Patriarca liberó mi poder!', col: '#ffd93b', enter: P => cura(P, 0.3), dmg: 1.15 },
    yamcha: { txt: '¡Garra del Lobo!', col: '#ffb060', enter: P => onda(P, 110, 30 + 5 * nv(), '#ffb060'), spd: 0.2 },
    tien: { txt: '¡Kikoho!', col: '#ffe14d', enter: P => onda(P, 170, 50 + 8 * nv(), '#ffe14d', 1), def: 0.1 },
    yajirobe: { txt: '¡Una semilla y a pelear!', col: '#6aff8a', enter: P => cura(P, 0.4), dmg: 1.15 },
    videl: { txt: '¡Patada voladora!', col: '#ff8ad0', enter: P => onda(P, 90, 25 + 4 * nv(), '#ff8ad0'), spd: 0.15, dmg: 1.08 },
    pan: { txt: '¡No subestimes a una Saiyajin!', col: '#ff6a6a', enter: P => onda(P, 120, 30 + 5 * nv(), '#ff6a6a'), dmg: 1.2 },
    coolerp: { txt: '¡Mi poder supera al de mi hermano!', col: '#b06aff', enter: P => onda(P, 140, 40 + 6 * nv(), '#b06aff'), def: 0.15 },
    raditzp: { txt: '¡Double Sunday!', col: '#ff5c5c', enter: P => onda(P, 130, 40 + 6 * nv(), '#ff5c5c'), dmg: 1.15, spd: 0.1 },
    nappap: { txt: '¡Explosión gigante!', col: '#ffb35c', enter: P => onda(P, 190, 55 + 8 * nv(), '#ffb35c'), def: 0.2 },
    taop: { txt: '¡Dodonpa!', col: '#ffd0a0', enter: P => onda(P, 100, 45 + 7 * nv(), '#ffd0a0', 0.8), dmg: 1.15 },
    ginyup: { txt: '¡Fuerzas Especiales Ginyu!', col: '#b06aff', enter: () => {}, dmg: 1.1 },
    recoomep: { txt: '¡Recoome Ultra Fighting Pose!', col: '#ff8a5c', enter: P => onda(P, 150, 45 + 7 * nv(), '#ff8a5c', 1.2), def: 0.1 },
    burterp: { txt: '¡El más rápido del universo!', col: '#7fd0ff', enter: P => onda(P, 100, 30 + 5 * nv(), '#7fd0ff'), spd: 0.3 },
    jeicep: { txt: '¡Crusher Ball!', col: '#ff6a3d', enter: P => onda(P, 140, 50 + 7 * nv(), '#ff6a3d'), dmg: 1.15 },
  };
  const activo = P => P && P.transformed > 0 && FORMA[P.charId] && !P.summon;

  const dm = dmgMult;
  dmgMult = function (P) { const f = activo(P) && FORMA[P.charId].dmg; return dm.apply(this, arguments) * (f || 1); };   // eslint-disable-line no-global-assign
  const ps = playerSpeed;
  playerSpeed = function (P) { const f = activo(P) && FORMA[P.charId].spd; return ps.apply(this, arguments) * (1 + (f || 0)); };   // eslint-disable-line no-global-assign
  const hp = hurtPlayer;
  hurtPlayer = function (P, amount) {   // eslint-disable-line no-global-assign
    const f = activo(P) && FORMA[P.charId].def;
    if (f) arguments[1] = amount * (1 - f);
    if (P && P.charId === 'spopovichp' && P.infla > 0) arguments[1] *= 0.3;   // inflado aguanta casi todo
    return hp.apply(this, arguments);
  };

  const up = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    const r = up.apply(this, arguments);
    if (!G || G.mode !== 'play' || (G.net && G.net.role !== 'host')) return r;
    for (const P of G.players) {
      if (P.gone || P.dead || P.hidden) { P._potTr = false; continue; }
      // Entrar en la forma
      const tr = P.transformed > 0;
      if (tr && !P._potTr && FORMA[P.charId] && !P.summon) { const F = FORMA[P.charId]; try { F.enter(P); } catch (e) { /* nada */ } dice(P, F.txt, F.col); }
      P._potTr = tr;
      // Recoome: poses
      if (P.charId === 'recoomep' && !P.summon && (P.pose = (P.pose ?? 12) - dt) <= 0) {
        P.pose = tr ? 6 : 12;
        dice(P, pick(['¡Recoome!', '¡Pose de combate!', '¡Mírenme!']), '#ff8a5c');
        for (const e of G.enemies) if (!e.dead && !e.friend && Math.hypot(e.x - P.x, e.y - P.y) < 220) e.stun = Math.max(e.stun || 0, e.boss ? 0.5 : 1.5);
        ring(P.x, P.y, 220, 0.5, '#ff8a5c');
        if (tr) onda(P, 160, 40 + 6 * nv(), '#ff8a5c');   // Recoome Bomber
      }
      // Spopovich: se infla y explota
      if (P.charId === 'spopovichp' && !P.summon) {
        P.inflaCd = Math.max(0, (P.inflaCd || 0) - dt);
        if (!(P.infla > 0) && !P.inflaCd && P.hp < P.maxHp * 0.3) { P.infla = 2; dice(P, '¡Me inflo…!', '#ff4da6'); }
        if (P.infla > 0 && (P.infla -= dt) <= 0) {
          P.inflaCd = 45;
          onda(P, 240, 90 + 12 * nv(), '#ff4da6'); cura(P, 0.25); G.shake = Math.max(G.shake, 0.8);
          dice(P, '¡BOOM!', '#ff4da6');
        }
      }
    }
    return r;
  };
  // Spopovich inflado: más grande mientras dura
  const dp = drawPlayer;
  drawPlayer = function (c, P) {   // eslint-disable-line no-global-assign
    if (!P || !(P.infla > 0)) return dp.apply(this, arguments);
    const k = 1 + (2 - P.infla) * 0.35;
    c.save(); c.translate(P.x, P.y); c.scale(k, k); c.translate(-P.x, -P.y);
    try { return dp.apply(this, arguments); } finally { c.restore(); }
  };
  // Las firmas que se ven en la ficha de cada guerrero
  if (window.IDENTIDAD) {
    const I = window.IDENTIDAD;
    if (I.recoomep) I.recoomep.firma = 'Cuerpo de hierro: −25% de daño. Cada 12 s hace una pose y los enemigos cercanos se quedan mirando 1,5 s; transformado, la pose sale cada 6 s con su Recoome Bomber.';
    if (I.spopovichp) I.spopovichp.firma = 'No siente dolor: −30% de daño. Con menos del 30% de vida se infla y explota con todo alrededor, y se cura un 25% (cada 45 s).';
    for (const id in FORMA) if (I[id] && id !== 'recoomep') I[id].firma += ` Al transformarse: ${FORMA[id].txt.replace(/[¡!]/g, '')}.`;
  }
  window.POTENCIAL = FORMA;
})();
