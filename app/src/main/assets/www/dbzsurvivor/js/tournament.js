'use strict';
// ─── Torneo Mundial de Artes Marciales (2.26.0) ─────────────────────────────────
// Nivel bonus de peleas 1 contra 1 en el ring. Eliges un peleador entre todos (guerreros y villanos), se arma una
// llave de 16 al azar y vas peleando ronda por ronda; los combates de los demás se resuelven solos.
// Cada pelea: las técnicas salen solas (una ráfaga de ki y, cada tanto, la técnica especial del peleador) y tú
// golpeas y haces dash a mano. Cada golpe sube el % de daño del rival: cuanto más alto, más lejos sale volando.
// Pierde el que se cae del ring; si se acaba el tiempo, gana el que tiene menos %.
// Tiene su propio bucle (TOUR): no usa G ni el motor de los niveles; sí los dibujos (drawActor) y el lienzo.
let TOUR = null;
const TOUR_RING = 128;          // medio lado del ring (unidades del mundo = píxeles de la imagen del estadio)
const TOUR_TIME = 60;           // segundos por pelea
const TOUR_PRESENT = 2.6;       // segundos de la presentación (VS) antes de cada combate
const TOUR_HP = 150;            // vida de cada peleador (2.26.3): a 0, K.O.; el daño recibido (pct) es lo que se pierde
const TOUR_ROUNDS = ['Octavos de final', 'Cuartos de final', 'Semifinal', 'Final'];
const TOUR_HIT = { cd: 0.45, range: 30, dmg: 6, kb: 80, grow: 2.6 };       // golpe (a mano)
const TOUR_KI = { cd: 1.4, speed: 280, r: 4, dmg: 3, kb: 30, grow: 0.8 };   // ráfaga de ki (sola)
const TOUR_SP = { charge: 0.6, speed: 300, r: 9, dmg: 9, kb: 130, grow: 2.4 };   // técnica especial (a mano, con el ki lleno)
// Barra de ki (2.27.0): se llena sola (rate por segundo), al pegar (hit) y al recibir (hurt); llena, se lanza el especial.
// Si te pegan mientras lo cargas, se corta y te queda la mitad del ki
const TOUR_KIBAR = { rate: 7, hit: 9, hurt: 6 };
const TOUR_DASH = { cd: 0.8, time: 0.16, mult: 3.2, inv: 0.12 };
// Técnica especial y color del ki de cada villano (los guerreros usan su técnica inicial)
// Tipos (2.28.0): beam rayo · disc disco cortante · spiral rayo en espiral · ball esfera grande · nova explosión alrededor ·
// barrage lluvia de esferas · rush embestida
const TOUR_VILLAIN_KI = {
  raditz: ['Double Sunday', '#c27aff', 'beam'], nappa: ['Bomber DX', '#ffd84a', 'nova'], freezer: ['Death Ball', '#d07aff', 'ball'],
  cell: ['Kamehameha', '#7dffb0', 'beam'], buu: ['Planet Burst', '#ff9bd6', 'nova'], recoome: ['Recoome Eraser Gun', '#ff9a3d', 'beam'],
  burter: ['Space Mach Attack', '#5c8cff', 'rush'], jeice: ['Crusher Ball', '#ff5c5c', 'ball'], ginyu: ['Milky Cannon', '#c27aff', 'ball'],
  a19: ['Photon Wave', '#ff5c5c', 'beam'], gero: ['Photon Wave', '#ff5c5c', 'beam'], a16: ["Hell's Flash", '#ffb84a', 'beam'],
  a17: ['Power Blitz', '#7dd3ff', 'ball'], a18: ['Destructo Disc', '#ffd84a', 'disc'], cellimp: ['Kamehameha', '#7dffb0', 'beam'],
  cellsemi: ['Kamehameha', '#7dffb0', 'beam'], puipui: ['Ki Blast', '#ffd84a', 'barrage'], dabura: ['Evil Impulse', '#ff5c5c', 'beam'],
  fatbuu: ['Candy Beam', '#ff9bd6', 'beam'],
};
// El tipo de la técnica inicial de un guerrero, según cómo es en los niveles
function tourSpKind(a) {
  if (a.type === 'beam') return 'beam';
  if (a.type === 'nova') return 'nova';
  if (a.kind === 'disc') return 'disc';
  if (a.kind === 'spiral') return 'spiral';
  return 'ball';
}
// Cómo es cada tipo: daño, empujón, y alcance para que la máquina sepa cuándo tirarlo
const TOUR_SPK = {
  beam: { dmg: 10, kb: 140, grow: 2.4, len: 250, width: 16, dur: 0.55, range: 240 },
  disc: { dmg: 9, kb: 110, grow: 2.2, speed: 380, r: 6, range: 230 },
  spiral: { dmg: 11, kb: 150, grow: 2.6, speed: 460, r: 4, range: 260 },
  ball: { dmg: 12, kb: 170, grow: 2.8, speed: 200, r: 13, range: 200 },
  nova: { dmg: 11, kb: 190, grow: 3, radius: 78, range: 70 },
  barrage: { dmg: 3.5, kb: 60, grow: 1.1, speed: 300, r: 5, n: 6, range: 200 },
  rush: { dmg: 10, kb: 170, grow: 2.8, time: 0.4, mult: 4, range: 180 },
};
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
// Todos los peleadores: los guerreros y los villanos (el Vegeta jefe no: ya está el guerrero)
function tourRoster() {
  const out = [];
  for (const id in CHARACTERS) {
    const c = CHARACTERS[id], sp = ATTACKS[c.start];
    out.push({ id, name: c.name, look: c.look, hero: true, color: sp.color, core: sp.core || '#ffffff', spKind: tourSpKind(sp), special: sp.name, scale: 1, speed: c.speed,
      weight: { piccolo: 1.1, krilin: 0.9, goten: 0.85, hercule: 0.95 }[id] || 1,
      power: { goku: 1.05, vegeta: 1.1, gohan: 1.05, ftrunks: 1.05, goten: 0.95, krilin: 0.95, hercule: 0.8 }[id] || 1 });
  }
  for (const b of BOSSES) {
    if (b.id === 'vegetas' || !TOUR_VILLAIN_KI[b.id]) continue;
    const [special, color, spKind] = TOUR_VILLAIN_KI[b.id];
    out.push({ id: b.id, name: b.name, look: b.look, hero: false, color, core: '#ffffff', spKind, special, scale: clampN(b.scale * 0.75, 1, 1.35),
      speed: clampN(2.2 + (b.speed - 1.2) * 0.6, 2.1, 2.9), weight: clampN(0.9 + (b.scale - 1.35) * 0.8, 0.85, 1.3),
      power: clampN(0.9 + (b.dmg - 15) / 40, 0.9, 1.2) });
  }
  return out;
}
const tourFighter = id => tourRoster().find(f => f.id === id);

// ─── Llave ───
function tourStart(myId) {
  const others = shuffle(tourRoster().filter(f => f.id !== myId)).slice(0, 15).map(f => f.id);
  const slots = others.slice(); slots.splice(Math.floor(Math.random() * 16), 0, myId);
  TOUR = { me: myId, rounds: [slots], round: 0, screen: 'bracket', fight: null, out: false, champion: false, pauseOpen: false, fought: 0, sent: false };
  showTourBracket();
}
// Las parejas de una ronda y quién pelea contra mí
const tourPairs = list => Array.from({ length: list.length / 2 }, (_, i) => [list[i * 2], list[i * 2 + 1]]);
function tourMyRival() { const pair = tourPairs(TOUR.rounds[TOUR.round]).find(p => p.includes(TOUR.me)); return pair && pair.find(x => x !== TOUR.me); }
// Un combate entre dos peleadores de la máquina: por sus números y un poco de suerte
function tourSimWinner(a, b) {
  const A = tourFighter(a), B = tourFighter(b), score = f => f.power + f.speed * 0.15 + f.weight * 0.3 + Math.random() * 0.6;
  return score(A) >= score(B) ? a : b;
}
// Al terminar mi pelea: se resuelven las demás y la llave pasa a la ronda siguiente
function tourAdvance(iWon) {
  const next = tourPairs(TOUR.rounds[TOUR.round]).map(([a, b]) => a === TOUR.me || b === TOUR.me ? (iWon ? TOUR.me : (a === TOUR.me ? b : a)) : tourSimWinner(a, b));
  TOUR.rounds.push(next);
  if (!iWon) {   // eliminado: el resto del torneo se resuelve solo, para ver quién sale campeón
    TOUR.out = true;
    tourReport();
    while (TOUR.rounds[TOUR.rounds.length - 1].length > 1) TOUR.rounds.push(tourPairs(TOUR.rounds[TOUR.rounds.length - 1]).map(([x, y]) => tourSimWinner(x, y)));
    return;
  }
  TOUR.round++;
  if (next.length === 1) TOUR.champion = true;
  if (TOUR.champion) tourReport();
}
// Para el backoffice: un aviso por torneo jugado (al terminar, o al abandonarlo si llegó a pelear)
function tourReport(abandoned = false) {
  if (!TOUR || TOUR.sent || !TOUR.fought || typeof Telemetry === 'undefined') return;
  TOUR.sent = true;
  Telemetry.tour({ char: TOUR.me, round: TOUR.champion ? 4 : TOUR.round, champion: !!TOUR.champion, abandoned, fights: TOUR.fought, log: TOUR.log || [], dev: Telemetry.device() });
}

// ─── Pantallas (elegir peleador, llave, resultado) ───
function tourOpen() {
  SFX.unlock();
  TOUR = { screen: 'pick', pickSel: SAVE.tourChar && tourFighter(SAVE.tourChar) ? SAVE.tourChar : myChar() };
  for (const id of ['menu', 'setup', 'bonusWin', 'shop', 'help', 'techs', 'achs', 'rank', 'news', 'profile', 'credits']) $(id).classList.add('hidden');
  const list = tourRoster();
  const card = f => `<button class="tour-card${f.id === TOUR.pickSel ? ' selected' : ''}" data-id="${f.id}"><canvas width="96" height="132"></canvas>
    <b>${esc(f.name)}</b><small>${f.hero ? t('Guerrero') : t('Villano')} · ${esc(f.special)}</small></button>`;
  $('tourBox').innerHTML = `<h2>🥋 ${t('Torneo Mundial de Artes Marciales')}</h2>
    <p class="tour-warn">${t('🚧 Versión muy preliminar: todavía estamos ajustando las peleas. ¡Cuéntanos qué te parece con «Reportar un problema»!')}</p>
    <p class="hint">${t('Elige tu peleador. Se arma una llave de 16 y peleas uno contra uno en el ring: tus técnicas salen solas, tú golpeas y haces dash. Cuanta menos vida le queda a tu rival, más lejos lo empujas. ¡Si te caes del ring o te quedas sin vida, pierdes!')}</p>
    <p class="tour-keys">${TOUR_TOUCH ? t('Controles: arrastra para moverte · 👊 golpe · 💨 dash · ⭐ especial') : t('Controles: WASD o flechas para moverte · Golpe: Espacio, J o clic · Dash: Shift, K o clic derecho · Especial (con el ki lleno): L · Mando: A golpe, B dash, Y especial')}</p>
    <h3 class="pick">${t('Guerreros')}</h3><div class="tour-grid">${list.filter(f => f.hero).map(card).join('')}</div>
    <h3 class="pick">${t('Villanos')}</h3><div class="tour-grid">${list.filter(f => !f.hero).map(card).join('')}</div>
    <div class="setup-actions tour-foot"><button class="btn ghost" id="tourBack">${t('Volver')}</button><button class="btn" id="tourGo">${t('¡Al torneo!')}</button></div>`;
  for (const b of $('tourBox').querySelectorAll('.tour-card')) b.onclick = () => {
    TOUR.pickSel = b.dataset.id;
    for (const x of $('tourBox').querySelectorAll('.tour-card')) x.classList.toggle('selected', x === b);
  };
  $('tourBack').onclick = () => { tourClose(); openBonus(); };   // Volver: a la ventana de Niveles bonus
  $('tourGo').onclick = () => { SAVE.tourChar = TOUR.pickSel; writeSave(); tourStart(TOUR.pickSel); };
  $('tour').classList.remove('hidden');
  $('tour').scrollTop = 0;
}
function tourClose() {
  if (TOUR && !TOUR.out && !TOUR.champion) tourReport(true);
  TOUR = null;
  $('tour').classList.add('hidden'); $('tourBtns').classList.add('hidden');
  $('menu').classList.remove('hidden');
  buildMenu();
}
// La llave, dibujada en un lienzo: en espejo (la mitad de arriba de la lista a la izquierda, la otra a la derecha) y
// la final en el centro. Cada peleador con su sprite; las líneas del camino de cada ganador en dorado; tú con borde dorado
const BR = { W: 960, H: 520, top: 58, boxW: 124, boxH: 30 };
const tourBracketHtml = () => '<div class="tour-bracket"><canvas id="tourBracketCv"></canvas></div>';
function tourDrawBracket(tm) {
  const cv = $('tourBracketCv');
  if (!cv || !TOUR || !TOUR.rounds) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== BR.W * dpr) { cv.width = BR.W * dpr; cv.height = BR.H * dpr; }
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, BR.W, BR.H); c.imageSmoothingEnabled = false;
  const colX = col => 14 + col * ((BR.W - 28 - BR.boxW) / 6), H = BR.H - BR.top - 20;
  // Posición de un lugar: ronda r (0 = octavos), su índice en la lista de esa ronda
  const slot = (r, i) => {
    const n = TOUR.rounds[0].length >> r, half = n / 2, left = i < half, k = left ? i : i - half;
    if (r === 3) return { x: colX(3), y: BR.top + H / 2 + (i ? 26 : -26) - BR.boxH / 2, left: i === 0, fin: true };
    return { x: colX(left ? r : 6 - r), y: BR.top + (k + 0.5) * (H / half) - BR.boxH / 2, left };
  };
  const won = (r, id) => !!TOUR.rounds[r + 1] && TOUR.rounds[r + 1].includes(id);
  const decided = r => !!TOUR.rounds[r + 1];
  // Títulos de las columnas
  c.font = `700 13px ${FONT}`; c.textAlign = 'center'; c.fillStyle = '#8fe3ff';
  TOUR_ROUNDS.forEach((title, r) => {
    const cols = r === 3 ? [3] : [r, 6 - r];
    for (const col of cols) c.fillText(t(title), colX(col) + BR.boxW / 2, BR.top - 30);
  });
  // Líneas: de cada pareja al lugar del ganador en la ronda siguiente
  for (let r = 0; r < 3; r++) {
    const list = TOUR.rounds[r];
    if (!list) break;
    for (let i = 0; i < list.length; i += 2) {
      const A = slot(r, i), B = slot(r, i + 1), N = slot(r + 1, i / 2);
      const ax = A.left ? A.x + BR.boxW : A.x, nx = N.fin ? (A.left ? N.x : N.x + BR.boxW) : (A.left ? N.x : N.x + BR.boxW), mx = (ax + nx) / 2;
      const yA = A.y + BR.boxH / 2, yB = B.y + BR.boxH / 2, yN = N.y + BR.boxH / 2;
      const line = (pts, gold) => { c.strokeStyle = gold ? '#ffd93b' : 'rgba(155,184,255,.35)'; c.lineWidth = gold ? 3 : 2; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.stroke(); };
      line([[ax, yA], [mx, yA], [mx, yN]], won(r, list[i]));
      line([[ax, yB], [mx, yB], [mx, yN]], won(r, list[i + 1]));
      line([[mx, yN], [nx, yN]], decided(r));
    }
  }
  // Los peleadores
  const box = (r, i, id) => {
    const p = slot(r, i), f = tourFighter(id), me = id === TOUR.me, out = decided(r) && !won(r, id);
    const next = !TOUR.out && !TOUR.champion && r === TOUR.round && TOUR.rounds[r] && tourPairs(TOUR.rounds[r]).some(pr => pr.includes(TOUR.me) && pr.includes(id));
    c.globalAlpha = out ? 0.4 : 1;
    c.fillStyle = next ? 'rgba(255,217,59,.18)' : 'rgba(10,15,46,.85)';
    c.beginPath(); c.roundRect(p.x, p.y, BR.boxW, BR.boxH, 6); c.fill();
    c.lineWidth = me ? 2.5 : 1.5; c.strokeStyle = me ? '#ffd93b' : next ? 'rgba(255,217,59,.7)' : 'rgba(155,184,255,.45)'; c.stroke();
    // Sprite chiquito, recortado dentro de la caja
    if (!tourPortrait(c, id, p.x + 2, p.y + 2, BR.boxH - 4, !p.left)) {   // (sin el retrato cargado: la cara del sprite)
      c.save(); c.beginPath(); c.rect(p.x + 2, p.y + 1, 26, BR.boxH - 2); c.clip();
      if (spritesReady) drawActor(c, f.look, p.x + 15, p.y + BR.boxH + 2, { facing: p.left ? 1 : -1, anim: 'idle', t: tm, scale: 1, noShadow: true });
      c.restore();
    }
    c.font = `700 12px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillStyle = out ? '#9aa6c8' : won(r, id) ? '#ffd93b' : '#ffffff';
    let name = f.name; while (c.measureText(name).width > BR.boxW - 36 && name.length > 3) name = name.slice(0, -2) + '…';
    c.fillText(name, p.x + 31, p.y + BR.boxH / 2 + 1);
    c.globalAlpha = 1;
  };
  TOUR.rounds.slice(0, 4).forEach((list, r) => list.forEach((id, i) => box(r, i, id)));
  // Campeón, arriba de la final
  if (TOUR.rounds[4]) {
    const id = TOUR.rounds[4][0], f = tourFighter(id), x = colX(3) + BR.boxW / 2, y = BR.top + H / 2 - 120;
    c.font = `700 13px ${FONT}`; c.textAlign = 'center'; c.fillStyle = '#8fe3ff'; c.fillText(t('Campeón'), x, y - 78);
    c.fillStyle = '#ffd93b'; c.fillRect(x - 36, y - 62, 72, 72);   // retrato con marco dorado (sin retrato: el sprite)
    if (!tourPortrait(c, id, x - 32, y - 58, 64)) { c.save(); c.translate(x, y); c.scale(2, 2); if (spritesReady) drawActor(c, f.look, 0, 0, { anim: 'walk', t: tm, scale: 1 }); c.restore(); }
    c.font = `700 16px ${FONT}`; c.fillStyle = '#ffd93b'; c.fillText(`🏆 ${f.name}`, x, y + 44);
  } else {
    c.font = `700 22px ${FONT}`; c.textAlign = 'center'; c.fillStyle = 'rgba(255,217,59,.8)'; c.fillText('VS', colX(3) + BR.boxW / 2, BR.top + H / 2);
  }
}
function showTourBracket() {
  TOUR.screen = 'bracket';
  $('tourBtns').classList.add('hidden');
  const me = tourFighter(TOUR.me);
  let head, actions;
  if (TOUR.champion) {
    head = `<h2>🏆 ${t('¡{name} es el campeón del Torneo!', { name: me.name })}</h2>`;
    actions = `<button class="btn ghost" id="tourMenu">${t('Menú')}</button><button class="btn" id="tourAgain">${t('Otro torneo')}</button>`;
  } else if (TOUR.out) {
    const by = tourFighter(TOUR.lastRival);
    head = `<h2>${t('Eliminado en {round}', { round: t(TOUR_ROUNDS[TOUR.round]) })}</h2><p class="hint">${t('Te ganó {name}.', { name: by.name })}</p>`;
    actions = `<button class="btn ghost" id="tourMenu">${t('Menú')}</button><button class="btn" id="tourAgain">${t('Otro torneo')}</button>`;
  } else {
    const rival = tourFighter(tourMyRival());
    head = `<h2>${t(TOUR_ROUNDS[TOUR.round])}</h2><p class="tour-vs"><b>${esc(me.name)}</b> ${t('vs')} <b>${esc(rival.name)}</b></p>`;
    actions = `<button class="btn ghost" id="tourMenu">${t('Abandonar')}</button><button class="btn" id="tourFight">${t('¡A pelear!')}</button>`;
  }
  $('tourBox').innerHTML = `${head}${tourBracketHtml()}<div class="setup-actions">${actions}</div>`;
  tourDrawBracket(performance.now() / 1000);
  $('tourMenu').onclick = () => { if (TOUR.out || TOUR.champion || confirm(t('¿Abandonar el torneo?'))) tourClose(); };
  if ($('tourAgain')) $('tourAgain').onclick = tourOpen;
  if ($('tourFight')) $('tourFight').onclick = () => tourFightStart(tourMyRival());
  $('tour').classList.remove('hidden');
  $('tour').scrollTop = 0;
}

// ─── La pelea ───
function tourMakeFighter(id, x, cpu) {
  const def = tourFighter(id);
  return { def, x, y: 0, vx: 0, vy: 0, facing: x < 0 ? 1 : -1, pct: 0, cpu, hitCd: 0.3, kiCd: 1 + Math.random() * 0.6, ki: 0,
    charge: 0, dir: 'side', dashT: 0, dashCd: 0, dashX: 0, dashY: 0, inv: 0, stun: 0, flash: 0, punchT: 0, moving: false, out: 0, ai: { t: 0, mx: 0, my: 0, react: 0, spWait: 0 } };
}
function tourFightStart(rivalId) {
  const r = TOUR.round;
  TOUR.lastRival = rivalId; TOUR.fought++;
  TOUR.fight = { beams: [], novas: [], t: 0, left: TOUR_TIME, state: 'present', presentT: TOUR_PRESENT, introT: 1.6, endT: 0, winner: null, shots: [], fx: [], texts: [], shake: 0,
    a: tourMakeFighter(TOUR.me, -55, false), b: tourMakeFighter(rivalId, 55, true),
    level: { react: 0.32 - r * 0.06, dodge: 0.25 + r * 0.15, speed: 0.85 + r * 0.05 } };
  TOUR.screen = 'fight';
  $('tour').classList.add('hidden'); $('menu').classList.add('hidden'); $('bonusWin').classList.add('hidden'); $('setup').classList.add('hidden');
  $('tourBtns').classList.remove('hidden');
  TOUR.pad = [];
}
const tourAlive = f => !f.out;
function tourPunch(F, me, foe) {
  if (me.hitCd > 0 || me.stun > 0 || me.out) return;
  me.hitCd = TOUR_HIT.cd; me.punchT = 0.18;
  const dx = foe.x - me.x, dy = foe.y - me.y, d = Math.hypot(dx, dy) || 1;
  me.facing = dx >= 0 ? 1 : -1; me.dir = dirFromVec(dx, dy);
  if (d > TOUR_HIT.range || foe.inv > 0 || foe.out) { SFX.play('shot', 0.05); return; }
  tourHurt(F, foe, me, dx / d, dy / d, TOUR_HIT.dmg * me.def.power, TOUR_HIT.kb, TOUR_HIT.grow);
  F.shake = Math.max(F.shake, 0.15);
}
// Golpe recibido: sube el %, y el empujón crece con el % (y baja con el peso)
function tourHurt(F, foe, by, nx, ny, dmg, kb, grow) {
  foe.pct = Math.min(TOUR_HP, foe.pct + dmg);
  if (foe.pct >= TOUR_HP && !foe.out) foe.ko = true;   // sin vida: K.O.
  const v = (kb + foe.pct * grow) / foe.def.weight;
  foe.vx = nx * v; foe.vy = ny * v;
  if (foe.charge > 0) foe.ki = 50;   // le cortaron el especial: le queda la mitad del ki
  foe.rushT = 0;   // (y si venía embistiendo, se frena)
  foe.stun = 0.15 + foe.pct * 0.004; foe.flash = 0.12; foe.charge = 0;
  by.ki = Math.min(100, by.ki + TOUR_KIBAR.hit); foe.ki = Math.min(100, foe.ki + TOUR_KIBAR.hurt);
  F.texts.push({ x: foe.x, y: foe.y - 26, text: `-${Math.round(dmg)}`, t: 0.8 });
  for (let i = 0; i < 6; i++) F.fx.push({ x: foe.x, y: foe.y - 8, vx: (Math.random() - 0.5) * 120 + nx * 80, vy: (Math.random() - 0.5) * 120 + ny * 80, t: 0.35, color: by.def.color });
  SFX.play('hit', 0.03);
}
// El especial: con el ki lleno, lo carga un momento (brilla y camina lento) y lo dispara hacia el rival
function tourSpecial(me) {
  if (me.ki < 100 || me.charge > 0 || me.stun > 0 || me.out || me.ko) return false;
  me.ki = 0; me.charge = TOUR_SP.charge;
  return true;
}
function tourDash(me, dx, dy) {
  if (me.dashCd > 0 || me.stun > 0 || me.out) return;
  const d = Math.hypot(dx, dy);
  if (!d) { dx = me.facing; dy = 0; } else { dx /= d; dy /= d; }
  me.dashT = TOUR_DASH.time; me.dashCd = TOUR_DASH.cd; me.inv = TOUR_DASH.inv; me.dashX = dx; me.dashY = dy;
}
function tourFire(F, me, foe, big) {
  const dx = foe.x - me.x, dy = foe.y - me.y, d = Math.hypot(dx, dy) || 1;
  me.facing = dx >= 0 ? 1 : -1; if (!me.moving) me.dir = dirFromVec(dx, dy);
  if (big) { tourFireSpecial(F, me, dx / d, dy / d); return; }
  F.shots.push({ x: me.x + dx / d * 10, y: me.y - 6 + dy / d * 6, vx: dx / d * TOUR_KI.speed, vy: dy / d * TOUR_KI.speed, r: TOUR_KI.r, owner: me, life: 1.6,
    color: me.def.color, dmg: TOUR_KI.dmg, kb: TOUR_KI.kb, grow: TOUR_KI.grow });
  SFX.play('shot', 0.06);
}
// El especial de verdad, según su tipo (2.28.0)
function tourFireSpecial(F, me, nx, ny) {
  const kind = me.def.spKind || 'ball', K = TOUR_SPK[kind], p = me.def.power;
  F.texts.push({ x: me.x, y: me.y - 34, text: `¡${me.def.special}!`, t: 1.1, big: true, color: me.def.color });
  const shot = (ang, extra) => F.shots.push(Object.assign({ x: me.x + Math.cos(ang) * 10, y: me.y - 6 + Math.sin(ang) * 6, vx: Math.cos(ang) * K.speed, vy: Math.sin(ang) * K.speed,
    r: K.r, owner: me, life: 1.8, color: me.def.color, kind, big: true, dmg: K.dmg * p, kb: K.kb, grow: K.grow, spin: 0 }, extra || {}));
  const ang = Math.atan2(ny, nx);
  if (kind === 'beam') { F.beams.push({ owner: me, ang, len: K.len, width: K.width, t: K.dur, dur: K.dur, color: me.def.color, core: me.def.core, hit: false }); SFX.play('beam', 0.05); }
  else if (kind === 'nova') { F.novas.push({ owner: me, x: me.x, y: me.y, r: 0, maxR: K.radius, color: me.def.color, hit: false }); F.shake = Math.max(F.shake, 0.3); SFX.play('boom', 0.05); }
  else if (kind === 'rush') { me.rushT = K.time; me.dashX = nx; me.dashY = ny; me.rushHit = false; me.inv = K.time; SFX.play('power', 0.05); }
  else if (kind === 'barrage') { for (let i = 0; i < K.n; i++) shot(ang + (i - (K.n - 1) / 2) * 0.16, { life: 1.4 + i * 0.05 }); SFX.play('shot', 0.02); }
  else { shot(ang); SFX.play(kind === 'ball' ? 'boss' : 'beam', 0.05); }
}
// La máquina: se acerca por el lado del centro (para empujar hacia afuera), se aleja del borde, golpea y esquiva
function tourAi(F, me, foe, dt) {
  const L = F.level, A = me.ai;
  A.t -= dt;
  if (A.t <= 0) {
    A.t = 0.12;
    const edge = Math.max(Math.abs(me.x), Math.abs(me.y));
    let tx, ty;
    if (edge > TOUR_RING - 28) { tx = me.x * 0.3 + foe.x * 0.1; ty = me.y * 0.3 + foe.y * 0.1; tx -= me.x; ty -= me.y; }
    else {
      const fd = Math.hypot(foe.x, foe.y), cx = fd > 10 ? foe.x / fd : (foe.x - me.x) / (Math.hypot(foe.x - me.x, foe.y - me.y) || 1), cy = fd > 10 ? foe.y / fd : (foe.y - me.y) / (Math.hypot(foe.x - me.x, foe.y - me.y) || 1);
      tx = foe.x - cx * 20 - me.x; ty = foe.y - cy * 20 - me.y;
    }
    const d = Math.hypot(tx, ty);
    A.mx = d > 4 ? tx / d : 0; A.my = d > 4 ? ty / d : 0;
    // Esquivar un disparo que viene hacia mí
    for (const s of F.shots) {
      if (s.owner === me) continue;
      const rx = me.x - s.x, ry = me.y - s.y, rd = Math.hypot(rx, ry);
      if (rd < 80 && (rx * s.vx + ry * s.vy) > 0 && Math.random() < L.dodge) { tourDash(me, -s.vy, s.vx); break; }
    }
    // Recuperarse: si quedó cerca del borde después de un golpe, dash hacia el centro
    if (edge > TOUR_RING - 18 && me.stun <= 0 && Math.random() < L.dodge) tourDash(me, -me.x, -me.y);
  }
  const dist = Math.hypot(foe.x - me.x, foe.y - me.y);
  if (me.ki >= 100) { A.spWait -= dt; if (A.spWait <= 0 && dist < TOUR_SPK[me.def.spKind || 'ball'].range) { tourSpecial(me); A.spWait = L.react * 4 + Math.random() * 1.5; } }
  if (dist < TOUR_HIT.range - 2) { A.react -= dt; if (A.react <= 0) { tourPunch(F, me, foe); A.react = L.react * (0.6 + Math.random() * 0.8); } }
  else A.react = Math.max(A.react, L.react * 0.5);
  return { x: A.mx * L.speed, y: A.my * L.speed };
}
function tourMove(me, dir, dt) {
  me.moving = false;
  if (me.out) {   // ya en el pasto: termina de deslizarse, sin pasar las paredes del estadio
    me.x = clampN(me.x + me.vx * dt, -195, 195); me.y = clampN(me.y + me.vy * dt, -195, 205);
    const k = Math.exp(-6 * dt); me.vx *= k; me.vy *= k;
    return;
  }
  if (me.rushT > 0) {
    const sp = me.def.speed * 60 * TOUR_SPK.rush.mult; me.x += me.dashX * sp * dt; me.y += me.dashY * sp * dt; me.rushT -= dt; me.moving = true; me.dir = dirFromVec(me.dashX, me.dashY);
  } else if (me.dashT > 0) { const sp = me.def.speed * 60 * TOUR_DASH.mult; me.x += me.dashX * sp * dt; me.y += me.dashY * sp * dt; me.dashT -= dt; me.moving = true; me.dir = dirFromVec(me.dashX, me.dashY); }
  else if (me.stun <= 0 && !me.ko && (dir.x || dir.y)) {
    const sp = me.def.speed * 60 * (me.charge > 0 ? 0.4 : 1);
    me.x += dir.x * sp * dt; me.y += dir.y * sp * dt; me.moving = true;
    if (Math.abs(dir.x) > 0.2) me.facing = dir.x > 0 ? 1 : -1;
    me.dir = dirFromVec(dir.x, dir.y);   // caminando hacia arriba o abajo: el sprite de espaldas o de frente
  }
  // Empujón: se frena de a poco
  me.x += me.vx * dt; me.y += me.vy * dt;
  const k = Math.exp(-4 * dt); me.vx *= k; me.vy *= k;
}
function tourTick(F, me, foe, dt) {
  for (const k of ['hitCd', 'dashCd', 'inv', 'stun', 'flash', 'punchT']) me[k] = Math.max(0, me[k] - dt);
  if (me.out) { me.out += dt; return; }
  if (me.ko) return;   // K.O.: ya no ataca
  if (F.state !== 'fight') return;
  me.kiCd -= dt;
  if (me.kiCd <= 0 && me.charge <= 0) { me.kiCd = TOUR_KI.cd * (0.9 + Math.random() * 0.2); tourFire(F, me, foe, false); }
  if (me.charge > 0) { me.charge -= dt; if (me.charge <= 0 && me.stun <= 0) tourFire(F, me, foe, true); }
  else me.ki = Math.min(100, me.ki + TOUR_KIBAR.rate * dt);
  // Fuera del ring: cae
  if (Math.abs(me.x) > TOUR_RING + 2 || Math.abs(me.y) > TOUR_RING + 2) { me.out = 0.001; me.charge = 0; F.shake = 0.4; SFX.play('boom'); }
}
function tourInput() {
  const dir = inputVec();
  let hit = false, dash = false, sp = false;
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
  if (gp) {
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), prev = TOUR.pad || [];
    hit = (b(0) && !prev[0]) || (b(2) && !prev[2]); dash = (b(1) && !prev[1]) || (b(5) && !prev[5]) || (b(7) && !prev[7]);
    sp = (b(3) && !prev[3]) || (b(4) && !prev[4]);   // Y o LB: especial
    if (b(9) && !prev[9]) setTimeout(tourTogglePause, 0);   // Start: pausa
    TOUR.pad = gp.buttons.map(x => x.pressed);
  }
  if (TOUR.want) { hit = hit || TOUR.want.hit; dash = dash || TOUR.want.dash; sp = sp || TOUR.want.sp; TOUR.want = null; }
  return { dir, hit, dash, sp };
}
function tourUpdate(dt) {
  const F = TOUR.fight;
  if (!F || TOUR.pauseOpen) return;
  // Presentación: los dos peleadores en grande; la pelea empieza cuando el jugador hace clic, toca o golpea
  if (F.state === 'present') {
    F.presentT = Math.max(0.25, F.presentT - dt); F.t += dt;   // (se queda quieta al terminar de entrar)
    const inp = tourInput();
    if ((inp.hit || inp.dash) && F.t > 0.5) { F.state = 'intro'; F.t = 0; }
    return;
  }
  F.t += dt; F.shake = Math.max(0, F.shake - dt);
  const { a, b } = F;
  if (F.state === 'intro') { F.introT -= dt; if (F.introT <= 0) { F.state = 'fight'; SFX.play('power'); } }
  else if (F.state === 'fight') {
    F.left -= dt;
    if (F.left <= 0) { F.left = 0; F.winner = a.pct <= b.pct ? a : b; F.state = 'end'; F.endT = 2.2; F.timeUp = true; SFX.play('boss'); }
  } else if (F.state === 'end') {
    F.endT -= dt;
    if (F.endT <= 0) {
      (TOUR.log = TOUR.log || []).push({ r: b.def.id, w: F.winner === a ? 1 : 0, e: F.koEnd ? 'ko' : F.timeUp ? 'time' : 'out', s: Math.round(TOUR_TIME - F.left) });
      tourAdvance(F.winner === a); TOUR.fight = null; showTourBracket(); return;
    }
  }
  // Controles
  const inp = tourInput();
  if (F.state === 'fight') {
    if (inp.hit) tourPunch(F, a, b);
    if (inp.dash) tourDash(a, inp.dir.x, inp.dir.y);
    if (inp.sp && !tourSpecial(a) && a.ki < 100) SFX.play('hurt', 0.3);   // (sin el ki lleno: un ruidito de "todavía no")
  }
  const ai = F.state === 'fight' ? tourAi(F, b, a, dt) : { x: 0, y: 0 };
  tourMove(a, F.state === 'fight' ? inp.dir : { x: 0, y: 0 }, dt);
  tourMove(b, ai, dt);
  // Los dos no se atraviesan
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
  if (d < 16 && d > 0 && !a.out && !b.out) { const p = (16 - d) / 2; a.x -= dx / d * p; a.y -= dy / d * p; b.x += dx / d * p; b.y += dy / d * p; }
  tourTick(F, a, b, dt); tourTick(F, b, a, dt);
  // Disparos
  for (const s of F.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    const foe = s.owner === a ? b : a;
    s.spin = (s.spin || 0) + dt * 14;
    if (!s.hit && !foe.out && foe.inv <= 0 && Math.hypot(foe.x - s.x, foe.y - 6 - s.y) < s.r + 9) {
      const n = Math.hypot(s.vx, s.vy) || 1;
      tourHurt(F, foe, s.owner, s.vx / n, s.vy / n, s.dmg * (s.big ? 1 : s.owner.def.power), s.kb, s.grow);
      if (s.big) F.shake = Math.max(F.shake, 0.25);
      if (s.kind === 'disc' || s.kind === 'spiral') s.hit = true; else s.life = 0;   // (los cortantes siguen de largo)
    }
  }
  F.shots = F.shots.filter(s => s.life > 0);
  // Rayos: salen de las manos del dueño (lo siguen) y pegan una vez a quien toquen
  for (const bm of F.beams) {
    bm.t -= dt;
    const o = bm.owner, foe = o === a ? b : a, grow = Math.min(1, (bm.dur - bm.t) / 0.08);
    if (!bm.hit && !foe.out && foe.inv <= 0) {
      const rx = foe.x - o.x, ry = foe.y - o.y, along = rx * Math.cos(bm.ang) + ry * Math.sin(bm.ang), side = Math.abs(-rx * Math.sin(bm.ang) + ry * Math.cos(bm.ang));
      if (along > 0 && along < bm.len * grow && side < bm.width / 2 + 9) {
        const K = TOUR_SPK.beam; bm.hit = true;
        tourHurt(F, foe, o, Math.cos(bm.ang), Math.sin(bm.ang), K.dmg * o.def.power, K.kb, K.grow); F.shake = Math.max(F.shake, 0.3);
      }
    }
  }
  F.beams = F.beams.filter(bm => bm.t > 0 && !bm.owner.out);
  // Explosiones alrededor del que la lanza
  for (const nv of F.novas) {
    nv.x = nv.owner.x; nv.y = nv.owner.y; nv.r = Math.min(nv.maxR, nv.r + nv.maxR * dt / 0.25);
    if (nv.r >= nv.maxR) nv.hold = (nv.hold === undefined ? NOVA_HOLD : nv.hold) - dt;
    const foe = nv.owner === a ? b : a, dd = Math.hypot(foe.x - nv.x, foe.y - nv.y);
    if (!nv.hit && !foe.out && foe.inv <= 0 && dd < nv.r + 8) {
      const K = TOUR_SPK.nova; nv.hit = true;
      tourHurt(F, foe, nv.owner, (foe.x - nv.x) / (dd || 1), (foe.y - nv.y) / (dd || 1), K.dmg * nv.owner.def.power, K.kb, K.grow);
    }
  }
  F.novas = F.novas.filter(nv => nv.hold === undefined || nv.hold > 0);
  // Embestida: golpea una vez al pasar por al lado
  for (const [me, foe] of [[a, b], [b, a]]) {
    if (!(me.rushT > 0) || me.rushHit || foe.out || foe.inv > 0) continue;
    const dd = Math.hypot(foe.x - me.x, foe.y - me.y);
    if (dd < 22) { const K = TOUR_SPK.rush; me.rushHit = true; me.rushT = Math.min(me.rushT, 0.06); tourHurt(F, foe, me, me.dashX, me.dashY, K.dmg * me.def.power, K.kb, K.grow); F.shake = Math.max(F.shake, 0.3); }
  }
  for (const f of F.fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.t -= dt; }
  F.fx = F.fx.filter(f => f.t > 0);
  for (const x of F.texts) { x.t -= dt; x.y -= 20 * dt; }
  F.texts = F.texts.filter(x => x.t > 0);
  // Alguien se cayó del ring
  if (F.state === 'fight' && (a.out || b.out || a.ko || b.ko)) { F.winner = a.out || a.ko ? b : a; F.koEnd = !!(a.ko || b.ko) && !(a.out || b.out); F.state = 'end'; F.endT = 2.2; SFX.play(F.winner === a ? 'levelup' : 'hurt'); }
}

// ─── Dibujo ───
// El estadio del Torneo (Buu's Fury, Papaya Island): el ring de la imagen mide 256 x 256 y su centro está en STADIUM_C,
// así el ring del juego (TOUR_RING) coincide con el dibujo. Afuera del ring, el pasto: el que lo toca, pierde
const STADIUM_IMG = new Image();
STADIUM_IMG.src = 'assets/levels/tournament-stadium.png';
const STADIUM_C = [360, 388];
// Retratos de los cuadros de diálogo de los juegos de GBA (el más nuevo de cada uno: Buu's Fury, Legacy of Goku II o
// Legacy of Goku), de 128x128, 7 por fila, en este orden. Los arma tools/build-portraits.ps1
const PORTRAIT_IMG = new Image();
PORTRAIT_IMG.src = 'assets/portraits.png';
const TOUR_PORTRAITS = ['goku', 'vegeta', 'piccolo', 'gohan', 'krilin', 'goten', 'trunks', 'ftrunks', 'hercule', 'raditz', 'nappa', 'freezer', 'cell',
  'buu', 'recoome', 'burter', 'jeice', 'ginyu', 'a19', 'gero', 'a16', 'a17', 'a18', 'cellimp', 'cellsemi', 'puipui', 'dabura', 'fatbuu'];
// Dibuja el retrato (flip: mirando al otro lado, para el rival). Si todavía no cargó, devuelve false
function tourPortrait(c, id, x, y, size, flip = false) {
  const i = TOUR_PORTRAITS.indexOf(id);
  if (i < 0 || !PORTRAIT_IMG.complete || !PORTRAIT_IMG.naturalWidth) return false;
  c.save(); c.imageSmoothingEnabled = false;
  if (flip) { c.translate(x + size, y); c.scale(-1, 1); x = 0; y = 0; }
  c.drawImage(PORTRAIT_IMG, (i % 7) * 128, Math.floor(i / 7) * 128, 128, 128, x, y, size, size);
  c.restore();
  return true;
}
function tourDrawRing(c) {
  c.fillStyle = '#1a1430'; c.fillRect(-BW * 2, -BH * 2, BW * 4, BH * 4);
  if (STADIUM_IMG.complete && STADIUM_IMG.naturalWidth) c.drawImage(STADIUM_IMG, -STADIUM_C[0], -STADIUM_C[1]);
  else { c.fillStyle = '#3d8a37'; c.fillRect(-300, -300, 600, 600); c.fillStyle = '#f7efe7'; c.fillRect(-TOUR_RING, -TOUR_RING, TOUR_RING * 2, TOUR_RING * 2); }
}
// Un disparo: la esfera común o la forma de su técnica (disco, espiral, esfera gigante)
function tourDrawShot(c, s) {
  if (s.kind === 'disc') {
    c.save(); c.translate(Math.round(s.x), Math.round(s.y)); c.rotate(Math.round(s.spin * 2) / 2);
    c.fillStyle = 'rgba(255,216,74,0.45)'; c.beginPath(); c.ellipse(0, 0, s.r + 4, (s.r + 4) * 0.4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = s.color; c.beginPath(); c.ellipse(0, 0, s.r + 2, (s.r + 2) * 0.3, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fffbe0'; c.fillRect(-s.r, -1, s.r * 2, 1);
    c.restore(); return;
  }
  if (s.kind === 'spiral') {
    c.save(); c.translate(Math.round(s.x), Math.round(s.y)); c.rotate(Math.atan2(s.vy, s.vx));
    c.fillStyle = '#fff6c0'; c.fillRect(-28, -1, 32, 3);
    c.fillStyle = s.color;
    for (let x = -28; x <= 2; x += 2) c.fillRect(x, Math.round(Math.sin(x * 0.5 + s.spin) * 4) - 1, 2, 2);
    c.restore(); return;
  }
  if (s.kind === 'ball' && sfxReady()) {   // esfera de energía que palpita (como la Genkidama)
    const sz = Math.round(s.r * 2.7 * (1 + 0.06 * Math.sin(s.spin)));
    c.globalAlpha = 0.3; c.fillStyle = s.color; circle(c, s.x, s.y, s.r * 1.7); c.globalAlpha = 1;
    c.drawImage(SFX_IMG, 3 * 32, SFX_ANIMS.sphere.row * 32, 32, 32, Math.round(s.x - sz / 2), Math.round(s.y - sz / 2), sz, sz);
    return;
  }
  c.globalAlpha = 0.35; c.fillStyle = s.color; circle(c, s.x, s.y, s.r * 1.9); c.globalAlpha = 1;
  c.fillStyle = s.color; circle(c, s.x, s.y, s.r);
  c.fillStyle = '#ffffff'; circle(c, s.x - s.r * 0.2, s.y - s.r * 0.2, s.r * 0.55);
}
function tourDrawFighter(c, f, t) {
  if (f.out > 0) {   // fuera del ring: quedó en el pasto
    drawActor(c, f.def.look, f.x, f.y, { facing: f.facing, dir: f.dir, anim: 'idle', t: 0, scale: f.def.scale, flash: f.flash > 0 });
    return;
  }
  if (f.charge > 0) { c.globalAlpha = 0.35 + 0.25 * Math.sin(t * 30); c.fillStyle = f.def.color; circle(c, f.x, f.y - 8, 16); c.globalAlpha = 1; }
  if (f.dashT > 0 || f.rushT > 0) { c.globalAlpha = 0.3; drawActor(c, f.def.look, f.x - f.dashX * 10, f.y - f.dashY * 10, { facing: f.facing, dir: f.dir, anim: 'walk', t, scale: f.def.scale, noShadow: true }); c.globalAlpha = 1; }
  const anim = f.punchT > 0 ? 'punch' : f.charge > 0 ? 'cast' : f.moving ? 'walk' : 'idle';
  drawActor(c, f.def.look, f.x, f.y, { facing: f.facing, dir: f.dir, anim, t, scale: f.def.scale, flash: f.flash > 0 });
}
function tourRender(now) {
  const F = TOUR.fight, t = F.t, c = bctx;
  const mx = (F.a.x + F.b.x) / 2, my = (F.a.y + F.b.y) / 2;
  const sh = F.shake > 0 ? F.shake * 8 : 0;
  // Cámara: entre los dos peleadores y con zoom para que el ring llene la pantalla (Z: unidades del mundo → píxeles del búfer)
  // (en pantallas anchas, al menos lo justo para que el estadio llene el ancho)
  const Z = TOUR.zoom = clampN(Math.max(Math.min(BW / (TOUR_RING * 2 + 60), BH / (TOUR_RING * 2 + 150)), BW / 720), 1, 2.2);
  // (la cámara no se sale del estadio: si entra entero, queda centrada)
  const hw = BW / 2 / Z, hh = BH / 2 / Z, X0 = -STADIUM_C[0], X1 = 720 - STADIUM_C[0], Y0 = -STADIUM_C[1], Y1 = 722 - STADIUM_C[1];
  const cx = hw * 2 >= X1 - X0 ? (X0 + X1) / 2 : clampN(clampN(mx, -70, 70), X0 + hw, X1 - hw), cy = hh * 2 >= Y1 - Y0 ? (Y0 + Y1) / 2 : clampN(clampN(my, -70, 70), Y0 + hh, Y1 - hh);
  beginWorld(cx, cy, Math.round((Math.random() - 0.5) * sh), Math.round((Math.random() - 0.5) * sh));
  c.setTransform(Z, 0, 0, Z, Math.round(BW / 2 - camX * Z + (Math.random() - 0.5) * sh), Math.round(BH / 2 - camY * Z + (Math.random() - 0.5) * sh));
  tourDrawRing(c);
  const list = [F.a, F.b].sort((p, q) => p.y - q.y);
  for (const f of list) tourDrawFighter(c, f, t);
  for (const nv of F.novas) drawNova(c, nv, t);
  for (const bm of F.beams) drawBeamBody(c, bm.owner.x + Math.cos(bm.ang) * 10, bm.owner.y - 6 + Math.sin(bm.ang) * 6, bm, t);
  for (const s of F.shots) tourDrawShot(c, s);
  for (const f of F.fx) { c.globalAlpha = Math.min(1, f.t * 3); c.fillStyle = f.color; c.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); }
  c.globalAlpha = 1;
  presentWorld();
  if (F.state === 'present') tourPresent(F); else tourHud(F);
}
function tourText(text, x, y, size, color, align = 'center') {
  ctx.font = `700 ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size / 5); ctx.strokeStyle = '#0b0d22'; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}
const TOUR_TOUCH = matchMedia('(pointer: coarse)').matches;   // celular: los controles son los botones de la pantalla
function tourHud(F) {
  const w = W, h = H;
  // Textos flotantes (en pantalla)
  for (const x of F.texts) {
    const Z = TOUR.zoom || 1, sx = ((x.x - camX) * Z + BW / 2) * SCALE, sy = ((x.y - camY) * Z + BH / 2) * SCALE;
    ctx.globalAlpha = Math.min(1, x.t * 3);
    tourText(x.text, sx, sy, x.big ? 18 : 14, x.color || '#fff');
  }
  ctx.globalAlpha = 1;
  tourText(t(TOUR_ROUNDS[TOUR.round]), w / 2, 22, 16, '#ffd93b');
  tourText(String(Math.ceil(F.left)), w / 2, 50, 26, F.left <= 10 ? '#ff6b6b' : '#ffffff');
  // Barras de vida arriba (como en los juegos de pelea): la tuya a la izquierda, la del rival a la derecha
  const PS = 46, bw = Math.min(300, w / 2 - 50 - PS), by = 88;   // (debajo de los botones de sonido)
  const bar = (f, left) => {
    const x = left ? 16 + PS + 8 : w - 16 - PS - 8 - bw, hp = Math.max(0, TOUR_HP - f.pct), k = hp / TOUR_HP;
    const px = left ? 16 : w - 16 - PS;
    ctx.fillStyle = '#0b0d22'; ctx.fillRect(px - 2, by - 30, PS + 4, PS + 4);
    tourPortrait(ctx, f.def.id, px, by - 28, PS, !left);
    tourText(f.def.name, left ? x : x + bw, by - 12, 15, left ? '#8fe3ff' : '#ffb3b3', left ? 'left' : 'right');
    ctx.fillStyle = '#0b0d22'; ctx.fillRect(x - 3, by - 3, bw + 6, 20);
    ctx.fillStyle = '#3a1020'; ctx.fillRect(x, by, bw, 14);
    ctx.fillStyle = k > 0.5 ? '#4ee36a' : k > 0.25 ? '#ffd93b' : '#ff4d4d';
    const fw = Math.round(bw * k); ctx.fillRect(left ? x : x + bw - fw, by, fw, 14);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(left ? x : x + bw - fw, by, fw, 4);
    tourText(`${Math.ceil(hp)}`, left ? x + 6 : x + bw - 6, by + 7, 12, '#ffffff', left ? 'left' : 'right');
    // Ki: dorado y titilando cuando está lleno
    const kw = Math.round(bw * 0.6), kx = left ? x : x + bw - kw, kf = Math.round(kw * f.ki / 100), full = f.ki >= 100;
    ctx.fillStyle = '#0b0d22'; ctx.fillRect(kx - 2, by + 18, kw + 4, 9);
    ctx.fillStyle = '#1d2a55'; ctx.fillRect(kx, by + 20, kw, 5);
    ctx.fillStyle = full ? (Math.sin(F.t * 12) > 0 ? '#fff6b0' : '#ffd93b') : '#5fb8ff';
    ctx.fillRect(left ? kx : kx + kw - kf, by + 20, kf, 5);
    if (full && left) tourText(TOUR_TOUCH ? t('¡Especial listo! ⭐') : t('¡Especial listo! (L)'), kx + kw + 8, by + 23, 12, '#ffd93b', 'left');
  };
  bar(F.a, true); bar(F.b, false);
  // Los controles, abajo (en el celular están los botones)
  const keysTxt = TOUR_TOUCH ? t('Controles: arrastra para moverte · 👊 golpe · 💨 dash · ⭐ especial') : t('Moverse: WASD o flechas · Golpe: Espacio, J o clic · Dash: Shift, K o clic derecho · Especial: L · Pausa: Esc');
  if (F.state === 'intro') {   // durante la cuenta, en el medio y más grandes
    ctx.fillStyle = 'rgba(11,13,34,.75)'; ctx.fillRect(w / 2 - Math.min(w / 2 - 10, 330), h / 2 + 4, Math.min(w - 20, 660), 40);
    tourText(keysTxt, w / 2, h / 2 + 24, w < 560 ? 12 : 15, '#ffffff');
  }
  if (TOUR_TOUCH) tourText(keysTxt, w / 2, by + 36, 12, 'rgba(255,255,255,.9)');   // (abajo están los botones)
  else tourText(keysTxt, w / 2, h - 24, 14, 'rgba(255,255,255,.9)');
  if (F.state === 'intro') tourText(F.introT > 0.5 ? String(Math.ceil((F.introT - 0.5) / 0.37)) : t('¡Pelea!'), w / 2, h / 2 - 40, 46, '#ffd93b');
  if (F.state === 'end') {
    if (F.koEnd) tourText(t('¡K.O.!'), w / 2, h / 2 - 84, 44, '#ff6b6b');
    tourText(F.timeUp ? t('¡Tiempo! Gana {name}', { name: F.winner.def.name }) : t('¡{name} gana!', { name: F.winner.def.name }), w / 2, h / 2 - 40, 30, F.winner === F.a ? '#ffd93b' : '#ff8a8a');
  }
}
// Presentación (2.26.5): cada peleador entra desde su lado, en grande, con su nombre y su técnica; VS en el medio
function tourPresent(F) {
  const w = W, h = H, k = Math.min(1, (TOUR_PRESENT - F.presentT) / 0.35), ease = 1 - (1 - k) ** 3, out = Math.max(0, 1 - F.presentT / 0.25);
  ctx.fillStyle = `rgba(8,6,20,${0.78 * (1 - out)})`; ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1 - out;
  const side = (f, left, color) => {
    const cx = left ? w * 0.27 : w * 0.73, off = (1 - ease) * (left ? -w * 0.6 : w * 0.6);
    // Franja de color en diagonal
    ctx.save(); ctx.translate(off, 0);
    ctx.fillStyle = color; ctx.beginPath();
    if (left) { ctx.moveTo(0, h * 0.22); ctx.lineTo(w * 0.52, h * 0.22); ctx.lineTo(w * 0.44, h * 0.8); ctx.lineTo(0, h * 0.8); }
    else { ctx.moveTo(w, h * 0.22); ctx.lineTo(w * 0.56, h * 0.22); ctx.lineTo(w * 0.48, h * 0.8); ctx.lineTo(w, h * 0.8); }
    ctx.fill();
    // El retrato en grande (en múltiplos de 64 para que los píxeles queden parejos); sin el retrato, el sprite
    const P = 64 * Math.max(1, Math.floor(Math.min(h * 0.36, w * 0.34) / 64)), top = h * 0.6 - P;
    ctx.fillStyle = '#0b0d22'; ctx.fillRect(Math.round(cx - P / 2) - 4, Math.round(top) - 4, P + 8, P + 8);
    if (!tourPortrait(ctx, f.def.id, Math.round(cx - P / 2), Math.round(top), P, !left)) {
      const sc = Math.max(3, Math.min(8, h * 0.36 / 34)) * (f.def.scale > 1 ? 0.85 : 1);
      ctx.imageSmoothingEnabled = false;
      if (spritesReady) drawActor(ctx, f.def.look, cx, h * 0.52, { facing: left ? 1 : -1, anim: 'idle', t: F.t, scale: sc * f.def.scale, noShadow: true });
    }
    tourText(f.def.name, cx, h * 0.62 + 12, Math.max(20, Math.min(34, w / 22)), '#ffffff');
    tourText(`★ ${f.def.special}`, cx, h * 0.62 + 42, Math.max(13, Math.min(18, w / 40)), '#ffd93b');
    tourText(f.def.hero ? t('Guerrero') : t('Villano'), cx, h * 0.62 + 64, 13, 'rgba(255,255,255,.75)');
    ctx.restore();
  };
  side(F.a, true, 'rgba(42,111,214,.55)'); side(F.b, false, 'rgba(214,52,52,.55)');
  tourText(t(TOUR_ROUNDS[TOUR.round]), w / 2, h * 0.14, Math.max(18, Math.min(30, w / 26)), '#ffd93b');
  const pop = k < 1 ? 0 : 1 + 0.12 * Math.sin(F.t * 10);
  if (pop) tourText('VS', w / 2, h * 0.5, Math.round(Math.max(40, Math.min(80, w / 11)) * pop), '#ffd93b');
  if (F.t > 0.5) tourText(TOUR_TOUCH ? t('Toca la pantalla para empezar') : t('Haz clic o pulsa Espacio para empezar'), w / 2, h * 0.88, 18 + Math.sin(F.t * 5) * 1.5, '#ffffff');
  ctx.globalAlpha = 1;
}
// Animación de las tarjetas al elegir peleador
function tourPickPortraits(t) {
  for (const card of $('tourBox').querySelectorAll('.tour-card')) {
    const f = tourFighter(card.dataset.id), cv = card.querySelector('canvas'), cx = cv.getContext('2d');
    const active = card.classList.contains('selected') || card.matches(':hover');
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, 96, 132); cx.imageSmoothingEnabled = false;
    cx.save(); cx.scale(2.5 / f.scale, 2.5 / f.scale);
    drawActor(cx, f.look, 19 * f.scale, 37 * f.scale, { anim: active ? 'walk' : 'idle', t, scale: f.scale });
    cx.restore();
  }
}
// Lo llama el bucle principal (step) mientras hay torneo
function tourStep(dt, draw, now) {
  if (TOUR.screen === 'fight' && TOUR.fight) {
    tourUpdate(dt);
    if (draw && TOUR.fight) tourRender(now);
  } else if (draw) {
    renderMenuBackground(now / 1000);
    if (TOUR.screen === 'pick' && spritesReady) tourPickPortraits(now / 1000);
    if (TOUR.screen === 'bracket') tourDrawBracket(now / 1000);
  }
}
// Los controles del torneo, en una tabla (en la pausa)
function tourKeysTable() {
  const rows = [
    [t('Moverse'), t('WASD o flechas'), t('Palanca izquierda'), t('Arrastra el dedo')],
    [t('Golpe'), t('Espacio, J o clic'), 'A / X', '👊'],
    [t('Dash'), t('Shift, K o clic derecho'), 'B / RB / RT', '💨'],
    [t('Especial (con el ki lleno)'), 'L / E', 'Y / LB', '⭐'],
    [t('Pausa'), 'Esc / P', 'Start', '⏸'],
  ];
  return `<table class="tour-keys-table"><tr><th></th><th>⌨️ ${t('Teclado')}</th><th>🎮 ${t('Mando')}</th><th>📱 ${t('Celular')}</th></tr>${rows.map(r => `<tr><th>${r[0]}</th>${r.slice(1).map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</table>
    <p class="hint">${t('La ráfaga de ki sale sola. La barra de ki (debajo de la vida) se llena con el tiempo, al pegar y al recibir golpes: llena, lanza tu técnica especial. Cuanta menos vida le queda a tu rival, más lejos lo empujas. Si te caes del ring o te quedas sin vida, pierdes.')}</p>`;
}
function tourTogglePause() {
  if (!TOUR || TOUR.screen !== 'fight') return;
  TOUR.pauseOpen = !TOUR.pauseOpen;
  if (TOUR.pauseOpen) {
    $('tourBox').innerHTML = `<h2>${t('Pausa')}</h2>${tourKeysTable()}<div class="setup-actions"><button class="btn ghost" id="tourQuit">${t('Abandonar el torneo')}</button><button class="btn" id="tourResume">${t('Continuar')}</button></div>`;
    $('tourResume').onclick = tourTogglePause;
    $('tourQuit').onclick = tourClose;
    $('tour').classList.remove('hidden');
  } else $('tour').classList.add('hidden');
}
// Controles: golpe (Espacio, J, clic izquierdo, botón A del mando) y dash (Shift, K, clic derecho, botón B)
addEventListener('keydown', e => {
  if (!TOUR || TOUR.screen !== 'fight' || e.repeat) return;
  if (e.code === 'Escape' || e.code === 'KeyP') { tourTogglePause(); return; }
  if (['Space', 'KeyJ', 'Enter'].includes(e.code)) { TOUR.want = { hit: true }; e.preventDefault(); }
  if (['ShiftLeft', 'ShiftRight', 'KeyK'].includes(e.code)) { TOUR.want = { dash: true }; e.preventDefault(); }
  if (['KeyL', 'KeyE'].includes(e.code)) { TOUR.want = { sp: true }; e.preventDefault(); }
});
canvas.addEventListener('pointerdown', e => {
  if (TOUR && TOUR.fight && TOUR.fight.state === 'present') { TOUR.want = { hit: true }; return; }   // presentación: tocar o hacer clic empieza la pelea
  if (!TOUR || TOUR.screen !== 'fight' || e.pointerType !== 'mouse') return;
  TOUR.want = e.button === 2 ? { dash: true } : { hit: true };
});
canvas.addEventListener('contextmenu', e => { if (TOUR) e.preventDefault(); });
$('tourHit').addEventListener('pointerdown', e => { e.preventDefault(); if (TOUR) TOUR.want = { hit: true }; });
$('tourDash').addEventListener('pointerdown', e => { e.preventDefault(); if (TOUR) TOUR.want = { dash: true }; });
$('tourSp').addEventListener('pointerdown', e => { e.preventDefault(); if (TOUR) TOUR.want = { sp: true }; });
$('tourPause').addEventListener('click', () => tourTogglePause());
