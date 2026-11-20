'use strict';
// ─── Bucle principal, entidades, combate, progresión e interfaz ──────────────────
// La simulación la ejecuta quien tiene la autoridad: el jugador en solitario o el
// anfitrión de una sala online. Los clientes reciben instantáneas (ver net.js).

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

// El mundo se dibuja en un búfer de baja resolución (1 unidad = 1 píxel de arte)
// y se amplía sin suavizado: PIX píxeles de pantalla por cada píxel de arte.
const buf = document.createElement('canvas');
const bctx = buf.getContext('2d');
let W = 0, H = 0, DPR = 1, PIX = 2, SCALE = 1, BW = 0, BH = 0;
// Zoom elegido en la pausa (2.34.3): -1 más cerca, 0 automático, 1 más lejos (un paso de PIX). Se carga junto con la partida guardada
// «Lejos» solo si la vista no pasa de 1440 de largo: los enemigos aparecen fuera de la vista, y con más lejos llegarían
// tarde (ventaja en el ranking) y habría mucho más para dibujar
let zoomStep = 0, zoomFarOk = false;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  // Zoom: el lado corto muestra al menos 330 píxeles de arte. 2.34.3: si así el lado largo queda en menos de 760
  // (un monitor 1080p en pantalla completa veía solo 640×360, menos mapa que un celular apaisado), se aleja un paso,
  // siempre que no quede demasiado lejos (hasta ~1000×560: así los celulares chicos y las pantallas 1366×768 no cambian)
  const sd = Math.min(W, H) * DPR, ld = Math.max(W, H) * DPR;
  PIX = Math.max(1, Math.floor(sd / 330));
  if (PIX > 1 && ld / PIX < 760 && ld / (PIX - 1) <= 1000 && sd / (PIX - 1) <= 560) PIX--;
  zoomFarOk = PIX > 1 && ld / (PIX - 1) <= 1440;
  if (zoomStep < 0) PIX++;
  else if (zoomStep > 0 && zoomFarOk) PIX--;
  SCALE = PIX / DPR;
  BW = Math.max(1, Math.ceil(canvas.width / PIX)); BH = Math.max(1, Math.ceil(canvas.height / PIX));
  buf.width = BW; buf.height = BH;
}
// Convierte coordenadas del mundo a píxeles CSS de pantalla
let camX = 0, camY = 0;
const toScreen = (x, y) => [(x - camX + BW / 2) * SCALE, (y - camY + BH / 2) * SCALE];
const FONT = '"Fredoka", "Trebuchet MS", sans-serif';
addEventListener('resize', resize);
resize();

// ─── Modo prueba ─────────────────────────────────────────────────────────────
// Entrando con ?test en el enlace (y la contraseña): todos los personajes desbloqueados, atajos
// de teclado para probar (F1-F5) y nada se guarda, así la partida guardada real queda intacta.
// Se guarda solo el hash SHA-256 de la contraseña; una vez aceptada, vale para esa pestaña.
const TEST_REQUESTED = new URLSearchParams(location.search).has('test');
const TEST_PASS_HASH = '9ebbc4bb811859c588eea5c522b2919b239170760897b23e4a684c1feac9211d';
const TEST_SESSION_KEY = 'dbzsurvivor.test';
let TEST_MODE = false;
try { TEST_MODE = TEST_REQUESTED && sessionStorage.getItem(TEST_SESSION_KEY) === TEST_PASS_HASH; } catch (e) { /* sin almacenamiento */ }
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Guardado ────────────────────────────────────────────────────────────────
const SAVE_KEY = 'dbzsurvivor.save.v1';
function loadSave() {
  const def = { best: {}, zeni: 0, runs: 0, wins: 0, name: '', char: 'goku', upgrades: {}, unlocked: {}, vegetaKills: 0, ach: {}, stats: {},
    level: 'saiyan', levelsWon: {}, showMap: true };   // minimapa prendido de entrada (2.29.1; quien lo apagó lo conserva apagado)
  let s;
  try { s = Object.assign(def, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) { s = def; }
  // Estadísticas acumuladas para los logros (bajas totales, victorias por guerrero, evoluciones vistas)
  s.stats = Object.assign({ kills: 0, winsBy: {}, evos: {}, wishes: {},
    // Logros de leyenda (2.12.0): tiempo jugado (s), Zeni ganado, élites, jefes por id, evoluciones, transformaciones,
    // fusiones, invocaciones de Shenlong, niveles ganados por guerrero ("nivel|guerrero"), victorias online y del desafío
    time: 0, zeniEarned: 0, elites: 0, bosses: {}, evoCount: 0, transforms: 0, fusions: 0, summons: 0,
    lvWins: {}, onlineWins: 0, weeklyWins: 0, weeklyWeeks: {},
    // Perfil (2.22.0): partidas y segundos por guerrero, quién te derrotó (id del jefe, o "horde"), daño total por técnica
    charRuns: {}, charTime: {}, killedBy: {}, techDmg: {} }, s.stats);
  // La mejora «Técnica secreta» (1500 Zeni) se reemplazó: se devuelve lo que costó
  if (s.upgrades && s.upgrades.moves) { s.zeni += 1500; delete s.upgrades.moves; s.refundedMoves = true; }
  return s;
}
function writeSave() { if (TEST_MODE) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* sin almacenamiento */ } }
const SAVE = loadSave();
if (SAVE.refundedMoves) { delete SAVE.refundedMoves; writeSave(); }   // guarda la devolución de la Técnica secreta
zoomStep = [-1, 0, 1].includes(SAVE.zoom) ? SAVE.zoom : 0;
if (zoomStep) resize();
const myName = () => (SAVE.name || '').trim() || t('Guerrero');
// Con el desafío semanal elegido y un guerrero fijo, ese es el que se juega (el que eligió la persona queda guardado
// para los otros niveles)
const weeklyChar = () => (SAVE.level === 'weekly' && WEEKLY && WEEKLY.char && CHARACTERS[WEEKLY.char] ? WEEKLY.char : null);
// Desafío semanal parejo (2.19.0): todos juegan con las mejoras de la tienda al máximo y con todos los guerreros
// (aunque no los tengan desbloqueados). Cada día hay WEEKLY_TRIES intentos que cuentan para el ranking; después se
// puede seguir jugando como práctica. Los intentos se cuentan en este navegador y vuelven a las 00:00 de Argentina.
const WEEKLY_TRIES = 3;
const weeklyOpen = () => SAVE.level === 'weekly' && !!WEEKLY;
const artDay = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
function weeklyTriesLeft() {
  const w = SAVE.wkTries;
  return w && WEEKLY && w.week === WEEKLY.week && w.day === artDay() ? Math.max(0, WEEKLY_TRIES - w.n) : WEEKLY_TRIES;
}
function useWeeklyTry() {
  const left = weeklyTriesLeft();
  if (!left) return false;
  SAVE.wkTries = { week: WEEKLY.week, day: artDay(), n: WEEKLY_TRIES - left + 1 };
  writeSave();
  return true;
}
const maxPerks = () => cleanPerks(Object.fromEntries(SHOP_UPGRADES.map(u => [u.id, u.max])));
const myChar = () => weeklyChar() || (CHARACTERS[SAVE.char] && (isUnlocked(SAVE.char) || weeklyOpen()) ? SAVE.char : 'goku');
// ¿Se ve distinto al transformarse? (pelo Super Saiyajin, o una hoja propia como Piccolo sin capa)
const hasTransformLook = c => !!(c.ssjHair || c.transformSprite);
// Niveles: el 1 está abierto; cada uno se abre al ganar el anterior (en el modo prueba, todos)
const isLevelOpen = id => { const L = levelDef(id); return TEST_MODE || L.bonus || L.num === 1 || !!SAVE.levelsWon[L.openAfter || LEVELS[L.num - 2].id]; };   // openAfter: niveles de la fusión (js/fusion.js)
const myLevel = () => SAVE.level === 'weekly' ? (WEEKLY ? 'weekly' : 'saiyan') : (isLevelOpen(SAVE.level) ? levelDef(SAVE.level).id : 'saiyan');
// Récord de un guerrero en un nivel (los récords de antes de los niveles cuentan para el Nivel 1)
const bestOf = (lv, ch) => SAVE.best[`${lv}|${ch}`] || (lv === 'saiyan' ? SAVE.best[ch] || 0 : 0);

// ─── Personajes desbloqueables ───────────────────────────────────────────────
const isUnlocked = id => TEST_MODE || !CHARACTERS[id].unlock || !!SAVE.unlocked[id];
// Progreso hacia el desbloqueo, para mostrar en el menú
function unlockProgress(id) {
  const u = CHARACTERS[id].unlock;
  if (u.kind === 'zeni') return `${Math.min(SAVE.zeni, u.cost)} / ${u.cost} Zeni`;
  if (u.kind === 'vegetaKills') return t('{n} / {goal} enemigos', { n: Math.min(SAVE.vegetaKills, u.goal), goal: u.goal });
  if (u.kind === 'quickLoss') return t('{n} / {goal} derrotas en el primer minuto', { n: Math.min(SAVE.quickLosses || 0, u.goal), goal: u.goal });
  const boss = BOSSES.find(b => b.id === u.boss);
  return t('Aún no derrotaste a {name}', { name: boss ? boss.name : u.boss });
}
function unlockChar(id) {
  if (isUnlocked(id)) return false;
  SAVE.unlocked[id] = true;
  writeSave();
  if (G) { (G.newUnlocks = G.newUnlocks || []).push(id); announce('¡Desbloqueaste a {name}!', '#3dff7a', { name: CHARACTERS[id].name }); }
  return true;
}
// Objetivos que se cumplen jugando (los de Zeni se compran desde el menú)
function checkUnlocks() {
  for (const id in CHARACTERS) {
    const u = CHARACTERS[id].unlock;
    if (u && u.kind === 'vegetaKills' && SAVE.vegetaKills >= u.goal) unlockChar(id);
    if (u && u.kind === 'quickLoss' && (SAVE.quickLosses || 0) >= u.goal) unlockChar(id);
  }
}
// Un jefe cayó (en online el anfitrión avisa a los demás, con los segundos que duró en pie):
// desbloquea a quien lo pida y revisa los logros de jefes
function bossDefeated(bossId, secs = 999) {
  for (const id in CHARACTERS) {
    const u = CHARACTERS[id].unlock;
    if (u && u.kind === 'boss' && u.boss === bossId) unlockChar(id);
  }
  if (!G || !G.me) return;
  SAVE.stats.bosses[bossId] = (SAVE.stats.bosses[bossId] || 0) + 1;   // para los logros de leyenda
  if (bossId === 'freezer' && secs < 60) unlockAch('freezer60');
  const M = G.me;
  if (!M.dead && M.hp < M.maxHp * 0.1) unlockAch('lowhp');
}

// ─── Logros ──────────────────────────────────────────────────────────────────
// Se cuentan desde el punto de vista de tu guerrero. Casi todo se detecta en achTick (también
// en online); lo que solo sabe el anfitrión (élites derrotados, semillas) llega con achEvent.
function unlockAch(id) {
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (!a || SAVE.ach[id]) return;
  SAVE.ach[id] = true;
  SAVE.zeni += a.zeni;
  writeSave();
  if (G) (G.achNew = G.achNew || []).push(id);
  achToast(a);
}
// Avisos de logro: se apilan al costado izquierdo (no tapan la pantalla de victoria o derrota),
// se van solos a los 6 segundos y con un clic se cierran antes
let achSfxAt = 0;
function achToast(a) {
  const box = $('achToasts');
  const el = document.createElement('div');
  el.className = 'ach-toast';
  el.title = t('Clic para cerrar');
  el.innerHTML = `<span class="trophy">🏆</span><div><b>${esc(t('¡Logro: {name}!', { name: a.name }))}</b><small>${esc(a.desc)} · +${a.zeni} Zeni</small></div>`;
  const close = () => {
    if (el.classList.contains('out')) return;
    el.classList.remove('in'); el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  };
  el.onclick = close;
  box.appendChild(el);
  while (box.children.length > 5) box.firstElementChild.remove();
  void el.offsetWidth; el.classList.add('in');
  if (performance.now() - achSfxAt > 300) { achSfxAt = performance.now(); SFX.play('ball'); }   // varios juntos: un solo sonido
  setTimeout(close, 6000);
}
// Eventos que solo ve el anfitrión: al propio jugador se aplican directo, al resto se les avisa
function achEvent(P, key) {
  if (!P) return;
  if (P === G.me) localAchEvent(key);
  else emit(['a', P.id, key]);
}
function localAchEvent(key) {
  if (!G || !G.ach) return;
  if (key === 'elite') { SAVE.stats.elites++; if (++G.ach.elite >= 10) unlockAch('elite10'); }
  if (key === 'senzu') G.ach.senzu = true;
  if (key.startsWith('wish:')) {
    SAVE.stats.wishes[key.slice(5)] = true; writeSave();
    const a = ACHIEVEMENTS.find(x => x.id === 'allwishes');
    if (a.progress(SAVE) >= achGoal(a)) unlockAch('allwishes');
  }
}
// Seguimiento por cuadro de tu guerrero (anfitrión, en solitario y en online)
function achTick() {
  const A = G.ach, M = G.me;
  if (!A || !M || G.mode === 'over') return;
  if (M.stats.kills >= 1000) unlockAch('kills1000');
  if (G.lv.infinite && !G.weekly) {   // Nivel 5: cuánto aguantas y hasta qué vuelta de jefes llegas
    if (G.t >= 600) unlockAch('kaio10');
    if (G.t >= 1200) unlockAch('kaio20');
    if (G.t >= 1800) unlockAch('kaio30');
    if (kaioRound() >= 2) unlockAch('kaioSagas');
  }
  // Transformaciones y fusión
  if (M.transformed > 0 && A.prevTrans <= 0) { A.everTrans = true; SAVE.stats.transforms++; if (++A.transforms >= 5) unlockAch('transform5'); }
  A.prevTrans = M.transformed;
  const fused = isFused(M);
  if (fused) { A.everTrans = true; unlockAch('fusion'); }
  if (fused && !A.prevFused) SAVE.stats.fusions++;
  A.prevFused = fused;
  // Evoluciones (y la colección de todas las que viste)
  const evolved = M.attacks.filter(a => ATTACKS[a.id] && ATTACKS[a.id].evolved);
  for (const a of evolved) if (!SAVE.stats.evos[a.id]) { SAVE.stats.evos[a.id] = true; writeSave(); }
  A.evoSeen = A.evoSeen || new Set();
  for (const a of evolved) if (!A.evoSeen.has(a.id)) { A.evoSeen.add(a.id); SAVE.stats.evoCount++; }
  if (evolved.length >= 1) unlockAch('evo1');
  if (evolved.length >= 3) unlockAch('evo3');
  if (Object.keys(SAVE.stats.evos).length >= achGoal(ACHIEVEMENTS.find(a => a.id === 'allevo'))) unlockAch('allevo');
  if (M.attacks.length >= 5 && M.attacks.every(a => ATTACKS[a.id].evolved || a.lvl >= MAX_ATTACK_LEVEL)) unlockAch('arsenal');
  // Intocable: 3 minutos seguidos sin perder vida
  if (M.hp < A.prevHp || M.dead) A.lastHurt = G.t;
  A.prevHp = M.hp;
  if (G.t - A.lastHurt >= 180) unlockAch('untouch');
  // Shenlong: cada ronda de deseos nueva
  if (G.round && G.round.kind === 'wish' && G.round.id !== A.wishRound) {
    A.wishRound = G.round.id;
    SAVE.stats.summons++;
    unlockAch('shenlong');
    if (++A.shenlong >= 3) unlockAch('shenlong3');
  }
}
// Al terminar la partida: victorias, bajas totales y los logros que dependen del resultado
function achEndRun(P, won) {
  const A = G.ach || {};
  unlockAch('first');
  SAVE.stats.kills += P.stats.kills;
  SAVE.stats.time += Math.floor(G.t);
  // Perfil: guerrero, daño por técnica y, si caíste (sin abandonar), quién fue: el jefe más cercano, o la horda
  const S = SAVE.stats;
  S.charRuns[P.charId] = (S.charRuns[P.charId] || 0) + 1;
  S.charTime[P.charId] = (S.charTime[P.charId] || 0) + Math.floor(G.t);
  for (const [aid, v] of Object.entries(P.stats.dmg)) if (ATTACKS[aid]) S.techDmg[aid] = Math.round((S.techDmg[aid] || 0) + v);
  if (!won && !G.quit && !G.lv.bonus) {
    let boss = null, bd = 600 ** 2;
    for (const e of G.enemies) if (e.boss && !e.dead) { const d = (e.x - P.x) ** 2 + (e.y - P.y) ** 2; if (d < bd) { bd = d; boss = e; } }
    const k = boss ? boss.id : 'horde';
    S.killedBy[k] = (S.killedBy[k] || 0) + 1;
  }
  if (G.weekly) { SAVE.stats.weeklyWeeks[G.weekly.week] = true; if (won) SAVE.stats.weeklyWins++; }
  else if (won && !G.lv.bonus) SAVE.stats.lvWins[`${G.lv.id}|${P.charId}`] = true;
  if (won && G.net) SAVE.stats.onlineWins++;
  if (won && !G.lv.bonus) {   // llegar al final del nivel bonus no cuenta como ganar un nivel
    SAVE.stats.winsBy[P.charId] = true;
    unlockAch('win');
    if (!A.everTrans) unlockAch('notrans');
    if (!A.senzu) unlockAch('nosenzu');
    if (G.net && G.players.filter(Q => !Q.ally).length >= 3) unlockAch('online3');
    if (G.speed > 1) unlockAch('fast');
  }
  for (const a of ACHIEVEMENTS) if (a.goal && a.progress(SAVE) >= achGoal(a)) unlockAch(a.id);
  writeSave();
}
function buyUnlock(id) {
  const u = CHARACTERS[id].unlock;
  if (!u || u.kind !== 'zeni' || isUnlocked(id) || SAVE.zeni < u.cost) return;
  SAVE.zeni -= u.cost;
  unlockChar(id);
  SFX.play('levelup');
  SAVE.char = id; writeSave();
  buildMenu();
}

// ─── Utilidades ──────────────────────────────────────────────────────────────
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function fmtTime(s) { s = Math.floor(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
// Con centésimas (ranking y pantalla final): 10:40.25
const fmtTimeCs = cs => `${fmtTime(cs / 100)}.${String(Math.floor(cs) % 100).padStart(2, '0')}`;
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

// ─── Entrada ─────────────────────────────────────────────────────────────────
const keys = {};
// Teclas que activan el poder del Ki (transformación)
const KI_KEYS = new Set(['Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyK', 'Enter', 'NumpadEnter']);
addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.code === 'Escape' && !$('report').classList.contains('hidden')) { $('report').classList.add('hidden'); return; }   // ventana de reporte
  keys[e.code] = true;
  SFX.unlock();
  if (e.code === 'KeyN' && !e.repeat) toggleMusic();
  if (e.code === 'KeyB' && !e.repeat) toggleSfx();
  if (e.code === 'KeyM' && !e.repeat && G) toggleMap();
  if (!G) { if (e.code === 'Escape' && !TOUR) closeMenuSection(); return; }
  if (TEST_MODE && e.code === 'Escape' && testPowersOpen()) { toggleTestPowers(false); return; }   // panel de Poderes
  if (TEST_MODE && testKey(e)) return;
  if (KI_KEYS.has(e.code)) { if (!e.repeat) requestTransform(); e.preventDefault(); }
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  // Elegir carta o deseo con los números: los de arriba del teclado o los del teclado numérico (1 a 4: Shenlong ofrece 4)
  const num = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
  if (G.round && num && !e.repeat) {
    const btn = $('choices').children[+num[1] - 1];
    if (btn) { btn.click(); e.preventDefault(); }
  }
  if (G.round && e.code === 'KeyR' && !e.repeat) rerollChoices();   // volver a sortear las cartas
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (G && !G.net && G.mode === 'play') togglePause(); });

const joy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
canvas.addEventListener('contextmenu', e => { if (G) e.preventDefault(); });
canvas.addEventListener('pointerdown', e => {
  SFX.unlock();
  if (e.pointerType === 'mouse') return; // el clic no hace nada: el Ki va con el teclado, el mando o el botón táctil
  Object.assign(joy, { active: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY });
});
addEventListener('pointermove', e => {
  if (joy.active && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; }
  if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = performance.now(); }
});
// Posición del mouse (para apuntar el Big Bang Kamehameha)
const mouse = { x: 0, y: 0, t: 0 };
const toWorld = (sx, sy) => [sx / SCALE - BW / 2 + camX, sy / SCALE - BH / 2 + camY];
const endJoy = e => { if (e.pointerId === joy.id) { joy.active = false; joy.id = null; } };
addEventListener('pointerup', endJoy);
addEventListener('pointercancel', endJoy);

// Mando: stick izquierdo o cruceta para moverse; stick derecho para apuntar (apuntado manual);
// A/B/X/Y o gatillos para el Ki; Start para pausar. Con una pantalla abierta (cartas, pausa, fin) maneja el menú
const pad = { x: 0, y: 0, prev: [], aim: 0, aimT: 0 };
let PAD_SEEN = false;
function pollGamepad() {
  pad.x = 0; pad.y = 0;
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g => g && g.connected) : null;
  if (!gp) return;
  PAD_SEEN = true;   // (para el backoffice: juega con mando)
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
  let x = gp.axes[0] || 0, y = gp.axes[1] || 0;
  if (Math.hypot(x, y) < 0.2) { x = 0; y = 0; }
  if (b(14)) x = -1; if (b(15)) x = 1; if (b(12)) y = -1; if (b(13)) y = 1;
  const d = Math.hypot(x, y);
  if (d > 1) { x /= d; y /= d; }
  pad.x = x; pad.y = y;
  // Stick derecho: hacia dónde apuntan las técnicas (si se suelta, se mantiene un momento la última dirección)
  const ax = gp.axes[2] || 0, ay = gp.axes[3] || 0;
  if (Math.hypot(ax, ay) > 0.35) { pad.aim = Math.atan2(ay, ax); pad.aimT = performance.now(); }
  const pressed = i => b(i) && !pad.prev[i];
  const ui = padScreen();
  if (ui) { padMenu(ui, x, y, pressed); pad.x = 0; pad.y = 0; }   // en el menú no se mueve ni tira el Ki
  else {
    if (padUi.box) padReset(null);
    if (G && [0, 1, 2, 3, 6, 7].some(pressed)) { SFX.unlock(); requestTransform(); }
  }
  if (G && pressed(9)) togglePause();
  pad.prev = gp.buttons.map(btn => btn.pressed);
}

// ─── Menús con el mando (2.34.0) ─────────────────────────────────────────────
// Cruceta o palanca izquierda: mueve el foco al elemento más cercano en esa dirección (en un deslizador de volumen,
// izquierda y derecha lo cambian). A: lo presiona. B: sale de la pausa. X / Y: bloquean / descartan la carta elegida
const padUi = { box: null, el: null, idx: 0, since: 0, dir: '', next: 0 };
const PAD_SCREENS = ['levelup', 'pause', 'gameover'];
function padScreen() {
  for (const id of PAD_SCREENS) { const s = $(id); if (s && !s.classList.contains('hidden')) return s; }
  return null;
}
// Lo que se puede elegir: botones visibles (bloquear y descartar van con X / Y, no con el foco)
const padTargets = s => [...s.querySelectorAll('button, input[type=range]')].filter(el => el.offsetParent && !el.disabled && !el.closest('.combo-wrap'));
function padReset(s) {
  if (padUi.el) padUi.el.classList.remove('pad-focus');
  Object.assign(padUi, { box: s, el: null, idx: 0, since: performance.now() });
}
function padFocus(el, list) {
  if (padUi.el && padUi.el !== el) padUi.el.classList.remove('pad-focus');
  padUi.el = el; padUi.idx = list.indexOf(el);
  el.classList.add('pad-focus');
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function padMenu(s, x, y, pressed) {
  const now = performance.now(), list = padTargets(s);
  if (padUi.box !== s) padReset(s);
  if (!list.length) return;
  // Al abrirse: Continuar en la pausa, Reintentar al terminar, la primera carta al subir de nivel.
  // Si la pantalla se volvió a armar (bloquear, descartar, sortear), el foco queda en el mismo lugar
  if (!list.includes(padUi.el)) padFocus(padUi.el ? list[Math.min(padUi.idx, list.length - 1)] : list.find(el => el.matches('#btnResume, #btnRetry')) || list[0], list);
  const cur = padUi.el;
  // Dirección: se mueve una vez y, si la mantienes, se repite
  const dir = Math.abs(x) > 0.5 || Math.abs(y) > 0.5 ? (Math.abs(x) > Math.abs(y) ? (x > 0 ? 'r' : 'l') : (y > 0 ? 'd' : 'u')) : '';
  if (dir && (dir !== padUi.dir || now >= padUi.next)) {
    padUi.next = now + (dir !== padUi.dir ? 380 : 150);
    const dx = dir === 'r' ? 1 : dir === 'l' ? -1 : 0, dy = dir === 'd' ? 1 : dir === 'u' ? -1 : 0;
    if (cur.type === 'range' && dx) {
      cur.value = +cur.value + dx * (+cur.step || 1);
      cur.dispatchEvent(new Event('input'));
    } else {
      const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let best = null, score = Infinity;
      for (const el of list) {
        if (el === cur) continue;
        const q = el.getBoundingClientRect(), ex = q.left + q.width / 2 - cx, ey = q.top + q.height / 2 - cy;
        // across: cuánto se corre hacia el costado (0 si queda justo arriba / abajo / al lado)
        const along = ex * dx + ey * dy, across = dx ? Math.max(0, q.top - r.bottom, r.top - q.bottom) : Math.max(0, q.left - r.right, r.left - q.right);
        if (along <= 4 || across > along * 2) continue;   // solo lo que está más o menos en esa dirección
        if (dx && across) continue;   // izquierda / derecha: en la misma fila
        if (along + across * 2 < score) { score = along + across * 2; best = el; }
      }
      if (best) { padFocus(best, list); SFX.play('pickup'); }
    }
  }
  padUi.dir = dir;
  if (now - padUi.since < 350) return;   // recién abierta: que un botón apretado para otra cosa no elija sin querer
  if (pressed(0)) { SFX.unlock(); cur.click(); }
  else if (pressed(1) && s.id === 'pause') togglePause();
  else if ((pressed(2) || pressed(3)) && s.id === 'levelup') {
    const tool = cur.querySelector('.card-tool[data-act="' + (pressed(2) ? 'lock' : 'discard') + '"]');
    if (tool) tool.click();
  }
}

function inputVec() {
  if (pad.x || pad.y) return { x: pad.x, y: pad.y };
  if (joy.active) {
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy);
    if (d > 8) { const m = Math.min(1, d / 50); return { x: dx / d * m, y: dy / d * m }; }
  }
  let x = 0, y = 0;
  if (keys.KeyW || keys.ArrowUp) y--;
  if (keys.KeyS || keys.ArrowDown) y++;
  if (keys.KeyA || keys.ArrowLeft) x--;
  if (keys.KeyD || keys.ArrowRight) x++;
  const d = Math.hypot(x, y);
  return d ? { x: x / d, y: y / d } : { x: 0, y: 0 };
}

// ─── Estado de la partida ────────────────────────────────────────────────────
let G = null;
const isAuthority = () => !G.net || G.net.role === 'host';
const START_OFFSETS = [[0, 0], [40, 0], [-40, 0], [0, 40]];

// Mejoras de la tienda: niveles validados (pueden llegar por la red)
function cleanPerks(src) {
  const out = {};
  for (const u of SHOP_UPGRADES) out[u.id] = Math.max(0, Math.min(u.max, Math.floor(+(src && src[u.id]) || 0)));
  return out;
}
const myPerks = () => cleanPerks(SAVE.upgrades);
// Valor total de una mejora para un jugador (niveles × efecto por nivel)
function perk(P, id) {
  const u = SHOP_UPGRADES.find(x => x.id === id);
  return ((P.perks && P.perks[id]) || 0) * u.per;
}

function makePlayer(id, name, charId, perks) {
  const c = CHARACTERS[charId] || CHARACTERS.goku;
  const P = {
    id, name, charId, c, x: 0, y: 0, r: 11, hp: c.hp, maxHp: c.hp, facing: 1, dirX: 1, dirY: 0,
    inv: 0, moving: false, castT: 0, ki: 0, dir: 'side', transformed: 0, dead: false, gone: false, revive: 0, orbitAng: 0,
    attacks: [{ id: c.start, lvl: 1, cd: 0.5 }],
    passives: Object.fromEntries(Object.keys(PASSIVES).map(k => [k, 0])),
    bonusZeni: 0, perks: cleanPerks(perks),
    stats: { dmg: {}, kills: 0, taken: 0 },   // daño por técnica, enemigos derrotados, daño recibido
  };
  P.maxHp += perk(P, 'hp');
  P.hp = P.maxHp;
  P.senzuLeft = perk(P, 'senzu');    // Semilla de reserva: revive una vez por partida
  P.rerolls = perk(P, 'reroll');     // Visión de Kaio-sama: sorteos de cartas por partida
  P.locks = perk(P, 'lock');         // Cápsula Hoipoi: bloqueos de cartas por partida
  P.discards = perk(P, 'discard');   // Juicio de Enma: descartes de cartas por partida
  P.banned = []; P.locked = null;
  return P;
}

// roster: [{ id, name, charId, perks }]; net: null (solo) o { role: 'host' | 'client' }
function newGame(roster, net = null, myId = 0, speed = 1, level = 'saiyan') {
  // Desafío semanal: sus reglas cambian el guerrero, la velocidad, la vida, los jefes... (ver rule())
  const weekly = level === 'weekly' && WEEKLY ? { ...WEEKLY, rules: [...WEEKLY.rules] } : null;
  if (weekly && weekly.char) roster = roster.map(r => ({ ...r, charId: weekly.char }));
  if (weekly) roster = roster.map(r => ({ ...r, perks: maxPerks() }));   // todos parejos: la tienda al máximo
  if (weekly && weekly.rules.includes('fast')) speed = FAST_SPEED;
  G = {
    t: 0, mode: 'play', net, menuOpen: false, speed: speed > 1 ? FAST_SPEED : 1,
    players: roster.map((r, i) => {
      const p = makePlayer(r.id, r.name, r.charId, r.perks);
      [p.x, p.y] = START_OFFSETS[i % START_OFFSETS.length];
      return p;
    }),
    enemies: [], projs: [], beams: [], ebeams: [], zones: [], blind: 0, decoys: [], helpers: [], novas: [], shots: [], hazards: [], lanes: [], pickups: [], fx: [], texts: [],
    level: 1, xp: 0, xpNext: 6, pendingLevels: 0, pendingWishes: 0, round: null, roundSeq: 0,
    kills: 0, dragonBalls: 0, ballsNeeded: 7, spawnAcc: 0, nextElite: 45, nextSwarm: 75, bossIdx: 0, nid: 1,
    banner: null, shake: 0, victoryAt: 0, out: [], emitted: {}, lv: levelDef(level), weekly,
  };
  G.bosses = bossSchedule(G.lv, weekly);
  G.practice = !!weekly && !useWeeklyTry();   // sin intentos hoy: partida de práctica (no entra al ranking)
  G.ballsNeeded = baseBalls();
  if (rule('glass')) for (const P of G.players) { P.maxHp = Math.max(1, Math.round(P.maxHp / 2)); P.hp = P.maxHp; }
  G.me = G.players.find(p => p.id === myId) || G.players[0];
  setTheme(G.lv.theme, true);   // mapa del nivel
  for (const k in mapCaches) delete mapCaches[k];
  // Seguimiento de logros de esta partida (desde el punto de vista de tu guerrero)
  G.ach = { elite: 0, transforms: 0, shenlong: 0, wishRound: 0, senzu: false, everTrans: false, prevTrans: 0, prevHp: G.me.hp, lastHurt: 0 };
  shownRound = 0;
  document.body.classList.add('playing');
  document.body.classList.remove('snake-run');   // (la pone snakeInit: sin mapa en el Camino de la Serpiente)
  for (const id of ['menu', 'setup', 'gameover', 'levelup', 'pause', 'lobby', 'shop', 'credits', 'help', 'techs', 'achs', 'profile', 'rank', 'news']) $(id).classList.add('hidden');
  if (typeof Replays !== 'undefined') Replays.start();   // graba los últimos segundos (js/replays.js)
  $('btnQuit').textContent = t(net ? 'Salir de la sala' : 'Abandonar');
  $('btnResume').textContent = t(net ? 'Volver al juego' : 'Continuar');
  announce(G.players.length > 1 ? '¡Los guerreros Z entran en combate!' : '¡{name} entra en combate!', undefined, { name: G.me.c.name });
  if (G.practice) announce('Práctica: ya usaste los intentos de hoy, esta partida no entra al ranking', '#8fd8ff');
  if (G.lv.bonus) snakeInit();   // nivel bonus: el Camino de la Serpiente (js/bonus.js)
}
function startSolo() {
  // Si el desafío terminó mientras estabas en el menú, se vuelve a cargar antes de jugar
  if (myLevel() === 'weekly' && WEEKLY && Date.now() >= WEEKLY.endsAt) { loadWeekly().then(() => { buildMenu(); }); return; }
  newGame([{ id: 0, name: myName(), charId: myChar(), perks: myPerks() }], null, 0, SAVE.speed2 ? FAST_SPEED : 1, myLevel());
}

// "hidden": el compañero absorbido por la fusión (no se dibuja ni recibe daño)
const alivePlayers = () => G.players.filter(p => !p.dead && !p.gone && !p.hidden);
function nearestPlayer(x, y) {
  let best = null, bd = Infinity;
  for (const p of G.players) {
    if (p.dead || p.gone || p.hidden) continue;
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
// Dificultad extra por jugador en las partidas cooperativas
const coop = () => 1 + 0.6 * (G.players.filter(p => !p.gone && !p.ally).length - 1);
// Dirección del sprite según un vector: de frente, de espaldas o de perfil
const DIR_CODES = ['side', 'down', 'up'];
function dirFromVec(x, y) {
  if (Math.abs(y) > Math.abs(x) * 1.3) return y > 0 ? 'down' : 'up';
  return 'side';
}
// ¿Este jugador es el cuerpo de Gogeta ahora mismo? ¿Forma parte de Gogeta (cuerpo o compañero absorbido)?
const isFusedBody = P => !!(G.fusion && G.fusion.phase === 'fused' && G.fusion.driverId === P.id);
const isFused = P => !!(G.fusion && G.fusion.phase === 'fused' && G.fusion.ids.includes(P.id));
// Gogeta muy por encima del Super Saiyajin (×1.5 de daño y -20% de recarga): daño ×2.5, recarga -35%,
// velocidad ×1.35 y la mitad del daño recibido. Usa las técnicas y la vida de los dos.
const FUSION_POWER = { dmg: 2.5, cd: 0.65, speed: 1.35, def: 0.5 };

// ─── Estadísticas derivadas (por jugador) ────────────────────────────────────
function dmgMult(P) {
  if (!P) return 1;
  let m = (rule('glass') ? 2 : 1) * (1 + 0.12 * P.passives.power) * (1 + (P.c.dmgBonus || 0)) * (1 + perk(P, 'atk')) * (1 + (P.wishDmg || 0)) * (1 + (P.limitDmg || 0));
  if (P.halo) m *= 1 + ZENKAI;
  if (P.swapBody > 0) m *= SWAP_DMG;   // en el cuerpo de Ginyu
  if (P.kaioken > 0) m *= 1 + (P.kaiokenBoost || 0);   // Kaioken   // Zenkai: volvió de la Semilla de reserva más fuerte (la aureola ya viaja por la red)
  if (P.transformed > 0 && !P.c.buddy) m *= (1.5 + (P.c.transformBonus || 0)) * (1 + (P.transBoost || 0));   // + Ki concentrado (Mr. Satán no: pelea Buu)
  if (isFused(P)) m *= FUSION_POWER.dmg; // poder de Gogeta
  if (P.passives.fury) m *= 1 + furyBonus(P);   // Furia: más daño con poca vida
  return m;
}
// 2.31.4 (reporte de un jugador: era +5% por nivel y solo casi muerto, muy por debajo de Fuerza): +15% por nivel, que sube
// a medida que pierdes salud y llega al máximo con 30% o menos (a nivel 5, +75% herido contra el +60% fijo de Fuerza)
const FURY_PER_LVL = 0.15, FURY_FULL_AT = 0.3;
const furyBonus = P => FURY_PER_LVL * (P.passives.fury || 0) * Math.min(1, Math.max(0, 1 - P.hp / P.maxHp) / (1 - FURY_FULL_AT));
function cdMult(P) {
  let m = Math.max(0.4, 1 - 0.08 * P.passives.focus - (P.c.cdBonus || 0) - perk(P, 'cd'));
  if (P.transformed > 0) m *= 0.8;
  if (isFused(P)) m *= FUSION_POWER.cd;
  return m;
}
function playerSpeed(P) {
  const boost = isFusedBody(P) ? FUSION_POWER.speed : P.transformed > 0 ? 1.2 : 1;
  const flee = P.c.flee && P.hp < P.maxHp * 0.3 ? 1.4 : 1;   // Mr. Satán: "retirada estratégica"
  const snake = G && G.snake ? (G.snake.mode === 'race' ? SNAKE_RACE_SPEED : 1) * (P.boost > 0 ? KINTON_BOOST : 1) : 1;   // Carrera y nube Kinton
  return P.c.speed * (1 + 0.08 * P.passives.speed + perk(P, 'spd')) * boost * snake * flee * (P.kaioken > 0 ? 1 + (P.kaiokenBoost || 0) * 0.5 : 1);
}
function magnetRange(P) { return (55 + 28 * P.passives.sense) * (1 + perk(P, 'magnet')); }

// ─── Efectos (el anfitrión también los reenvía a los clientes) ───────────────
function emit(ev) { if (G.net && G.net.role === 'host') G.out.push(ev); }
function sfx(name, gap = 0.04) {
  SFX.play(name, gap);
  const now = G.t, last = G.emitted[name];
  if (last !== undefined && now - last < Math.max(gap, 0.08)) return;
  G.emitted[name] = now;
  emit(['s', name, gap]);
}
// text: plantilla en español (se traduce al dibujarla, ver t()); params: sus datos
function announce(text, color = '#ffd93b', params = null) { G.banner = { text, color, t: 2.6, params }; }
function addText(x, y, text, color = '#fff', big = false, params = null) {
  localText(x, y, text, color, big, params);
  emit(['t', Math.round(x), Math.round(y), text, color, big === 2 ? 2 : big ? 1 : 0, params]);
}
function localText(x, y, text, color, big, params = null) {
  if (G.texts.length > 90) G.texts.shift();
  G.texts.push({ x: x + rand(-4, 4), y, text, color, big, params, t: 0.7 });
}
// ─── Efectos de técnicas: assets/sprites/sfx.png (tools/build-sfx.ps1, de Legacy of Goku II) ───
// Cada fila es una animación de cuadros de 32x32; la fila SFX_BEAM_ROW guarda los tramos de los rayos
const SFX_IMG = new Image();
SFX_IMG.src = 'assets/sprites/sfx.png';
const SFX_ANIMS = {
  impact:    { row: 0, count: 6, dur: 0.3 },              // destello al golpear
  explosion: { row: 1, count: 3, dur: 0.5 },              // explosión de fuego
  shock:     { row: 2, count: 3, dur: 0.4, flat: true },  // onda expansiva amarilla
  wring:     { row: 3, count: 3, dur: 0.45, flat: true }, // anillo blanco
  sphere:    { row: 4, count: 4 },                        // esfera de energía (Genkidama, Big Bang)
};
const SFX_BEAM_ROW = 5;
const sfxReady = () => SFX_IMG.complete && SFX_IMG.naturalWidth > 0;
function localAnim(name, x, y, s = 1) {
  const A = SFX_ANIMS[name];
  if (!A || G.fx.length > 450) return;
  G.fx.push({ type: 'anim', name, x, y, s, t: A.dur, dur: A.dur });
}
// En online el anfitrión avisa a los demás para que vean el mismo efecto
function playAnim(name, x, y, s = 1) {
  localAnim(name, x, y, s);
  emit(['x', name, Math.round(x), Math.round(y), Math.round(s * 100) / 100]);
}
function drawAnimFx(c, f) {
  const A = SFX_ANIMS[f.name];
  const fr = Math.min(A.count - 1, Math.floor((1 - f.t / f.dur) * A.count));
  const w = 32 * f.s, h = w * (A.flat ? 0.8 : 1);   // los anillos se aplastan como el resto del suelo
  c.globalAlpha = A.flat ? Math.min(1, f.t / f.dur * 2) : 1;
  c.drawImage(SFX_IMG, fr * 32, A.row * 32, 32, 32, Math.round(f.x - w / 2), Math.round(f.y - h / 2), Math.round(w), Math.round(h));
  c.globalAlpha = 1;
}
// Tramo violeta (Galick Ho): la hoja no lo trae, se arma con el azul cambiando rojo por verde
let PURPLE_BEAM = null;
function purpleBeam() {
  if (PURPLE_BEAM) return PURPLE_BEAM;
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 8;
  const c = cv.getContext('2d');
  c.drawImage(SFX_IMG, 0, SFX_BEAM_ROW * 32 + 12, 32, 8, 0, 0, 32, 8);
  const img = c.getImageData(0, 0, 32, 8), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const r = d[i]; d[i] = d[i + 1]; d[i + 1] = r; }
  c.putImageData(img, 0, 0);
  return PURPLE_BEAM = cv;
}
// Familia de color de una técnica: 0 azul, 1 dorado, 2 fuego, 3 violeta
function beamKind(color) {
  const n = parseInt(String(color).slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return b > r + 20 ? (r > g + 40 ? 3 : 0) : r > 200 && g < 150 ? 2 : 1;
}
// Tramo de rayo según el color de la técnica → [imagen, x, y]
function beamTile(color) {
  const k = beamKind(color);
  return k === 3 ? [purpleBeam(), 0, 0] : [SFX_IMG, k * 32, SFX_BEAM_ROW * 32 + 12];
}
function burst(x, y, color, n = 8, speed = 3, size = 3) {
  localBurst(x, y, color, n, speed, size);
  emit(['b', Math.round(x), Math.round(y), color, n, speed, size]);
}
function localBurst(x, y, color, n, speed, size) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = rand(0.4, 1) * speed;
    G.fx.push({ type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: rand(0.3, 0.6), color, size });
  }
  if (G.fx.length > 500) G.fx.splice(0, G.fx.length - 500);
}
function ring(x, y, r, dur, color) {
  G.fx.push({ type: 'ring', x, y, r, t: dur, dur, color });
  emit(['r', Math.round(x), Math.round(y), Math.round(r), dur, color]);
}

// ─── Transformación ──────────────────────────────────────────────────────────
// El botón de Ki transforma, pide la fusión o (fusionado) lanza el Big Bang Kamehameha.
function requestTransform() {
  if (!G || !G.me || G.mode !== 'play') return;
  const ang = aimAngle();
  if (isAuthority()) handleKi(G.me, ang);
  else Net.send({ t: 'tr', a: Math.round(ang * 1000) / 1000 });
}
// Apuntado manual de las técnicas (opción del menú): con el stick derecho del mando; en PC hacia el mouse;
// en el celular (o si no se usa ninguno hace rato), hacia donde te moviste por última vez. null = automático
const padAiming = () => performance.now() - pad.aimT < 1500 && pad.aimT > mouse.t;
function manualAim() {
  if (!SAVE.aim || !G || !G.me) return null;
  const V = viewer();
  if (padAiming()) return pad.aim;
  if (!isTouch() && performance.now() - mouse.t < 30000) {
    const [wx, wy] = toWorld(mouse.x, mouse.y);
    return Math.atan2(wy - (V.y - 4), wx - V.x);
  }
  return Math.atan2(G.me.dirY, G.me.dirX);
}
// Dirección de apuntado: el mouse si se movió hace poco; si no, el enemigo más cercano
function aimAngle() {
  const V = viewer();
  if (padAiming()) return pad.aim;   // stick derecho del mando
  if (performance.now() - mouse.t < 4000) {
    const [wx, wy] = toWorld(mouse.x, mouse.y);
    return Math.atan2(wy - (V.y - 4), wx - V.x);
  }
  const e = nearestEnemy(V, 600);
  return e ? Math.atan2(e.y - V.y, e.x - V.x) : (V.facing < 0 ? Math.PI : 0);
}
function handleKi(P, ang) {
  if (!P || P.dead || P.gone || G.mode !== 'play' || rule('notrans')) return;
  const F = G.fusion;
  if (F && F.ids.includes(P.id)) { // fusionado: lanza el Big Bang quien controla las técnicas
    if (F.phase === 'fused' && (P.id === F.gunnerId || !G.net)) bigBang(F, ang);
    return;
  }
  const partner = fusionPartner(P);
  if (partner && !F) {
    if (partner.fuseReq && G.t - partner.fuseReq < FUSION_WINDOW) { startFusion(P, partner); return; }
    if (!P.fuseReq || G.t - P.fuseReq >= FUSION_WINDOW) {
      P.fuseReq = G.t;
      announce('¡{name} quiere hacer la fusión! {partner}: pulsa Ki', '#ffe14d', { name: P.name, partner: partner.name });
      sfx('ball');
    }
    return;
  }
  doTransform(P);
}

// ─── Fusión (Goku + Vegeta = Gogeta) ─────────────────────────────────────────
const FUSION_WINDOW = 3;      // segundos para que el compañero responda
const FUSION_TIME = 30, FUSION_TIME_WISH = 40, DANCE_TIME = 1.4, BIGBANG_CD = 4;
const FUSION_PAIR = { goku: 'vegeta', vegeta: 'goku' };
const BIGBANG_LOOK = { color: '#8fe3ff', core: '#ffffff' };
const GOGETA = {
  name: 'Gogeta', aura: '#ffe14d',
  look: { id: 'gogeta', style: 'goku', hair: '#16161c', ssjHair: '#ffd93b', skin: '#f7c9a0', top: '#1c1c2e', shirt: '#f2f2f2',
    pants: '#f2f2f2', belt: '#2546c9', boots: '#e8e8e8', wrist: '#ff7b1c' },
};
const canFuse = P => !!P && !P.dead && !P.gone && !P.hidden && FUSION_PAIR[P.charId] && P.ki >= 100 && P.transformed <= 0;
function fusionPartner(P) {
  if (!canFuse(P)) return null;
  return G.players.find(Q => Q !== P && canFuse(Q) && Q.charId === FUSION_PAIR[P.charId] && Math.hypot(Q.x - P.x, Q.y - P.y) < 80) || null;
}
// driverId: quién mueve a Gogeta (al azar en online; en el deseo, siempre el jugador)
function startFusion(a, b, dur = FUSION_TIME, driverId = null) {
  const driver = driverId !== null ? G.players.find(p => p.id === driverId) : (Math.random() < 0.5 ? a : b);
  const gunner = driver === a ? b : a;
  G.fusion = {
    ids: [a.id, b.id], driverId: driver.id, gunnerId: gunner.id, phase: 'dance', t: DANCE_TIME, dur, bbCd: 0,
    mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
    saved: { [a.id]: a.maxHp, [b.id]: b.maxHp },
  };
  for (const P of [a, b]) { P.fuseReq = 0; P.ki = 0; P.kiHold = 0; P.transformed = 0; P.inv = 99; }
  announce('¡Fu... sión... HA!', '#ffe14d');
  sfx('power');
}
function updateFusion(dt) {
  const F = G.fusion;
  if (!F) return;
  const [a, b] = F.ids.map(id => G.players.find(p => p.id === id));
  const driver = G.players.find(p => p.id === F.driverId), gunner = G.players.find(p => p.id === F.gunnerId);
  if (!a || !b || a.gone || b.gone) { endFusion(); return; }
  F.t -= dt;
  if (F.phase === 'dance') {
    // Se acercan al punto medio haciendo la danza
    for (const P of [a, b]) {
      P.x += (F.mx + (P === a ? -10 : 10) * Math.max(0, F.t / DANCE_TIME) - P.x) * Math.min(1, dt * 6);
      P.y += (F.my - P.y) * Math.min(1, dt * 6);
      P.facing = P.x < F.mx ? 1 : -1; P.dir = 'side';
      P.inv = 99;
    }
    if (Math.random() < 0.6) G.fx.push({ type: 'spark', x: F.mx + rand(-14, 14), y: F.my + rand(-20, 10), vx: 0, vy: -rand(1, 3), t: 0.5, color: '#ffffff', size: 3 });
    if (F.t <= 0) { // ¡Gogeta!
      F.phase = 'fused'; F.t = F.dur;
      driver.x = F.mx; driver.y = F.my; driver.tx = undefined;
      driver.maxHp = a.maxHp + b.maxHp; driver.hp = a.hp + b.hp;
      gunner.hidden = true;
      driver.inv = 1.5; gunner.inv = 0;
      G.shake = Math.max(G.shake, 0.9);
      burst(F.mx, F.my, '#ffffff', 50, 7, 4);
      ring(F.mx, F.my, 120, 0.6, '#ffe14d');
      G.novas.push({ x: F.mx, y: F.my, r: 0, maxR: 200, dmg: 60, hit: new Set(), color: '#ffe14d', kb: 22, owner: driver, aid: 'ki' });
      announce('¡GOGETA!', '#ffe14d');
      sfx('boom');
    }
    return;
  }
  // Fusionados: el compañero viaja dentro de Gogeta
  F.bbCd -= dt;
  gunner.x = driver.x; gunner.y = driver.y; gunner.facing = driver.facing; gunner.moving = driver.moving; gunner.dir = driver.dir;
  if (Math.random() < 0.5) G.fx.push({ type: 'spark', x: driver.x + rand(-10, 10), y: driver.y + rand(-5, 12), vx: 0, vy: -rand(1, 2.5), t: 0.4, color: '#ffe14d', size: 2 });
  if (driver.dead || F.t <= 0) endFusion();
}
function endFusion() {
  const F = G.fusion;
  if (!F) return;
  G.fusion = null;
  const driver = G.players.find(p => p.id === F.driverId), gunner = G.players.find(p => p.id === F.gunnerId);
  if (!driver || !gunner) return;
  const ratio = driver.dead ? 0 : Math.max(0, Math.min(1, driver.hp / driver.maxHp));
  for (const P of [driver, gunner]) {
    P.maxHp = F.saved[P.id];
    P.hp = Math.max(ratio ? 1 : 0, Math.round(P.maxHp * ratio));
    P.hidden = false;
    P.inv = 1.5;
    if (!ratio) { P.dead = true; P.hp = 0; }
  }
  if (F.phase === 'fused') { gunner.x = driver.x + 22; gunner.y = driver.y; }
  if (gunner.ally) gunner.gone = true;   // el aliado del deseo se retira
  burst(driver.x, driver.y, '#ffffff', 20, 4, 3);
  if (ratio) announce('La fusión ha terminado', '#cccccc');
}
// Big Bang Kamehameha: lo lanza quien controla las técnicas, desde Gogeta
function bigBang(F, ang) {
  if (F.bbCd > 0) return;
  const driver = G.players.find(p => p.id === F.driverId);
  if (!driver || !isFinite(ang)) return;
  F.bbCd = BIGBANG_CD;
  const shooter = G.players.find(p => p.id === F.gunnerId);
  G.beams.push({ ang, len: 520, width: 60, dmg: 45 + G.level * 4, t: 1.2, dur: 1.2, tick: 0, ...BIGBANG_LOOK, aid: 'bigbang',
    owner: driver, credit: G.net ? shooter : driver });
  driver.castT = 1.2;
  if (Math.abs(Math.cos(ang)) > 0.2) driver.facing = Math.sign(Math.cos(ang));
  if (!driver.moving) driver.dir = dirFromVec(Math.cos(ang), Math.sin(ang));
  G.shake = Math.max(G.shake, 0.4);
  sfx('beam', 0.1);
  announce('¡Big Bang Kamehameha!', '#8fe3ff');
}
// Cámara: si estás dentro de Gogeta, sigues a Gogeta
function viewer() {
  const M = G.me;
  if (M && M.hidden && G.fusion) return G.players.find(p => p.id === G.fusion.driverId) || M;
  return M;
}
// Ki concentrado (2.13.0): con el Ki lleno y sin transformarte, se va concentrando. A los 20 segundos la
// próxima transformación dura un 50% más y pega un 25% más (a mitad de camino, la mitad de eso).
const KI_FOCUS_TIME = 20, KI_FOCUS_DUR = 0.5, KI_FOCUS_DMG = 0.25;
const kiFocus = P => Math.min(1, (P.kiHold || 0) / KI_FOCUS_TIME);
function doTransform(P, secs = 20, force = false) {
  if (!P || P.dead || P.gone) return;
  if (!force && (P.ki < 100 || P.transformed > 0)) return;
  const focus = force ? 0 : kiFocus(P);
  P.ki = 0; P.kiHold = 0;
  if (P.c.buddy) {   // Mr. Satán no se transforma: llama a su amigo Majin Buu, que pelea por él
    P.transformed = (force ? secs : BUDDY_TIME) * (1 + KI_FOCUS_DUR * focus);   // (el deseo de Ki infinito: Buu se queda los 60 segundos)
    G.helpers.push({ x: P.x + 34, y: P.y, t: P.transformed, owner: P, cd: 0.5, facing: -1, punch: 0 });
    announce(G.players.length > 1 ? '¡{name}: ¡Amigo Buu!' : '¡Amigo Buu! ¡Ayúdame!', '#ff9bd6', { name: P.name });
    burst(P.x + 34, P.y, '#ff9bd6', 30, 5, 3); sfx('power');
    return;
  }
  P.transformed = secs * (1 + (P.c.transformTime || 0)) * (1 + KI_FOCUS_DUR * focus);   // Trunks: dura un 50% más
  P.transBoost = KI_FOCUS_DMG * focus;
  G.shake = Math.max(G.shake, focus >= 1 ? 0.8 : 0.5);
  sfx('power');
  if (focus >= 1) announce(G.players.length > 1 ? '¡{name}: {form} concentrado!' : '¡{form} concentrado!', P.c.aura, { name: P.name, form: P.c.transform });
  else announce(G.players.length > 1 ? '¡{name}: {form}!' : '¡{form}!', P.c.aura, { name: P.name, form: P.c.transform });
  burst(P.x, P.y, P.c.aura, 40, 6, 4);
  // 2.13.0: la onda pega menos (era 40 de daño y 160 de radio); despeja alrededor, no limpia la pantalla
  // y no les hace nada a los jefes: la transformación es para la horda
  G.novas.push({ x: P.x, y: P.y, r: 0, maxR: 130, dmg: 22, hit: new Set(), color: P.c.aura, kb: 18, owner: P, aid: 'ki', noBoss: true });
}

// ─── Aparición de enemigos ───────────────────────────────────────────────────
// Cada nivel multiplica la vida y el daño de sus enemigos (G.lv.hp, G.lv.dmg)
// Nivel 5: desde el minuto KAIO.from los enemigos se endurecen más rápido (k: segundos para sumar otro ×1).
// 2.33.0: partidas más cortas (los mejores duraban 50-60 minutos; la idea es ~30-35). Antes: experiencia ×1,16 por
// nivel, desde el minuto 15, k 240 / 420 / 1200. Con un bot inmortal, la presión del minuto 32-34 (daño recibido por
// minuto y jefes apilados) quedó igual a la que había en el 50-52, y se sube de nivel más rápido (nivel 40 en el 11, antes en el 16)
const KAIO = { xpGrow: 1.12, from: 480, hpK: 94, dmgK: 166, bossK: 420 };
const lateRamp = k => G.lv.infinite ? 1 + Math.max(0, G.t - KAIO.from) / k : 1;
function hpScale() { return (1 + G.t / 110) * coop() * G.lv.hp * lateRamp(KAIO.hpK); }
// Vida de un jefe al aparecer: en el Nivel 5 también se acelera, más suave que la horda, para que los jefes sigan
// siendo jefes sin apilarse demasiado pronto
const bossHp = b => b.hp * coop() * (rule('bossHp') ? 2 : 1) * lateRamp(KAIO.bossK);
// Tope de los élites: nunca más del 75% de la vida de un jefe de ese momento. Antes los élites de los enemigos
// más resistentes superaban a los jefes, y en el Nivel 5 cualquier élite los alcanzaba (2.23.4). La referencia:
//   niveles normales: el último jefe que apareció (o el primero, si todavía no salió ninguno)
//   Nivel 5: el jefe promedio de la vuelta actual (cada vuelta empieza con jefes débiles, como Raditz)
const ELITE_CAP = 0.75;   // (0,75: siempre por debajo del jefe, sin achicar de más a los élites de los primeros minutos)
function eliteCap() {
  let ref;
  if (G.lv.infinite) {
    const r = kaioRound() - 1, hps = G.lv.bosses.filter(b => b.round === r).map(b => b.hp).sort((x, y) => x - y);
    ref = hps.length ? { hp: hps[Math.floor(hps.length / 2)] } : null;
  } else ref = levelBoss(G.bossIdx - 1) || levelBoss(G.bossIdx);
  return ref ? bossHp(ref) * ELITE_CAP : Infinity;
}
function dmgScale() { return (1 + G.t / 320) * G.lv.dmg * lateRamp(KAIO.dmgK); }
// Vuelta de jefes del Nivel 5 en la que va la partida (la del último jefe que ya apareció)
function kaioRound() {
  let r = 0;
  for (const b of G.lv.bosses) { if (b.at > G.t) break; r = b.round; }
  return r + 1;
}
// Jefe número i del nivel: la ficha del jefe con el minuto, la vida y si es el final según el nivel
// ¿La partida es del desafío semanal y tiene esta regla?
const rule = r => !!(G && G.weekly && G.weekly.rules.includes(r));
const baseBalls = () => rule('balls4') ? 4 : 7;
// Jefes del nivel con sus minutos; con «Jefes en pareja» cada jefe llega junto con el siguiente (el final, solo)
function bossSchedule(lv, weekly) {
  const list = lv.bosses.map(b => ({ ...b }));
  if (weekly && weekly.rules.includes('bossPairs')) {
    const normal = list.filter(b => !b.final);
    for (let i = 0; i + 1 < normal.length; i += 2) normal[i + 1].at = normal[i].at;
    list.sort((a, b) => a.at - b.at);
  }
  return list;
}
function levelBoss(i) {
  const e = (G.bosses || G.lv.bosses)[i];
  return e ? { ...bossDef(e.id), at: e.at, hp: e.hp, final: !!e.final, saga: e.saga, round: e.round, sagaStart: !!e.sagaStart } : null;
}

function spawnPos(extra = 40, around = null) {
  if (G && G.snake) return snakeSpawnPos();   // Camino de la Serpiente: sobre el camino, adelante o atrás
  const P = around || pick(alivePlayers()) || G.players[0], R = Math.hypot(BW, BH) / 2 + extra;
  let x, y;
  for (let i = 0; i < 12; i++) {   // en el Planeta de Kaio-sama, nunca sobre las nubes
    const a = Math.random() * Math.PI * 2;
    x = P.x + Math.cos(a) * R; y = P.y + Math.sin(a) * R;
    if (!footBlocked(x, y)) return { x, y };
  }
  [x, y] = walkableSpot(x, y);   // todo el anillo cae en nubes (el planeta del inicio): el borde más cercano
  return { x, y };
}
// ¿Los pies de un enemigo en (x, y) pisan terreno prohibido? (THEME.blocked: las nubes del Planeta de Kaio-sama)
const footBlocked = (x, y, s = 1) => !!THEME.blocked && THEME.blocked(x, y + 10 * s);
// Si un movimiento lo metió en las nubes, se desliza por el borde o vuelve a donde estaba.
// (Si ya estaba adentro, lo deja salir: nunca queda trabado.)
// Devuelve true si lo tuvo que frenar.
function keepOnGround(e, ox, oy) {
  if (!THEME.blocked || !footBlocked(e.x, e.y, e.scale) || footBlocked(ox, oy, e.scale)) return false;
  if (!footBlocked(e.x, oy, e.scale)) e.y = oy;
  else if (!footBlocked(ox, e.y, e.scale)) e.x = ox;
  else { e.x = ox; e.y = oy; }
  return true;
}
function pickEnemyType() {
  const avail = G.lv.spawns.filter(s => G.t >= s.from && !(G.t >= s.to));
  let total = avail.reduce((a, s) => a + s.weight, 0), r = Math.random() * total;
  for (const s of avail) { if ((r -= s.weight) <= 0) return s.id; }
  return avail[0].id;
}
// Esferas en juego (2.32.2): nunca más de las que faltan para el deseo, sumando las juntadas, las del suelo y las que
// llevan los élites y jefes vivos. Si ya están todas, el élite o el jefe que llega no trae esfera (suelta otra cosa)
const ballsInPlay = () => G.dragonBalls + G.pickups.filter(p => p.kind === 'ball' && !p.dead).length + G.enemies.filter(e => e.ball && !e.dead).length;
const canCarryBall = () => ballsInPlay() < ballsNeeded();
function spawnEnemy(id, opts = {}) {
  let pos = opts.pos || spawnPos();
  if (opts.pos && footBlocked(pos.x, pos.y)) { const [x, y] = walkableSpot(pos.x, pos.y); pos = { x, y }; }   // la horda en círculo: nunca sobre las nubes
  const def = ENEMIES[id];
  // Élite (2.13.0: un poco más fuerte): 12 veces la vida (era 10), +30% de daño y +10% de velocidad
  const elite = !!opts.elite, hp = Math.min(def.hp * hpScale() * (elite ? 12 : 1) * (rule('horde') ? 0.6 : 1), elite ? eliteCap() : Infinity);
  G.enemies.push({
    nid: G.nid++, def, id, x: pos.x, y: pos.y, hp, maxHp: hp, r: def.r * (elite ? 1.4 : 1), speed: def.speed * rand(0.9, 1.1) * (rule('speedy') ? 1.5 : 1) * (elite ? 1.1 : 1),
    dmg: def.dmg * (elite ? 1.3 : 1), xp: def.xp * (elite ? 8 : 1), scale: def.scale * (elite ? 1.4 : 1), elite, ball: elite && canCarryBall(),
    cd: rand(1.5, 3.5), flash: 0, facing: 1, orbHit: 0, phase: Math.random() * 10,
    shooter: !!def.shooter && Math.random() < (def.shootChance ?? SHOOTER_CHANCE),   // solo algunos disparan
  });
}
// quiet: sin cartel (lo pone spawnBosses, uno solo para todo el grupo)
function spawnBoss(b, quiet = false) {
  const pos = spawnPos(10), hp = bossHp(b);
  G.enemies.push({
    nid: G.nid++, def: b, id: b.id, boss: true, spawnT: G.t, final: !!b.final, ball: !b.final && canCarryBall(), x: pos.x, y: pos.y, hp, maxHp: hp, r: b.r,
    speed: b.speed, dmg: b.dmg, xp: 60, scale: b.scale, cd: 2.5, pi: 0, dash: 0, flash: 0, facing: 1, orbHit: 0,
    phase: 0,
  });
  G.shake = 0.6;
  sfx('boss');
  if (!quiet) announce('¡{name} ha llegado!', '#ff5c5c', { name: b.name });
}
function updateSpawning(dt) {
  if (G.testNoSpawn) {   // modo prueba: sin enemigos comunes, élites ni hordas (los jefes, sí)
    G.spawnAcc = 0; G.nextElite = Math.max(G.nextElite, G.t + 1); G.nextSwarm = Math.max(G.nextSwarm, G.t + 1);
  }
  const rate = (0.9 + G.t / 18) * (1 + 0.35 * (G.players.filter(p => !p.gone && !p.ally).length - 1)) * (rule('horde') ? 2 : 1);
  G.spawnAcc += rate * dt;
  while (G.spawnAcc >= 1) {
    G.spawnAcc--;
    if (G.enemies.length < 320) spawnEnemy(pickEnemyType());
  }
  if (G.t >= G.nextElite) {
    G.nextElite += 45;
    spawnEnemy(pickEnemyType(), { elite: true });
    announce(G.enemies[G.enemies.length - 1].ball ? '¡Un enemigo de élite lleva una Esfera del Dragón!' : '¡Llegó un enemigo de élite!', '#ffb81c');
  }
  if (G.t >= G.nextSwarm) { // un círculo de enemigos del nivel que se cierra sobre un jugador
    G.nextSwarm += 75;
    const P = pick(alivePlayers()), n = 18 + Math.floor(G.t / 30);
    if (P) {
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, R = Math.hypot(BW, BH) / 2 + 20;
        spawnEnemy(G.lv.swarm, { pos: { x: P.x + Math.cos(a) * R, y: P.y + Math.sin(a) * R } });
      }
      announce(G.lv.swarmTextEs || G.lv.swarmText, '#7dff6a');   // en español: cada jugador lo traduce
    }
  }
  // Los jefes que tocan en el mismo momento salen juntos y con un solo aviso
  const group = [];
  for (let b = levelBoss(G.bossIdx); b && G.t >= b.at; b = levelBoss(G.bossIdx)) { G.bossIdx++; group.push(b); }
  if (group.length) spawnBosses(group);
}
function spawnBosses(group) {
  for (const b of group) spawnBoss(b, true);
  // Nivel 5: al empezar cada saga, el aviso es de la saga (y de la vuelta, desde la segunda)
  if (group[0].sagaStart) {
    const saga = KAIO_SAGAS[group[0].saga], round = group[0].round + 1;
    return round > 1 ? announce('¡Vuelta {n}: vuelve la saga {saga}!', '#ff5c5c', { n: round, saga })
      : announce('¡Vuelve la saga {saga}!', '#ff5c5c', { saga });
  }
  if (group.length === 1) return announce('¡{name} ha llegado!', '#ff5c5c', { name: group[0].name });
  // Los nombres van sueltos para que cada jugador los vea en su idioma (a, b, c → "{a}, {b} y {c}")
  const params = { n: group.length }, keys = group.map((b, i) => { params['b' + i] = b.name; return `{b${i}}`; });
  announce(`¡{n} jefes a la vez: ${keys.slice(0, -1).join(', ')} y ${keys[keys.length - 1]}!`, '#ff5c5c', params);
}

// ─── Daño ────────────────────────────────────────────────────────────────────
// aid: técnica que causó el daño (para las estadísticas de la pantalla de pausa)
const DMG_STEP = 15;   // el daño se anota en tramos de 15 s (gráfico del final)
// Daño hecho por técnica (estadísticas de la pausa y del final, y el gráfico del final)
function creditDmg(owner, aid, got) {
  owner.stats.dmg[aid] = (owner.stats.dmg[aid] || 0) + got;
  const line = owner.stats.dmgLine || (owner.stats.dmgLine = []), b = Math.floor(G.t / DMG_STEP);
  line[b] = (line[b] || 0) + got;
}
function damageEnemy(e, amount, src, kb, owner, aid) {
  if (e.dead) return;
  if (e.shield > 0) { if (Math.random() < 0.15) burst(e.x, e.y - 8, '#7fe6ff', 3, 2, 2); return; }   // Barrera del Androide 17
  const crit = Math.random() < 0.08 + 0.04 * ((owner && owner.passives && owner.passives.crit) || 0);   // Golpe certero
  const boss = (e.boss && owner ? 1 + (owner.c.bossBonus || 0) : 1)   // Trunks del Futuro: más daño a los jefes
    * ((e.boss || e.elite) && owner && owner.passives ? 1 + 0.25 * (owner.passives.tracker || 0) : 1);   // Rastreador
  const d = Math.max(1, Math.round(amount * dmgMult(owner) * boss * (crit ? 2 : 1)));
  if (owner && aid) creditDmg(owner, aid, Math.min(d, Math.max(0, e.hp)));
  e.hp -= d;
  e.flash = 0.08;
  addText(e.x, e.y - e.r * 1.6, crit ? d + '!' : d, crit ? '#ffdd33' : '#ffffff', crit ? 2 : false);   // crítico: más grande
  if (crit || Math.random() < (e.boss ? 0.3 : 0.12)) playAnim('impact', e.x + rand(-4, 4), e.y - e.r * 0.8, crit ? 1 : 0.7);
  sfx('hit', 0.05);
  if (src) {
    const dx = e.x - src.x, dy = e.y - src.y, l = Math.hypot(dx, dy) || 1, k = e.boss ? kb * 0.08 : kb;
    const ox = e.x, oy = e.y;
    e.x += dx / l * k; e.y += dy / l * k;
    keepOnGround(e, ox, oy);   // el empujón no los tira a las nubes
  }
  if (e.hp <= 0) killEnemy(e, owner);
}
function killEnemy(e, owner) {
  e.dead = true;
  G.kills++;
  // Cíborg: al morir suelta un anillo de disparos (cuidado con matarlo pegado)
  if (e.def.deathRing && !e.vanish) for (let i = 0; i < e.def.deathRing; i++) enemyShot(e, i / e.def.deathRing * Math.PI * 2, 2.4, 6, 0);
  if (owner) { owner.stats.kills++; if (e.elite) achEvent(owner, 'elite'); }
  if (owner && owner.transformed <= 0) owner.ki = Math.min(100, owner.ki + (e.boss ? 50 : e.elite ? 15 : 1) * (1 + (owner.c.kiBonus || 0)) * (1 + 0.15 * (owner.passives.kictl || 0)));
  if (owner && owner.passives.absorb && !owner.dead && Math.random() < 0.03 * owner.passives.absorb) healPlayer(owner, 1 + Math.floor(owner.maxHp * 0.005));   // Absorción
  const luck = 1 + luckPct(owner && owner.passives.luck) / 100;   // Suerte de Mr. Satán
  burst(e.x, e.y, e.boss ? '#ffd93b' : '#ffffff', e.boss ? 40 : 6, e.boss ? 6 : 2.5);
  if (e.boss) { playAnim('explosion', e.x, e.y - 10, 3); playAnim('wring', e.x, e.y, 3.5); }
  else if (e.elite || e.xp >= 8) playAnim('explosion', e.x, e.y - 6, e.elite ? 2 : 1.4);
  const [sx, sy] = walkableSpot(e.x, e.y);
  // Experiencia: orbes pequeños o grandes según el valor
  let xp = e.xp;
  while (xp > 0) {
    const v = xp >= 10 ? 10 : xp >= 3 ? 3 : 1;
    xp -= v;
    G.pickups.push({ kind: 'xp', v, x: sx + rand(-8, 8) * (e.boss ? 3 : 1), y: sy + rand(-8, 8) * (e.boss ? 3 : 1), pulled: false, sp: 0 });
  }
  if (!rule('nosenzu') && Math.random() < SENZU_DROP * luck) G.pickups.push({ kind: 'senzu', x: sx, y: sy, pulled: false, sp: 0 });
  // Cápsula de Bulma: rara (más probable en los de élite) y nunca dos en el suelo a la vez
  if (Math.random() < (e.elite ? 0.35 : CAPSULE_DROP * luck) && !G.pickups.some(p => p.kind === 'capsule')) G.pickups.push({ kind: 'capsule', x: sx, y: sy, pulled: false, sp: 0 });
  if (e.ball) G.pickups.push({ kind: 'ball', x: sx, y: sy, pulled: false, sp: 0 });
  else if (e.elite || (e.boss && !e.final)) {   // sin esfera (ya están todas en juego): una Semilla del Ermitaño, o una Cápsula de Bulma
    const kind = rule('nosenzu') || G.pickups.some(p => p.kind === 'senzu') ? 'capsule' : 'senzu';
    if (kind === 'senzu' || !G.pickups.some(p => p.kind === 'capsule')) G.pickups.push({ kind, x: sx + 10, y: sy, pulled: false, sp: 0 });
  }
  if (e.boss) {
    for (const Q of G.players) {   // Mr. Satán cerca: "¡Lo vencí yo!" (y cobra)
      if (!Q.c.credit || Q.dead || Q.gone || Math.hypot(Q.x - e.x, Q.y - e.y) > 400) continue;
      Q.bonusZeni += 150;
      addText(Q.x, Q.y - 34, '¡Lo vencí yo!', '#ffd93b', true);
    }
    G.shake = 0.8;
    G.hitStop = 0.14; G.slowmo = 0.7; G.flashT = 0.45;   // el golpe final se siente (ver step y drawOverlays)
    sfx('boom');
    announce('¡{name} ha sido derrotado!', undefined, { name: e.def.name });
    const secs = Math.round(G.t - (e.spawnT || 0));   // cuánto duró en pie (logro de Freezer)
    emit(['k', e.id, secs]);
    bossDefeated(e.id, secs);
    if (e.final) G.victoryAt = G.t;   // la partida termina en este mismo cuadro
  }
}
function hurtPlayer(P, amount, kind) {
  if (G.testGod) return;   // modo prueba: inmortal
  if (P.koT > 0) return;   // cayendo con la Semilla de reserva
  if (P.inv > 0 || P.immortal > 0 || P.dead || P.hidden || G.mode !== 'play') return;
  if (P.c.dodge && Math.random() < P.c.dodge) {   // Mr. Satán: el golpe "falla solo"
    P.inv = Math.max(P.inv, 0.2);
    if (Math.random() < 0.35) addText(P.x, P.y - 26, kind === 'beam' ? '¡Son trucos de luces!' : '¡JA, JA, JA!', '#ffd93b', true);
    return;
  }
  if (P.passives.instinct && Math.random() < 0.03 * P.passives.instinct) {   // Instinto de combate: lo esquiva
    P.inv = Math.max(P.inv, 0.2);
    addText(P.x, P.y - 26, '¡Esquivado!', '#e8f2ff');
    return;
  }
  const tough = isFusedBody(P) ? FUSION_POWER.def : 1;   // Gogeta recibe la mitad del daño
  const d = Math.max(1, Math.round(amount * tough * dmgScale() * (1 - perk(P, 'def')) - P.passives.armor));
  P.hp -= d;
  P.stats.taken += d;
  P.inv = 0.5;
  if (P === G.me) G.shake = Math.max(G.shake, 0.2);
  addText(P.x, P.y - 22, d, '#ff4d4d', true);
  sfx('hurt', 0.15);
}
function healPlayer(P, v) { P.hp = Math.min(P.maxHp, P.hp + v); }
// Mejoras que actúan solas con el tiempo (2.21.0)
//   Meditación: quieto más de medio segundo, cura 0,6 por nivel cada segundo y carga 1 de Ki por nivel cada segundo
//   Aura de combate: cada medio segundo, los enemigos pegados reciben 4 de daño por nivel (con el daño del guerrero)
function passiveTicks(P, dt) {
  if (P.dead || P.gone) return;
  const med = P.passives.meditate || 0;
  P.stillT = P.moving ? 0 : (P.stillT || 0) + dt;
  if (med && P.stillT > 0.5) {
    healPlayer(P, 0.6 * med * dt);
    if (P.transformed <= 0 && !P.c.noKi) P.ki = Math.min(100, P.ki + med * dt);
    if (Math.random() < dt * 3) G.fx.push({ type: 'spark', x: P.x + rand(-10, 10), y: P.y + 6, vx: 0, vy: -0.6, t: 0.6, color: '#c8a2ff', size: 2 });   // destellos que suben
  }
  const aura = P.passives.aura || 0;
  if (aura && (P.auraT = (P.auraT || 0) - dt) <= 0) {
    P.auraT = 0.5;
    for (const e of G.enemies) {
      if (e.dead || (e.x - P.x) ** 2 + (e.y - P.y) ** 2 > (e.r + P.r + 10) ** 2) continue;
      damageEnemy(e, 4 * aura, P, 3, P, 'aura');
      burst(e.x, e.y - 4, '#ff7a3d', 3, 2, 2);
    }
  }
}

// ─── Técnicas de los jugadores ───────────────────────────────────────────────
function nearestEnemy(P, maxD = 480) {
  let best = null, bd = maxD * maxD;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = (e.x - P.x) ** 2 + (e.y - P.y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
// Estadísticas de una técnica de un jugador: las de su nivel, con Técnica amplia (más tamaño y área) y
// Multiplicación (+1 proyectil a nivel 1 y otro a nivel 4, en las técnicas que disparan varios)
// Multiplicación (un solo nivel): +1 proyectil, solo en las técnicas que ya disparan varios (las de una sola
// esfera grande, como la Genkidama, no se multiplican)
const multiExtra = l => (l > 0 ? 1 : 0);
// Suerte de Mr. Satán (2.18.5; antes +25% por nivel, era demasiado): cuánto más de semillas, cápsulas y Zeni al
// terminar, en %, según el nivel (hasta +8% a nivel 5)
const LUCK_PCT = [0, 2, 3, 5, 6, 8];
const luckPct = l => LUCK_PCT[Math.max(0, Math.min(LUCK_PCT.length - 1, l || 0))];
function attackStats(P, id, lvl) {
  const s = { ...ATTACKS[id].stats(lvl) }, area = 1 + 0.08 * (P.passives.area || 0), ml = P.passives.multi || 0;
  for (const k of ['radius', 'width', 'explode', 'taunt', 'ringR']) if (s[k]) s[k] *= area;
  if (s.r) s.r = Math.round(s.r * area);
  if (ml && s.count >= 1 && ATTACKS[id].type !== 'decoy') s.count += multiExtra(ml);   // fusión: desde 1 proyectil (antes solo con 2 o más)
  if (s.dur && P.passives.sustain) s.dur *= 1 + 0.1 * P.passives.sustain;   // Técnica sostenida
  return s;
}
function fireAttacks(P, dt) {
  const cdm = cdMult(P);
  for (const a of P.attacks) {
    const def = ATTACKS[a.id];
    if (def.type === 'orbit') continue;
    a.cd -= dt;
    if (a.cd > 0) continue;
    const s = attackStats(P, a.id, a.lvl);
    // Las ondas (Ráfaga de Puños, Onda Explosiva) esperan a tener a alguien dentro de su alcance
    const tgt = nearestEnemy(P, def.kick ? 230 : def.type === 'beam' ? s.len + 40 : def.type === 'nova' ? s.radius + 30 : def.type === 'rain' ? 380 : def.type === 'decoy' || def.type === 'buff' ? 260 : 480);
    if (!tgt) { a.cd = 0.2; continue; }
    a.cd = s.cd * cdm;
    // Apuntado manual (opción del menú): rayos y proyectiles van hacia donde apunta el jugador; en el semiautomático,
    // solo los rayos. El Makosen y las ondas siguen centrados en el enemigo / el jugador
    const manual = P.aim != null && !def.ring && (def.type === 'beam' || (def.type === 'projectile' && !P.aimSemi));
    const ang = manual ? P.aim : Math.atan2(tgt.y - P.y, tgt.x - P.x);
    if (Math.abs(Math.cos(ang)) > 0.2 && !P.moving) P.facing = Math.sign(Math.cos(ang));
    if (!P.moving) P.dir = dirFromVec(Math.cos(ang), Math.sin(ang));   // quieto: mira hacia donde dispara
    if (def.type === 'projectile' && def.ring) {
      // Makosen: las esferas aparecen en círculo alrededor del enemigo y se cierran sobre él
      for (let i = 0; i < s.count; i++) {
        const an = i / s.count * Math.PI * 2, x = tgt.x + Math.cos(an) * s.ringR, y = tgt.y + Math.sin(an) * s.ringR;
        G.projs.push({
          x, y, vx: -Math.cos(an) * s.speed, vy: -Math.sin(an) * s.speed, r: s.r, dmg: s.dmg, aid: a.id, pierce: s.pierce,
          life: s.ringR * 1.6 / (s.speed * 60), hit: new Set(), color: def.color, kind: def.kind, explode: 0, spin: 0, owner: P,
        });
      }
      sfx('shot');
      P.castT = Math.max(P.castT || 0, 0.25);
    } else if (def.type === 'projectile') {
      // Granada: cae donde está el enemigo (o, apuntando a mano, un poco más allá en esa dirección)
      const lx = manual ? P.x + Math.cos(ang) * 220 : tgt.x, ly = manual ? P.y + Math.sin(ang) * 220 : tgt.y;
      for (let i = 0; i < s.count; i++) {
        const an = ang + (i - (s.count - 1) / 2) * s.spread;
        const land = def.grenade ? { x: lx + (i - (s.count - 1) / 2) * 60 * Math.cos(ang + Math.PI / 2), y: ly + (i - (s.count - 1) / 2) * 60 * Math.sin(ang + Math.PI / 2) } : null;
        const lan = land ? Math.atan2(land.y - P.y, land.x - P.x) : an;
        G.projs.push({
          x: P.x, y: P.y - 4, vx: Math.cos(lan) * s.speed, vy: Math.sin(lan) * s.speed, r: s.r, dmg: s.dmg, aid: a.id,
          pierce: s.pierce || 0, life: land ? 9 : s.life, hit: new Set(), color: def.color, kind: def.kind, explode: s.explode || 0, spin: 0, owner: P,
          bounce: s.bounce || 0, speed: s.speed, home: s.home || 0, land, fuse: s.fuse,
        });
      }
      sfx('shot');
      P.castT = Math.max(P.castT || 0, 0.2);
    } else if (def.type === 'beam') {
      for (const an of beamAngles(P, def, ang)) {   // Super Masenko: hacia adelante y hacia atrás; Multiplicación: un rayo más (fusion.js)
        G.beams.push({ ang: an, len: s.len, width: s.width, dmg: s.dmg, t: s.dur, dur: s.dur, tick: 0, color: def.color, core: def.core, aid: a.id, owner: P });
      }
      sfx('beam', 0.3);
      P.castT = Math.max(P.castT || 0, s.dur);
    } else if (def.type === 'buff') {
      // Kaioken: por unos segundos más daño y velocidad, a cambio de un poco de vida (nunca te deja en 0)
      P.kaioken = s.dur; P.kaiokenBoost = s.boost;
      P.hp = Math.max(1, P.hp - Math.round(P.maxHp * s.cost / 100));
      addText(P.x, P.y - 34, def.evolved ? '¡Kaioken x20!' : '¡Kaioken!', '#ff3d3d', true);
      burst(P.x, P.y, '#ff3d3d', 18, 4, 3);
      sfx('power', 0.3);
    } else if (def.type === 'rain') {
      // Lluvia de Ki: una esfera cae del cielo sobre cada uno de varios enemigos al azar cerca tuyo
      const near = shuffle(G.enemies.filter(e => !e.dead && (e.x - P.x) ** 2 + (e.y - P.y) ** 2 < 380 * 380)).slice(0, s.count);
      for (const e of near) {
        const x = e.x + rand(-6, 6);
        G.projs.push({ x, y: e.y - 230, vx: 0, vy: 9, fallY: e.y, r: s.r, dmg: s.dmg, aid: a.id, pierce: 0, life: 3, hit: new Set(),
          color: def.color, kind: def.kind, explode: s.explode, spin: 0, owner: P });
      }
      sfx('shot');
      P.castT = Math.max(P.castT || 0, 0.25);
    } else if (def.type === 'decoy') {
      // Zanzoken: imágenes residuales que atraen a los enemigos y al final estallan
      for (let i = 0; i < s.count; i++) {
        // (la Bomba de regalo, si es una sola, va un poco adelante)
        const an = i / s.count * Math.PI * 2, off = s.count > 1 ? 70 : 0, front = def.gift && s.count === 1 ? 50 * (P.facing || 1) : 0;
        const [x, y] = walkableSpot(P.x + front + Math.cos(an) * off, P.y + Math.sin(an) * off * 0.7);
        G.decoys.push({ x, y, t: s.dur, dur: s.dur, taunt: s.taunt, dmg: s.dmg, explode: s.explode, owner: P, aid: a.id, facing: P.facing, color: def.color, gift: !!def.gift });
        burst(x, y, '#c8e0ff', 10, 3, 2);
      }
      sfx('power', 0.3);
    } else if (def.megaton) {   // Megaton Punch: 1 de daño... salvo el golpe legendario
      P.punchT = 0.25;
      if (Math.random() < s.legend) megatonLegend(P, s.boss, a.id);
      else {
        damageEnemy(tgt, s.dmg, P, 6, P, a.id);
        if (Math.random() < 0.35) addText(P.x, P.y - 34, '¡MEGATON PUNCH!', '#ffd93b', true);
      }
      sfx('hit', 0.2);
    } else if (def.kick) {   // Dynamite Kick: patada voladora... o se cae de cara
      if (Math.random() < s.trip) {
        P.tripT = 1.1;
        addText(P.x, P.y - 30, '¡Ay!', '#ff9b9b', true);
        sfx('hurt', 0.2);
      } else {
        if (P === G.me) { const d = Math.hypot(tgt.x - P.x, tgt.y - P.y) || 1; P.dashT = 0.18; P.dashVX = (tgt.x - P.x) / 0.18; P.dashVY = (tgt.y - P.y) / 0.18; }
        P.punchT = 0.3;
        G.novas.push({ x: tgt.x, y: tgt.y, r: 0, maxR: s.radius, dmg: s.dmg, hit: new Set(), color: def.color, kb: 20, owner: P, aid: a.id });
        addText(P.x, P.y - 34, '¡Dynamite Kick!', '#ff9b3d', true);
        sfx('boom', 0.3);
      }
    } else if (def.type === 'nova') {
      G.novas.push({ x: P.x, y: P.y, r: 0, maxR: s.radius, dmg: s.dmg, hit: new Set(), color: def.color, kb: 14, owner: P, aid: a.id, stun: s.stun || 0 });
      if (s.heal) healPlayer(P, s.heal);   // Explosión de Ki
      if (def.punch) P.punchT = 0.25;   // Ráfaga de Puños: el personaje tira un puñetazo
      if (s.radius >= 120 && !s.stun) { burst(P.x, P.y, def.color, 24, 6, 4); playAnim('wring', P.x, P.y, s.radius / 14); G.shake = Math.max(G.shake, 0.25); }   // las ondas grandes se sienten
      sfx('boom', 0.3);
    }
  }
}
function updateProjectiles(k, dt) {
  for (const p of G.projs) {
    if (p.land) {   // Granada de Ki: vuela hasta su lugar (sin chocar con nadie), espera y estalla
      if (!p.arrived) {
        const dx = p.land.x - p.x, dy = p.land.y - p.y, dd = Math.hypot(dx, dy);
        if (dd <= p.speed * k) { p.x = p.land.x; p.y = p.land.y; p.vx = p.vy = 0; p.arrived = true; }
        else { p.x += dx / dd * p.speed * k; p.y += dy / dd * p.speed * k; }
      } else if ((p.fuse -= dt) <= 0) { p.dead = true; explode(p.x, p.y, p.explode, p.dmg, p.color, p.owner, p.aid); }
      p.spin += dt * 20;
      continue;
    }
    if (p.home) {   // Sokidan: gira de a poco hacia el enemigo más cercano que todavía no golpeó
      let best = null, bd = 320 * 320;
      for (const e of G.enemies) { if (e.dead || p.hit.has(e)) continue; const dd = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (dd < bd) { bd = dd; best = e; } }
      if (best) {
        const sp = Math.hypot(p.vx, p.vy), a = Math.atan2(p.vy, p.vx);
        let da = Math.atan2(best.y - p.y, best.x - p.x) - a; da = Math.atan2(Math.sin(da), Math.cos(da));
        const na = a + Math.max(-p.home * dt, Math.min(p.home * dt, da));
        p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
      }
    }
    p.x += p.vx * k; p.y += p.vy * k; p.life -= dt; p.spin += dt * 20;
    if (p.fallY !== undefined) {   // Lluvia de Ki: cae sin chocar hasta llegar al suelo, y ahí estalla
      if (p.y >= p.fallY) { p.dead = true; explode(p.x, p.y, p.explode, p.dmg, p.color, p.owner, p.aid); }
      continue;
    }
    if (p.life <= 0) { p.dead = true; if (p.explode) explode(p.x, p.y, p.explode, p.dmg, p.color, p.owner, p.aid); continue; }
    for (const e of G.enemies) {
      if (e.dead || p.hit.has(e)) continue;
      const rr = e.r + p.r;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > rr * rr) continue;
      if (p.explode) { explode(p.x, p.y, p.explode, p.dmg, p.color, p.owner, p.aid); p.dead = true; break; }
      damageEnemy(e, p.dmg, p, 3, p.owner, p.aid);
      p.hit.add(e);
      if (--p.pierce < 0) { p.dead = true; break; }
      if (p.bounce > 0) { bounceProjectile(p); break; }   // Kienzan Múltiple: salta al siguiente enemigo
    }
  }
  G.projs = G.projs.filter(p => !p.dead);
}
function bounceProjectile(p) {
  let best = null, bd = 260 * 260;
  for (const e of G.enemies) {
    if (e.dead || p.hit.has(e)) continue;
    const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  if (!best) return;
  const an = Math.atan2(best.y - p.y, best.x - p.x);
  p.vx = Math.cos(an) * p.speed; p.vy = Math.sin(an) * p.speed;
  p.life = Math.max(p.life, 0.9);
  p.bounce--;
}
function explode(x, y, radius, dmg, color, owner, aid) {
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.x - x, e.y - y) < radius + e.r) damageEnemy(e, dmg, { x, y }, 12, owner, aid);
  }
  ring(x, y, radius, 0.4, color);
  burst(x, y, color, 24, 5, 4);
  playAnim('explosion', x, y, Math.min(2.6, Math.max(1.2, radius / 26)));
  playAnim('shock', x, y, Math.min(5, radius / 16));
  G.shake = Math.max(G.shake, 0.25);
  sfx('boom', 0.1);
}
// El golpe legendario del Megaton Punch: todos los enemigos comunes de la pantalla caen, y los jefes lo sienten
function megatonLegend(P, bossPct = 0.15, aid = 'megaton') {
  const ki = P.ki;   // (las bajas del golpe legendario no cargan el Ki: Buu se hace esperar)
  for (const e of G.enemies) {
    if (e.dead || Math.hypot(e.x - P.x, e.y - P.y) > 520) continue;
    if (e.boss) damageEnemy(e, e.maxHp * bossPct / Math.max(1, dmgMult(P)), P, 20, P, aid);   // (parte de la vida máxima del jefe)
    else { creditDmg(P, aid, Math.max(0, e.hp)); killEnemy(e, P); }   // (la vida que les quedaba cuenta como daño de la técnica)
  }
  P.ki = ki;
  announce('¡¿VIERON ESO?!', '#ffd93b');
  addText(P.x, P.y - 40, '¡MEGATON PUNCH!', '#ffd93b', true);
  G.shake = Math.max(G.shake, 1);
  ring(P.x, P.y, 300, 0.6, '#ffd93b'); burst(P.x, P.y, '#ffd93b', 40, 8, 4);
  sfx('boom');
}
// ¡Amigo Buu!: Majin Buu pelea por Mr. Satán mientras dura su "transformación"
const BUDDY_TIME = 15;
function updateHelpers(dt, k) {
  for (const h of G.helpers) {
    h.t -= dt; h.punch = Math.max(0, h.punch - dt);
    if (h.t <= 0) { h.dead = true; poof(h.x, h.y); continue; }
    let best = null, bd = 450 * 450;
    for (const e of G.enemies) { if (e.dead) continue; const d = (e.x - h.x) ** 2 + (e.y - h.y) ** 2; if (d < bd) { bd = d; best = e; } }
    const tx = best ? best.x : h.owner.x + 34, ty = best ? best.y : h.owner.y, d = Math.hypot(tx - h.x, ty - h.y);
    if (d > (best ? best.r + 16 : 40)) { const sp = 3.6 * k; h.x += (tx - h.x) / d * Math.min(sp, d); h.y += (ty - h.y) / d * Math.min(sp, d); }
    if (Math.abs(tx - h.x) > 2) h.facing = tx > h.x ? 1 : -1;
    if (best && d < best.r + 22 && (h.cd -= dt) <= 0) {
      h.cd = 0.4; h.punch = 0.2;
      for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - h.x, e.y - h.y) < 60) damageEnemy(e, 90 + G.level * 12, h, 18, h.owner, 'ki');
      burst(best.x, best.y, '#ff9bd6', 6, 3, 2);
    }
    if ((h.slam = (h.slam ?? 2) - dt) <= 0) {   // cada tanto, un pisotón que barre todo alrededor
      h.slam = 2.5; h.punch = 0.3;
      G.novas.push({ x: h.x, y: h.y, r: 0, maxR: 150, dmg: 160 + G.level * 20, hit: new Set(), color: '#ff9bd6', kb: 30, owner: h.owner, aid: 'ki' });
      G.shake = Math.max(G.shake, 0.3); sfx('boom', 0.3);
    }
  }
  G.helpers = G.helpers.filter(h => !h.dead);
}
function updateDecoys(dt) {
  for (const d of G.decoys) {
    if ((d.t -= dt) > 0) continue;
    d.dead = true;
    explode(d.x, d.y, d.explode, d.dmg, d.color, d.owner, d.aid);
  }
  G.decoys = G.decoys.filter(d => !d.dead);
}
// La imagen residual más cercana que atrae a este enemigo (los jefes no caen en el engaño)
function nearDecoy(e) {
  let best = null, bd = Infinity;
  for (const d of G.decoys) { const dd = (d.x - e.x) ** 2 + (d.y - e.y) ** 2; if (dd < d.taunt * d.taunt && dd < bd) { bd = dd; best = d; } }
  return best;
}
function updateBeams(dt) {
  for (const b of G.beams) {
    b.t -= dt; b.tick -= dt;
    if (b.t <= 0) { b.dead = true; continue; }
    if (b.tick <= 0) {
      b.tick = 0.1;
      const P = b.owner, ax = P.x, ay = P.y - 4, bx = ax + Math.cos(b.ang) * b.len, by = ay + Math.sin(b.ang) * b.len;
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (segDist(e.x, e.y, ax, ay, bx, by) < b.width / 2 + e.r) damageEnemy(e, b.dmg, P, 1.5, b.credit || P, b.aid);
      }
    }
  }
  G.beams = G.beams.filter(b => !b.dead);
}
// Esferas que giran alrededor del jugador (Esferas de Ki o su evolución, el Escudo de Ki)
function orbitPositions(P) {
  const a = P.attacks.find(x => ATTACKS[x.id] && ATTACKS[x.id].type === 'orbit');
  if (!a || P.dead || P.gone) return [];
  const def = ATTACKS[a.id], s = attackStats(P, a.id, a.lvl), out = [];
  for (let i = 0; i < s.count; i++) {
    const an = P.orbitAng * s.spin + i / s.count * Math.PI * 2;
    out.push({ x: P.x + Math.cos(an) * s.radius, y: P.y + Math.sin(an) * s.radius, r: s.r, dmg: s.dmg, aid: a.id, shield: !!def.shield });
  }
  return out;
}
function updateOrbit(P, dt) {
  P.orbitAng += dt;
  if (P.koT > 0) return;   // tirado en el piso (Semilla de reserva): las esferas no golpean
  const orbs = orbitPositions(P);
  if (!orbs.length) return;
  for (const e of G.enemies) {
    if (e.dead || G.t < e.orbHit) continue;
    for (const o of orbs) {
      const rr = o.r + e.r;
      if ((e.x - o.x) ** 2 + (e.y - o.y) ** 2 < rr * rr) { damageEnemy(e, o.dmg, o, 6, P, o.aid); e.orbHit = G.t + 0.45; break; }
    }
  }
}
// Las ondas crecen en 0,3 s (solo hacen daño mientras crecen) y después quedan un momento
// desvaneciéndose (hold), para que se vean
const NOVA_HOLD = 0.35;
function updateNovas(dt) {
  for (const n of G.novas) {
    if (n.hold !== undefined) { n.hold -= dt; if (n.hold <= 0) n.dead = true; continue; }
    n.r = Math.min(n.maxR, n.r + (n.maxR / 0.3) * dt);
    for (const e of G.enemies) {
      if (e.dead || n.hit.has(e) || (n.noBoss && e.boss)) continue;
      if (Math.hypot(e.x - n.x, e.y - n.y) < n.r + e.r) {
        n.hit.add(e); damageEnemy(e, n.dmg, n, n.stun ? 0 : n.kb, n.owner, n.aid);
        if (n.stun) e.stun = Math.max(e.stun || 0, n.stun * (e.boss ? 0.35 : 1));   // Taiyoken: los jefes, menos
      }
    }
    if (n.r >= n.maxR) n.hold = NOVA_HOLD;
  }
  G.novas = G.novas.filter(n => !n.dead);
}
// Onda expansiva: disco de energía, anillo grueso con borde blanco, anillo que lo sigue y,
// en las grandes (Onda Explosiva, Explosión de Ki), rayos en el borde y un destello al salir
function drawNova(c, n, t) {
  const p = Math.min(1, n.r / n.maxR), big = n.maxR >= 120;
  const fade = n.hold !== undefined ? Math.max(0, n.hold / NOVA_HOLD) : 1;
  const ell = (r, fill) => { c.beginPath(); c.ellipse(n.x, n.y, Math.max(0, r), Math.max(0, r * 0.8), 0, 0, Math.PI * 2); fill ? c.fill() : c.stroke(); };
  if (n.color === ATTACKS.taiyoken.color) {   // Taiyoken (2.18.7): solo un anillo fino y un destello chico, para no tapar el mapa
    c.strokeStyle = '#ffffff'; c.globalAlpha = 0.45 * fade; c.lineWidth = 2; ell(n.r);
    c.globalAlpha = 0.2 * fade; c.lineWidth = 1; ell(n.r * 0.85);
    if (n.hold === undefined && p < 0.3) { c.globalAlpha = (1 - p / 0.3) * 0.6; c.fillStyle = '#ffffff'; circle(c, n.x, n.y - 8, 10 * (1 - p)); }
    c.globalAlpha = 1;
    return;
  }
  c.fillStyle = n.color;
  c.globalAlpha = (big ? 0.24 : 0.14) * fade; ell(n.r, true);
  c.fillStyle = '#ffffff';
  c.globalAlpha = (big ? 0.14 : 0.08) * fade; ell(n.r * 0.6, true);
  c.strokeStyle = n.color;
  c.globalAlpha = 0.5 * fade; c.lineWidth = big ? 4 : 2; ell(n.r * 0.75);
  c.globalAlpha = fade; c.lineWidth = (big ? 10 : 5) * (0.5 + 0.5 * fade); ell(n.r);
  c.strokeStyle = '#ffffff'; c.lineWidth = big ? 3 : 2; ell(n.r);
  if (big) {   // rayos de energía que giran en el borde
    c.globalAlpha = 0.8 * fade; c.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2 + t * 1.5, ca = Math.cos(a), sa = Math.sin(a) * 0.8;
      c.beginPath(); c.moveTo(n.x + ca * n.r * 0.88, n.y + sa * n.r * 0.88); c.lineTo(n.x + ca * n.r * 1.14, n.y + sa * n.r * 1.14); c.stroke();
    }
  }
  if (n.hold === undefined && p < 0.35) {   // destello al salir
    c.globalAlpha = (1 - p / 0.35) * 0.9; c.fillStyle = '#ffffff';
    circle(c, n.x, n.y, (big ? 26 : 14) * (1 - p));
  }
  c.globalAlpha = 1;
}

// ─── Enemigos ────────────────────────────────────────────────────────────────
const SHOT_COLORS = ['#ff6a3d', '#ff3d7a', '#ffa53d', '#b8b8b0', '#ff2a2a', '#c8d4e0'];   // 3: piedra (Dabura) · 4: Crusher Ball · 5: puño de 16
const SHOOTER_CHANCE = 0.5;   // proporción de soldados que disparan (el resto ataca cuerpo a cuerpo)
// Tope de disparos de enemigos comunes en pantalla (los de los jefes no cuentan ni se frenan): en el Nivel 4
// los abanicos, ráfagas y anillos llegaban a apilar más de 300 disparos (2.10.1)
const ENEMY_SHOT_CAP = 40;
function enemyShot(e, ang, speed = 3.5, r = 5, color = 0) {
  if (!e.boss) { let n = 0; for (const s of G.shots) if (!s.boss) n++; if (n >= ENEMY_SHOT_CAP) return; }
  G.shots.push({ boss: !!e.boss, x: e.x, y: e.y - 6, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r, dmg: e.dmg * 0.8, life: 4, color: SHOT_COLORS[color], ci: color });
}
// Probabilidad de que un enemigo común suelte una Semilla del Ermitaño o una Cápsula de Bulma.
// La semilla es baja para que no se pueda ganar aguantando golpes a fuerza de semillas (2.9.0: 2% → 0,8%)
const SENZU_DROP = 0.008, CAPSULE_DROP = 0.012;
// Embestida de los jefes: aviso, duración y velocidad (px por cuadro a 60 fps)
const DASH_WINDUP = 0.75, DASH_TIME = 0.55, DASH_SPEED = 7;
// Técnicas propias de cada jefe (2.16.0), además de los ataques comunes (anillo, abanico, pisotón, embestida).
// Siempre con aviso: franja marcada en el suelo, círculos donde algo va a salir, el jefe cargando con su aura.
//   every: cada cuántos segundos · first: la primera vez, a los cuántos segundos de llegar · color: aura al cargar
const BOSS_SPECIAL = {
  // Nivel 1
  raditz:   { every: 9,  first: 5, color: '#ff6ad5', fn: doubleSunday },
  nappa:    { every: 11, first: 6, color: '#ffb35c', fn: plantSaibamen },
  vegetas:  { every: 10, first: 6, color: '#b04dff', fn: galickHo },
  // Nivel 2
  recoome:  { every: 9,  first: 5, color: '#ffd23d', fn: eraserGun },
  burter:   { every: 8,  first: 4, color: '#6ab8ff', fn: machAttack },
  jeice:    { every: 8,  first: 4, color: '#ff4d4d', fn: crusherBall },
  ginyu:    { every: 11, first: 6, color: '#c86aff', fn: bodyChange },
  freezer:  { every: 8,  first: 5, color: '#ff4df0', fn: freezerSpecial },
  // Nivel 3
  a19:      { every: 9,  first: 5, color: '#6aff8a', fn: absorbEnergy },
  gero:     { every: 9,  first: 5, color: '#6aff8a', fn: absorbEnergy },
  a16:      { every: 8,  first: 5, color: '#c8d4e0', fn: rocketPunch },
  a17:      { every: 12, first: 6, color: '#7fe6ff', fn: barrier },
  a18:      { every: 8,  first: 5, color: '#ffe066', fn: energyStream },
  cellimp:  { every: 8,  first: 5, color: '#6aff8a', fn: tailDrain },
  cellsemi: { every: 9,  first: 5, color: '#4dc3ff', fn: kamehameha },
  cell:     { every: 9,  first: 5, color: '#ffffff', fn: cellSpecial },
  // Nivel 4
  puipui:   { every: 10, first: 5, color: '#a05aff', fn: zoonGravity },
  dabura:   { every: 8,  first: 5, color: '#b8b8b0', fn: stoneSpit },
  fatbuu:   { every: 9,  first: 5, color: '#ff8ad8', fn: candyBeam },
  buu:      { every: 6,  first: 4, color: '#ff8ad8', fn: kidBuuChaos },
};
// Cargar una técnica sin rayos: se planta con su aura y al terminar hace fire(e)
function bossCharge(e, windup, name, color, fire) {
  e.cast = { t: windup, o: { beams: [], fire } };
  addText(e.x, e.y - 40 * e.scale, name, color, true);
  sfx('power', 0.2);
}
// Disparo que persigue al jugador más cercano (home: cuánto puede girar por segundo)
function homingShot(e, ang, speed, r, ci, dmg, home, life, extra = {}) {
  G.shots.push({ boss: true, x: e.x, y: e.y - 6, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r, dmg, life, color: SHOT_COLORS[ci], ci, home, ...extra });
}
// ── Nivel 2 ──
// Recoome · Recoome Eraser Gun: un rayo grueso por la boca
function eraserGun(e, P, ang) {
  bossBeams(e, { windup: 1.3, dur: 0.7, color: '#ffd23d', core: '#fffbe0', dmg: e.dmg * 2.2, name: '¡Recoome Eraser Gun!', beams: [{ ang, len: 520, w: 46 }] });
}
// Burter · el más rápido del universo: tres embestidas seguidas, cada una apuntando de nuevo
function machAttack(e, P, ang) {
  addText(e.x, e.y - 40 * e.scale, '¡Space Mach Attack!', '#6ab8ff', true);
  e.dashChain = 2;
  startLunge(e, Math.cos(ang), Math.sin(ang), DASH_WINDUP * 0.7, DASH_TIME * 0.8, DASH_SPEED * 1.15, e.r * 2.2);
}
// Jeice · Crusher Ball: una bola roja grande y lenta que te persigue
function crusherBall(e) {
  bossCharge(e, 0.6, '¡Crusher Ball!', '#ff4d4d', () => {
    const P = nearestPlayer(e.x, e.y);
    homingShot(e, Math.atan2(P.y - e.y, P.x - e.x), 2.6, 13, 4, e.dmg * 1.8, 2.2, 5);
  });
}
// Capitán Ginyu · Cambio de cuerpo: un rayo fino; si te toca, cambian de lugar
function bodyChange(e, P, ang) {
  bossBeams(e, { windup: 1.0, dur: 0.3, color: '#c86aff', core: '#f4e6ff', dmg: e.dmg * 0.6, name: '¡Cambio de cuerpo!', swap: e.nid, beams: [{ ang, len: 480, w: 16 }] });
}
// Freezer · Death Ball (una bola enorme y lenta que cae donde estabas) y Rayo mortal (fino y rápido), alternados
function freezerSpecial(e, P, ang) {
  if ((e.spN = (e.spN || 0) + 1) % 2) {
    G.hazards.push({ x: P.x, y: P.y, r: 105, t: 2.2, dur: 2.2, dmg: e.dmg * 2.4, ball: { x: e.x, y: e.y - 30 * e.scale, r: 26 } });
    addText(e.x, e.y - 40 * e.scale, '¡Death Ball!', '#ff4d4d', true);
    sfx('power', 0.2);
  } else {
    bossBeams(e, { windup: 0.7, dur: 0.25, color: '#ff4df0', core: '#ffe6fb', dmg: e.dmg * 1.6, name: '¡Rayo mortal!', beams: [{ ang, len: 560, w: 12 }] });
  }
}
// ── Nivel 3 ──
// Androide 19 y Dr. Gero · Absorción de energía: marca un círculo a su alrededor; si te agarra, se cura con tu vida
function absorbEnergy(e) {
  G.hazards.push({ x: e.x, y: e.y, r: 95, t: 0.9, dur: 0.9, dmg: e.dmg * 1.1, drain: e.nid });
  bossCharge(e, 0.9, '¡Absorción de energía!', '#6aff8a', () => {});
}
// Androide 16 · Hell's Flash: dispara los dos puños como misiles que te siguen un poco
function rocketPunch(e) {
  bossCharge(e, 0.5, '¡Puños cohete!', '#c8d4e0', () => {
    const P = nearestPlayer(e.x, e.y), a = Math.atan2(P.y - e.y, P.x - e.x);
    homingShot(e, a - 0.5, 4.2, 8, 5, e.dmg * 1.4, 1.6, 3.5);
    homingShot(e, a + 0.5, 4.2, 8, 5, e.dmg * 1.4, 1.6, 3.5);
  });
}
// Androide 17 · Barrera: una burbuja que lo protege de todo el daño unos segundos y te empuja si la tocas
function barrier(e) {
  e.shield = 3.5;
  addText(e.x, e.y - 40 * e.scale, '¡Barrera!', '#7fe6ff', true);
  sfx('power', 0.2);
}
// Androide 18 · Ráfaga de energía: muchos disparos rápidos seguidos
function energyStream(e) {
  bossCharge(e, 0.5, '¡Ráfaga de energía!', '#ffe066', () => { e.stream = { n: 12, t: 0 }; });
}
// Cell Imperfecto · Cola absorbente: una embestida que, si te pega, lo cura
function tailDrain(e, P, ang) {
  addText(e.x, e.y - 40 * e.scale, '¡Cola absorbente!', '#6aff8a', true);
  e.drainDash = true;
  startLunge(e, Math.cos(ang), Math.sin(ang), DASH_WINDUP, DASH_TIME, DASH_SPEED, e.r * 2.4);
}
// Cell Semi-Perfecto · Kamehameha
function kamehameha(e, P, ang) {
  bossBeams(e, { windup: 1.4, dur: 0.8, color: '#4dc3ff', core: '#e6f8ff', dmg: e.dmg * 2.4, name: '¡Kamehameha!', beams: [{ ang, len: 600, w: 50 }] });
}
// Cell · Taiyoken (la pantalla se pone blanca un momento) y Cell Jr., alternados
function cellSpecial(e) {
  if ((e.spN = (e.spN || 0) + 1) % 2) {
    bossCharge(e, 1.0, '¡Taiyoken!', '#ffffff', () => { blind(1.6); G.shake = Math.max(G.shake, 0.3); });
  } else {
    if (G.enemies.filter(q => q.id === 'celljr').length > 15) return;
    const pts = [];
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2, [x, y] = walkableSpot(e.x + Math.cos(a) * rand(45, 80), e.y + Math.sin(a) * rand(30, 60));
      pts.push([x, y]);
      G.hazards.push({ x, y, r: 16, t: 0.9, dur: 0.9, dmg: 0 });
    }
    e.sprout = { t: 0.9, pts, id: 'celljr' };
    addText(e.x, e.y - 40 * e.scale, '¡Cell Jr.!', '#7dff6a', true);
    sfx('power', 0.2);
  }
}
// ── Nivel 4 ──
// Puipui · Gravedad del planeta Zoon: zonas donde te mueves mucho más lento
function zoonGravity(e, P) {
  if (G.zones.length > 4) return;
  for (const [dx, dy] of [[0, 0], [rand(-160, -90), rand(-60, 60)], [rand(90, 160), rand(-60, 60)]]) {
    const [x, y] = walkableSpot(P.x + dx, P.y + dy);
    G.zones.push({ x, y, r: 80, t: 6.5, dur: 6.5 });
  }
  addText(e.x, e.y - 40 * e.scale, '¡Gravedad de Zoon!', '#a05aff', true);
  sfx('power', 0.2);
}
// Dabura · Escupitajo de piedra: si te toca, te petrifica un momento
function stoneSpit(e) {
  bossCharge(e, 0.45, '¡Escupitajo de piedra!', '#b8b8b0', () => {
    const P = nearestPlayer(e.x, e.y), a = Math.atan2(P.y - e.y, P.x - e.x);
    for (const da of [-0.2, 0, 0.2]) homingShot(e, a + da, 4.2, 7, 3, e.dmg * 0.8, 0, 3, { stone: true });
  });
}
// Majin Buu · Rayo de caramelo: si te toca, te vuelve caramelo (lento) unos segundos; y se cura un poco
function candyBeam(e, P, ang) {
  if (e.hp < e.maxHp * 0.6) { const h = e.maxHp * 0.05; e.hp = Math.min(e.maxHp, e.hp + h); burst(e.x, e.y, '#ff8ad8', 14, 3, 3); }
  bossBeams(e, { windup: 0.9, dur: 0.35, color: '#ff8ad8', core: '#ffe6f6', dmg: e.dmg * 0.8, name: '¡Rayo de caramelo!', candy: true, beams: [{ ang, len: 480, w: 22 }] });
}
// Kid Buu · caos: se teletransporta seguido y al aparecer suelta un anillo de bolas de energía
function kidBuuChaos(e, P) {
  if (e.tp) return;
  bossTeleport(e, P);
  e.tp.ring = true;
}
// Ceguera del Taiyoken (el anfitrión la reenvía a los demás)
function blind(secs) {
  G.blind = Math.max(G.blind || 0, secs);
  emit(['f', secs]);
}
function drawBlind() {
  if (!(G.blind > 0)) return;
  ctx.save(); ctx.globalAlpha = Math.min(0.95, G.blind / 1.6 * 1.1); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// Velocidad del jugador según los efectos de los jefes: petrificado, caramelo, gravedad
function statusSpeed(P) {
  if (P.stone > 0 || P.fallT > 0 || P.tripT > 0 || P.koT > 0) return 0;   // petrificado, cayendo al Infierno o tirado en el piso
  let m = (P.candy > 0 ? 0.5 : 1) * (P.swapBody > 0 ? SWAP_SPEED : 1);
  for (const z of G.zones || []) if (z.t < z.dur - 0.6 && (P.x - z.x) ** 2 + ((P.y - z.y) / 0.75) ** 2 < z.r * z.r) { m *= 0.45; break; }
  return m;
}
// Raditz · Double Sunday: dos rayos que salen abiertos en V y se cierran barriendo hasta juntarse donde estabas
// (quedarse quieto en el medio no sirve: hay que salir de la V)
function doubleSunday(e, P, ang) {
  const open = 0.5, dur = 0.9;
  bossBeams(e, { windup: 1.0, dur, color: '#ff6ad5', core: '#ffe6fa', dmg: e.dmg * 1.6, name: '¡Double Sunday!',
    beams: [{ ang: ang - open, len: 430, w: 24, spin: open / dur }, { ang: ang + open, len: 430, w: 24, spin: -open / dur }],
    marks: [{ ang, len: 430, w: 24 }] });   // franja también donde se juntan
}
// Vegeta · Galick Ho: carga más tiempo y dispara un rayo enorme
function galickHo(e, P, ang) {
  bossBeams(e, { windup: 1.6, dur: 0.8, color: '#b04dff', core: '#f1dcff', dmg: e.dmg * 2.6, name: '¡Galick Ho!',
    beams: [{ ang, len: 620, w: 56 }] });
}
// Nappa · siembra Saibaiman: tres círculos en el suelo alrededor y de cada uno sale un Saibaiman
function plantSaibamen(e) {
  if (G.enemies.filter(q => q.id === 'saibaman').length > 40) return;
  const pts = [];
  for (let i = 0; i < 3; i++) {
    const a = Math.random() * Math.PI * 2, [x, y] = walkableSpot(e.x + Math.cos(a) * rand(45, 80), e.y + Math.sin(a) * rand(30, 60));
    pts.push([x, y]);
    G.hazards.push({ x, y, r: 16, t: 0.9, dur: 0.9, dmg: 0 });   // la marca donde va a salir (no daña)
  }
  e.sprout = { t: 0.9, pts };
  addText(e.x, e.y - 40 * e.scale, '¡Saibaiman!', '#7dff6a', true);
  sfx('power', 0.2);
}
// El jefe se planta, carga con su aura mientras se marcan las franjas, y al final salen los rayos
function bossBeams(e, o) {
  e.cast = { t: o.windup, o };
  for (const b of [...o.beams, ...(o.marks || [])]) G.lanes.push({ x: e.x, y: e.y, dx: Math.cos(b.ang), dy: Math.sin(b.ang), len: b.len, w: b.w, t: o.windup, dur: o.windup });
  addText(e.x, e.y - 40 * e.scale, o.name, o.color, true);
  sfx('power', 0.2);
}
function tickBossCast(e, dt) {
  if (e.shield > 0) e.shield -= dt;
  if (e.stream && (e.stream.t -= dt) <= 0) {   // ráfaga de 18: un disparo cada 0,09 s hacia el jugador
    const P = nearestPlayer(e.x, e.y);
    enemyShot(e, Math.atan2(P.y - e.y, P.x - e.x) + rand(-0.08, 0.08), 5.2, 5, 2);
    e.stream.t = 0.09;
    if (--e.stream.n <= 0) e.stream = null;
  }
  if (e.sprout && (e.sprout.t -= dt) <= 0) {
    for (const [x, y] of e.sprout.pts) {
      spawnEnemy(e.sprout.id || 'saibaman', { pos: { x, y } });
      burst(x, y, '#7dff6a', 10, 3, 2);
    }
    e.sprout = null;
  }
  if (!e.cast || (e.cast.t -= dt) > 0) return;
  const o = e.cast.o;
  e.cast = null;
  if (o.fire) { o.fire(e); return; }
  for (const b of o.beams) G.ebeams.push({ x: e.x, y: e.y - 4, ang: b.ang, spin: b.spin || 0, len: b.len, width: b.w, t: o.dur, dur: o.dur, color: o.color, core: o.core, dmg: o.dmg, hit: new Set(),
    swap: o.swap, candy: o.candy });
  G.shake = Math.max(G.shake, 0.5);
  sfx('beam', 0.1);
}
// Cambio de cuerpo de Ginyu: 5 s más lento (-30%) y más débil (-40% de daño); los primeros 4 s, controles al revés
const SWAP_BODY_TIME = 5, SWAP_INVERT_TIME = 4, SWAP_SPEED = 0.7, SWAP_DMG = 0.6;
// Mueve a un jugador a otro lugar (si es el invitado, su juego mueve su personaje: se le avisa)
function warpPlayer(P, x, y) {
  P.x = x; P.y = y; P.tx = undefined;
  emit(['w', P.id, Math.round(x), Math.round(y)]);
}
// Rayos de los jefes: dañan una vez a cada jugador que tocan
function updateEbeams(dt) {
  for (const b of G.ebeams) {
    b.t -= dt;
    if (b.t <= 0) { b.dead = true; continue; }
    b.ang += b.spin * dt;   // los que barren (Double Sunday)
    const bx = b.x + Math.cos(b.ang) * b.len, by = b.y + Math.sin(b.ang) * b.len;
    for (const P of alivePlayers()) {
      if (b.hit.has(P) || segDist(P.x, P.y, b.x, b.y, bx, by) >= b.width / 2 + P.r) continue;
      b.hit.add(P); hurtPlayer(P, b.dmg, 'beam');
      if (b.candy) { P.candy = 3; addText(P.x, P.y - 30, '¡Caramelo!', '#ff8ad8', true); }
      if (b.swap !== undefined) {   // Ginyu: cambian de lugar
        const g = G.enemies.find(q => q.nid === b.swap && !q.dead);
        if (g) {
          const px = P.x, py = P.y;
          warpPlayer(P, g.x, g.y); g.x = px; g.y = py;
          burst(P.x, P.y, '#c86aff', 16, 4, 3); burst(g.x, g.y, '#c86aff', 16, 4, 3);
          addText(P.x, P.y - 30, '¡Cambio de cuerpo!', '#c86aff', true);
          // Como Goku en el cuerpo de Ginyu: más lento y más débil, y al principio no sabe manejarlo
          P.swapBody = SWAP_BODY_TIME; P.invert = SWAP_INVERT_TIME;
          G.shake = Math.max(G.shake, 0.5);
        }
      }
    }
  }
  G.ebeams = G.ebeams.filter(b => !b.dead);
}
function bossAI(e, target, k, dt, dx, dy, d) {
  tickBossCast(e, dt);
  if (e.cast) return;   // cargando su técnica: no hace otra cosa
  const sp = BOSS_SPECIAL[e.id];
  if (sp && !e.tp) {
    e.spCd = (e.spCd ?? sp.first) - dt;
    if (e.spCd <= 0 && d < 520) {
      e.spCd = sp.every;
      e.cd = Math.max(e.cd, 1.2);   // un respiro antes del próximo ataque común
      sp.fn(e, target, Math.atan2(dy, dx));
      if (e.cast) return;
    }
  }
  e.cd -= dt;
  if (e.cd <= 0) {
    const pat = e.def.patterns[e.pi++ % e.def.patterns.length];
    e.cd = e.def.every;
    const ang = Math.atan2(dy, dx);
    if (pat === 'ring') {
      const n = 12 + G.bossIdx * 2;
      for (let i = 0; i < n; i++) enemyShot(e, i / n * Math.PI * 2 + e.pi, 2.8, 7, 1);
    } else if (pat === 'aimed') {
      for (let i = -2; i <= 2; i++) enemyShot(e, ang + i * 0.16, 4.5, 6, 2);
    } else if (pat === 'slam') {
      G.hazards.push({ x: target.x, y: target.y, r: 70, t: 1.1, dur: 1.1, dmg: e.dmg * 1.3 });
    } else if (pat === 'dash') {
      startLunge(e, dx / d, dy / d, DASH_WINDUP, DASH_TIME, DASH_SPEED, e.r * 2.4);
    }
  }
}
// Antes de embestir se planta y marca en el suelo el recorrido, para dar tiempo a esquivarlo
function startLunge(e, ux, uy, windup, time, speed, width) {
  e.windup = windup; e.dashX = ux; e.dashY = uy; e.dashTime = time; e.dashSpeed = speed;
  G.lanes.push({ x: e.x, y: e.y + 10 * e.scale, dx: ux, dy: uy, len: speed * 60 * time, w: width, t: windup, dur: windup });
}
function updateLunge(e, k, dt) {
  if (e.windup > 0) {
    e.windup -= dt;
    if (e.windup <= 0) e.dash = e.dashTime;
  }
  if (e.dash > 0) {
    e.dash -= dt;
    e.x += e.dashX * e.dashSpeed * k; e.y += e.dashY * e.dashSpeed * k;
    if (e.dash <= 0) {
      e.drainDash = false;
      if (e.dashChain > 0) {   // Burter: la siguiente, apuntando de nuevo
        e.dashChain--;
        const P = nearestPlayer(e.x, e.y), dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
        startLunge(e, dx / d, dy / d, 0.35, DASH_TIME * 0.8, DASH_SPEED * 1.15, e.r * 2.2);
      }
    }
    if (Math.random() < (e.boss ? 0.5 : 0.15)) G.fx.push({ type: 'spark', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.3, color: '#ffffff', size: e.boss ? 4 : 3 });
  }
}
// Mecánicas de los enemigos comunes (desde el Nivel 2), según su ficha en ENEMIES:
//   spread: disparo en abanico de n · burst: ráfaga de n tiros · lunge: embestida con aviso
//   stomp: pisotón (círculo marcado en el suelo) · ring: anillo de n disparos cada tanto
//   (deathRing, el anillo al morir, está en killEnemy)
const LUNGE = { windup: 0.6, time: 0.35, speed: 6, range: 200, every: [4, 7] };
function enemyTricks(e, P, dt, dx, dy, d) {
  const def = e.def, ang = Math.atan2(dy, dx);
  // Ráfaga en curso: los tiros siguientes salen cada 0,15 s
  if (e.burstLeft > 0 && (e.burstT -= dt) <= 0) { e.burstLeft--; e.burstT = 0.15; enemyShot(e, ang, 4); }
  if (def.lunge && !(e.windup > 0) && !(e.dash > 0)) {
    e.lungeCd = (e.lungeCd ?? rand(...LUNGE.every)) - dt;
    if (e.lungeCd <= 0 && d < LUNGE.range && d > 40) {
      e.lungeCd = rand(...LUNGE.every);
      startLunge(e, dx / d, dy / d, LUNGE.windup, LUNGE.time, LUNGE.speed, e.r * 2);
    }
  }
  if (def.stomp) {
    e.stompCd = (e.stompCd ?? rand(3, 6)) - dt;
    if (e.stompCd <= 0 && d < 240) {
      e.stompCd = rand(5, 8);
      G.hazards.push({ x: P.x, y: P.y, r: def.stomp, t: 1.0, dur: 1.0, dmg: e.dmg * 1.2 });
    }
  }
  if (def.ring) {
    e.ringCd = (e.ringCd ?? rand(2, 5)) - dt;
    if (e.ringCd <= 0 && d < 320) {
      e.ringCd = rand(7, 10);
      for (let i = 0; i < def.ring; i++) enemyShot(e, i / def.ring * Math.PI * 2 + Math.random(), 2.6, 6, 1);
    }
  }
}
// Disparo de los enemigos que disparan: uno solo, en abanico (spread) o en ráfaga (burst)
function enemyFire(e, ang) {
  const def = e.def;
  if (def.spread) for (let i = 0; i < def.spread; i++) enemyShot(e, ang + (i - (def.spread - 1) / 2) * 0.22);
  else enemyShot(e, ang);
  if (def.burst) { e.burstLeft = def.burst - 1; e.burstT = 0.15; }
}
function updateEnemies(k, dt) {
  const farR = Math.hypot(BW, BH), alive = alivePlayers();
  if (!alive.length) return;
  G.pathBudget = 2;   // caminos por los puentes que se pueden buscar en este cuadro
  for (const e of G.enemies) {
    if (e.dead) continue;
    const ox = e.x, oy = e.y;
    const P = nearestPlayer(e.x, e.y);
    const dc = !e.boss && G.decoys.length ? nearDecoy(e) : null, T = dc || P;   // Zanzoken: van hacia la imagen residual
    const dx = T.x - e.x, dy = T.y - e.y, d = Math.hypot(dx, dy) || 1;
    let sp = e.speed;
    const stunned = e.stun > 0;   // Taiyoken: paralizado, no se mueve ni ataca
    if (stunned) e.stun -= dt;
    if (e.shooter && d < 230 && !stunned) {
      sp *= 0.15;
      e.cd -= dt;
      if (e.cd <= 0) { e.cd = rand(3, 4.5); enemyFire(e, Math.atan2(dy, dx)); }
    }
    if (!stunned) {
      if (e.boss) bossAI(e, P, k, dt, dx, dy, d);
      else enemyTricks(e, P, dt, dx, dy, d);
    }
    updateLunge(e, k, dt);
    if (e.windup > 0 || e.cast || stunned) sp = 0;   // quieto mientras avisa la embestida o carga su técnica
    if (e.tp) {   // jefe teletransportándose: se queda quieto y reaparece en la marca
      sp = 0; e.tp.t -= dt;
      if (e.tp.t <= 0) {
        const ringOut = e.tp.ring;
        e.x = e.tp.x; e.y = e.tp.y; e.tp = null; burst(e.x, e.y, '#ffffff', 18, 5, 3); ring(e.x, e.y, 60, 0.4, '#ffffff');
        if (ringOut) for (let i = 0; i < 14; i++) enemyShot(e, i / 14 * Math.PI * 2, 3.2, 7, 1);   // Kid Buu
      }
    }
    // Rumbo: el jugador, el próximo punto del camino por los puentes, o lejos del jugador si se rindió
    let mx = dx, my = dy;
    // Cada cuarto de segundo: ¿te ve (sin nubes en línea recta)? Entonces deja el camino o la huida y va directo.
    // Y si te moviste lejos del final de su camino, lo descarta (si se vuelve a trabar, busca uno nuevo)
    if ((e.path || e.flee) && (e.losT = (e.losT || 0) - dt) <= 0) {
      e.losT = 0.25;
      if (d < 420 && clearLine(e.x, e.y, P.x, P.y, e.scale)) { e.path = null; e.flee = false; }
      else if (e.path) { const end = e.path[e.path.length - 1]; if (!end || Math.hypot(end[0] - P.x, end[1] - P.y) > 150) e.path = null; }
      if (e.flee && (e.fleeT = (e.fleeT || 0) + 0.25) > 4) { e.flee = false; e.fleeT = 0; }   // se rinde solo un rato
    }
    if (e.flee) { mx = -dx; my = -dy; }
    else if (e.path) {
      let w = e.path[e.pi];
      while (w && Math.hypot(w[0] - e.x, w[1] - e.y) < 18) w = e.path[++e.pi];
      e.pathAge += dt;
      if (!w || e.pathAge > 6) e.path = null; else { mx = w[0] - e.x; my = w[1] - e.y; }
    }
    const md = Math.hypot(mx, my) || 1;
    e.x += mx / md * sp * k; e.y += my / md * sp * k;
    pushOutOfSolids(e, 12 * e.scale, e.r * 0.5);
    enemyTerrain(e, ox, oy, dt, sp * k, P);
    e.facing = dx >= 0 ? 1 : -1;
    if (e.flash > 0) e.flash -= dt;
    // Bombardero: al tocar a un guerrero explota y daña a todos los que estén cerca
    if (e.def.kamikaze && alive.some(Q => (Q.x - e.x) ** 2 + (Q.y - e.y) ** 2 < (e.r + Q.r + 4) ** 2)) {
      for (const Q of alive) if ((Q.x - e.x) ** 2 + (Q.y - e.y) ** 2 < 46 ** 2) hurtPlayer(Q, e.dmg);
      burst(e.x, e.y, '#ffa53d', 18, 4, 3);
      playAnim('explosion', e.x, e.y - 6, 1.6);
      sfx('boom', 0.2);
      e.dead = true;
      continue;
    }
    if (!stunned) for (const Q of alive) if ((Q.x - e.x) ** 2 + (Q.y - e.y) ** 2 < (e.r + Q.r) ** 2) {
      const before = Q.hp;
      hurtPlayer(Q, e.dmg);
      if (e.drainDash && Q.hp < before) {   // Cell Imperfecto: la cola le devuelve vida
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.04); e.drainDash = false;
        burst(e.x, e.y, '#6aff8a', 14, 3, 3); addText(e.x, e.y - 40 * e.scale, '¡Absorbido!', '#6aff8a');
      }
    }
    // Los enemigos que quedan muy atrás reaparecen delante
    if (!e.boss && d > farR) { const p = spawnPos(); e.x = p.x; e.y = p.y; e.flee = false; e.path = null; e.air = null; }
  }
  separate();
  G.enemies = G.enemies.filter(e => !e.dead);
}
function separate() {
  const cell = 32, grid = new Map();
  for (const e of G.enemies) {
    const key = Math.floor(e.x / cell) * 100003 + Math.floor(e.y / cell);
    let b = grid.get(key); if (!b) grid.set(key, b = []); b.push(e);
  }
  for (const e of G.enemies) {
    const cx = Math.floor(e.x / cell), cy = Math.floor(e.y / cell);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const b = grid.get((cx + ox) * 100003 + cy + oy);
      if (!b) continue;
      for (const o of b) {
        if (o === e) continue;
        const dx = e.x - o.x, dy = e.y - o.y, min = (e.r + o.r) * 0.8, d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2), push = (min - d) * 0.25;
        if (!e.boss) { const ox = e.x, oy = e.y; e.x += dx / d * push; e.y += dy / d * push; keepOnGround(e, ox, oy); }
      }
    }
  }
}
function updateShots(k, dt) {
  const alive = alivePlayers();
  const shields = alive.flatMap(P => orbitPositions(P).filter(o => o.shield));   // Escudo de Ki
  for (const s of G.shots) {
    if (s.home && alive.length) {   // persigue al jugador más cercano, girando de a poco
      const P = nearestPlayer(s.x, s.y), sp = Math.hypot(s.vx, s.vy), a = Math.atan2(s.vy, s.vx);
      let da = Math.atan2(P.y - s.y, P.x - s.x) - a;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      const na = a + Math.max(-s.home * dt, Math.min(s.home * dt, da));
      s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp;
    }
    s.x += s.vx * k; s.y += s.vy * k; s.life -= dt;
    if (s.life <= 0) { s.dead = true; continue; }
    if (shields.some(o => (s.x - o.x) ** 2 + (s.y - o.y) ** 2 < (o.r + s.r + 2) ** 2)) {
      s.dead = true; burst(s.x, s.y, '#7dffb0', 5, 2); continue;
    }
    for (const P of alive) {
      if (Math.hypot(s.x - P.x, s.y - P.y) < s.r + P.r - 2) {
        const was = P.inv > 0 || P.immortal > 0;
        hurtPlayer(P, s.dmg); s.dead = true;
        if (s.stone && !was) { P.stone = 1.2; addText(P.x, P.y - 30, '¡Petrificado!', '#d8d8d0', true); }   // Dabura
        break;
      }
    }
  }
  G.shots = G.shots.filter(s => !s.dead);
  for (const h of G.hazards) {
    h.t -= dt;
    if (h.t <= 0) {
      h.dead = true;
      if (!h.dmg) continue;   // solo una marca (de dónde sale algo): no daña
      let caught = false;
      for (const P of alive) if (Math.hypot(P.x - h.x, P.y - h.y) < h.r) { const b = P.hp; hurtPlayer(P, h.dmg); if (P.hp < b) caught = true; }
      if (h.drain !== undefined && caught) {   // Androide 19 / Dr. Gero: se cura con la energía absorbida
        const g = G.enemies.find(q => q.nid === h.drain && !q.dead);
        if (g) { g.hp = Math.min(g.maxHp, g.hp + g.maxHp * 0.06); burst(g.x, g.y, '#6aff8a', 18, 3, 3); addText(g.x, g.y - 40 * g.scale, '¡Absorbido!', '#6aff8a'); }
      }
      ring(h.x, h.y, h.r, 0.35, '#ff5c3d');
      burst(h.x, h.y, '#ffb35c', 16, 4, 4);
      sfx('boom', 0.1);
    }
  }
  G.hazards = G.hazards.filter(h => !h.dead);
  tickLanes(dt);
}
// Las marcas de embestida siguen visibles (apagándose) mientras el jefe cruza
function tickLanes(dt) {
  for (const l of G.lanes) l.t -= dt;
  G.lanes = G.lanes.filter(l => l.t > -DASH_TIME);
}

// ─── Objetos y experiencia ───────────────────────────────────────────────────
function updatePickups(k) {
  if (!alivePlayers().length) return;
  for (const p of G.pickups) {
    // Las gemas atraídas por la Cápsula de Bulma van hacia quien la recogió, acelerando de a poco
    const owner = p.to !== undefined && G.players.find(o => o.id === p.to && !o.dead && !o.gone && !o.hidden);
    const P = owner || nearestPlayer(p.x, p.y);
    const dx = P.x - p.x, dy = P.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (!p.pulled && d < (p.kind === 'xp' ? magnetRange(P) : 40)) p.pulled = true;
    if (p.pulled) {   // nunca avanzan más de lo que les falta, para no pasarse de largo
      p.sp = Math.min(owner ? 16 : 14, p.sp + (owner ? 0.18 : 0.5) * k);
      const step = Math.min(p.sp * k, d);
      p.x += dx / d * step; p.y += dy / d * step;
    }
    if (d < P.r + 6) { p.dead = true; collect(p, P); }
  }
  G.pickups = G.pickups.filter(p => !p.dead);
  // Si hay demasiados orbes, se juntan los que están fuera de pantalla con otros del mismo
  // lugar (por celdas de 80 px): la experiencia se conserva y lo que se ve no desaparece
  if (G.pickups.length > 400) {
    const players = alivePlayers();
    const hw = Math.max(BW, 700) / 2 + 60, hh = Math.max(BH, 500) / 2 + 60;   // margen por pantallas más grandes
    const offscreen = p => p.kind === 'xp' && !p.pulled && players.every(P => Math.abs(P.x - p.x) > hw || Math.abs(P.y - p.y) > hh);
    const cells = new Map();
    G.pickups = G.pickups.filter(p => {
      if (!offscreen(p)) return true;
      const key = `${Math.floor(p.x / 80)},${Math.floor(p.y / 80)}`, host = cells.get(key);
      if (!host) { cells.set(key, p); return true; }
      host.v += p.v;
      return false;
    });
  }
}
function collect(p, P) {
  if (p.kind === 'xp') { gainXp(p.v * (1 + (P.c.xpBonus || 0) + perk(P, 'xp'))); sfx('pickup', 0.03); }
  else if (p.kind === 'senzu') {
    const bag = P.passives.senzubag || 0;   // Bolsa de Semillas: cura más y sube la salud máxima
    if (bag) { P.maxHp += 2 * bag; }
    achEvent(P, 'senzu'); healPlayer(P, P.maxHp * (0.5 + 0.1 * bag)); addText(P.x, P.y - 26, 'Semilla del Ermitaño', '#6cff7a', true); sfx('levelup'); }
  else if (p.kind === 'capsule') {
    // Cápsula de Bulma: todas las gemas de experiencia del mapa vuelan hacia quien la recogió
    for (const g of G.pickups) if (g.kind === 'xp' && !g.dead) { g.pulled = true; g.to = P.id; g.sp = Math.max(g.sp, 0.5); }
    poof(p.x, p.y);
    addText(P.x, P.y - 26, '¡Cápsula de Bulma!', '#8fd8ff', true);
    if (P === G.me) announce('¡Toda la experiencia viene hacia ti!', '#8fd8ff');
    ring(P.x, P.y, 160, 0.5, '#8fd8ff');
    sfx('power');
  }
  else if (p.kind === 'ball') {
    G.dragonBalls++;
    sfx('ball');
    if (G.dragonBalls >= ballsNeeded()) { G.dragonBalls = 0; G.ballsNeeded = baseBalls(); G.pendingWishes++; summonShenlong(); }
    else announce('Esfera del Dragón {n}/{max}', '#ffb81c', { n: G.dragonBalls, max: ballsNeeded() });
  }
}
// Atajos del modo prueba (solo en solitario o como anfitrión, que es quien maneja la partida)
const TEST_KEYS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F8', 'F9', 'F10'];
// Interruptores del modo prueba (también son botones en el cartel, para el celular):
//   god: no recibes daño · fast: el tiempo pasa 5 veces más rápido · noSpawn: no aparecen enemigos comunes
//   (los jefes siguen saliendo a su hora; también con F3)
const TEST_TOGGLES = { god: 'testGod', fast: 'testFast', noSpawn: 'testNoSpawn' };
function testToggle(kind) {
  if (!TEST_MODE || !G || !isAuthority()) return;
  const key = TEST_TOGGLES[kind], on = G[key] = !G[key], P = G.me;
  if (kind === 'noSpawn' && on) for (const e of G.enemies) if (!e.boss) e.dead = true;   // se van los que había
  const text = { god: on ? 'Prueba: inmortal' : 'Prueba: sin inmortalidad', fast: on ? 'Prueba: tiempo x5' : 'Prueba: tiempo normal',
    noSpawn: on ? 'Prueba: sin enemigos' : 'Prueba: vuelven los enemigos' }[kind];
  addText(P.x, P.y - 30, text, '#ffd93b', true);
  syncTestButtons();
}
function syncTestButtons() {
  for (const kind of Object.keys(TEST_TOGGLES)) {
    const b = document.querySelector(`[data-test="${kind}"]`);
    if (b) b.classList.toggle('on', !!(G && G[TEST_TOGGLES[kind]]));
  }
}
function testKey(e) {
  if (!TEST_KEYS.includes(e.code)) return false;
  e.preventDefault();   // F1 ayuda, F3 buscar, F5 recargar: no deben hacer lo del navegador
  if (e.code === 'F6' && !e.repeat) { toggleTestPowers(); return true; }
  if (e.repeat || !isAuthority() || G.mode !== 'play') return true;
  const P = G.me;
  if (e.code === 'F1') { gainXp(G.xpNext - G.xp); addText(P.x, P.y - 30, 'Prueba: +1 nivel', '#3dff7a', true); }
  if (e.code === 'F2') { P.ki = 100; addText(P.x, P.y - 30, 'Prueba: Ki al máximo', '#ffd93b', true); }
  if (e.code === 'F3') {
    const b = levelBoss(G.bossIdx);
    if (b) { G.bossIdx++; spawnBoss(b); addText(P.x, P.y - 30, 'Prueba: {name}', '#ff5c5c', true, { name: b.name }); }
    else addText(P.x, P.y - 30, 'Ya aparecieron todos los jefes', '#ffffff', true);
  }
  if (e.code === 'F4') collect({ kind: 'ball' }, P);
  if (e.code === 'F8') testToggle('god');
  if (e.code === 'F9') testToggle('fast');
  if (e.code === 'F10') testToggle('noSpawn');
  if (e.code === 'F5') {
    for (const a of P.attacks) if (!ATTACKS[a.id].evolved) a.lvl = MAX_ATTACK_LEVEL;
    addText(P.x, P.y - 30, 'Prueba: técnicas a nivel 5', '#8fe3ff', true);
  }
  return true;
}
// Experiencia para el nivel siguiente: un 16% más que el anterior (+5); en el Nivel 5 crece más despacio
const nextXp = n => Math.floor(n * (G.lv.infinite ? KAIO.xpGrow : 1.16) + 5);
function gainXp(v) {
  v *= 1 + 0.08 * Math.max(0, ...G.players.map(P => P.passives.gravity || 0));   // Entrenamiento en gravedad
  G.xp += v;
  while (G.xp >= G.xpNext) {
    G.xp -= G.xpNext;
    G.level++;
    G.xpNext = nextXp(G.xpNext);
    G.pendingLevels++;
  }
  maybeStartRound();
}

// ─── Rondas de elección (subida de nivel y deseos) ───────────────────────────
// La partida se detiene hasta que todos los jugadores conectados eligen.
// ─── Aparición de Shenlong: la partida se detiene unos segundos con la escena y después aparecen los deseos ───
const SUMMON_TIME = 2.4;
const ballsNeeded = () => (G && G.ballsNeeded) || 7;
function summonShenlong() {
  G.mode = 'summon'; G.summonT = SUMMON_TIME; G.shake = 0; G.banner = null;   // sin carteles encima del pedido
  sfx('boss'); sfx('power');
}
// El anfitrión (o el juego en solitario) decide cuándo termina; en online los demás solo la dibujan con su reloj
function tickSummon(dt) {
  if (!G) return;
  if (G.mode !== 'summon') { G.summonT = undefined; return; }
  G.summonT = (G.summonT ?? SUMMON_TIME) - dt;
  // (si quedó una elección abierta, por subir de nivel justo al juntar la séptima esfera, se vuelve a ella pausado)
  if (isAuthority() && G.summonT <= 0) { G.mode = G.round ? 'choice' : 'play'; G.summonT = undefined; maybeStartRound(); }
}
function drawSummon() {
  if (G.mode !== 'summon') return;
  const p = Math.min(1, 1 - (G.summonT ?? SUMMON_TIME) / SUMMON_TIME), now = performance.now() / 1000;
  const V = viewer(), px = (V.x - camX + BW / 2) * SCALE, py = (V.y - camY + BH / 2) * SCALE;
  const fade = Math.min(1, p * 3);
  // El cielo se oscurece como una viñeta: más suave alrededor del guerrero
  const sky = ctx.createRadialGradient(px, py, 40, px, py, Math.hypot(W, H) * 0.7);
  sky.addColorStop(0, `rgba(10, 40, 18, ${0.25 * fade})`); sky.addColorStop(1, `rgba(2, 10, 6, ${0.72 * fade})`);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';   // las luces se suman: bordes suaves y brillantes
  // Resplandor redondo en la base
  const base = ctx.createRadialGradient(px, py, 4, px, py, 70 + 30 * p);
  base.addColorStop(0, `rgba(200, 255, 190, ${0.55 * fade})`); base.addColorStop(1, 'rgba(60, 200, 90, 0)');
  ctx.fillStyle = base; ctx.beginPath(); ctx.arc(px, py, 70 + 30 * p, 0, Math.PI * 2); ctx.fill();
  // Haz de luz con los bordes difuminados (se va afinando hacia arriba)
  const rise = Math.min(1, p * 1.5), top = py - (py + 60) * rise, bw = 26 + 36 * p;
  const beam = ctx.createLinearGradient(px - bw, 0, px + bw, 0);
  beam.addColorStop(0, 'rgba(90, 255, 120, 0)'); beam.addColorStop(0.5, `rgba(170, 255, 170, ${0.45 * fade})`); beam.addColorStop(1, 'rgba(90, 255, 120, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath(); ctx.moveTo(px - bw, py); ctx.quadraticCurveTo(px - bw * 0.4, (py + top) / 2, px, top);
  ctx.quadraticCurveTo(px + bw * 0.4, (py + top) / 2, px + bw, py); ctx.closePath(); ctx.fill();
  // Cinta de luz serpenteante que sube (el cuerpo de Shenlong): círculos suaves sobre una onda
  const len = 46;
  for (let i = 0; i < len; i++) {
    const f = i / len, y = py - f * (py + 40) * rise;
    if (y < -20) break;
    const x = px + Math.sin(f * 9 - now * 4) * (18 + 40 * f) * Math.min(1, p * 2);
    const r = 13 * (1 - f * 0.6);
    const dot = ctx.createRadialGradient(x, y, 0, x, y, r);
    dot.addColorStop(0, `rgba(220, 255, 210, ${0.5 * fade * (1 - f * 0.5)})`); dot.addColorStop(1, 'rgba(80, 230, 110, 0)');
    ctx.fillStyle = dot; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // Chispas que suben
  for (let i = 0; i < 24; i++) {
    const ph = (now * 0.6 + i / 24) % 1, sx = px + Math.sin(i * 7.1 + now) * (40 + 30 * Math.sin(i)), sy = py - ph * 260;
    ctx.fillStyle = `rgba(200, 255, 200, ${(1 - ph) * 0.8 * fade})`;
    ctx.beginPath(); ctx.arc(sx, sy, 1.5 + (i % 3) * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // Las siete esferas girando alrededor
  for (let i = 0; i < 7; i++) {
    const a = now * 2.5 + i / 7 * Math.PI * 2, r = 70 - 25 * p;
    drawDragonBall(ctx, px + Math.cos(a) * r, py - 10 + Math.sin(a) * r * 0.45, 7, i + 1, false);
  }
  // El pedido
  if (p > 0.3) {
    ctx.globalAlpha = Math.min(1, (p - 0.3) * 3);
    hudText(t('¡Sal, Shenlong! ¡Concede mis deseos!'), W / 2, H * 0.24, W < 640 ? 18 : 28, '#7dff8a', 'center');
    ctx.globalAlpha = 1;
  }
}
function maybeStartRound() {
  if (G.round || G.mode === 'over' || G.mode === 'summon' || G.victoryAt) return;   // tras el jefe final no hay más elecciones
  const kind = G.pendingWishes > 0 ? 'wish' : G.pendingLevels > 0 ? 'level' : null;
  if (!kind) return;
  G.round = {
    id: ++G.roundSeq, kind, level: G.level - G.pendingLevels + 1,
    waiting: new Set(G.players.filter(p => !p.gone && !p.ally).map(p => p.id)),
  };
  if (kind === 'wish') {
    G.round.offers = {};
    for (const id of G.round.waiting) G.round.offers[id] = wishOffer(G.players.find(p => p.id === id));
  }
  G.mode = 'choice';
  sfx(kind === 'wish' ? 'power' : 'levelup');
}
function applyPick(pid, roundId, choice) {
  const r = G.round;
  if (!r || r.id !== roundId || !r.waiting.has(pid)) return;
  const P = G.players.find(p => p.id === pid);
  if (P) { if (r.kind === 'level') applyOption(P, choice); else applyWish(P, choice); }
  r.waiting.delete(pid);
  if (!r.waiting.size) finishRound();
}
function finishRound() {
  const r = G.round;
  G.round = null;
  if (r.kind === 'level') G.pendingLevels = Math.max(0, G.pendingLevels - 1);
  else G.pendingWishes = Math.max(0, G.pendingWishes - 1);
  if (r.kind === 'level') {   // el poder nuevo se nota: anillo dorado y un temblor chico
    G.shake = Math.max(G.shake, 0.25);
    for (const P of G.players) if (!P.dead && !P.gone) { ring(P.x, P.y, 70, 0.5, '#ffd93b'); burst(P.x, P.y - 8, '#ffe27a', 12, 3, 2); }
  }
  if (r.kind === 'level') for (const P of G.players) {   // Mr. Satán posa, y los enemigos cercanos se quedan mirándolo
    if (!P.c.pose || P.dead || P.gone) continue;
    P.poseT = 1.2;
    for (const e of G.enemies) if (!e.boss && Math.hypot(e.x - P.x, e.y - P.y) < 150) e.stun = Math.max(e.stun || 0, 1);
    addText(P.x, P.y - 34, '¡JA, JA, JA!', '#ffd93b', true);
  }
  G.mode = 'play';
  maybeStartRound();
}
// ¿Esta técnica ya puede evolucionar? (nivel máximo + la mejora de la partida que pide, al menos nivel 1)
function canEvolve(P, a) {
  const evo = EVOLUTION_OF[a.id];
  return !!evo && a.lvl >= MAX_ATTACK_LEVEL && P.passives[ATTACKS[evo].needs] > 0 && canLearn(P.charId, evo);
}
// Descartar y bloquear cartas (2.32.0): lo descartado (la técnica o la mejora entera) no vuelve a salir en la partida;
// lo bloqueado sale primero en las próximas subidas de nivel hasta que lo elijas o lo desbloquees
const optKey = o => (o.kind === 'passive' ? 'p:' : 'a:') + o.id;
// Cartas de relleno cuando quedan menos de 3 opciones (todo al máximo o casi)
const FILLERS = ['train', 'body', 'heal', 'ki', 'zeni'];
const FILL_DMG = 0.05, FILL_HP = 15;
const isFiller = o => FILLERS.includes(o.kind);
function buildOptions(P) {
  const pool = cardPool(P);
  // Las evoluciones disponibles siempre aparecen (primero), después la bloqueada; el resto se completa al azar
  const evolves = P.attacks.filter(a => canEvolve(P, a)).map(a => ({ kind: 'evolve', id: a.id }));
  const lk = P.locked && pool.find(o => optKey(o) === optKey(P.locked));
  if (!lk) P.locked = null;   // ya no se puede elegir (por ejemplo, sin casillas libres)
  return fillOptions([...evolves, ...(lk ? [lk] : []), ...shuffle(pool.filter(o => o !== lk))].slice(0, 3));
}
function fillOptions(chosen) {
  // primero las que hacen crecer (daño y salud), después una de las otras
  const ok = k => !chosen.some(o => o.kind === k) && !(k === 'ki' && rule('notrans'));
  const free = [...shuffle(FILLERS.slice(0, 2).filter(ok)), ...shuffle(FILLERS.slice(2).filter(ok))];
  while (chosen.length < 3 && free.length) chosen.push({ kind: free.shift() });
  return chosen;
}
// Otra carta en lugar de la descartada, distinta de las que ya están a la vista
function replacementOption(P, shown) {
  const keys = new Set(shown.filter(o => !isFiller(o)).map(optKey));
  const o = shuffle(cardPool(P).filter(x => !keys.has(optKey(x))))[0];
  return o || fillOptions(shown.slice())[shown.length];
}
function cardPool(P) {
  const opts = [];
  for (const a of P.attacks) if (a.lvl < MAX_ATTACK_LEVEL) opts.push({ kind: 'up', id: a.id });
  if (P.attacks.length < MAX_ATTACKS) {
    for (const id in ATTACKS) {
      if (ATTACKS[id].evolved || !canLearn(P.charId, id)) continue;
      if (ATTACKS[id].reward && !(SAVE.rewards || {})[ATTACKS[id].reward]) continue;   // premios (el Kaioken: Camino de la Serpiente)
      if (!P.attacks.some(a => a.id === id || a.id === EVOLUTION_OF[id])) opts.push({ kind: 'new', id });
    }
  }
  // Mejoras: subir las que ya tienes, o sumar una nueva si queda casilla libre (mismo tope que las técnicas)
  const ownedPassives = Object.keys(PASSIVES).filter(id => P.passives[id] > 0).length;
  for (const id in PASSIVES) {
    if (P.passives[id] >= passiveMax(id) || (P.c.noPassives || []).includes(id)) continue;
    if (P.passives[id] > 0 || ownedPassives < maxPassives(P)) opts.push({ kind: 'passive', id });
  }
  const banned = new Set(P.banned || []);
  return opts.filter(o => !banned.has(optKey(o)));
}
// Estadísticas de las técnicas que se muestran en las cartas: [nombre, unidad, decimales]
const STAT_INFO = {
  dmg: [t('Daño'), '', 0], cd: [t('Recarga'), ' s', 1], count: [t('Cantidad'), '', 0], len: [t('Alcance'), '', 0],
  width: [t('Ancho'), '', 0], dur: [t('Duración'), ' s', 2], r: [t('Tamaño'), '', 0], pierce: [t('Atraviesa'), '', 0],
  life: [t('Duración'), ' s', 1], radius: [t('Radio'), '', 0], spin: [t('Velocidad de giro'), '', 1], explode: [t('Radio de explosión'), '', 0],
  bounce: [t('Rebotes'), '', 0], heal: [t('Curación'), '', 0], stun: [t('Parálisis'), ' s', 1], taunt: [t('Atracción'), '', 0],
  boost: [t('Poder extra'), '', 0], cost: [t('Costo de vida'), '%', 0],
  legend: [t('Golpe legendario'), '', 1], trip: [t('Probabilidad de tropezar'), '', 0], boss: [t('Daño a los jefes (legendario)'), '', 0],
};
function fmtStat(k, v) {
  if (k === 'boost') return `+${Math.round(v * 100)}%`;   // Kaioken
  if (k === 'legend') return `${+(v * 100).toFixed(1)}%`;   // Mr. Satán
  if (k === 'trip') return `${Math.round(v * 100)}%`;
  if (k === 'boss') return `${Math.round(v * 100)}% ${t('de su vida')}`;
  if (k === 'pierce') return v >= 99 ? t('a todos') : v ? tn(v, '{n} enemigo', '{n} enemigos') : t('no');
  const [, unit, dec] = STAT_INFO[k];
  return (dec ? String(+v.toFixed(dec)) : String(Math.round(v))) + unit;
}
// Qué cambia al subir una técnica de nivel (o sus valores iniciales si es nueva)
function attackStatLines(id, lvl) {
  const def = ATTACKS[id];
  if (!lvl) {
    const s = def.stats(1);
    return ['dmg', 'cd', 'count'].filter(k => s[k] !== undefined && !(k === 'count' && s[k] < 2))
      .map(k => `${STAT_INFO[k][0]}: ${fmtStat(k, s[k])}`);
  }
  return statDiff(def.stats(lvl), def.stats(lvl + 1));
}
function statDiff(a, b) {
  return Object.keys(STAT_INFO).filter(k => (a[k] !== undefined || b[k] !== undefined) && fmtStat(k, a[k] || 0) !== fmtStat(k, b[k] || 0))
    .map(k => `${STAT_INFO[k][0]}: ${fmtStat(k, a[k] || 0)} → ${fmtStat(k, b[k] || 0)}`);
}
// Pista de evolución para las cartas: qué falta para evolucionar una técnica o para qué sirve una mejora
// ★ COMBO: la carta sirve para evolucionar algo que ya tienes (la mejora que le falta a tu técnica, o subir una
// técnica cuya mejora ya tienes). Aviso: tomar esta mejora llena tu última casilla y alguna técnica ya no podría evolucionar.
function cardCombo(P, o) {
  if (o.kind === 'passive' && !P.passives[o.id]) {
    const a = P.attacks.find(x => EVOLUTION_OF[x.id] && ATTACKS[EVOLUTION_OF[x.id]].needs === o.id && canLearn(P.charId, EVOLUTION_OF[x.id]));
    if (a) return { combo: t('Combina con tu {name}: con esta mejora puede evolucionar', { name: ATTACKS[a.id].name }) };
    const used = Object.keys(PASSIVES).filter(k => P.passives[k] > 0).length;
    if (used === maxPassives(P) - 1) {   // última casilla: ¿deja afuera la mejora que alguna técnica necesita?
      const stuck = P.attacks.find(x => { const e = EVOLUTION_OF[x.id]; return e && canLearn(P.charId, e) && !P.passives[ATTACKS[e].needs]; });
      if (stuck) return { warn: t('Es tu última casilla de mejoras: tu {name} ya no podría evolucionar (necesita {need})', { name: ATTACKS[stuck.id].name, need: PASSIVES[ATTACKS[EVOLUTION_OF[stuck.id]].needs].name }) };
    }
  }
  if (o.kind === 'up' || o.kind === 'new') {
    const e = EVOLUTION_OF[o.id];
    if (e && canLearn(P.charId, e) && P.passives[ATTACKS[e].needs] > 0) return { combo: t('Ya tienes {need}: a nivel {max} evoluciona en {evo}', { need: PASSIVES[ATTACKS[e].needs].name, max: MAX_ATTACK_LEVEL, evo: ATTACKS[e].name }) };
  }
  return {};
}
function evolveHint(P, o) {
  if (o.kind === 'up' || o.kind === 'new') {
    const evo = EVOLUTION_OF[o.id];
    return evo ? t('★ Evoluciona en {evo} con {need} (técnica a nivel {max})', { evo: ATTACKS[evo].name, need: PASSIVES[ATTACKS[evo].needs].name, max: MAX_ATTACK_LEVEL }) : '';
  }
  if (o.kind === 'passive' && !P.passives[o.id]) {
    const a = P.attacks.find(x => EVOLUTION_OF[x.id] && ATTACKS[EVOLUTION_OF[x.id]].needs === o.id);
    return a ? t('★ Necesaria para evolucionar tu {name}', { name: ATTACKS[a.id].name }) : '';
  }
  return '';
}
function passiveStatLines(P, id) {
  const l = P.passives[id], n = l + 1;
  switch (id) {
    case 'power': return [`${t('Daño')}: +${12 * l}% → +${12 * n}%`];
    case 'speed': return [`${t('Velocidad')}: +${8 * l}% → +${8 * n}%`];
    case 'vital': return [`${t('Salud máxima')}: ${P.maxHp} → ${P.maxHp + 20}`];
    case 'focus': return [`${t('Recarga')}: -${8 * l}% → -${8 * n}%`];
    case 'sense': { const m = 1 + perk(P, 'magnet'); return [`${t('Radio de atracción')}: ${Math.round((55 + 28 * l) * m)} → ${Math.round((55 + 28 * n) * m)}`]; }
    case 'armor': return [`${t('Daño recibido por golpe')}: ${l ? -l : 0} → -${n}`];
    case 'crit': return [`${t('Probabilidad de crítico')}: ${8 + 4 * l}% → ${8 + 4 * n}%`];
    case 'kictl': return [`${t('Carga del Ki')}: +${15 * l}% → +${15 * n}%`];
    case 'absorb': return [`${t('Probabilidad de curarte al derrotar')}: ${3 * l}% → ${3 * n}%`];
    case 'area': return [`${t('Tamaño y área')}: +${8 * l}% → +${8 * n}%`];
    case 'multi': return [`${t('Proyectiles extra')}: +${multiExtra(l)} → +${multiExtra(n)}`];
    case 'luck': return [`${t('Semillas y cápsulas')}: +${luckPct(l)}% → +${luckPct(n)}%`, `${t('Zeni al terminar')}: +${luckPct(l)}% → +${luckPct(n)}%`];
    case 'gravity': return [`${t('Experiencia')}: +${8 * l}% → +${8 * n}%`];
    case 'instinct': return [`${t('Probabilidad de esquivar')}: ${3 * l}% → ${3 * n}%`];
    case 'regen': return [`${t('Regeneración')}: ${(0.25 * l).toFixed(2)}/s → ${(0.25 * n).toFixed(2)}/s`];
    case 'aura': return [`${t('Daño por toque')}: ${4 * l} → ${4 * n} ${t('cada 0,5 s')}`];
    case 'tracker': return [`${t('Daño a jefes y élite')}: +${25 * l}% → +${25 * n}%`];
    case 'sustain': return [`${t('Duración')}: +${25 * l}% → +${25 * n}%`];
    case 'meditate': return [`${t('Curación quieto')}: ${(0.6 * l).toFixed(1)}/s → ${(0.6 * n).toFixed(1)}/s`, `${t('Ki quieto')}: +${l}/s → +${n}/s`];
    case 'fury': return [`${t('Daño extra con poca salud')}: +${15 * l}% → +${15 * n}%`];
    case 'senzubag': return [`${t('Curación de las semillas')}: ${50 + 10 * l}% → ${50 + 10 * n}%`, `${t('Salud máxima por semilla')}: +${2 * l} → +${2 * n}`];
  }
  return [];
}
function optionCard(P, o) {
  if (o.kind === 'evolve') {
    const base = ATTACKS[o.id], evo = ATTACKS[EVOLUTION_OF[o.id]];
    return { color: evo.color, name: evo.name, tag: t('★ ¡EVOLUCIÓN! ({name})', { name: base.name }), desc: evo.desc,
      stats: statDiff(base.stats(MAX_ATTACK_LEVEL), evo.stats()), evolve: true, icon: ['atk', EVOLUTION_OF[o.id]], kind: 'atk' };
  }
  if (o.kind === 'up' || o.kind === 'new') {
    const def = ATTACKS[o.id], a = P.attacks.find(x => x.id === o.id);
    const cb = cardCombo(P, o);
    return { color: def.color, name: def.name, tag: a ? t('Nivel {a} → {b}', { a: a.lvl, b: a.lvl + 1 }) : t('¡Nueva técnica!'), desc: def.desc,
      stats: attackStatLines(o.id, a ? a.lvl : 0), hint: cb.combo ? '' : evolveHint(P, o), combo: cb.combo, icon: ['atk', o.id], kind: 'atk' };
  }
  if (o.kind === 'passive') {
    const def = PASSIVES[o.id], l = P.passives[o.id];
    const cb = cardCombo(P, o);
    return { color: def.color, name: def.name, tag: t('Nivel {a} → {b}', { a: l, b: l + 1 }), desc: def.desc, stats: passiveStatLines(P, o.id),
      hint: cb.combo || cb.warn ? '' : evolveHint(P, o), combo: cb.combo, warn: cb.warn, icon: ['pas', o.id], kind: 'pas' };
  }
  if (o.kind === 'heal') return { color: '#6cff7a', name: t('Semilla del Ermitaño'), tag: t('Curación'), desc: t('Recuperas toda tu salud.') };
  if (o.kind === 'train') return { color: '#ff7a3d', name: t('Entrenamiento extremo'), tag: t('Ahora: +{n}% de daño', { n: Math.round((P.limitDmg || 0) * 100) }),
    desc: t('+{n}% de daño para el resto de la partida. Se suma cada vez que lo eliges.', { n: FILL_DMG * 100 }) };
  if (o.kind === 'body') return { color: '#4dff6a', name: t('Cuerpo de guerrero'), tag: t('Salud máxima'),
    desc: t('+{n} de salud máxima (y te cura lo mismo). Se suma cada vez que lo eliges.', { n: FILL_HP }) };
  if (o.kind === 'ki') return { color: '#5cf2ff', name: t('Ki al máximo'), tag: t('Ki'), desc: t('Tu barra de Ki se llena al instante.') };
  return { color: '#ffe27a', name: t('Bolsa de Zeni'), tag: '+50 Zeni', desc: t('Dinero para el futuro.') };
}
// Valida la opción (puede venir de la red) y la aplica al jugador
function applyOption(P, o) {
  if (!o) return;
  if (o.kind === 'up') {
    const a = P.attacks.find(x => x.id === o.id);
    if (a && a.lvl < MAX_ATTACK_LEVEL) a.lvl++;
  } else if (o.kind === 'evolve') {
    const a = P.attacks.find(x => x.id === o.id);
    if (a && canEvolve(P, a)) {
      const evo = ATTACKS[EVOLUTION_OF[a.id]];
      a.id = EVOLUTION_OF[a.id]; a.lvl = MAX_ATTACK_LEVEL; a.cd = 0.3;
      addText(P.x, P.y - 34, '¡{name}!', evo.color, true, { name: evo.name });
      if (P === G.me) announce('¡{name} evolucionó a {evo}!', '#ffd93b', { name: ATTACKS[o.id].name, evo: evo.name });
      sfx('power');
    }
  } else if (o.kind === 'new') {
    if (ATTACKS[o.id] && canLearn(P.charId, o.id) && P.attacks.length < MAX_ATTACKS && !P.attacks.some(a => a.id === o.id)) P.attacks.push({ id: o.id, lvl: 1, cd: 0.3 });
  } else if (o.kind === 'passive') {
    const slotFree = P.passives[o.id] > 0 || Object.keys(PASSIVES).filter(id => P.passives[id] > 0).length < maxPassives(P);
    if (PASSIVES[o.id] && P.passives[o.id] < passiveMax(o.id) && slotFree) {
      P.passives[o.id]++;
      if (o.id === 'vital') { P.maxHp += 20; healPlayer(P, 20); }
    }
  } else if (o.kind === 'heal') healPlayer(P, P.maxHp);
  else if (o.kind === 'zeni') P.bonusZeni += 50;
  else if (o.kind === 'train') P.limitDmg = (P.limitDmg || 0) + FILL_DMG;
  else if (o.kind === 'body') { P.maxHp += FILL_HP; healPlayer(P, FILL_HP); }
  else if (o.kind === 'ki' && P.transformed <= 0) P.ki = 100;
}
// En solitario, Goku y Vegeta pueden pedir la fusión con el otro Saiyajin
const FUSION_WISH = { id: 'fusion', name: t('Fusión'), desc: t('Llega tu rival Saiyajin y os fusionáis en Gogeta durante 40 segundos.') };
// Los deseos que ve un jugador: 3 al azar de la lista y el cuarto fijo (Fusión si puede fusionarse, si no Ki infinito)
const canWishFusion = P => !G.net && !!FUSION_PAIR[P.charId] && !G.fusion && !rule('notrans');
// Volver del Otro Mundo: lo ofrece siempre (en lugar de uno de los 3 al azar) si ya usaste la Semilla de reserva
// (hasta OTHERWORLD_MAX veces por partida: P.owUses cuenta cuántas)
const OTHERWORLD_MAX = 3;
const canWishOtherworld = P => !!P && P.halo && !(P.senzuLeft > 0) && perk(P, 'senzu') > 0 && (P.owUses || 0) < OTHERWORLD_MAX;
// Despertar el poder oculto (2.24.0): la técnica de mayor nivel que tiene evolución y todavía no puede evolucionar
// sola (le falta el nivel máximo o la mejora que pide) evoluciona al instante. Sale en la mitad de las apariciones
const AWAKEN_CHANCE = 0.5;
function awakenTarget(P) {
  if (!P) return null;
  const list = P.attacks.filter(a => EVOLUTION_OF[a.id] && canLearn(P.charId, EVOLUTION_OF[a.id]) && !canEvolve(P, a));
  return list.sort((a, b) => b.lvl - a.lvl)[0] || null;
}
function wishOffer(P) {
  const pool = shuffle(WISH_POOL.map(w => w.id)), back = canWishOtherworld(P) ? ['otherworld'] : [];
  if (awakenTarget(P) && Math.random() < AWAKEN_CHANCE) back.push('awaken');
  if (rule('notrans')) return [...back, ...pool.slice(0, WISH_OFFER + 1 - back.length)];   // sin transformación: el cuarto también sale de la lista
  return [...back, ...pool.slice(0, WISH_OFFER - back.length), P && canWishFusion(P) ? 'fusion' : 'ki'];
}
const wishById = id => id === 'fusion' ? FUSION_WISH : WISHES.find(w => w.id === id);
function wishList(P) {
  const ids = (G.round && G.round.offers && G.round.offers[P.id]) || [];
  return ids.map(wishById).filter(Boolean);
}
const ZENKAI = 0.2;   // Semilla de reserva: +20% de daño y de vida máxima al revivir
const WISH_STRONG = 0.25, WISH_IMMORTAL = 10, WISH_RICHES = 300, WISH_CHAMBER = 3, WISH_KI_TIME = 60, ATTRACT_BALLS = 5;
function applyWish(P, i) {
  const w = wishList(P)[i];
  if (!w) return;
  (P.wishLog = P.wishLog || []).push(w.id);   // (para el backoffice: qué deseos se piden)
  if (!w.extra && w.id !== 'fusion') achEvent(P, 'wish:' + w.id);   // logro «Todos los deseos»
  if (w.id === 'heal') { P.maxHp += 50; healPlayer(P, P.maxHp); }
  if (w.id === 'strong') P.wishDmg = (P.wishDmg || 0) + WISH_STRONG;
  if (w.id === 'chamber') {   // los niveles son del grupo: se suman a las elecciones pendientes
    for (let n = 0; n < WISH_CHAMBER; n++) { G.level++; G.xpNext = nextXp(G.xpNext); G.pendingLevels++; }
  }
  if (w.id === 'immortal') { P.immortal = WISH_IMMORTAL; ring(P.x, P.y, 90, 0.6, '#ffe27a'); }
  if (w.id === 'vanish') {   // los jefes se quedan; el Cíborg no suelta su anillo
    for (const e of G.enemies) if (!e.boss && !e.dead) { e.vanish = true; killEnemy(e, P); }
    G.shake = Math.max(G.shake, 0.5);
    sfx('boom');
  }
  if (w.id === 'riches') { P.bonusZeni += WISH_RICHES; P.wishZeni = (P.wishZeni || 0) + WISH_RICHES; }
  if (w.id === 'attract') G.ballsNeeded = Math.min(ATTRACT_BALLS, baseBalls());
  if (w.id === 'ki') { P.ki = 100; P.transformed = 0; doTransform(P, WISH_KI_TIME, true); }
  if (w.id === 'awaken') {
    const a = awakenTarget(P);
    if (a) {
      const from = a.id, evo = ATTACKS[EVOLUTION_OF[from]];
      a.id = EVOLUTION_OF[from]; a.lvl = MAX_ATTACK_LEVEL; a.cd = 0.3;
      burst(P.x, P.y - 10, evo.color, 24, 4, 3); ring(P.x, P.y, 90, 0.6, '#ffd93b');
      addText(P.x, P.y - 34, '¡{name}!', evo.color, true, { name: evo.name });
      if (P === G.me) announce('¡{name} evolucionó a {evo}!', '#ffd93b', { name: ATTACKS[from].name, evo: evo.name });
      sfx('power');
    }
  }
  if (w.id === 'otherworld') {   // de vuelta del Otro Mundo: la semilla otra vez, sin la aureola (ni el +20% de daño)
    P.senzuLeft = 1; P.halo = false; P.owUses = (P.owUses || 0) + 1;
    burst(P.x, P.y - 10, '#ffe14d', 24, 4, 3); ring(P.x, P.y, 80, 0.6, '#6cff7a');
    addText(P.x, P.y - 34, '¡De vuelta del Otro Mundo!', '#ffe14d', true);
  }
  if (w.id === 'fusion' && !G.fusion) {
    // 2.15.1: cada aliado con su propio id y sin los que ya se retiraron. Antes todos eran el 99: en la segunda
    // fusión se encontraba al aliado viejo (retirado), la fusión se cortaba al instante y el nuevo quedaba quieto
    G.players = G.players.filter(Q => !(Q.ally && Q.gone));
    G.allyN = (G.allyN || 0) + 1;
    const ally = makePlayer(98 + G.allyN, CHARACTERS[FUSION_PAIR[P.charId]].name, FUSION_PAIR[P.charId], {});
    ally.ally = true;
    // El aliado llega a tu altura: su técnica propia a tu mejor nivel, tus mejoras y tu vida máxima,
    // así Gogeta mezcla las técnicas y el poder de los dos
    ally.attacks[0].lvl = Math.max(...P.attacks.map(a => a.lvl));
    ally.passives = { ...P.passives };
    ally.maxHp = ally.hp = P.maxHp;
    ally.x = P.x + 34; ally.y = P.y;
    G.players.push(ally);
    burst(ally.x, ally.y, ally.c.aura, 20, 5, 3);
    startFusion(P, ally, FUSION_TIME_WISH, P.id);
  }
}

// Interfaz de la ronda: cada jugador ve sus propias opciones
let shownRound = 0;
function syncChoiceUI() {
  const r = G.round;
  if (!r) { if (shownRound) { $('levelup').classList.add('hidden'); shownRound = 0; } return; }
  if (shownRound === r.id) return;
  shownRound = r.id;
  if (!r.waiting.has(G.me.id)) { showWaiting(); return; }
  if (r.kind === 'level') showLevelChoices(r);
  else {
    showChoices(t('¡Shenlong ha aparecido! Pide un deseo'),
      wishList(G.me).map(w => {
        const card = { color: w.id === 'fusion' || w.extra ? '#ffe14d' : '#3dff7a', name: w.name, tag: t('Deseo'), desc: w.desc };
        if (w.id === 'awaken') {   // qué técnica evoluciona y en qué
          const a = awakenTarget(G.me);
          if (a) card.desc = t('{name} evoluciona al instante a {evo}, aunque no tenga el nivel máximo ni la mejora que pide.', { name: ATTACKS[a.id].name, evo: ATTACKS[EVOLUTION_OF[a.id]].name });
        }
        if (w.id === 'otherworld') {   // cuántas veces ya te revivió Shenlong en esta partida (hasta 3)
          const n = G.me.owUses || 0;
          card.tag = t('Deseo · {n}/{max}', { n, max: OTHERWORLD_MAX });
          if (n === OTHERWORLD_MAX - 1) card.warn = t('Es la última vez que Shenlong podrá revivirte');
        }
        return card;
      }), i => pickChoice(r.id, i));
  }
}
// Cartas de subida de nivel, con el botón de volver a sortear si te quedan sorteos (Visión de Kaio-sama)
// y los de bloquear y descartar en cada carta (Cápsula Hoipoi y Juicio de Enma). opts: las cartas que ya estaban a la vista
let levelOpts = [], cardMsg = '';
function showLevelChoices(r, opts) {
  const P = G.me;
  levelOpts = opts || buildOptions(P);
  const cards = levelOpts.map(o => {
    const c = optionCard(P, o);
    if (o.kind === 'evolve' || isFiller(o)) return c;
    c.locked = !!P.locked && optKey(P.locked) === optKey(o);
    c.canLock = c.locked || (!P.locked && P.locks > 0);
    c.canDiscard = !c.locked && P.discards > 0;
    return c;
  });
  showChoices(t('¡Nivel {n}! Tu poder aumenta', { n: r.level }), cards, i => pickChoice(r.id, levelOpts[i]));
  if (!opts) cardMsg = '';
  if (perk(P, 'lock') || perk(P, 'discard')) {   // qué hace cada botón, cuántos te quedan y lo último que hiciste
    const h = document.createElement('div');
    h.id = 'cardHint'; h.className = 'card-hint';
    const line = (txt, cls) => { const d = document.createElement('div'); d.textContent = txt; if (cls) d.className = cls; h.appendChild(d); };
    if (perk(P, 'lock')) line(t('🔒 Bloquear: la carta vuelve a salir en las próximas subidas de nivel hasta que la elijas (te quedan {n})', { n: P.locks }));
    if (perk(P, 'discard')) line(t('✖ Descartar: la carta desaparece de esta partida y sale otra en su lugar (te quedan {n})', { n: P.discards }));
    if (cardMsg) line(cardMsg, 'card-msg');
    $('levelup').appendChild(h);
  }
  if (typeof renderCombos === 'function') renderCombos($('comboLvl'));   // cuadro de combinaciones (js/combos.js)
  buildHudTips();   // pasando el mouse por tus técnicas y mejoras (arriba a la izquierda) se ve qué hacen
  if (G.me.rerolls > 0) {
    const b = document.createElement('button');
    b.id = 'rerollBtn'; b.className = 'btn ghost reroll-btn';
    b.textContent = t('🎲 Sortear de nuevo ({n}) · R', { n: G.me.rerolls });
    b.onclick = () => rerollChoices();
    $('levelup').appendChild(b);
  }
}
function rerollChoices() {
  const r = G && G.round;
  if (!r || r.kind !== 'level' || !(G.me.rerolls > 0) || $('levelup').classList.contains('hidden') || !$('rerollBtn')) return;
  G.me.rerolls--;
  SFX.play('pickup');
  showLevelChoices(r);
}
// Bloquear (gasta un bloqueo; si la desbloqueas en la misma pantalla, te lo devuelve) o desbloquear la carta i
function toggleLock(i) {
  const P = G.me, o = levelOpts[i], r = G.round;
  if (!o || !r || r.kind !== 'level') return;
  const name = optionCard(P, o).name;
  if (P.locked && optKey(P.locked) === optKey(o)) {
    P.locked = null;
    cardMsg = t('Desbloqueaste {name}.', { name }) + (P.lockFresh ? ' ' + t('Recuperaste el bloqueo.') : '');
    if (P.lockFresh) { P.locks++; P.lockFresh = false; }
  } else if (!P.locked && P.locks > 0) {
    P.locked = { kind: o.kind, id: o.id }; P.locks--; P.lockFresh = true;
    cardMsg = t('Bloqueaste {name}: si eliges otra carta, te la volverá a ofrecer en la próxima subida de nivel.', { name });
  } else return;
  SFX.play('pickup');
  showLevelChoices(r, levelOpts);
}
// Descartar la carta i: no vuelve a salir en la partida y en su lugar aparece otra
function discardCard(i) {
  const P = G.me, o = levelOpts[i], r = G.round;
  if (!o || !r || r.kind !== 'level' || !(P.discards > 0) || o.kind === 'evolve' || isFiller(o)) return;
  P.discards--;
  P.banned.push(optKey(o));
  cardMsg = t('Descartaste {name}: no volverá a salir en esta partida.', { name: optionCard(P, o).name });
  const next = levelOpts.slice(), alt = replacementOption(P, levelOpts.filter((_, j) => j !== i));
  if (alt) next[i] = alt; else next.splice(i, 1);
  SFX.play('pickup');
  showLevelChoices(r, next);
}
function pickChoice(roundId, choice) {
  clearHudTips(); hideTip();
  if (choice && typeof choice === 'object') {   // carta de nivel: la bloqueada, si la elegiste, deja de estarlo
    if (G.me.locked && optKey(G.me.locked) === optKey(choice)) G.me.locked = null;
    G.me.lockFresh = false;
  }
  if (G.net) showWaiting(); else $('levelup').classList.add('hidden');
  if (isAuthority()) applyPick(G.me.id, roundId, choice);
  else Net.send({ t: 'pick', r: roundId, c: choice });
}
function showWaiting() {
  $('levelupTitle').textContent = t('Esperando a los demás guerreros...');
  $('choices').innerHTML = '';
  $('levelup').classList.remove('hidden');
}
function showChoices(title, cards, onPick) {
  for (const id of ['rerollBtn', 'cardHint', 'padHint']) { const x = $(id); if (x) x.remove(); }
  $('comboLvl').innerHTML = '';   // (solo al subir de nivel: ver showLevelChoices)
  $('levelupTitle').textContent = title;
  const box = $('choices');
  box.innerHTML = '';
  cards.forEach((c, i) => {
    const el = document.createElement('button');
    el.className = c.evolve ? 'choice evolve' : c.combo ? 'choice combo' : 'choice';
    el.innerHTML = (c.combo ? `<div class="combo-ribbon">${t('★ COMBO')}</div>` : '')
      + `<div class="head">${c.icon ? '<canvas class="icon icon-cv" width="40" height="40"></canvas>' : `<div class="icon" style="background:radial-gradient(circle at 35% 35%,#fff,${c.color} 45%,${c.color}88);color:${c.color}"></div>`}
      <div>${c.kind ? `<div class="kind kind-${c.kind}">${c.kind === 'atk' ? t('Técnica') : t('Mejora')}</div>` : ''}<div class="name"></div><div class="tag"></div></div></div><div class="desc"></div>`;
    if (c.icon) {   // el mismo ícono que en el HUD
      const cv = el.querySelector('canvas'), x = cv.getContext('2d');
      if (c.icon[0] === 'atk') drawAttackIcon(c.icon[1], 4, 4, 32, x); else drawPassiveIcon(c.icon[1], 4, 4, 32, x);
    }
    el.querySelector('.name').textContent = `${i + 1}. ${c.name}`;
    el.querySelector('.tag').textContent = c.tag;
    el.querySelector('.desc').textContent = c.desc;
    if (c.stats && c.stats.length) {
      const ul = document.createElement('ul');
      ul.className = 'stats';
      for (const line of c.stats) { const li = document.createElement('li'); li.textContent = line; ul.appendChild(li); }
      el.appendChild(ul);
    }
    for (const [k, cls] of [['combo', 'combo-hint'], ['warn', 'warn-hint'], ['hint', 'evo-hint']]) {
      if (!c[k]) continue;
      const hint = document.createElement('div');
      hint.className = cls;
      hint.textContent = (k === 'combo' ? '★ ' : k === 'warn' ? '⚠ ' : '') + c[k];
      el.appendChild(hint);
    }
    if (c.locked) {   // franja dorada arriba: está bloqueada
      el.classList.add('locked');
      const lb = document.createElement('div');
      lb.className = 'lock-banner';
      lb.textContent = t('🔒 Bloqueada: vuelve hasta que la elijas');
      el.prepend(lb);
    }
    if (c.canLock || c.canDiscard) {   // bloquear / descartar: botones con nombre al pie de la carta
      const tools = document.createElement('div');
      tools.className = 'card-tools';
      if (c.canLock) tools.appendChild(cardTool(c.locked ? t('🔓 Desbloquear') : t('🔒 Bloquear'),
        c.locked ? t('Deja de estar bloqueada') : t('Si eliges otra carta, esta vuelve a salir en la próxima subida de nivel'), () => toggleLock(i), c.locked, 'lock'));
      if (c.canDiscard) tools.appendChild(cardTool(t('✖ Descartar'), t('No vuelve a salir en esta partida; sale otra carta en su lugar'), () => discardCard(i), false, 'discard'));
      el.appendChild(tools);
    }
    el.onclick = () => onPick(i);
    box.appendChild(el);
  });
  if (PAD_SEEN) {   // con mando: qué botón hace qué
    const h = document.createElement('div');
    h.id = 'padHint'; h.className = 'pad-hint';
    h.textContent = '🎮 ' + [t('Cruceta o palanca: moverte'), t('A: elegir'),
      cards.some(c => c.canLock) && t('X: bloquear'), cards.some(c => c.canDiscard) && t('Y: descartar')].filter(Boolean).join(' · ');
    $('levelup').appendChild(h);
  }
  $('levelup').classList.remove('hidden');
}
function cardTool(label, tip, fn, on, act) {
  const b = document.createElement('span');
  b.className = 'card-tool' + (on ? ' on' : '');
  b.dataset.act = act;   // (el mando las usa con X / Y)
  b.setAttribute('role', 'button');
  b.textContent = label; b.title = tip;
  b.onclick = e => { e.stopPropagation(); fn(); };
  return b;
}

// ─── Pausa y fin de partida ──────────────────────────────────────────────────
function togglePause() {
  if (!G || G.mode === 'over') return;
  hideTip(); clearHudTips();
  if (G.net) { // online la partida no se detiene: solo se muestra el menú
    G.menuOpen = !G.menuOpen;
    $('pause').classList.toggle('hidden', !G.menuOpen);
    if (G.menuOpen) { renderPause(); syncPauseOptions(); }
    return;
  }
  if (G.mode === 'play') { G.mode = 'pause'; $('pause').classList.remove('hidden'); renderPause(); syncPauseOptions(); resetRestartBtn(); }
  else if (G.mode === 'pause') { G.mode = 'play'; $('pause').classList.add('hidden'); }
}

// Opciones de la pausa: se cargan al abrirla (no en cada refresco online, para no pisar el deslizador)
function syncPauseOptions() {
  const vm = Math.round(AudioVolume.music * 100), vs = Math.round(AudioVolume.sfx * 100);
  $('volMusic').value = vm; $('volMusicVal').textContent = `${vm}%`;
  $('volSfx').value = vs; $('volSfxVal').textContent = `${vs}%`;
  $('optZoom').max = zoomFarOk ? 1 : 0;   // (en esta pantalla «Normal» ya es lo más lejos)
  $('optZoom').value = zoomStep; $('optZoomVal').textContent = zoomLabel();
}
const zoomLabel = () => t(zoomStep < 0 ? 'Cerca' : zoomStep > 0 && zoomFarOk ? 'Lejos' : 'Normal');
// El zoom se ve al instante detrás de la pausa (el mapa se redibuja con el próximo cuadro)
$('optZoom').oninput = e => {
  zoomStep = Math.max(-1, Math.min(1, Math.round(+e.target.value)));
  SAVE.zoom = zoomStep; writeSave(); resize();
  $('optZoom').max = zoomFarOk ? 1 : 0;
  $('optZoomVal').textContent = zoomLabel();
};
$('volMusic').oninput = e => {
  const v = +e.target.value; $('volMusicVal').textContent = `${v}%`;
  Music.setVolume(v / 100);
  if (v > 0 && !Music.enabled) toggleMusic();   // subir el volumen vuelve a activar la música
};
$('volSfx').oninput = e => {
  const v = +e.target.value; $('volSfxVal').textContent = `${v}%`;
  SFX.setVolume(v / 100);
  if (v > 0 && !SFX.enabled) toggleSfx();
};

// ─── Pantalla de pausa: estadísticas y mapa ─────────────────────────────────
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const fmtNum = n => Math.round(n).toLocaleString(LANG === 'en' ? 'en-US' : 'es-AR');
function techName(aid, P) {
  if (aid === 'ki') return t('Estallido ({form})', { form: P.c.transform });
  if (aid === 'bigbang') return 'Big Bang Kamehameha';
  if (PASSIVES[aid]) return PASSIVES[aid].name;   // Aura de combate
  return ATTACKS[aid] ? ATTACKS[aid].name : aid;
}
// ─── Descripciones al pasar el mouse (pausa) ───────────────────────────────────
// La primera línea es el título; el resto, qué hace y cuánto rinde ahora
function attackTip(P, id) {
  if (id === 'ki') return t('Estallido de {form}', { form: P.c.transform }) + '\n' + t('La onda de energía que liberas al transformarte.');
  if (id === 'bigbang') return 'Big Bang Kamehameha\n' + t('El rayo de Gogeta: lo lanza quien controla las técnicas, hacia donde apunta, cada {n} segundos.', { n: BIGBANG_CD });
  const d = ATTACKS[id];
  if (!d) return id;
  const a = P.attacks.find(x => x.id === id);
  const head = d.name + (d.evolved ? ' · ' + t('Evolucionada ★') : a ? ' · ' + t('Nivel {a}/{max}', { a: a.lvl, max: MAX_ATTACK_LEVEL }) : '');
  const s = d.stats(a ? a.lvl : MAX_ATTACK_LEVEL);
  const stats = Object.keys(STAT_INFO).filter(k => s[k] !== undefined).map(k => `${STAT_INFO[k][0]}: ${fmtStat(k, s[k])}`).join(' · ');
  const lines = [head, d.desc, stats];
  const evo = EVOLUTION_OF[id];
  if (evo && canLearn(P.charId, evo)) {
    const e = ATTACKS[evo], has = P.passives[e.needs] > 0;
    lines.push(t(has ? '★ Evoluciona en {evo} con {need} (ya la tienes) y la técnica a nivel {max}.' : '★ Evoluciona en {evo} con {need} (te falta) y la técnica a nivel {max}.',
      { evo: e.name, need: PASSIVES[e.needs].name, max: MAX_ATTACK_LEVEL }));
  } else if (d.evolved) lines.push(t('Evolución de {name}.', { name: ATTACKS[d.from].name }));
  return lines.join('\n');
}
function passiveTip(P, id) {
  const d = PASSIVES[id], l = P.passives[id];
  const now = {
    power: t('+{n}% de daño', { n: 12 * l }), speed: t('+{n}% de velocidad', { n: 8 * l }), vital: t('+{n} de salud máxima', { n: 20 * l }),
    focus: t('-{n}% de recarga', { n: 8 * l }), sense: `${t('Radio de atracción')}: ${Math.round(magnetRange(P))}`, armor: t('-{n} de daño por golpe recibido', { n: l }),
    crit: t('{n}% de probabilidad de crítico', { n: 8 + 4 * l }), kictl: t('El Ki se carga un {n}% más rápido', { n: 15 * l }),
    absorb: t('{n}% de probabilidad de curarte al derrotar', { n: 3 * l }), area: t('+{n}% de tamaño y área', { n: 8 * l }),
    multi: t('+{n} proyectil en tus técnicas que disparan y un rayo más en tus rayos', { n: multiExtra(l) }),
    luck: t('+{a}% de semillas y cápsulas, +{b}% de Zeni', { a: luckPct(l), b: luckPct(l) }),
    gravity: t('+{n}% de experiencia', { n: 8 * l }), instinct: t('{n}% de probabilidad de esquivar', { n: 3 * l }),
    regen: t('Recuperas {n} de salud por segundo', { n: (0.25 * l).toFixed(2) }), aura: t('{n} de daño cada medio segundo a los enemigos pegados', { n: 4 * l }),
    tracker: t('+{n}% de daño a jefes y élite', { n: 25 * l }), sustain: t('+{n}% de duración', { n: 10 * l }),
    meditate: t('Quieto: {a} de salud y {b} de Ki por segundo', { a: (0.6 * l).toFixed(1), b: l }),
    fury: t('+{n}% de daño (hasta +{max}%)', { n: Math.round(furyBonus(P) * 100), max: 15 * l }),
    senzubag: t('Las semillas curan el {a}% y suben {b} de salud máxima', { a: 50 + 10 * l, b: 2 * l }),
  }[id];
  const lines = [`${d.name} · ${t('Nivel {a}/{max}', { a: l, max: passiveMax(id) })}`, d.desc, `${t('Ahora')}: ${now}`];
  const evolves = P.attacks.filter(a => EVOLUTION_OF[a.id] && ATTACKS[EVOLUTION_OF[a.id]].needs === id && canLearn(P.charId, EVOLUTION_OF[a.id]));
  for (const a of evolves) lines.push(t('★ Sirve para evolucionar tu {name} en {evo}.', { name: ATTACKS[a.id].name, evo: ATTACKS[EVOLUTION_OF[a.id]].name }));
  return lines.join('\n');
}
function perkTip(u, lvl) {
  return `${u.name} · ${t('Nivel {a}/{max}', { a: lvl, max: u.max })}\n${t('Mejora permanente de la Tienda de Zeni.')}\n${u.fmt(u.per * lvl)}`;
}
// Cartel flotante: aparece al pasar el mouse (o al tocar, en el celular) sobre algo con data-tip
const tipEl = document.createElement('div');
tipEl.className = 'tip hidden';
document.body.appendChild(tipEl);
function showTip(el, x, y) {
  const [title, ...rest] = el.dataset.tip.split('\n');
  tipEl.innerHTML = `<b>${esc(title)}</b>${rest.map(l => `<div>${esc(l)}</div>`).join('')}`;
  tipEl.classList.remove('hidden');
  const r = tipEl.getBoundingClientRect();
  tipEl.style.left = `${Math.max(8, Math.min(innerWidth - r.width - 8, x + 14))}px`;
  tipEl.style.top = `${Math.max(8, Math.min(innerHeight - r.height - 8, y + 16))}px`;
}
const hideTip = () => tipEl.classList.add('hidden');
document.addEventListener('mousemove', e => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (el) showTip(el, e.clientX, e.clientY); else hideTip();
});
document.addEventListener('click', e => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (el && isTouch()) showTip(el, e.clientX, e.clientY); else if (!el) hideTip();
});
// Pestaña de la columna derecha de la pausa: el mapa o el cuadro de mejoras (se recuerda la última)
let pauseTab = 'map';
try { pauseTab = localStorage.getItem('dbz-pause-tab') === 'combos' ? 'combos' : 'map'; } catch (e) { /* sin almacenamiento */ }
function setPauseTab(tab) {
  if (tab) { pauseTab = tab; try { localStorage.setItem('dbz-pause-tab', tab); } catch (e) { /* sin almacenamiento */ } }
  const tb = G && G.snake ? 'combos' : pauseTab;   // en el Camino de la Serpiente no hay mapa
  document.querySelector('.pause-map').classList.toggle('tab-combos', tb === 'combos');
  $('tabMap').classList.toggle('on', tb === 'map'); $('tabCombos').classList.toggle('on', tb === 'combos');
  if (tb === 'combos' && typeof renderCombos === 'function') renderCombos($('pauseCombos'));
}
for (const b of document.querySelectorAll('.pause-tabs .btn')) b.onclick = () => { setPauseTab(b.dataset.tab); b.blur(); };
function renderPause() {
  const P = G.me, st = P.stats, online = !!G.net;
  setPauseTab();
  $('pauseTitle').textContent = t(online ? 'Menú' : 'Pausa');
  $('pauseNote').textContent = online ? t('La partida sigue mientras miras esta pantalla') : '';
  const dmgTotal = Object.values(st.dmg).reduce((a, b) => a + b, 0);
  const rows = Object.entries(st.dmg).sort((a, b) => b[1] - a[1]);
  // Técnicas que tienes pero aún no hicieron daño también aparecen
  for (const a of P.attacks) if (!st.dmg[a.id]) rows.push([a.id, 0]);
  // Nivel y progreso hacia la evolución (nivel máximo + la mejora que pide)
  const lvlOf = id => {
    const a = P.attacks.find(x => x.id === id);
    if (!a) return '';
    if (ATTACKS[id].evolved) return t('★ Evolucionada');
    const evo = ATTACKS[EVOLUTION_OF[id]];
    if (!evo || !canLearn(P.charId, EVOLUTION_OF[id])) return t('Nv {n}', { n: a.lvl });
    return `${t('Nv {n}', { n: a.lvl })}/${MAX_ATTACK_LEVEL} · ${esc(PASSIVES[evo.needs].name)} ${P.passives[evo.needs] ? '✓' : '✗'} → ${esc(evo.name)}`;
  };
  const techHtml = rows.map(([id, v]) => {
    const color = id === 'ki' ? P.c.aura : id === 'bigbang' ? BIGBANG_LOOK.color : (ATTACKS[id] ? ATTACKS[id].color : '#fff');
    const pct = dmgTotal ? v / dmgTotal * 100 : 0, tip = esc(attackTip(P, id));
    return `<span class="dot" style="background:${color}"></span><span data-tip="${tip}">${esc(techName(id, P))} <small>${lvlOf(id)}</small></span>
      <span class="val">${fmtNum(v)} · ${pct.toFixed(0)}%</span><div class="bar"><i style="width:${pct}%;background:${color}"></i></div>`;
  }).join('');
  const passives = Object.entries(P.passives).filter(([, l]) => l > 0)
    .map(([id, l]) => `<span data-tip="${esc(passiveTip(P, id))}">${esc(PASSIVES[id].name)} ${l}</span>`).join('');
  const perks = SHOP_UPGRADES.filter(u => P.perks[u.id])
    .map(u => `<span data-tip="${esc(perkTip(u, P.perks[u.id]))}">${esc(u.name)} ${P.perks[u.id]}</span>`).join('');
  const dps = G.t > 0 ? dmgTotal / G.t : 0;
  // Atributos actuales (con mejoras de la partida, de la tienda, ventaja del personaje y transformación)
  const pctTxt = (v, sign = '+') => `${Math.round(v * 100) ? sign : ''}${Math.round(v * 100)}%`;
  const regen = (P.c.regen || 0) + perk(P, 'regen'), def = perk(P, 'def'), armor = P.passives.armor;
  const attrs = [
    [`${fmtNum(Math.ceil(P.hp))} / ${fmtNum(P.maxHp)}`, 'Salud'],
    [pctTxt(dmgMult(P) - 1), 'Daño de técnicas'],
    [pctTxt(1 - cdMult(P), '-'), 'Tiempo de recarga'],
    [pctTxt(playerSpeed(P) / P.c.speed - 1), 'Velocidad'],
    [armor || def ? [armor ? t('-{n}/golpe', { n: armor }) : '', def ? `-${Math.round(def * 100)}%` : ''].filter(Boolean).join(' · ') : '—', 'Daño recibido'],
    [regen ? `${regen.toFixed(1)}/s` : '—', 'Regeneración'],
    [pctTxt((P.c.xpBonus || 0) + perk(P, 'xp')), 'Experiencia'],
    [fmtNum(magnetRange(P)), 'Radio de atracción'],
    [`${Math.round(P.ki)}%`, 'Ki'],
  ].map(([v, label]) => `<div class="ps-cell"><b>${esc(v)}</b><span>${esc(t(label))}</span></div>`).join('');
  const boosted = P.transformed > 0 ? ` <small>${esc(t('({form} activo)', { form: P.c.transform }))}</small>` : isFusedBody(P) || (G.fusion && G.fusion.phase === 'fused' && G.fusion.ids.includes(P.id)) ? ` <small>${t('(fusionado)')}</small>` : '';
  $('pauseStats').innerHTML = `
    <div class="ps-head"><canvas id="psPortrait" width="48" height="44"></canvas>
      <div><div class="ps-name">${esc(online ? P.name : P.c.name)}</div><div class="hint">${esc(P.c.name)} · ${t('Nivel {n}', { n: G.level })} · ${fmtTime(G.t)}</div></div></div>
    <div class="ps-grid">
      <div class="ps-cell"><b>${fmtNum(st.kills)}</b><span>${t('Derrotados')}${online ? ' ' + t('(grupo: {n})', { n: fmtNum(G.kills) }) : ''}</span></div>
      <div class="ps-cell"><b>${fmtNum(dmgTotal)}</b><span>${t('Daño total')} · ${fmtNum(dps)}/s</span></div>
      <div class="ps-cell"><b>${fmtNum(st.taken)}</b><span>${t('Daño recibido')}</span></div>
    </div>
    <div><h3>${t('Atributos')}${boosted}</h3><div class="ps-grid">${attrs}</div></div>
    <div><h3>${t('Técnicas')}</h3><div class="ps-tech">${techHtml || `<span></span><span>${t('Aún sin daño')}</span>`}</div></div>
    ${passives ? `<div><h3>${t('Mejoras de la partida')}</h3><div class="ps-chips">${passives}</div></div>` : ''}
    ${perks ? `<div><h3>${t('Mejoras de la tienda')}</h3><div class="ps-chips">${perks}</div></div>` : ''}`;
  const pc = $('psPortrait').getContext('2d');
  drawPortraitTo(pc, P.c.look, P.transformed > 0 && hasTransformLook(P.c), 0, 0, 48);
  renderMap();
  buildHudTips();
}

// Mapa de la zona: terreno alrededor del jugador con marcadores
const MAP_SPAN = 2400;
// (los colores del mapa salen del tema del nivel: THEME.map)
const mapCaches = {};
function renderMap() {
  const c = $('mapCanvas').getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  drawAreaMap(c, 300, 0, 0);
}
// Dibuja el mapa de la zona (MAP_PX × MAP_PX píxeles) con la esquina en (ox, oy)
function drawAreaMap(c, MAP_PX, ox, oy) {
  const M = G.me, k = MAP_PX / MAP_SPAN;
  c.save();
  c.translate(ox, oy);
  c.beginPath(); c.rect(0, 0, MAP_PX, MAP_PX); c.clip();
  // Terreno: se precalcula con un margen alrededor (PAD) más grande que lo que el jugador
  // puede alejarse antes del recálculo (REDRAW), así nunca quedan franjas vacías en los bordes
  const REDRAW = 160, PAD = Math.ceil(REDRAW * k) + 4, SIZE = MAP_PX + PAD * 2;
  let mapCache = mapCaches[MAP_PX];
  if (!mapCache || Math.max(Math.abs(M.x - mapCache.cx), Math.abs(M.y - mapCache.cy)) > REDRAW) {
    const off = document.createElement('canvas'); off.width = off.height = SIZE;
    const oc = off.getContext('2d'), img = oc.createImageData(SIZE, SIZE), d = img.data;
    const cx = Math.round(M.x), cy = Math.round(M.y), cols = THEME.map.map(hexRgb);
    // El terreno cambia suave: se muestrea cada 2×2 píxeles (4 veces más rápido); en los mapas pesados
    // (el planeta de Kaio-sama, THEME.margin) cada 4×4, para que rearmar el mapa no dé un tirón
    const st = THEME.margin > 1 ? 4 : 2;
    for (let y = 0; y < SIZE; y += st) for (let x = 0; x < SIZE; x += st) {
      const col = cols[groundType(Math.round(cx + (x + st / 2 - SIZE / 2) / k), Math.round(cy + (y + st / 2 - SIZE / 2) / k))];
      for (let yy = y; yy < Math.min(SIZE, y + st); yy++) for (let xx = x; xx < Math.min(SIZE, x + st); xx++) {
        const i = (yy * SIZE + xx) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    oc.putImageData(img, 0, 0);
    if (!PROP_TYPES) initProps();
    oc.fillStyle = '#7c5330';
    const half = (SIZE / 2) / k;
    for (let gy = Math.floor((cy - half) / CHUNK); gy <= Math.floor((cy + half) / CHUNK); gy++) {
      for (let gx = Math.floor((cx - half) / CHUNK); gx <= Math.floor((cx + half) / CHUNK); gx++) {
        for (const p of chunkProps(gx, gy)) {
          if (!p.solid) continue;
          oc.fillRect(Math.round((p.x - cx) * k + SIZE / 2) - 2, Math.round((p.y - cy) * k + SIZE / 2) - 2, 4, 4);
        }
      }
    }
    mapCache = mapCaches[MAP_PX] = { cx, cy, img: off };
  }
  c.imageSmoothingEnabled = false;
  c.drawImage(mapCache.img, Math.round((mapCache.cx - M.x) * k) - PAD, Math.round((mapCache.cy - M.y) * k) - PAD);
  const toMap = (x, y) => [(x - M.x) * k + MAP_PX / 2, (y - M.y) * k + MAP_PX / 2];
  const inMap = ([x, y]) => x >= -4 && y >= -4 && x <= MAP_PX + 4 && y <= MAP_PX + 4;
  // El terreno un poco más oscuro, para que resalten los marcadores
  c.fillStyle = 'rgba(10,15,46,0.28)'; c.fillRect(0, 0, MAP_PX, MAP_PX);
  const now = performance.now() / 1000, pulse = 0.5 + 0.5 * Math.sin(now * 6);
  // Zona visible en pantalla
  c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1;
  c.strokeRect(Math.round(MAP_PX / 2 - BW * k / 2) + 0.5, Math.round(MAP_PX / 2 - BH * k / 2) + 0.5, Math.round(BW * k), Math.round(BH * k));
  // Enemigos comunes: puntos rojos con borde oscuro (se ven sobre cualquier terreno)
  c.fillStyle = '#0a0f2e';
  for (const e of G.enemies) {
    if (e.boss || e.elite) continue;
    const q = toMap(e.x, e.y);
    if (inMap(q)) c.fillRect(Math.round(q[0]) - 2, Math.round(q[1]) - 2, 5, 5);
  }
  c.fillStyle = '#ff4d4d';
  for (const e of G.enemies) {
    if (e.boss || e.elite) continue;
    const q = toMap(e.x, e.y);
    if (inMap(q)) c.fillRect(Math.round(q[0]) - 1, Math.round(q[1]) - 1, 3, 3);
  }
  // Élites con esfera: se marcan con una esfera y un anillo dorado que late
  for (const e of G.enemies) {
    if (!e.elite || e.boss || !e.ball) continue;
    const q = toMap(e.x, e.y);
    if (!inMap(q)) continue;
    c.strokeStyle = '#ffcc33'; c.lineWidth = 1.5; c.globalAlpha = 0.5 + 0.5 * pulse;
    c.beginPath(); c.arc(q[0], q[1], 7 + pulse * 2, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;
    drawDragonBall(c, q[0], q[1], 4, 1, false);
  }
  // Objetos (2.18.1: encima de los enemigos, que antes los tapaban), con un anillo claro que late.
  // Si se pisan, manda la cápsula, después la esfera y después la semilla (se dibujan en ese orden, al revés)
  const PICK_ORDER = { senzu: 0, ball: 1, capsule: 2 };
  for (const p of G.pickups.filter(p => p.kind !== 'xp').sort((a, b) => (PICK_ORDER[a.kind] ?? 0) - (PICK_ORDER[b.kind] ?? 0))) {
    const q = toMap(p.x, p.y);
    if (p.kind === 'ball') {
      // Esfera del Dragón como en el favicon; si queda fuera del mapa, se marca en el borde
      const r = Math.max(5, Math.round(MAP_PX / 36)), m = r + 2, out = !inMap(q);
      const bx = Math.min(MAP_PX - m, Math.max(m, q[0])), by = Math.min(MAP_PX - m, Math.max(m, q[1]));
      if (!out) { c.strokeStyle = '#fff6b0'; c.lineWidth = 1.5; c.globalAlpha = 0.4 + 0.5 * pulse; c.beginPath(); c.arc(bx, by, r + 3 + pulse * 2, 0, Math.PI * 2); c.stroke(); }
      c.globalAlpha = out ? 0.65 : 1;
      drawDragonBall(c, bx, by, r, 4, !out);
      c.globalAlpha = 1;
      continue;
    }
    if (!inMap(q)) continue;
    const [x, y] = [Math.round(q[0]), Math.round(q[1])];
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.globalAlpha = 0.35 + 0.5 * pulse;
    c.beginPath(); c.arc(x, y, 8 + pulse * 2, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
    if (p.kind === 'capsule') {   // Cápsula Hoi-Poi: el mismo dibujo del mapa (puntas redondeadas, franja azul, botón)
      CAPSULE_ART.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
          if (row[i] === '.') continue;
          c.fillStyle = CAPSULE_PAL[row[i]];
          c.fillRect(x - 9 + i, y - 4 + j, 1, 1);
        }
      });
    } else {                      // Semilla: poroto verde con borde claro (sobre el pasto no se veía)
      c.fillStyle = '#fffad6'; c.beginPath(); c.ellipse(x, y, 7, 5.5, -0.4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#0a0f2e'; c.beginPath(); c.ellipse(x, y, 5.5, 4, -0.4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#6cff7a'; c.beginPath(); c.ellipse(x, y, 4.2, 2.8, -0.4, 0, Math.PI * 2); c.fill();
    }
  }
  // Jefes: círculo rojo grande con borde blanco; si está lejos, en el borde del mapa
  for (const e of G.enemies) {
    if (!e.boss) continue;
    let [x, y] = toMap(e.x, e.y);
    x = Math.max(8, Math.min(MAP_PX - 8, x)); y = Math.max(8, Math.min(MAP_PX - 8, y));
    c.fillStyle = '#0a0f2e'; c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, 6.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ff3d5c'; c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0a0f2e'; c.fillRect(Math.round(x) - 1, Math.round(y) - 3, 2, 4); c.fillRect(Math.round(x) - 1, Math.round(y) + 2, 2, 1);   // «!»
  }
  // Jugadores
  G.players.forEach((P, i) => {
    if (P.gone) return;
    const [x, y] = toMap(P.x, P.y), me = P === M;
    c.fillStyle = '#0a0f2e'; c.beginPath(); c.arc(x, y, me ? 6 : 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = P.dead ? '#888' : me ? '#ffe27a' : PLAYER_COLORS[i % 4] === '#ffe27a' ? '#7fd8ff' : PLAYER_COLORS[i % 4];
    c.beginPath(); c.arc(x, y, me ? 4 : 3, 0, Math.PI * 2); c.fill();
  });
  c.restore();
}
// Mapa en partida (tecla M): panel en la esquina superior derecha
function toggleMap() {
  SAVE.showMap = !SAVE.showMap;
  writeSave();
}
// Posiciones del HUD superior según el ancho de pantalla. Los botones HTML (mapa,
// música y pausa) ocupan la esquina superior derecha: de W-144 a W-12.
const isTouch = () => matchMedia('(pointer: coarse)').matches;
const BOSS_BAR_GAP = 30;
// Desde BOSS_STRIP_MIN jefes a la vez (Nivel 5 avanzado): en lugar de una barra por jefe, una tira con el retrato de
// cada uno y su mini barra, y una sola barra grande, la del más cercano (2.26.8). Antes las barras tapaban media pantalla
const BOSS_STRIP_MIN = 3, BOSS_STRIP_S = 34;
const bossStripSize = n => Math.max(18, Math.min(BOSS_STRIP_S, Math.floor((W - 40 - (n - 1) * 6) / n)));
// Cuánto más ocupa lo de los jefes que una sola barra (para correr el mapa de la esquina)
const bossHudExtra = n => n >= BOSS_STRIP_MIN ? bossStripSize(n) + 12 : Math.max(0, n - 1) * BOSS_BAR_GAP;
function hudLayout() {
  // Varios jefes a la vez (Burter y Jeice, los Androides): una barra debajo de la otra
  const narrow = W < 520, bosses = G.enemies.filter(e => e.boss).length, boss = bosses > 0, extra = bossHudExtra(bosses);
  if (narrow) return { narrow, statsX: W - 146, statsY: 60, bossY: 118, mapY: boss ? 146 + extra : 106 };
  const killsFit = W / 2 + 54 < W - 302;   // a la izquierda de los 4 botones (mapa, sonido, música, pausa)
  const killsX = killsFit ? W - 302 : W / 2 - 50, killsY = killsFit ? 14 : 56;
  const bossY = killsFit ? 72 : 116;
  const bossBarReach = W / 2 + Math.min(420, W - 40) / 2;
  return { narrow, killsX, killsY, bossY, mapY: boss && bossBarReach > W - 296 ? bossY + 32 + extra : 62 };
}
function drawHudMap() {
  if (!SAVE.showMap || !G.me || G.snake) return;   // en el Camino de la Serpiente no hay mapa: no se ve el recorrido
  const px = Math.round(Math.min(220, Math.max(120, Math.min(W, H) * 0.24)));
  const x = W - px - 18, y = hudLayout().mapY;
  ctx.save();
  ctx.globalAlpha = 0.92;
  panel(x - 6, y - 6, px + 12, px + 12);
  ctx.globalAlpha = 0.85;
  drawAreaMap(ctx, px, x, y);
  ctx.restore();
  if (!isTouch()) hudText(t('M: ocultar mapa'), x + px / 2, y + px + 20, 11, 'rgba(255,255,255,0.7)', 'center');
}
// Mientras la pausa está abierta se refresca cada medio segundo (online la partida sigue)
let pauseRefresh = 0;
function tickPause(dt) {
  if (!G || !G.net || $('pause').classList.contains('hidden')) return;
  pauseRefresh -= dt;
  if (pauseRefresh <= 0) { pauseRefresh = 0.5; renderPause(); }
}
// Frase de la pantalla final: al azar, sin repetir las últimas 8 de cada grupo; las del guerrero que jugaste, x3
function showQuote(won, charId) {
  const kind = won ? 'win' : 'lose', list = QUOTES[kind];
  const recent = (SAVE.recentQuotes = SAVE.recentQuotes || {})[kind] || [];
  let pool = list.map((q, i) => i).filter(i => !recent.includes(i));
  if (!pool.length) pool = list.map((q, i) => i);
  const weight = i => list[i].who === charId ? 3 : 1;
  let r = Math.random() * pool.reduce((a, i) => a + weight(i), 0), idx = pool[0];
  for (const i of pool) if ((r -= weight(i)) <= 0) { idx = i; break; }
  SAVE.recentQuotes[kind] = [idx, ...recent].slice(0, 8);
  writeSave();
  const q = list[idx], who = q.who && (CHARACTERS[q.who] || bossDef(q.who));
  const name = who ? who.name : t(q.name);
  $('goQuote').innerHTML = `${who ? '<canvas width="40" height="40"></canvas>' : `<span class="q-ico">${q.icon}</span>`}
    <blockquote>«${esc(t(q.text))}»<cite>— ${esc(name)}</cite></blockquote>`;
  if (who) drawPortraitTo($('goQuote').querySelector('canvas').getContext('2d'), who.look, false, 0, 0, 40);
}
// Para el backoffice (2.28.1): qué eligió (técnicas, evoluciones, mejoras, deseos), qué lo mató y a cuántos cuadros por segundo anduvo
function runMetrics(P, won) {
  const atk = P.attacks.map(a => ATTACKS[a.id] && ATTACKS[a.id].evolved ? ATTACKS[a.id].from : a.id);
  const evo = P.attacks.filter(a => ATTACKS[a.id] && ATTACKS[a.id].evolved).map(a => a.id);
  const pas = Object.keys(P.passives).filter(k => P.passives[k] > 0);
  let killer = '';
  if (!won && !G.quit) {   // el jefe más cercano (si había uno cerca) o la horda
    let bd = 400 ** 2; killer = 'horde';
    for (const e of G.enemies) if (e.boss && !e.dead) { const d = (e.x - P.x) ** 2 + (e.y - P.y) ** 2; if (d < bd) { bd = d; killer = e.id; } }
  }
  const fps = G.perfT > 2 ? Math.round(G.perfN / G.perfT) : 0, slow = G.perfN ? Math.round((G.perfSlow || 0) / G.perfN * 100) : 0;
  return { atk, evo, pas, wish: P.wishLog || [], killer, fps, slow, dev: Telemetry.device() };
}
function endRun(won) {
  if (!G || G.mode === 'over') return;
  if (G.net && G.net.role === 'host') Net.gameOver(won);
  G.mode = 'over';
  G.round = null;
  document.body.classList.remove('playing');
  for (const id of ['btnTransform', 'levelup', 'pause']) $(id).classList.add('hidden');
  clearHudTips(); hideTip();
  const P = G.me;
  // El Zeni se multiplica según el nivel; el récord es por guerrero y por nivel
  const coins = perk(G.weekly ? { perks: myPerks() } : P, 'coins');   // en el desafío, tu mejora de Zeni real (no la prestada)
  const zeni = Math.floor((Math.floor(G.kills / 8 + G.t / 6) + (won ? 500 : 0) + (P.bonusZeni || 0)) * (1 + coins) * G.lv.zeni * (G.weekly && !G.practice ? WEEKLY_ZENI : 1)
    * (1 + luckPct(P.passives.luck) / 100) * (1 + (P.c.zeniBonus || 0)));   // Suerte de Mr. Satán (la mejora) y Mr. Satán (el guerrero)
  // Nivel bonus: el récord es el menor tiempo para llegar (por modo); en los demás, el mayor tiempo aguantado
  const recKey = G.lv.rankId || G.lv.id, prev = bestOf(recKey, P.charId);
  const record = G.lv.bonus ? won && (!prev || G.t < prev) : !G.weekly && G.t > prev;   // el desafío no cuenta para los récords del nivel
  if (record) SAVE.best[`${recKey}|${P.charId}`] = G.lv.bonus ? Math.round(G.t * 100) / 100 : Math.floor(G.t);
  // La mejor partida completa (para comparar en la pantalla final): se guarda junto con el récord de tiempo
  const runKey = `${recKey}|${P.charId}`, prevRun = (SAVE.bestRun || {})[runKey] || null;
  const thisRun = { t: Math.round(G.t * 100) / 100, level: G.level, kills: P.stats.kills, dmg: Math.round(Object.values(P.stats.dmg).reduce((a, b) => a + b, 0)), won };
  if (!G.weekly && (record || !prevRun)) (SAVE.bestRun = SAVE.bestRun || {})[runKey] = thisRun;
  let reward = '';
  if (G.lv.bonus && won) {
    unlockAch('snakeway');
    if (!(SAVE.rewards = SAVE.rewards || {}).kaioken) { SAVE.rewards.kaioken = true; reward = t('¡Kaio-sama le enseñó el Kaioken a Goku! Ya puede aprenderlo en sus partidas.'); }
    // La Carrera guarda el recorrido del mejor tiempo: es el fantasma de la próxima
    if (record && G.snake && G.snake.mode === 'race') (SAVE.snakeGhost = SAVE.snakeGhost || {})[recKey] = { char: P.charId, trail: G.snake.trail };
  }
  if (G.weekly && won) unlockAch('weekly');
  SAVE.zeni += zeni; SAVE.stats.zeniEarned += zeni; SAVE.runs++; if (won) SAVE.wins++;
  const nextLevel = LEVELS[G.lv.num];   // el que se abre al ganar este
  const opened = won && !G.weekly && nextLevel && !isLevelOpen(nextLevel.id);
  if (won && !G.weekly) SAVE.levelsWon[G.lv.id] = true;   // ganar el desafío no abre niveles
  if (P.charId === 'vegeta') SAVE.vegetaKills += P.stats.kills;   // objetivo para desbloquear a Trunks
  if (!won && !G.quit && G.t < 60) SAVE.quickLosses = (SAVE.quickLosses || 0) + 1;   // para desbloquear a Mr. Satán (abandonar no cuenta)
  if (won && P.charId === 'hercule' && !G.lv.bonus) unlockAch('satanwin');
  achEndRun(P, won);   // logros que dependen del resultado (y suma las bajas totales)
  writeSave();
  checkUnlocks();
  $('goTitle').textContent = won ? (G.lv.bonus ? t('¡Llegaste al planeta de Kaio-sama!') : G.weekly ? t('¡Desafío semanal superado!') : t('¡Nivel {n} superado!', { n: G.lv.num })) : G.players.length > 1 ? t('Los guerreros Z han caído...') : t('{name} ha caído...', { name: P.c.name });
  $('goBadge').textContent = t(won ? '¡VICTORIA!' : 'DERROTA');
  showQuote(won, P.charId);
  $('gameover').classList.toggle('won', won);
  $('gameover').classList.toggle('lost', !won);
  $('goStats').innerHTML =
    `<span class="go-level">${G.lv.bonus ? `🐍 ${t('El Camino de la Serpiente')} · ${t(G.snake && G.snake.mode === 'fight' ? '⚔️ Con enemigos' : '🏃 Carrera')}${G.snake && !G.snake.fall ? ' · ' + t('sin caídas') : ''}`
      : G.weekly ? t('⭐ Desafío semanal · Nivel {n}', { n: G.lv.num }) : t('Nivel {n}', { n: G.lv.num })}</span><br>` +
    (reward ? `<span class="go-unlock">${esc(reward)}</span><br>` : '') +
    t('Tiempo: <b>{time}</b>', { time: fmtTimeCs(Math.floor(G.t * 100)) }) + (record ? ' · ' + t('¡Nuevo récord!') : '') + '<br>' +
    t('Nivel alcanzado: <b>{lvl}</b> · Enemigos derrotados: <b>{kills}</b>', { lvl: G.level, kills: G.kills }) + '<br>' +
    '<i class="coin"></i>' + t('Zeni ganado: <b>{n}</b>', { n: zeni }) +
    (opened ? `<br><span class="go-unlock">${t('¡Se abrió el <b>Nivel {n}</b>!', { n: nextLevel.num })}</span>` : '') +
    (G.newUnlocks || []).map(id => `<br><span class="go-unlock">${t('¡Nuevo guerrero desbloqueado: <b>{name}</b>!', { name: esc(CHARACTERS[id].name) })}</span>`).join('') +
    (G.achNew || []).map(id => { const a = ACHIEVEMENTS.find(x => x.id === id); return `<br><span class="go-ach">${t('🏆 Logro: <b>{name}</b> (+{zeni} Zeni)', { name: esc(a.name), zeni: a.zeni })}</span>`; }).join('') +
    '<span id="goReplay"></span>';
  $('goDetail').innerHTML = endStatsHtml(P, G.weekly ? undefined : prevRun, record);
  // Repetición: los últimos segundos quedan guardados en este navegador (Perfil → Repeticiones)
  if (typeof Replays !== 'undefined') Replays.capture({ char: P.charId, level: G.lv.id, won, time: Math.floor(G.t) }).then(ok => {
    if (ok && $('goReplay')) $('goReplay').innerHTML = `<br><span class="go-replay">${t('🎬 Se guardó la repetición de los últimos segundos (Perfil → Repeticiones)')}</span>`;
  });   // (el desafío no se compara)
  // Estadísticas anónimas para el backoffice (cada jugador manda la suya; en el modo prueba no se manda)
  if (typeof Telemetry !== 'undefined') Telemetry.run({ level: (G.lv.rankId || G.lv.id).replace('_safe', ''), char: P.charId, won, secs: Math.floor(G.t), online: !!G.net,
    mode: G.weekly ? 'weekly' : G.lv.bonus ? 'snake' : 'levels',   // (2.28.1: para saber qué modos se juegan)
    ...runMetrics(P, won),
    players: G.players.filter(Q => !Q.ally).length, aim: aimMode(), fast: G.speed > 1 });
  if (typeof Support !== 'undefined') Support.endAsk({ secs: G.t, won });   // pedido de ayuda, como mucho una vez por día (2.35.0)
  rankSubmit({ level: G.lv.rankId || G.lv.id, weekly: G.weekly ? G.weekly.week : undefined, practice: !!G.practice, char: P.charId, won, secs: Math.floor(G.t), cs: Math.floor(G.t * 100), kills: P.stats.kills, taken: Math.round(P.stats.taken), aim: aimMode(),
    online: !!G.net, players: G.players.filter(Q => !Q.ally).length });
  $('btnRetry').textContent = t(G.net ? 'Volver a la sala' : 'Reintentar');
  $('gameover').classList.remove('hidden');
}
// Estadísticas del final: daño por técnica (con la técnica MVP), totales y, en online, el grupo
// Gráfico de barras del daño en el tiempo: tramos de 15 s, o de a 1 minuto si la partida fue larga
function dmgChartHtml(P) {
  const raw = P.stats.dmgLine || [], n = Math.ceil(G.t / DMG_STEP);
  if (n < 2) return '';
  const per = G.t > 240 ? 60 / DMG_STEP : 1, bars = [];   // cuántos tramos van en cada barra
  for (let i = 0; i < n; i += per) { let s = 0; for (let j = i; j < Math.min(n, i + per); j++) s += raw[j] || 0; bars.push(s); }
  const max = Math.max(1, ...bars), W = 100 / bars.length;
  const step = per > 1 ? 60 : DMG_STEP, best = bars.indexOf(max);
  const cols = bars.map((v, i) => `<i style="left:${i * W}%;width:${W}%;height:${Math.max(2, v / max * 100)}%"${i === best ? ' class="top"' : ''} title="${fmtTime(i * step)}–${fmtTime(Math.min(G.t, (i + 1) * step))}: ${fmtNum(v)}"></i>`).join('');
  return `<h3>${t(per > 1 ? 'Daño por minuto' : 'Daño cada 15 segundos')}</h3>
    <div class="dmg-chart">${cols}</div><div class="dmg-axis"><span>0:00</span><span>${fmtTime(Math.floor(G.t))}</span></div>`;
}
// Comparación con la mejor partida anterior con este guerrero en este nivel
function bestRunHtml(P, prev, record) {
  if (!prev) return `<p class="go-best">${t('Es tu primera partida con {name} en este nivel: ya quedó como tu mejor marca.', { name: esc(P.c.name) })}</p>`;
  const now = { t: G.t, level: G.level, kills: P.stats.kills, dmg: Object.values(P.stats.dmg).reduce((a, b) => a + b, 0) };
  const lowerBetter = G.lv.bonus;   // en el Camino de la Serpiente gana el menor tiempo
  const cell = (label, a, b, fmt, lower) => {
    const up = lower ? a < b : a > b, same = Math.round(a) === Math.round(b);
    return `<div class="ps-cell"><b>${fmt(a)}</b><span>${t(label)}</span><small class="${same ? '' : up ? 'better' : 'worse'}">${same ? '=' : up ? '▲' : '▼'} ${t('mejor')}: ${fmt(b)}</small></div>`;
  };
  return `<h3>${record ? t('¡Nueva mejor partida con {name}!', { name: esc(P.c.name) }) : t('Contra tu mejor partida con {name}', { name: esc(P.c.name) })}</h3>
    <div class="ps-grid go-compare">${cell('Tiempo', now.t, prev.t, v => fmtTime(Math.floor(v)), lowerBetter)}${cell('Nivel alcanzado', now.level, prev.level, v => v)}
      ${cell('Derrotados', now.kills, prev.kills, fmtNum)}${cell('Daño total', now.dmg, prev.dmg, fmtNum)}</div>`;
}
function endStatsHtml(P, prevRun, record) {
  const dmgOf = Q => Object.values(Q.stats.dmg).reduce((a, b) => a + b, 0);
  const total = dmgOf(P), rows = Object.entries(P.stats.dmg).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const colorOf = id => id === 'ki' ? P.c.aura : id === 'bigbang' ? BIGBANG_LOOK.color : (ATTACKS[id] || PASSIVES[id] || { color: '#fff' }).color;
  const techs = rows.map(([id, v], i) => {
    const pct = total ? v / total * 100 : 0;
    return `<span class="dot" style="background:${colorOf(id)}"></span><span>${esc(techName(id, P))}${i === 0 ? ' <small class="mvp">★ MVP</small>' : ''}</span>
      <span class="val">${fmtNum(v)} · ${pct.toFixed(0)}%</span><div class="bar"><i style="width:${pct}%;background:${colorOf(id)}"></i></div>`;
  }).join('');
  const dps = G.t > 0 ? total / G.t : 0;
  let html = `<div class="ps-grid">
      <div class="ps-cell"><b>${fmtNum(total)}</b><span>${t('Daño total')}</span></div>
      <div class="ps-cell"><b>${fmtNum(dps)}</b><span>${t('Daño por segundo')}</span></div>
      <div class="ps-cell"><b>${fmtNum(P.stats.taken)}</b><span>${t('Daño recibido')}</span></div>
    </div>
    <h3>${t('Daño por técnica')}</h3><div class="ps-tech">${techs || `<span></span><span>${t('Sin daño')}</span>`}</div>`;
  if (prevRun !== undefined && !G.net) html += dmgChartHtml(P) + bestRunHtml(P, prevRun, record);   // (la pausa no lo muestra)
  // Online: comparación entre los jugadores
  const team = G.players.filter(Q => !Q.ally);
  if (team.length > 1) {
    const best = Math.max(...team.map(dmgOf));
    html += `<h3>${t('El grupo')}</h3><table class="go-team"><tr><th>${t('Jugador')}</th><th>${t('Derrotados')}</th><th>${t('Daño')}</th><th>${t('Recibido')}</th></tr>${team
      .sort((a, b) => dmgOf(b) - dmgOf(a)).map(Q => `<tr${Q === P ? ' class="me"' : ''}><td>${esc(Q.name)} <small>${esc(Q.c.name)}</small>${dmgOf(Q) === best && best > 0 ? ' ★' : ''}</td>
        <td>${fmtNum(Q.stats.kills)}</td><td>${fmtNum(dmgOf(Q))}</td><td>${fmtNum(Q.stats.taken)}</td></tr>`).join('')}</table>`;
  }
  return html;
}
function toMenu() {
  G = null;
  if (typeof Replays !== 'undefined') Replays.stop();
  document.body.classList.remove('playing');
  for (const id of ['gameover', 'levelup', 'pause', 'lobby', 'setup', 'shop', 'credits', 'help', 'techs', 'achs', 'profile', 'rank', 'news']) $(id).classList.add('hidden');
  clearHudTips(); hideTip();
  $('btnTransform').classList.add('hidden');
  rollMenuDuel();   // otro duelo en la portada
  buildMenu();
  $('menu').classList.remove('hidden');
}

// ─── Actualización (autoridad) ───────────────────────────────────────────────
// ¿Los pies de un personaje en (x, y) pisan terreno prohibido? (THEME.blocked, ver js/maps.js)
const blockedAt = (x, y) => !!THEME.blocked && (THEME.blocked(x - 5, y + 12) || THEME.blocked(x + 5, y + 12) || THEME.blocked(x, y + 8));
// El punto pisable más cercano (para lo que sueltan los enemigos que mueren sobre las nubes)
// Cómo cruza cada enemigo el terreno que no se pisa (las nubes del Planeta de Kaio-sama, 2.15.1):
//   fly: aves, pasan por encima siempre · hover: guerreros que en la serie vuelan, levitan para cruzar ·
//   jump: los Saibaiman cruzan a los saltos · ground: animales y humanos, buscan el camino por los puentes ·
//   boss: los jefes usan la Teletransportación (con una marca de aviso donde van a aparecer)
const ENEMY_MOVE = { nbird: 'fly', hawk: 'fly', saibaman: 'jump', soldier: 'hover', esoldier: 'hover', celljr: 'hover', eggbot: 'hover',
  cyborg: 'hover', msoldier: 'hover', majin: 'hover', destroyer: 'hover' };
const moveKind = e => e.boss ? 'boss' : ENEMY_MOVE[e.id] || 'ground';
function enemyTerrain(e, ox, oy, dt, step, P) {
  if (!THEME.blocked) return;
  const mv = moveKind(e);
  if (mv === 'fly') { e.air = footBlocked(e.x, e.y, e.scale) ? 'fly' : null; return; }   // nada las frena
  if (e.leap) {   // Saibaiman en pleno salto: va en arco hasta la otra orilla
    const L = e.leap, p = Math.min(1, (L.t += dt) / L.dur);
    e.x = L.x0 + (L.x1 - L.x0) * p; e.y = L.y0 + (L.y1 - L.y0) * p;
    if (p >= 1) { e.leap = null; e.air = null; e.stuck = 0; burst(e.x, e.y + 10 * e.scale, '#e8e0c8', 8, 3, 2); }
    return;
  }
  if (e.air) {   // cruzando por el aire: aterriza en tierra firme (los Saibaiman, al terminar un salto)
    e.airT += dt;
    if (e.airT > 0.4 && !footBlocked(e.x, e.y, e.scale)) { e.air = null; e.stuck = 0; }
    return;
  }
  if (keepOnGround(e, ox, oy) && Math.hypot(e.x - ox, e.y - oy) < step * 0.35) e.stuck = (e.stuck || 0) + dt;
  else if (e.stuck) e.stuck = Math.max(0, e.stuck - dt);
  if (!(e.stuck > 0.5)) return;
  if (mv === 'hover') {   // despega
    e.air = mv; e.airT = 0; e.stuck = 0; e.path = null;
    burst(e.x, e.y + 10 * e.scale, '#ffffff', 8, 3, 2);
    return;
  }
  if (mv === 'jump') {   // salta de una hasta la otra orilla (si no hay orilla a la vista, busca el puente como los animales)
    const L = leapTarget(e, P);
    if (L) {
      e.leap = { x0: e.x, y0: e.y, x1: L.x, y1: L.y, t: 0, dur: Math.max(0.45, L.d / 260), h: Math.min(80, 18 + L.d * 0.14) };
      e.air = 'jump'; e.airT = 0; e.stuck = 0; e.path = null;
      burst(e.x, e.y + 10 * e.scale, '#e8e0c8', 8, 3, 2);
      return;
    }
  }
  if (mv === 'boss') { if (e.stuck > 1 && !e.tp) bossTeleport(e, P); return; }
  // Por tierra: busca el camino (por los puentes); si no hay, se rinde y se va (reaparece más tarde de tu lado)
  if (e.flee || !(G.pathBudget > 0)) return;
  G.pathBudget--;
  e.stuck = 0;
  const path = findPath(e.x, e.y, P.x, P.y, e.scale);
  if (path && path.length) { e.path = path; e.pi = 0; e.pathAge = 0; } else { e.path = null; e.flee = true; }   // (un camino vacío cuenta como «no hay»)
}
// ¿Se puede ir en línea recta de (x0, y0) a (x1, y1) sin pisar nubes?
function clearLine(x0, y0, x1, y1, s = 1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 12);
  for (let i = 1; i < n; i++) if (footBlocked(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, s)) return false;
  return true;
}
// Dónde cae el salto de un Saibaiman: la primera tierra firme después de las nubes, yendo hacia el jugador
function leapTarget(e, P) {
  const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  let cloud = false;
  for (let s = 8; s <= 520; s += 8) {
    const x = e.x + ux * s, y = e.y + uy * s;
    if (footBlocked(x, y, e.scale)) cloud = true;
    else if (cloud && !footBlocked(x + ux * 12, y + uy * 12, e.scale)) return { x: x + ux * 12, y: y + uy * 12, d: s + 12 };
  }
  return null;
}
function bossTeleport(e, P) {
  const a = Math.random() * Math.PI * 2;
  const [x, y] = walkableSpot(P.x + Math.cos(a) * 70, P.y + Math.sin(a) * 70);
  e.tp = { t: 0.8, x, y }; e.stuck = 0;
  G.hazards.push({ x, y, r: 50, t: 0.8, dur: 0.8, dmg: e.dmg * 0.8 });   // la marca roja: aparece golpeando
  burst(e.x, e.y, '#ffffff', 16, 4, 3);
  addText(e.x, e.y - 34 * e.scale, '¡Teletransportación!', '#ffffff', true);
  sfx('power', 0.2);
}
// Camino por tierra firme de (sx, sy) a (gx, gy): A* en una grilla de 24 px alrededor de los dos puntos.
// Devuelve una lista de puntos [x, y] o null si no hay camino (o es demasiado largo para buscarlo).
const PATH_CELL = 24;
function findPath(sx, sy, gx, gy, s = 1) {
  [gx, gy] = walkableSpot(gx, gy);   // el jugador justo en el borde: la tierra firme más cercana
  const C = PATH_CELL, M = 1200;
  const x0 = Math.floor((Math.min(sx, gx) - M) / C), y0 = Math.floor((Math.min(sy, gy) - M) / C);
  const W = Math.floor((Math.max(sx, gx) + M) / C) - x0 + 1, H = Math.floor((Math.max(sy, gy) + M) / C) - y0 + 1;
  if (W * H > 90000) return null;
  const N = W * H, cellOf = (x, y) => (Math.floor(y / C) - y0) * W + (Math.floor(x / C) - x0);
  const start = cellOf(sx, sy), goal = cellOf(gx, gy), gxC = goal % W, gyC = (goal / W) | 0;
  const blk = new Int8Array(N);   // 0: sin mirar · 1: libre · 2: nube
  const free = i => {
    if (i === goal || i === start) return true;
    if (!blk[i]) blk[i] = footBlocked((x0 + i % W + 0.5) * C, (y0 + ((i / W) | 0) + 0.5) * C, s) ? 2 : 1;
    return blk[i] === 1;
  };
  const gs = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const heap = [], push = (f, i) => {   // montículo de [f, celda]
    heap.push([f, i]);
    for (let j = heap.length - 1; j > 0;) { const p = (j - 1) >> 1; if (heap[p][0] <= heap[j][0]) break; [heap[p], heap[j]] = [heap[j], heap[p]]; j = p; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      for (let j = 0; ;) { const l = 2 * j + 1, r = l + 1; let m = j;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === j) break; [heap[m], heap[j]] = [heap[j], heap[m]]; j = m; }
    }
    return top;
  };
  const hh = i => { const ax = Math.abs(i % W - gxC), ay = Math.abs(((i / W) | 0) - gyC); return Math.max(ax, ay) + 0.414 * Math.min(ax, ay); };
  gs[start] = 0; push(hh(start), start);
  let steps = 0;
  while (heap.length && steps++ < 60000) {
    const [, i] = pop();
    if (done[i]) continue;
    done[i] = 1;
    if (i === goal) {
      const out = [];
      for (let c = i; c !== start && c >= 0; c = from[c]) out.push([(x0 + c % W + 0.5) * C, (y0 + ((c / W) | 0) + 0.5) * C]);
      out.reverse();
      return out;
    }
    const cx = i % W, cy = (i / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (done[n] || !free(n)) continue;
      if (dx && dy && (!free(cy * W + nx) || !free(ny * W + cx))) continue;   // sin cortar esquinas de nube
      const g = gs[i] + (dx && dy ? 1.414 : 1);
      if (g < gs[n]) { gs[n] = g; from[n] = i; push(g + hh(n), n); }
    }
  }
  return null;
}
function walkableSpot(x, y) {
  if (!THEME.blocked || !THEME.blocked(x, y)) return [x, y];
  for (let r = 16; r <= 640; r += 16) for (let a = 0; a < 16; a++) {
    const px = x + Math.cos(a / 16 * Math.PI * 2) * r, py = y + Math.sin(a / 16 * Math.PI * 2) * r;
    if (!THEME.blocked(px, py)) return [px, py];
  }
  return [x, y];
}
function moveLocal(dt) {
  const P = G.me, k = dt * 60;
  if (!P || P.dead || P.gone || G.mode !== 'play' || fusionLocked(P)) { if (P) P.moving = false; return; }
  if (P.dashT > 0) {   // Dynamite Kick: vuela hacia el enemigo
    P.dashT -= dt;
    const ox = P.x, oy = P.y;
    P.x += P.dashVX * dt; P.y += P.dashVY * dt;
    if (!(G.snake && G.snake.fall) && blockedAt(P.x, P.y)) { P.x = ox; P.y = oy; P.dashT = 0; }
    pushOutOfSolids(P, 12, 6);
    return;
  }
  const v0 = inputVec(), sp = playerSpeed(P) * statusSpeed(P);
  const v = P.invert > 0 ? { x: -v0.x, y: -v0.y } : v0;   // Ginyu: controles al revés
  P.moving = !!(v.x || v.y) && sp > 0;
  if (P.moving) {
    const ox = P.x, oy = P.y;
    const edge = !(G.snake && G.snake.fall);   // con las caídas del Camino de la Serpiente, el borde no frena
    P.x += v.x * sp * k; if (edge && blockedAt(P.x, P.y)) P.x = ox;   // eje por eje: se desliza por el borde
    P.y += v.y * sp * k; if (edge && blockedAt(P.x, P.y)) P.y = oy;
    pushOutOfSolids(P, 12, 6);
    P.dirX = v.x; P.dirY = v.y;
    if (Math.abs(v.x) > 0.1) P.facing = Math.sign(v.x);
    P.dir = dirFromVec(v.x, v.y);
  }
}
function updateDowned(dt) {
  for (const P of G.players) {
    if (!P.dead || P.gone) continue;
    const helper = G.players.find(o => o !== P && !o.dead && !o.gone && Math.hypot(o.x - P.x, o.y - P.y) < 32);
    if (helper) {
      P.revive += dt;
      if (P.revive >= 2.5) {
        P.dead = false; P.hp = Math.round(P.maxHp * 0.4); P.inv = 2; P.revive = 0;
        announce('¡{helper} ha reanimado a {name}!', '#6cff7a', { helper: helper.name, name: P.name });
        sfx('levelup');
        burst(P.x, P.y, '#6cff7a', 20, 4, 3);
      }
    } else P.revive = Math.max(0, P.revive - dt);
  }
}
function tickFx(dt, k) {
  for (const f of G.fx) { f.t -= dt; if (f.vx !== undefined) { f.x += f.vx * k; f.y += f.vy * k; f.vx *= 0.92; f.vy *= 0.92; } }
  G.fx = G.fx.filter(f => f.t > 0);
  for (const t of G.texts) { t.t -= dt; t.y -= 0.6 * k; }
  G.texts = G.texts.filter(t => t.t > 0);
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  if (G.shake > 0) G.shake -= dt;
  const P = G.me, F = G.fusion;
  const canBigBang = F && F.phase === 'fused' && F.ids.includes(P.id) && (P.id === F.gunnerId || !G.net) && F.bbCd <= 0;
  const canKi = !P.dead && P.ki >= 100 && P.transformed <= 0 && !(F && F.ids.includes(P.id)) && !rule('notrans');
  $('btnTransform').classList.toggle('hidden', !(G.mode === 'play' && (canKi || canBigBang)));
}
// Durante la danza los dos quedan quietos; el compañero absorbido no se mueve solo
const fusionLocked = P => !!(G.fusion && G.fusion.ids.includes(P.id) && (G.fusion.phase === 'dance' || P.hidden));
// Semilla de reserva (2.23.0): en vez de revivir en el acto, el guerrero sale despedido, queda tirado en el piso, se come
// la semilla y se levanta. Mientras tanto no recibe daño, no se mueve ni ataca. Al levantarse, reserveRevive.
const KO_TIME = 1.8, KO_HIT = 0.3, KO_UP = 0.45;   // duración total, del golpe y de levantarse (s)
const koAnim = P => P.koT > KO_TIME - KO_HIT ? 'kohit' : P.koT > KO_UP ? 'kolie' : 'koup';
function koUpdate(P, dt) {
  if (!(P.koT > 0)) return;
  P.koT -= dt;
  if (P.koT <= KO_UP && !P.koSenzu) {   // se come la semilla y empieza a levantarse
    P.koSenzu = true;
    addText(P.x, P.y - 30, '¡Semilla de reserva!', '#6cff7a', true);
    burst(P.x, P.y - 6, '#6cff7a', 14, 2, 2);
  }
  if (P.koT <= 0) { P.koT = 0; P.koSenzu = false; reserveRevive(P); }
}
function reserveRevive(P) {
  P.halo = true;   // ya "murió" una vez: aureola por el resto de la partida, como en el Otro Mundo
  // Zenkai (2.15.1): los Saiyajin vuelven más fuertes de estar al borde de la muerte. +20% de vida máxima ya;
  // el +20% de daño sale de P.halo en dmgMult
  P.maxHp = Math.round(P.maxHp * (1 + ZENKAI));
  P.hp = Math.round(P.maxHp * 0.5); P.inv = 3;   // 3 s sin recibir daño
  // Explosión de Ki: daña a todo lo de alrededor (también a los jefes) y borra los disparos enemigos cercanos
  G.novas.push({ x: P.x, y: P.y, r: 0, maxR: 170, dmg: 30 + G.level * 3, hit: new Set(), color: '#ffe14d', kb: 22, owner: P, aid: 'ki' });
  for (const s of G.shots) if (Math.hypot(s.x - P.x, s.y - P.y) < 220) s.dead = true;
  G.shake = Math.max(G.shake, 0.6);
  for (const e of G.enemies) {   // y la onda aparta a los enemigos de alrededor (a los jefes, poco)
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1;
    if (d > 130) continue;
    const ox = e.x, oy = e.y, push = (130 - d) * (e.boss ? 0.25 : 0.9) + (e.boss ? 0 : 30);
    e.x += dx / d * push; e.y += dy / d * push;
    keepOnGround(e, ox, oy);
  }
  burst(P.x, P.y, '#6cff7a', 30, 5, 3);
  ring(P.x, P.y, 90, 0.5, '#6cff7a');
  ring(P.x, P.y, 170, 0.6, '#ffe14d');
  if (P === G.me) announce('¡Zenkai! Vuelves más fuerte: +20% de daño y de vida', '#ffe14d');
  sfx('boom');
}
function update(dt) {
  const k = dt * 60;
  G.t += dt;
  moveLocal(dt);
  if (G.me) { G.me.aim = manualAim(); G.me.aimSemi = aimMode() === 'semi'; }   // los jugadores remotos mandan su apuntado con la posición
  for (const P of G.players) {
    if (P.gone) continue;
    if (P !== G.me && P.tx !== undefined && !P.dead && !fusionLocked(P)) { // jugadores remotos: suavizar su posición
      const a = Math.min(1, dt * 15);
      P.x += (P.tx - P.x) * a; P.y += (P.ty - P.y) * a;
    }
    // Pidió la fusión y el compañero no respondió a tiempo: se transforma normal
    if (P.fuseReq && G.t - P.fuseReq >= FUSION_WINDOW && !G.fusion) { P.fuseReq = 0; doTransform(P); }
    if (!P.dead && P.ki >= 100 && P.transformed <= 0 && !rule('notrans')) P.kiHold = Math.min(KI_FOCUS_TIME, (P.kiHold || 0) + dt);
    if (P.transformed > 0) {
      P.transformed -= dt;
      if (P.transformed <= 0) { P.transformed = 0; if (P === G.me) announce('La transformación ha terminado', '#cccccc'); }
      else if (Math.random() < 0.4) G.fx.push({ type: 'spark', x: P.x + rand(-10, 10), y: P.y + rand(-5, 12), vx: 0, vy: -rand(1, 2.5), t: 0.4, color: P.c.aura, size: 2 });
    }
    if (P.inv > 0) P.inv -= dt;
    if (P.stone > 0) P.stone -= dt;   // petrificado (Dabura)
    if (P.candy > 0) P.candy -= dt;   // caramelo (Majin Buu)
    if (P.swapBody > 0) P.swapBody -= dt;   // cuerpo cambiado (Ginyu)
    if (P.invert > 0) P.invert -= dt;
    if (P.kaioken > 0) P.kaioken -= dt;
    if (P.tripT > 0) P.tripT -= dt;   // Mr. Satán tirado en el piso
    koUpdate(P, dt);   // Semilla de reserva: la caída
    if (P.poseT > 0) P.poseT -= dt;
    if (P.c.flee && !P.dead) {   // con poca vida sale corriendo (una vez por cada vez que baja)
      if (P.hp < P.maxHp * 0.3 && !P.fleeing) { P.fleeing = true; addText(P.x, P.y - 30, '¡Me duele el estómago!', '#ffd93b', true); }
      else if (P.hp > P.maxHp * 0.4) P.fleeing = false;
    }
    if (P.immortal > 0) P.immortal -= dt;
    if (P.castT > 0) P.castT -= dt;
    if (P.punchT > 0) P.punchT -= dt;
    const regen = (P.c.regen || 0) + perk(P, 'regen') + 0.25 * (P.passives.regen || 0);   // + Regeneración namekiana
    if (!P.dead && regen) healPlayer(P, regen * dt);
    passiveTicks(P, dt);
  }
  updateDowned(dt);
  updateFusion(dt);
  updateSpawning(dt);
  // También dispara el compañero absorbido: Gogeta usa las técnicas de los dos
  for (const P of G.players) if (!P.dead && !P.gone && !(P.koT > 0)) fireAttacks(P, dt);   // (tirado en el piso no ataca)
  updateProjectiles(k, dt);
  updateBeams(dt);
  updateEbeams(dt);
  updateDecoys(dt);
  updateHelpers(dt, k);
  for (const z of G.zones) z.t -= dt;
  G.zones = G.zones.filter(z => z.t > 0);
  if (G.blind > 0) G.blind -= dt;
  for (const P of G.players) updateOrbit(P, dt);
  updateNovas(dt);
  updateEnemies(k, dt);
  updateShots(k, dt);
  updatePickups(k);
  if (G.snake) snakeUpdate(dt);

  for (const P of G.players) {
    if (P.dead || P.gone || P.hp > 0) continue;
    if (P.koT > 0) { P.hp = 1; continue; }   // ya está en el piso (Semilla de reserva): se levanta enseguida
    if (P.senzuLeft > 0 && !isFusedBody(P)) {   // Semilla de reserva: cae, queda tirado un momento y se levanta
      P.senzuLeft--;
      P.hp = 1; P.koT = KO_TIME;   // al terminar la caída revive (koUpdate → reserveRevive)
      P.punchT = P.castT = P.tripT = P.poseT = 0;
      burst(P.x, P.y, '#ff4d4d', 16, 3, 3);
      G.shake = Math.max(G.shake, 0.3);
      sfx('hurt');
      continue;
    }
    P.hp = 0; P.dead = true; P.transformed = 0; P.revive = 0;
    burst(P.x, P.y, '#ff4d4d', 24, 4, 3);
    if (isFusedBody(P)) announce('¡Gogeta ha caído!', '#ff5c5c');
    else if (G.players.length > 1) announce('¡{name} ha caído! Acércate para reanimarlo', '#ff5c5c', { name: P.name });
  }
  tickFx(dt, k);

  if (!alivePlayers().length) endRun(false);
  else if (G.victoryAt && G.t >= G.victoryAt) endRun(true);
}

// ─── Render del mundo (búfer pixel art) ──────────────────────────────────────
function beginWorld(cx, cy, shx = 0, shy = 0) {
  camX = Math.round(cx); camY = Math.round(cy);
  bctx.setTransform(1, 0, 0, 1, Math.round(BW / 2 - camX + shx), Math.round(BH / 2 - camY + shy));
  bctx.imageSmoothingEnabled = false;
}
function presentWorld() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, 0, 0, BW * PIX, BH * PIX);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
const GEM_COLORS = { 1: ['#2a6fd6', '#6fd0ff', '#e8fbff'], 3: ['#1f9a4a', '#6cff8f', '#eaffef'], 10: ['#a02aa8', '#ff6cf0', '#ffe8fd'],
  30: ['#a8241f', '#ff5c4d', '#ffe8e6'] };   // gema roja y más grande: orbes juntados
function drawGem(c, x, y, v) {
  if (v >= 30) {
    c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(2, 2);
    drawGemShape(c, 0, 0, GEM_COLORS[30]);
    c.restore();
    return;
  }
  drawGemShape(c, Math.round(x), Math.round(y), GEM_COLORS[v >= 10 ? 10 : v >= 3 ? 3 : 1]);
}
function drawGemShape(c, x, y, [d, m, l]) {
  c.fillStyle = d; c.fillRect(x - 1, y - 4, 3, 9); c.fillRect(x - 2, y - 3, 5, 7); c.fillRect(x - 3, y - 1, 7, 3);
  c.fillStyle = m; c.fillRect(x - 1, y - 3, 3, 7); c.fillRect(x - 2, y - 1, 5, 3);
  c.fillStyle = l; c.fillRect(x - 1, y - 2, 1, 2);
}
// Semilla del Ermitaño: un poroto en pixel art (con su ranura y brillo) que flota, rodeado de un
// aura clara que late y chispitas que suben, para que se distinga sobre el pasto
const SENZU_ART = [
  '...oooooo...',
  '..ommmmmmoo.',
  '.ommlhmmmmdo',
  'ommllmmmmmdo',
  'ommmmmmmmddo',
  '.odmmsssmddo',
  '..oddddddoo.',
  '...oooooo...',
];
const SENZU_PAL = { o: '#10300a', d: '#2e6e1e', m: '#5fbf3a', l: '#9fe870', h: '#f0ffe0', s: '#245218' };
// La semilla con un borde claro de un píxel alrededor (se arma una vez)
let SENZU_LINED = null;
function senzuLined() {
  if (SENZU_LINED) return SENZU_LINED;
  const im = ITEM_IMG.senzu, W = im.width + 2, H = im.height + 2, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  x.drawImage(im, 1, 1);
  const d = x.getImageData(0, 0, W, H).data, on = (i, j) => i >= 0 && j >= 0 && i < W && j < H && d[(j * W + i) * 4 + 3] > 0;
  x.fillStyle = '#fffad6';
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (!on(i, j) && (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1))) x.fillRect(i, j, 1, 1);
  }
  return SENZU_LINED = cv;
}
function drawSenzu(c, x, y, t = 0) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);
  y = Math.round(y + Math.sin(t * 3) * 2); x = Math.round(x);
  // Haz de luz cortito que sube (2.18.1): se ve de lejos aunque el pasto sea del mismo verde
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createLinearGradient(0, y - 34, 0, y);
  g.addColorStop(0, 'rgba(255,250,200,0)'); g.addColorStop(1, `rgba(255,250,200,${0.3 + 0.2 * pulse})`);
  c.fillStyle = g; c.fillRect(x - 4, y - 34, 8, 34);
  c.restore();
  // Aura: blanca y amarilla que late (2.15.1; verde se perdía sobre el pasto)
  c.globalAlpha = 0.22 + 0.14 * pulse; c.fillStyle = '#fff3a0'; circle(c, x, y, 13 + pulse * 3);
  c.globalAlpha = 0.35 + 0.15 * pulse; c.fillStyle = '#fffbe0'; circle(c, x, y, 8);
  // Chispitas que suben
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.9 + i / 4) % 1;
    c.globalAlpha = 1 - ph; c.fillStyle = i % 2 ? '#ffffff' : '#ffe680';
    c.fillRect(Math.round(x + Math.sin(i * 2.3 + t * 2) * 8), Math.round(y - 5 - ph * 16), 1, 1);
  }
  c.globalAlpha = 1;
  // El poroto: el de Buu's Fury (10×10); hasta que carga, el dibujado de 12×8
  if (ITEM_IMG.senzu) { c.imageSmoothingEnabled = false; c.drawImage(senzuLined(), x - 6, y - 6); return; }
  SENZU_ART.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      c.fillStyle = SENZU_PAL[ch];
      c.fillRect(x - 6 + i, y - 4 + j, 1, 1);
    }
  });
}
// Segunda vida del HUD (Semilla de reserva): la semilla dentro de un corazón, para no confundirla con la que cura
const LIFE_HEART = [
  '..ooooo...ooooo..',
  '.orrrrro.orrrrro.',
  'orrwwrrrorrrrrrro',
  'orrwrrrrrrrrrrrro',
  'orrrrrrrrrrrrrrro',
  'orrrrrrrrrrrrrrro',
  'orrrrrrrrrrrrrrro',
  '.orrrrrrrrrrrrro.',
  '..orrrrrrrrrrro..',
  '...orrrrrrrrro...',
  '....orrrrrrro....',
  '.....orrrrro.....',
  '......orrro......',
  '.......oro.......',
  '........o........',
];
const LIFE_HEART_PAL = { o: '#2a0610', r: '#ff3d5c', w: '#ffc4cf' };
function hudReserveSenzu(x, y, ready) {
  const s = 1.4;
  const px = (art, pal, ox, oy) => art.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      ctx.fillStyle = pal[row[i]];
      ctx.fillRect(Math.round(x + (i + ox) * s), Math.round(y + (j + oy) * s), Math.ceil(s), Math.ceil(s));
    }
  });
  ctx.globalAlpha = ready ? 1 : 0.35;
  px(LIFE_HEART, LIFE_HEART_PAL, -8.5, -7.5);
  if (ITEM_IMG.senzu) { ctx.imageSmoothingEnabled = false; ctx.drawImage(ITEM_IMG.senzu, Math.round(x - 5 * s), Math.round(y - 5 * s), Math.round(10 * s), Math.round(10 * s)); }
  else px(SENZU_ART, SENZU_PAL, -6, -5);
  ctx.globalAlpha = 1;
  if (!ready) { ctx.strokeStyle = '#ff5c5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 11, y + 9); ctx.lineTo(x + 11, y - 9); ctx.stroke(); }
}
// Cápsula de Bulma: al recogerla, toda la experiencia del mapa vuela hacia ti
// (2.15.1) una cápsula Hoi-Poi en pixel art, con el mismo estilo que los objetos de GBA: cilindro blanco
// sombreado, franja azul con el número, tapa gris y el botón amarillo en la punta
const CAPSULE_ART = [
  '...oooooooooooo...',
  '..ohhhhhhhhhkccco.',
  '.ohhwwwwwwwwkcccyo',
  '.ohwwwrrwrwwkcccyo',
  '.owwwwrrwrwwkcccyo',
  '.owwwwrrwrwwkcccYo',
  '.osswwwwwwwwkdddso',
  '..ossssssssskdddo.',
  '...oooooooooooo...',
];
const CAPSULE_PAL = { o: '#141428', h: '#ffffff', w: '#e9ecf4', s: '#a3a9c0', c: '#c9cfdf', d: '#8a90a8', k: '#4a4f66', r: '#2f7fe0', y: '#ffd93b', Y: '#b07a10' };   // r: la franja (azul, como la cápsula de Bulma)
function drawCapsule(c, x, y, t = 0) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  y = Math.round(y + Math.sin(t * 3 + 1) * 2); x = Math.round(x);
  c.save();
  c.globalAlpha = 0.25 + 0.2 * pulse; c.fillStyle = '#8fd8ff'; circle(c, x, y, 13 + pulse * 3);
  c.restore();
  CAPSULE_ART.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '.') continue;
      c.fillStyle = CAPSULE_PAL[row[i]];
      c.fillRect(x - 9 + i, y - 4 + j, 1, 1);
    }
  });
}
// "¡POOF!" al abrir la cápsula: bolitas de humo blanco con borde que se inflan y se desvanecen
const POOF_PUFFS = [[0, 0, 5], [-6, -2, 4], [6, -1, 4], [-3, -6, 4], [4, -6, 3], [-7, 4, 3], [7, 4, 3]];
function drawPoof(c, f) {
  const p = 1 - f.t / f.dur, k = 0.4 + p * 1.2;
  c.globalAlpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
  for (const pass of [0, 1]) for (const [dx, dy, r] of POOF_PUFFS) {
    c.fillStyle = pass ? (dy < -3 ? '#ffffff' : '#e3e6ee') : '#5a5f78';   // primero los bordes, después el relleno
    circle(c, Math.round(f.x + dx * k), Math.round(f.y + dy * k), Math.round(r * k + (pass ? 0 : 1)));
  }
  c.globalAlpha = 1;
}
function poof(x, y) {
  G.fx.push({ type: 'poof', x, y, t: 0.5, dur: 0.5 });
  emit(['p', Math.round(x), Math.round(y)]);
}

// Un rayo desde (ax, ay) en la dirección b.ang: crece al salir y se afina al apagarse
// (los de los jugadores salen de sus manos; los de los jefes, desde donde los dispararon)
// Zona de gravedad (Puipui): se marca y a los 0,6 s empieza a pesar
// Caja de regalo de Mr. Satán: roja con moño dorado; al final tiembla y titila
function drawGift(c, x, y, left) {
  const sh = left < 0.6 ? Math.round(Math.sin(G.t * 60) * 1.5) : 0, X = Math.round(x) + sh, Y = Math.round(y);
  if (left < 0.6 && Math.floor(left * 14) % 2) return;
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(X - 9, Y + 5, 18, 3);
  c.fillStyle = '#5a0a1a'; c.fillRect(X - 9, Y - 12, 18, 17);
  c.fillStyle = '#e23b3b'; c.fillRect(X - 8, Y - 11, 16, 15);
  c.fillStyle = '#ff7a7a'; c.fillRect(X - 8, Y - 11, 16, 3);
  c.fillStyle = '#ffd93b'; c.fillRect(X - 1, Y - 11, 3, 15); c.fillRect(X - 8, Y - 6, 16, 3);
  c.fillRect(X - 5, Y - 16, 4, 4); c.fillRect(X + 2, Y - 16, 4, 4);
}
function drawZone(c, z, t) {
  const on = z.t < z.dur - 0.6, a = Math.min(1, (z.dur - z.t) / 0.6) * Math.min(1, z.t / 0.5);
  c.save();
  c.globalAlpha = (on ? 0.42 : 0.18) * a; c.fillStyle = '#6a22ff';
  c.beginPath(); c.ellipse(z.x, z.y, z.r, z.r * 0.75, 0, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 0.9 * a; c.strokeStyle = '#d8b8ff'; c.lineWidth = 2; c.stroke();
  if (on) {   // flechitas que bajan: algo te aplasta
    c.fillStyle = '#e8d8ff';
    for (let i = 0; i < 6; i++) {
      const ang = i / 6 * Math.PI * 2, ph = (t * 1.5 + i / 6) % 1, x = z.x + Math.cos(ang) * z.r * 0.55, y = z.y + Math.sin(ang) * z.r * 0.4 - 12 + ph * 16;
      c.globalAlpha = 0.8 * a * (1 - ph);
      c.fillRect(Math.round(x) - 2, Math.round(y), 5, 1); c.fillRect(Math.round(x) - 1, Math.round(y) + 1, 3, 1); c.fillRect(Math.round(x), Math.round(y) + 2, 1, 1);
    }
  }
  c.restore();
}
function drawBeamBody(c, ax, ay, b, t) {
  const grow = Math.min(1, (b.dur - b.t) / 0.08), fade = Math.min(1, b.t / 0.15);
  const len = b.len * grow, w = Math.max(2, b.width * fade);
  const wob = Math.sin(t * 60) * 1.5;
  c.save(); c.translate(Math.round(ax), Math.round(ay)); c.rotate(b.ang);
  c.globalAlpha = 0.35; c.fillStyle = b.color; c.fillRect(0, -(w * 0.8 + wob), len, (w * 0.8 + wob) * 2);
  c.globalAlpha = 1;
  if (sfxReady()) {   // el cuerpo del rayo se arma repitiendo el tramo del sprite (32x8) a lo ancho del rayo
    const th = w * 1.1, tw = 32 * th / 8, [img, sx, sy] = beamTile(b.color);
    for (let x = 0; x < len; x += tw) {
      const seg = Math.min(tw, len - x);
      c.drawImage(img, sx, sy, Math.max(1, 32 * seg / tw), 8, Math.round(x), Math.round(-th / 2), Math.ceil(seg), Math.round(th));
    }
    c.fillStyle = b.core;
  } else {
    c.fillRect(0, -w / 2, len, w);
    c.fillStyle = b.core; c.fillRect(0, -w * 0.22, len, w * 0.44);
  }
  circle(c, 0, 0, w * 0.75); circle(c, len, 0, w * 0.85);
  c.fillStyle = b.color; c.globalAlpha = 0.5; circle(c, len, 0, w * 1.25);
  c.restore();
}
// ─── Ataques de los compañeros (online, 2.24.0) ───
// Con 4 jugadores, en un celular, los ataques de todos juntos tapan la pantalla. Los tuyos se ven como siempre; los
// de los compañeros se dibujan en una capa aparte que se pega con ALLY_ALPHA (así se atenúa todo el dibujo junto, sin
// tocar cada función de dibujo). En el invitado, el dueño llega en la instantánea (ownerId).
const ALLY_ALPHA = 0.4;
let allyLayer = null;
const hasAllies = () => !!(G.me && G.players.length > 1 && G.players.some(P => P !== G.me && !P.gone));
function isAlly(o) {
  const id = o.owner ? o.owner.id : o.ownerId;
  if (id === undefined || id === null || id < 0 || id === G.me.id) return false;
  return !(G.fusion && G.fusion.ids.includes(id) && G.fusion.ids.includes(G.me.id));   // en la fusión, lo de la fusión es tuyo
}
function allyPass(c, list, draw) {
  let L = null;
  for (const o of list) {
    if (!isAlly(o)) continue;
    if (!L) {
      const cv = c.canvas;
      if (!allyLayer) allyLayer = document.createElement('canvas');
      if (allyLayer.width !== cv.width || allyLayer.height !== cv.height) { allyLayer.width = cv.width; allyLayer.height = cv.height; }
      L = allyLayer.getContext('2d');
      L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, cv.width, cv.height);
      L.setTransform(c.getTransform()); L.imageSmoothingEnabled = false; L.globalAlpha = 1;
    }
    draw(L, o);
  }
  if (!L) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = ALLY_ALPHA; c.drawImage(allyLayer, 0, 0); c.restore();
}
function render() {
  const M = G.me, V = viewer(), t = G.t, c = bctx;
  const sh = G.shake > 0 && G.mode === 'play' ? G.shake * 7 : 0;   // en la pausa o eligiendo mejora no tiembla
  beginWorld(V.x, V.y, Math.round(rand(-sh, sh)), Math.round(rand(-sh, sh)));
  const props = drawGround(c, camX, camY, BW, BH);
  if (G.snake) snakeDrawWorld(c, t);   // Camino de la Serpiente: puntos de control, nubes Kinton, fantasma

  // Zonas de impacto telegrafiadas
  for (const z of G.zones || []) drawZone(c, z, t);
  for (const h of G.hazards) {
    const p = Math.max(0, 1 - h.t / h.dur), mark = h.dmg === 0 || h.mark;   // marca sin daño: verde
    if (h.ball) {   // Death Ball: la bola baja desde Freezer hasta la marca
      const bx = h.ball.x + (h.x - h.ball.x) * p, by = h.ball.y + (h.y - h.ball.y) * p, br = h.ball.r * (0.6 + 0.4 * p);
      c.save(); c.globalAlpha = 0.35; c.fillStyle = '#ff9a4d'; circle(c, bx, by, br * 1.35); c.globalAlpha = 1;
      c.fillStyle = '#ff5a1f'; circle(c, bx, by, br); c.fillStyle = '#ffd08a'; circle(c, bx - br * 0.25, by - br * 0.25, br * 0.5); c.restore();
    }
    c.fillStyle = mark ? `rgba(60,200,60,${0.2 + p * 0.3})` : `rgba(230,40,30,${0.15 + p * 0.25})`;
    c.beginPath(); c.ellipse(h.x, h.y, h.r, h.r * 0.75, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = mark ? '#3dff6a' : '#ff3d2a'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(h.x, h.y, h.r * p, h.r * p * 0.75, 0, 0, Math.PI * 2); c.stroke();
  }
  // Recorrido de las embestidas: franja que se va llenando hasta que el jefe sale disparado
  for (const l of G.lanes) {
    const p = Math.min(1, Math.max(0, 1 - l.t / l.dur)), fade = l.t > 0 ? 1 : Math.max(0, 1 + l.t / DASH_TIME);
    c.save(); c.translate(l.x, l.y); c.rotate(Math.atan2(l.dy, l.dx)); c.globalAlpha = fade;
    c.fillStyle = 'rgba(230,40,30,0.18)'; c.fillRect(0, -l.w / 2, l.len, l.w);
    c.fillStyle = `rgba(255,70,40,${0.2 + p * 0.25})`; c.fillRect(0, -l.w / 2, l.len * p, l.w);
    c.strokeStyle = '#ff3d2a'; c.lineWidth = 2; c.strokeRect(0, -l.w / 2, l.len, l.w);
    c.fillStyle = '#ff3d2a';   // punta de flecha al final
    c.beginPath(); c.moveTo(l.len + 12, 0); c.lineTo(l.len - 4, -l.w / 2 - 4); c.lineTo(l.len - 4, l.w / 2 + 4); c.closePath(); c.fill();
    c.restore();
  }
  // Objetos del suelo
  for (const p of G.pickups) {
    if (p.kind === 'xp') drawGem(c, p.x, p.y + Math.sin(t * 5 + p.x), p.v);
    // (las semillas, las cápsulas y las Esferas del Dragón se dibujan más abajo, encima de los decorados y los personajes)
  }
  // Ondas expansivas (a ras de suelo). Online, las de los compañeros más transparentes (allyPass)
  const allies = hasAllies();
  for (const n of G.novas) if (!allies || !isAlly(n)) drawNova(c, n, t);
  if (allies) allyPass(c, G.novas, (L, n) => drawNova(L, n, t));

  // Decorados y personajes ordenados por profundidad
  const vw = BW / 2 + 60, vh = BH / 2 + 90, list = [];
  for (const p of props) if (Math.abs(p.x - camX) < vw && Math.abs(p.y - camY) < vh + 60) list.push({ y: p.y, p });
  for (const e of G.enemies) if (Math.abs(e.x - camX) < vw && Math.abs(e.y - camY) < vh) list.push({ y: e.y + 12 * e.scale, e });
  for (const P of G.players) if (!P.gone) list.push({ y: P.y + 12, pl: P });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.p) drawProp(c, it.p);
    else if (it.pl) drawPlayer(c, it.pl);
    else drawEnemy(c, it.e, t);
  }
  // Semillas y cápsulas (2.18.1) y Esferas del Dragón tiradas: por encima de todo (se ven aunque caigan detrás
  // de un árbol o en medio de una horda); las esferas, además, con un haz de luz que sube.
  // Si se pisan, manda la cápsula, después la esfera y después la semilla (como en el minimapa)
  for (const p of G.pickups) if (p.kind === 'senzu') drawSenzu(c, p.x, p.y, t);
  for (const p of G.pickups) {
    if (p.kind !== 'ball') continue;
    const by = p.y + Math.round(Math.sin(t * 4) * 2), pulse = 0.5 + 0.5 * Math.sin(t * 5 + p.x);
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(0, by - 70, 0, by);
    g.addColorStop(0, 'rgba(255,170,40,0)'); g.addColorStop(1, `rgba(255,190,70,${0.35 + 0.25 * pulse})`);
    c.fillStyle = g; c.fillRect(p.x - 5, by - 70, 10, 70);
    c.fillStyle = `rgba(255,240,180,${0.25 + 0.2 * pulse})`; c.fillRect(p.x - 1, by - 60, 2, 60);
    c.restore();
    drawDragonBall(c, p.x, by, 6, G.dragonBalls + 1, true);
  }
  for (const p of G.pickups) if (p.kind === 'capsule') drawCapsule(c, p.x, p.y, t);

  // Esferas orbitales
  const drawOrbits = (c, P) => {
    for (const o of orbitPositions(P)) {
      if (o.shield) { c.globalAlpha = 0.25 + 0.15 * Math.sin(t * 8); c.fillStyle = '#bff6ff'; circle(c, o.x, o.y, o.r + 6); }   // Escudo de Ki
      c.globalAlpha = 0.4; c.fillStyle = '#7dffb0'; circle(c, o.x, o.y, o.r + 3); c.globalAlpha = 1;
      c.fillStyle = '#2fbf6a'; circle(c, o.x, o.y, o.r);
      c.fillStyle = '#b8ffd6'; circle(c, o.x - 1, o.y - 1, o.r * 0.6);
      c.fillStyle = '#ffffff'; c.fillRect(Math.round(o.x - 3), Math.round(o.y - 3), 2, 2);
    }
  };
  for (const P of G.players) if (!allies || !isAlly({ owner: P })) drawOrbits(c, P);
  if (allies) allyPass(c, G.players.map(P => ({ owner: P })), (L, o) => drawOrbits(L, o.owner));
  // Proyectiles de los jugadores
  const drawProj = (c, p) => {
    if (p.kind === 'disc') {
      c.save(); c.translate(Math.round(p.x), Math.round(p.y)); c.rotate(Math.round(p.spin * 2) / 2);
      c.fillStyle = 'rgba(255,216,74,0.45)'; c.beginPath(); c.ellipse(0, 0, p.r + 3, (p.r + 3) * 0.4, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffe066'; c.beginPath(); c.ellipse(0, 0, p.r, p.r * 0.3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fffbe0'; c.fillRect(-p.r + 2, -1, p.r * 2 - 4, 1);
      c.restore();
    } else if (p.kind === 'spiral') {
      c.save(); c.translate(Math.round(p.x), Math.round(p.y)); c.rotate(Math.atan2(p.vy, p.vx));
      c.fillStyle = '#fff6c0'; c.fillRect(-28, -1, 32, 3);
      c.fillStyle = '#ffb81c';
      for (let x = -28; x <= 2; x += 2) c.fillRect(x, Math.round(Math.sin(x * 0.5 + p.spin) * 4) - 1, 2, 2);
      c.restore();
    } else if (p.kind === 'big' && beamKind(p.color) === 0 && sfxReady()) {
      // Genkidama, Big Bang y Final Impact: esfera de energía que palpita
      const sz = Math.round(p.r * 2.7 * (1 + 0.06 * Math.sin(p.spin)));
      c.globalAlpha = 0.3; c.fillStyle = p.color; circle(c, p.x, p.y, p.r * 1.7); c.globalAlpha = 1;
      c.drawImage(SFX_IMG, 3 * 32, SFX_ANIMS.sphere.row * 32, 32, 32, Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
    } else {
      const r = p.r;
      c.globalAlpha = 0.35; c.fillStyle = p.color; circle(c, p.x, p.y, r * 1.9); c.globalAlpha = 1;
      c.fillStyle = p.color; circle(c, p.x, p.y, r);
      c.fillStyle = '#ffffff'; circle(c, p.x - r * 0.2, p.y - r * 0.2, r * 0.55);
    }
  };
  for (const p of G.projs) if (!allies || !isAlly(p)) drawProj(c, p);
  if (allies) allyPass(c, G.projs, drawProj);
  // Rayos (salen de las manos de su dueño) y los de los jefes (desde donde los dispararon)
  const drawBeam = (c, b) => { const P = b.owner; if (P && b.t > 0) drawBeamBody(c, P.x + Math.cos(b.ang) * 12, P.y - 3 + Math.sin(b.ang) * 10, b, t); };
  for (const b of G.beams) if (!allies || !isAlly(b)) drawBeam(c, b);
  if (allies) allyPass(c, G.beams, drawBeam);
  for (const b of G.ebeams || []) if (b.t > 0) drawBeamBody(c, b.x + Math.cos(b.ang) * 14, b.y + Math.sin(b.ang) * 10, b, t);
  // Disparos enemigos
  for (const s of G.shots) {
    c.fillStyle = '#5a0a1a'; circle(c, s.x, s.y, s.r + 1);
    c.fillStyle = s.color; circle(c, s.x, s.y, s.r);
    c.fillStyle = '#fff2e0'; circle(c, s.x - 1, s.y - 1, s.r * 0.45);
  }
  // Partículas
  for (const f of G.fx) {
    if (f.type === 'anim') { if (sfxReady()) drawAnimFx(c, f); continue; }
    if (f.type === 'poof') { drawPoof(c, f); continue; }
    if (f.type === 'ring') {
      c.globalAlpha = Math.max(0, f.t / f.dur); c.strokeStyle = f.color; c.lineWidth = 3;
      const rr = f.r * (1.2 - f.t / f.dur * 0.4);
      c.beginPath(); c.ellipse(f.x, f.y, rr, rr * 0.8, 0, 0, Math.PI * 2); c.stroke();
    } else {
      c.globalAlpha = Math.min(1, f.t * 3); c.fillStyle = f.color;
      const s = Math.max(1, Math.round(f.size * 0.7));
      c.fillRect(Math.round(f.x), Math.round(f.y), s, s);
    }
  }
  c.globalAlpha = 1;
  // ¡Amigo Buu!: Majin Buu peleando por Mr. Satán
  const BUU_LOOK = BOSSES.find(b => b.id === 'fatbuu').look;
  for (const h of G.helpers || []) {
    if (h.t < 1 && Math.floor(h.t * 12) % 2) continue;   // titila antes de irse
    drawActor(c, BUU_LOOK, h.x, h.y, { facing: h.facing, anim: h.punch > 0 ? 'cast' : 'walk', t: G.t * 0.8 });
  }
  // Zanzoken: las imágenes residuales (translúcidas, titilan al final) · Bomba de regalo: la caja
  for (const d of G.decoys || []) {
    if (d.gift) { drawGift(c, d.x, d.y, d.t); continue; }
    const P = d.owner && G.players.includes(d.owner) ? d.owner : G.players.find(p => p.id === d.ownerId);
    if (!P) continue;
    c.globalAlpha = d.t < 0.6 ? (Math.floor(d.t * 16) % 2 ? 0.2 : 0.55) : 0.5;
    const { ch, tr } = fighterLook(P, isFused(P));   // con tu aspecto de ahora: Gogeta o transformado
    drawActor(c, ch.look, d.x, d.y, { facing: d.facing || 1, anim: 'idle', t: 0, noShadow: true, ssj: tr && hasTransformLook(ch) });
    c.globalAlpha = 0.25; c.strokeStyle = '#c8e0ff'; c.lineWidth = 1;
    c.beginPath(); c.ellipse(d.x, d.y + 8, d.taunt * 0.25, d.taunt * 0.18, 0, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;
  }
  // Los jugadores se vuelven a dibujar encima de rayos y proyectiles
  for (const P of G.players) if (!P.gone) drawPlayer(c, P, true);
  presentWorld();
  drawBlind();   // Taiyoken de Cell: la pantalla blanca (el HUD sigue a la vista)
  drawVignette(M.transformed > 0 ? M.c.aura : null);
  drawNames();
  drawTexts();
  drawHUD();
  drawSummon();
  drawAimReticle();
  if (typeof Replays !== 'undefined') Replays.frame();   // copia para la repetición (si está grabando)
}
// Apuntado manual: el cursor del sistema se esconde (ver style.css) y se dibuja una mira grande,
// con borde oscuro y una línea tenue desde el guerrero, para no perderla entre tantos efectos
function drawAimReticle() {
  const viaPad = SAVE.aim && G.mode === 'play' && padAiming();
  if (!viaPad && (!SAVE.aim || isTouch() || G.mode !== 'play' || performance.now() - mouse.t > 30000)) return;
  const V = viewer();
  const px = (V.x - camX + BW / 2) * SCALE, py = (V.y - 4 - camY + BH / 2) * SCALE;
  const mx = viaPad ? px + Math.cos(pad.aim) * 80 * SCALE : mouse.x, my = viaPad ? py + Math.sin(pad.aim) * 80 * SCALE : mouse.y;
  const pulse = 1 + 0.08 * Math.sin(performance.now() / 120), r = 12 * pulse;
  ctx.save();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.setLineDash([4, 6]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(mx, my); ctx.stroke();
  ctx.setLineDash([]); ctx.lineCap = 'round';
  const shape = () => {
    ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(mx + dx * (r - 5), my + dy * (r - 5)); ctx.lineTo(mx + dx * (r + 7), my + dy * (r + 7)); }
    ctx.stroke();
  };
  ctx.lineWidth = 6; ctx.strokeStyle = '#0a0f2e'; shape();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#ff4dd8'; shape();
  ctx.fillStyle = '#0a0f2e'; circle(ctx, mx, my, 3.5);
  ctx.fillStyle = '#ffffff'; circle(ctx, mx, my, 2);
  ctx.restore();
}
function drawEnemy(c, e, t) {
  if (e.elite) {
    // Anillo dorado en el piso que late: se distingue de una mirada entre la multitud
    const p = 0.5 + 0.5 * Math.sin(t * 5 + e.phase), rx = 17 * e.scale + p * 3;
    c.save(); c.globalAlpha = 0.55 + 0.35 * p; c.strokeStyle = '#ffcc33'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(e.x, e.y + 11 * e.scale, rx, rx * 0.4, 0, 0, Math.PI * 2); c.stroke(); c.restore();
    drawAura(c, '#ffcc33', e.x, e.y, t + e.phase, e.scale);
  }
  // Mira hacia el jugador que persigue (de frente, de espaldas o de perfil si la hoja lo tiene)
  const target = nearestPlayer(e.x, e.y);
  const dir = target ? dirFromVec(target.x - e.x, target.y - e.y) : 'side';
  const alt = enemyAlt(e, t), ey = e.y - alt;
  if (alt > 0.5) drawAirborne(c, e, alt, t);
  const casting = e.cast || e.castF, spec = BOSS_SPECIAL[e.id];
  if (casting && spec) drawAura(c, spec.color, e.x, ey, t + e.phase, e.scale * 1.25);
  const shielded = e.shield > 0 || e.shieldF;   // Barrera del Androide 17: la burbuja de energía
  if (shielded && ITEM_IMG.shield) {
    const sz = Math.round(56 * e.scale);
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = 0.5 + 0.1 * Math.sin(t * 9);
    c.drawImage(ITEM_IMG.shield, 6 * 32, 0, 32, 32, Math.round(e.x - sz / 2), Math.round(ey - 6 * e.scale - sz / 2), sz, sz); c.restore();
  }
  const tp = e.tp || e.tpF;   // teletransportándose: se desvanece titilando
  if (tp) c.globalAlpha = Math.floor(t * 16) % 2 ? 0.15 : 0.45;
  drawActor(c, e.def.look, e.x, ey, { facing: e.facing, dir, variant: e.nid, anim: 'walk', t: t + e.phase, scale: e.scale, flash: e.flash > 0, outline: !!THEME.outline, noShadow: alt > 0.5 });
  c.globalAlpha = 1;
  if (casting && spec) {   // la bola de energía en las manos, latiendo
    const r = 5 + Math.sin(t * 25) * 1.5;
    c.save(); c.globalAlpha = 0.85; c.fillStyle = spec.color; circle(c, e.x + e.facing * 10 * e.scale, ey - 4 * e.scale, r + 3);
    c.fillStyle = '#ffffff'; circle(c, e.x + e.facing * 10 * e.scale, ey - 4 * e.scale, r * 0.55); c.restore();
  }
  if (e.stun > 0 || e.stunF) {   // paralizado (Taiyoken): estrellitas que giran sobre la cabeza
    c.fillStyle = '#ffe14d';
    for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; c.fillRect(Math.round(e.x + Math.cos(a) * 9 * e.scale) - 1, Math.round(ey - 30 * e.scale + Math.sin(a) * 3) - 1, 3, 3); }
  }
  if (e.ball) drawDragonBall(c, e.x, ey - 34 * e.scale, 4, 1, false);
  if (e.boss && G.lv.infinite) drawHalo(c, e.x, ey - 30 * e.scale - 6 + Math.sin(t * 3 + e.phase) * 1.5);
  if (e.windup > 0) {   // "¡!" sobre el que está por embestir (más chico en los enemigos comunes)
    const y = Math.round(ey - 30 * e.scale - 6 + Math.sin(t * 20) * 2);
    c.font = `700 ${e.boss ? 16 : 11}px ${FONT}`; c.textAlign = 'center'; c.lineJoin = 'round';
    c.lineWidth = 3; c.strokeStyle = '#0a0f2e'; c.strokeText('¡!', e.x, y);
    c.fillStyle = '#ff3d2a'; c.fillText('¡!', e.x, y);
  }
  if (e.elite) {   // élite: barra de vida dorada, más grande y siempre a la vista
    const w = 30, x = Math.round(e.x - w / 2), y = Math.round(ey + 15 * e.scale);
    c.fillStyle = '#ffcc33'; c.fillRect(x - 2, y - 2, w + 4, 7);
    c.fillStyle = '#1a0a10'; c.fillRect(x - 1, y - 1, w + 2, 5);
    c.fillStyle = '#ff4d4d'; c.fillRect(x, y, Math.round(w * Math.max(0, e.hp) / e.maxHp), 3);
  } else if (!e.boss && e.hp < e.maxHp) {
    const w = 16, x = Math.round(e.x - w / 2), y = Math.round(ey + 15 * e.scale);
    c.fillStyle = '#1a0a10'; c.fillRect(x - 1, y - 1, w + 2, 4);
    c.fillStyle = '#ff4d4d'; c.fillRect(x, y, Math.round(w * Math.max(0, e.hp) / e.maxHp), 2);
  }
}
// Altura del enemigo en el aire (sale de e.air en el anfitrión y de e.airF en el invitado): los que vuelan flotan
// subiendo y bajando un poco, los Saibaiman van a los saltos
function enemyAlt(e, t) {
  const air = e.air || e.airF, mv = moveKind(e);
  e.airDT = air ? (e.airDT || 0) + Math.max(0, Math.min(0.1, t - (e.lastDraw ?? t))) : 0;
  e.lastDraw = t;
  // Saibaiman: un arco (en el invitado, que no sabe cuánto dura el salto, uno parecido)
  const jumpP = e.leap ? Math.min(1, e.leap.t / e.leap.dur) : Math.min(1, e.airDT / 0.8), jumpH = e.leap ? e.leap.h : 45;
  const want = !air ? 0 : mv === 'jump' ? Math.sin(Math.PI * jumpP) * jumpH : 20 + Math.sin(e.airDT * 6 + e.phase) * 2.5;
  e.altS = air && mv === 'jump' ? want : (e.altS || 0) + (want - (e.altS || 0)) * 0.2;
  return Math.round(e.altS);
}
// En el aire: la sombra se queda en el suelo (más chica cuanto más alto); los guerreros que vuelan, con aura de Ki y estela
function drawAirborne(c, e, alt, t) {
  const s = e.scale, gy = e.y + 12 * s, k = Math.max(0.45, 1 - alt / 40);
  c.save();
  c.fillStyle = 'rgba(10,5,20,0.45)';
  c.beginPath(); c.ellipse(e.x, gy, 12 * s * k, 4 * s * k, 0, 0, Math.PI * 2); c.fill();
  if (moveKind(e) === 'hover') {   // las aves vuelan solas; los Saibaiman saltan: sin aura
    for (let i = 0; i < 3; i++) {   // rayitas de viento que caen entre los pies y la sombra
      const ph = (t * 2.5 + i / 3 + e.phase) % 1;
      c.globalAlpha = 0.85 * (1 - ph); c.fillStyle = '#3f6fc0';
      c.fillRect(Math.round(e.x - 6 * s + i * 6 * s), Math.round(gy - alt + 4 + ph * alt * 0.8), 2, 5);
    }
    c.restore();
    drawAura(c, '#9fdcff', e.x, e.y - alt, t + e.phase, 0.85 * s);   // aura de Ki celeste: está volando
    return;
  }
  c.restore();
}
// overlay: segunda pasada por encima de las técnicas, para que no tapen al personaje
// Cómo se ve un guerrero ahora: ch (sus datos, o los de Gogeta si está fusionado) y tr (transformado)
function fighterLook(P, fused) {
  const ch = fused ? Object.assign({}, P.c, GOGETA, { ssjHair: null, transformSprite: false }) : P.c;   // el sprite de Gogeta ya es SSJ
  return { ch, tr: P.transformed > 0 || fused };
}
function drawPlayer(c, P, overlay = false) {
  if (P.hidden) return;                      // absorbido por la fusión
  if (P.fallT > 0) {   // cayendo al Infierno (Camino de la Serpiente): se achica y se oscurece
    if (overlay) return;
    const f = Math.max(0, P.fallT / SNAKE_FALL_TIME);
    c.save(); c.globalAlpha = f; c.filter = `brightness(${0.35 + 0.65 * f})`;
    drawActor(c, P.c.look, P.x, P.y + (1 - f) * 18, { facing: P.facing, anim: 'idle', t: 0, scale: 0.3 + 0.7 * f, noShadow: true });
    c.restore();
    return;
  }
  const { ch, tr } = fighterLook(P, isFusedBody(P));
  if (overlay && P.dead) return;
  if (P.dead) { // caído: translúcido, con el progreso de reanimación
    c.globalAlpha = 0.45;
    drawActor(c, ch.look, P.x, P.y, { facing: P.facing, anim: 'idle', t: 0 });
    c.globalAlpha = 1;
    if (P.revive > 0) {
      c.strokeStyle = '#6cff7a'; c.lineWidth = 3;
      c.beginPath(); c.arc(P.x, P.y - 4, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, P.revive / 2.5)); c.stroke();
    }
    return;
  }
  if (tr && !overlay && !ch.buddy) drawAura(c, ch.aura, P.x, P.y, G.t, 1.15);   // (Mr. Satán no se transforma)
  if (P.kaioken > 0 && !overlay) drawAura(c, '#ff3d3d', P.x, P.y, G.t + 1, 1.25);   // Kaioken: aura roja
  if (P.immortal > 0 && !overlay) {   // Inmortalidad: anillo dorado que late (parpadea el último segundo)
    if (P.immortal > 1 || Math.floor(G.t * 10) % 2) {
      c.globalAlpha = 0.35 + 0.2 * Math.sin(G.t * 8); c.strokeStyle = '#ffe27a'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(P.x, P.y + 2, 20, 26, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
    }
  }
  // Petrificado (Dabura): gris · caramelo (Majin Buu): rosado
  const tint = P.stone > 0 ? 'grayscale(1) brightness(1.1)' : P.candy > 0 ? 'sepia(1) saturate(3) hue-rotate(290deg) brightness(1.15)'
    : P.swapBody > 0 ? 'sepia(1) saturate(3) hue-rotate(220deg)' : null;   // violeta: en el cuerpo de Ginyu
  if (tint) c.filter = tint;
  // Mr. Satán: tirado en el piso (Dynamite Kick fallida) o posando (al subir de nivel o mientras pelea Buu)
  const special = P.koT > 0 ? koAnim(P) : P.tripT > 0 ? 'trip' : (P.poseT > 0 || (ch.buddy && P.transformed > 0 && !P.moving)) ? 'pose' : null;
  if (!(P.inv > 0 && !P.bubble && Math.floor(P.inv * 20) % 2)) {   // con el escudo puesto no parpadea
    drawActor(c, ch.look, P.x, P.y, {
      facing: P.facing, dir: special === 'pose' ? 'down' : special ? 'side' : P.dir, t: G.t + P.id * 0.37, ssj: tr && hasTransformLook(ch) && !(P.koT > 0),
      anim: special || (P.punchT > 0 ? 'punch' : P.castT > 0 ? 'cast' : !P.moving ? 'idle' : ch.flee && P.hp < P.maxHp * 0.3 ? 'flee' : 'walk'),   // Mr. Satán huye asustado
      noShadow: overlay,
    });
  }
  c.filter = 'none';
  if (tr && overlay) drawAuraFront(c, ch.aura, P.x, P.y, G.t, 1.15);
  if (P.halo && overlay) drawHalo(c, P.x, P.y - 34 + Math.sin(G.t * 3 + P.id) * 1.5);
  if (overlay) drawShield(c, P);
  const x = Math.round(P.x - 12), y = Math.round(P.y + 16);
  c.fillStyle = '#1a0a10'; c.fillRect(x - 1, y - 1, 26, 5);
  c.fillStyle = '#5a1a1a'; c.fillRect(x, y, 24, 3);
  c.fillStyle = P.hp / P.maxHp > 0.3 ? '#4dff6a' : '#ff4d4d'; c.fillRect(x, y, Math.round(24 * Math.max(0, P.hp) / P.maxHp), 3);
}
// Escudo de energía (Buu's Fury) mientras dura una inmunidad larga: la Semilla de reserva (3 s) o al revivir en
// cooperativo (2 s). Los golpes dan 0,5 s y las fusiones 99, así que esos no lo muestran. Sale de P.inv, que ya
// viaja por la red: el invitado también lo ve.
function drawShield(c, P) {
  if (!(P.inv > 0) || P.inv > 50) { P.bubble = 0; return; }
  if (!P.bubble) { if (P.inv <= 1.6) return; P.bubble = P.inv; }   // cuánto dura esta inmunidad
  const im = ITEM_IMG.shield;
  if (!im) return;
  const f = Math.min(6, Math.floor((P.bubble - P.inv) / 0.05));   // se infla en un tercio de segundo
  const end = P.inv < 0.6 ? (Math.floor(P.inv * 12) % 2 ? 0.35 : 1) : 1;   // titila al terminar
  c.save();
  c.imageSmoothingEnabled = false;
  c.globalAlpha = (0.52 + 0.08 * Math.sin(G.t * 9)) * end;
  c.drawImage(im, f * 32, 0, 32, 32, Math.round(P.x - 24), Math.round(P.y - 30), 48, 48);
  c.restore();
}
// Aureola del Otro Mundo (se ganó usando la Semilla de reserva): anillo amarillo en pixel art, como en los juegos de GBA
// (más claro arriba, anaranjado abajo, con borde oscuro de un píxel)
const HALO_ART = [
  '....hhhhhhh....',
  '..hhy.....yhh..',
  '.yy.........yy.',
  '..oyy.....yyo..',
  '....ooooooo....',
];
const HALO_PAL = { h: '#fff6a0', y: '#ffd426', o: '#e08a10' };
// Píxeles ya calculados (grilla de 17×7): el anillo y su borde oscuro solo por fuera, así el centro queda hueco
const HALO_PX = (() => {
  const ring = new Map();
  HALO_ART.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') ring.set(`${i + 1},${j + 1}`, HALO_PAL[row[i]]); });
  const px = [];
  for (let j = 0; j < 7; j++) for (let i = 0; i < 17; i++) {
    if (ring.has(`${i},${j}`)) continue;
    const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ring.has(`${i + dx},${j + dy}`));
    const inside = ((i - 8) / 6.5) ** 2 + ((j - 3) / 1.6) ** 2 < 1;
    if (touches && !inside) px.push([i, j, '#4a2a00']);
  }
  for (const [k, col] of ring) { const [i, j] = k.split(',').map(Number); px.push([i, j, col]); }
  return px;
})();
function drawHalo(c, x, y) {
  const ox = Math.round(x) - 8, oy = Math.round(y) - 3;
  for (const [i, j, col] of HALO_PX) { c.fillStyle = col; c.fillRect(ox + i, oy + j, 1, 1); }
}
const PLAYER_COLORS = ['#ffe27a', '#7fd8ff', '#ff9bd6', '#9dff8a'];
function drawNames() {
  const F = G.fusion;
  G.players.forEach((P, i) => {
    if (P.gone || P.hidden) return;
    const [x, y] = toScreen(P.x, P.y - (P.halo ? 47 : 40)), fused = isFusedBody(P);   // con aureola, el nombre va más arriba
    // Nombre (solo si hay más de un jugador real) y cuenta regresiva del poder activo
    if (G.players.filter(p => !p.ally).length > 1) {
      let name = P.dead ? t('{name} (caído)', { name: P.name }) : P.name;
      if (fused) name = `Gogeta (${F.ids.map(id => G.players.find(p => p.id === id)).filter(p => p && !p.ally).map(p => p.name).join(' + ')})`;
      hudText(name, x, y, 12, fused ? '#ffe14d' : PLAYER_COLORS[i % 4], 'center');
    }
    const secs = fused ? F.t : P.transformed;
    if (!P.dead && secs > 0) hudText(`${Math.ceil(secs)}s`, x, y - (G.players.length > 1 ? 14 : 0), 12, fused ? '#ffe14d' : P.c.aura, 'center');
  });
}
function drawVignette(tint) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(30,10,20,0.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (tint) { ctx.globalAlpha = 0.06; ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  const M = G.me, hp = M.hp / M.maxHp;
  if (!M.dead && hp < 0.3) { ctx.globalAlpha = (0.3 - hp) * (0.8 + Math.sin(G.t * 8) * 0.3); ctx.fillStyle = '#c00018'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (M.dead) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#1a0a20'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (G.flashT > 0) { ctx.globalAlpha = Math.min(0.55, G.flashT); ctx.fillStyle = '#fff6d8'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }   // jefe derrotado
}
function drawTexts() {
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  for (const tx of G.texts) {
    const [x, y] = toScreen(tx.x, tx.y);
    const pop = tx.big === 2 ? 1 + Math.max(0, tx.t - 0.55) * 4 : 1;   // los críticos aparecen grandes y se acomodan
    ctx.font = `700 ${Math.round((tx.big === 2 ? 22 : tx.big ? 20 : 14) * pop)}px ${FONT}`;
    ctx.globalAlpha = Math.min(1, tx.t * 3);
    const s = t(tx.text, tx.params);
    ctx.lineWidth = 4; ctx.strokeStyle = '#1a0c14'; ctx.strokeText(s, x, y);
    ctx.fillStyle = tx.color; ctx.fillText(s, x, y);
  }
  ctx.globalAlpha = 1;
}

// ─── Interfaz (HUD) ──────────────────────────────────────────────────────────
function panel(x, y, w, h) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = '#0a0f2e'; ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#2c4499'); g.addColorStop(1, '#18245e');
  ctx.fillStyle = g; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.strokeStyle = '#9bb8ff'; ctx.lineWidth = 2; ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
}
// La tira de los jefes: retrato (los del Torneo, js/tournament.js; si no hay, la cara del sprite) y mini barra de cada
// uno, en el orden en que aparecieron; el más cercano con marco dorado y su barra grande debajo, con el nombre
function drawBossStrip(list, P, y0, bossBar) {
  const n = list.length, S = bossStripSize(n), gap = 6, x0 = Math.round((W - (n * S + (n - 1) * gap)) / 2), y = y0 - 14;
  let near = list[0], nd = Infinity;
  for (const b of list) { const d = (b.x - P.x) ** 2 + (b.y - P.y) ** 2; if (d < nd) { nd = d; near = b; } }
  list.forEach((b, i) => {
    const x = x0 + i * (S + gap), focus = b === near;
    ctx.fillStyle = focus ? '#ffd93b' : '#0a0f2e'; ctx.fillRect(x - 2, y - 2, S + 4, S + 4);
    const pid = b.id === 'vegetas' ? 'vegeta' : b.id;
    if (!(typeof tourPortrait === 'function' && tourPortrait(ctx, pid, x, y, S))) {
      ctx.fillStyle = '#2a1830'; ctx.fillRect(x, y, S, S);
      if (b.def.look) drawPortraitTo(ctx, b.def.look, false, x, y + 2, S);
    }
    if (b.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x, y, S, S); }   // le están pegando
    pbar(x, y + S + 4, S, 4, b.hp / b.maxHp, '#ff3d5c', '#ffb0bc');
  });
  bossBar(near, y + S + 26);
}
function pbar(x, y, w, h, frac, color, light) {
  ctx.fillStyle = '#0a0f2e'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#2a1830'; ctx.fillRect(x, y, w, h);
  const fw = Math.round(w * Math.max(0, Math.min(1, frac)));
  ctx.fillStyle = color; ctx.fillRect(x, y, fw, h);
  ctx.fillStyle = light || 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, fw, Math.max(1, Math.round(h / 3)));
}
function hudText(text, x, y, size = 14, color = '#ffffff', align = 'left') {
  ctx.font = `700 ${size}px ${FONT}`; ctx.textAlign = align; ctx.lineJoin = 'round';
  ctx.lineWidth = 3; ctx.strokeStyle = '#0a0f2e'; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}
// Retrato (cabeza) de un personaje en cualquier contexto 2D
function drawPortraitTo(cx, L, ssj, x, y, size) {
  cx.imageSmoothingEnabled = false;
  const ext = EXTERNAL.get(L.id + (ssj ? ':ssj' : '')) || EXTERNAL.get(L.id);
  if (ext) { // cabeza: parte superior central del fotograma de reposo
    const a = ext.anims.idle, fw = ext.frameW;
    const sw = Math.round(fw * 0.6), sh = Math.round(ext.frameH * 0.55);
    cx.drawImage(ext.img, a.col * fw + Math.round(fw * 0.2), a.row * ext.frameH, sw, sh, x, y, size, size * sh / sw);
    return;
  }
  const sh = getSheet(L, ssj);
  cx.drawImage(sh.normal, HEAD_X, 0, 24, 22, x, y, size, size * 22 / 24);
}
function drawAttackIcon(id, x, y, s, c = ctx) {   // c: en qué lienzo (el HUD o los íconos del menú)
  const d = ATTACKS[id], cx = x + s / 2, cy = y + s / 2;
  c.fillStyle = d.color;
  if (d.type === 'beam') {
    c.fillRect(x + 4, cy - 4, s - 8, 8); c.fillStyle = '#fff'; c.fillRect(x + 4, cy - 1, s - 8, 2); circle(c, x + 7, cy, 5);
  } else if (d.type === 'orbit') {
    for (let i = 0; i < 3; i++) { const a = i * 2.09; circle(c, cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, 4); }
  } else if (d.type === 'buff') {   // Kaioken: aura roja alrededor de una silueta
    const u = s / 24;
    c.globalAlpha = 0.45; circle(c, cx, cy, 10 * u); c.globalAlpha = 1;
    c.fillStyle = '#fff'; circle(c, cx, cy - 4 * u, 3 * u); c.fillRect(cx - 3 * u, cy - u, 6 * u, 8 * u);
  } else if (d.type === 'rain') {   // Lluvia de Ki: gotas que caen
    const u = s / 24;
    for (const [ox, oy] of [[-6, -6], [2, -2], [-2, 5], [6, 3]]) { c.fillRect(cx + (ox - 1) * u, cy + (oy - 5) * u, 2 * u, 4 * u); circle(c, cx + ox * u, cy + oy * u, 3 * u); }
  } else if (d.type === 'decoy') {   // Zanzoken: dos siluetas, una transparente
    const u = s / 24;
    c.globalAlpha = 0.45; circle(c, cx + 4 * u, cy - 5 * u, 4 * u); c.fillRect(cx, cy - u, 8 * u, 9 * u);
    c.globalAlpha = 1; circle(c, cx - 4 * u, cy - 5 * u, 4 * u); c.fillRect(cx - 8 * u, cy - u, 8 * u, 9 * u);
  } else if (d.grenade) {   // Granada de Ki: esfera con mecha
    circle(c, cx, cy + 2, s * 0.28); c.fillStyle = '#fff'; c.fillRect(cx - 1, cy - s * 0.4, 2, 5); c.fillStyle = '#ffd93b'; circle(c, cx, cy - s * 0.42, 2);
  } else if (d.type === 'nova' && (ATTACKS.taiyoken === d || ATTACKS.taiyokenx === d)) {   // Taiyoken: destello con rayos
    c.fillStyle = '#fff'; circle(c, cx, cy, s * 0.18);
    c.strokeStyle = d.color; c.lineWidth = 2;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.beginPath(); c.moveTo(cx + Math.cos(a) * s * 0.24, cy + Math.sin(a) * s * 0.24); c.lineTo(cx + Math.cos(a) * s * 0.42, cy + Math.sin(a) * s * 0.42); c.stroke(); }
  } else if (d.type === 'nova') {
    c.strokeStyle = d.color; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, s * 0.32, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#fff'; circle(c, cx, cy, 3);
  } else if (d.kind === 'disc') {
    c.beginPath(); c.ellipse(cx, cy, s * 0.38, s * 0.14, -0.4, 0, Math.PI * 2); c.fill();
  } else if (d.kind === 'spiral') {
    c.fillStyle = '#fff6c0'; c.fillRect(x + 4, cy - 1, s - 8, 3); c.fillStyle = d.color;
    for (let i = 4; i < s - 4; i += 3) c.fillRect(x + i, cy + Math.sin(i) * 4 - 1, 2, 2);
  } else {
    const r = d.kind === 'big' ? s * 0.34 : s * 0.24;
    circle(c, cx, cy, r); c.fillStyle = '#fff'; circle(c, cx - r * 0.25, cy - r * 0.25, r * 0.45);
  }
}
// Íconos de las mejoras de la partida (para la fila del HUD)
function drawPassiveIcon(id, x, y, s, c = ctx) {
  const d = PASSIVES[id], cx = x + s / 2, cy = y + s / 2, u = s / 16;
  c.fillStyle = d.color; c.strokeStyle = d.color; c.lineWidth = Math.max(1.5, u * 1.6);
  if (id === 'power') {          // puño de poder: flecha hacia arriba
    poly(c, [0, -6 * u, 6 * u, 1 * u, 2.5 * u, 1 * u, 2.5 * u, 6 * u, -2.5 * u, 6 * u, -2.5 * u, 1 * u, -6 * u, 1 * u], cx, cy);
  } else if (id === 'speed') {   // velocidad: doble chevrón
    for (const o of [-3, 3]) { c.beginPath(); c.moveTo(cx + (o - 3) * u, cy - 5 * u); c.lineTo(cx + (o + 2) * u, cy); c.lineTo(cx + (o - 3) * u, cy + 5 * u); c.stroke(); }
  } else if (id === 'vital') {   // vitalidad: corazón
    circle(c, cx - 2.6 * u, cy - 2 * u, 3.2 * u); circle(c, cx + 2.6 * u, cy - 2 * u, 3.2 * u);
    poly(c, [-5.6 * u, -0.8 * u, 5.6 * u, -0.8 * u, 0, 6 * u], cx, cy);
  } else if (id === 'focus') {   // concentración: reloj
    c.beginPath(); c.arc(cx, cy, 5.5 * u, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(cx, cy - 3.5 * u); c.lineTo(cx, cy); c.lineTo(cx + 3 * u, cy + 1.5 * u); c.stroke();
  } else if (id === 'sense') {   // percepción del ki: ojo
    c.beginPath(); c.ellipse(cx, cy, 6.5 * u, 3.8 * u, 0, 0, Math.PI * 2); c.stroke();
    circle(c, cx, cy, 2.2 * u);
  } else if (id === 'crit') {   // golpe certero: mira
    c.beginPath(); c.arc(cx, cy, 5 * u, 0, Math.PI * 2); c.stroke();
    c.fillRect(cx - 0.8 * u, cy - 7.5 * u, 1.6 * u, 4 * u); c.fillRect(cx - 0.8 * u, cy + 3.5 * u, 1.6 * u, 4 * u);
    c.fillRect(cx - 7.5 * u, cy - 0.8 * u, 4 * u, 1.6 * u); c.fillRect(cx + 3.5 * u, cy - 0.8 * u, 4 * u, 1.6 * u);
  } else if (id === 'kictl') {   // control del Ki: rayo
    poly(c, [1.5 * u, -7 * u, -4 * u, 1 * u, -0.5 * u, 1 * u, -1.5 * u, 7 * u, 4 * u, -1 * u, 0.5 * u, -1 * u], cx, cy);
  } else if (id === 'absorb') {   // absorción: gota con una cruz
    circle(c, cx, cy + 1.5 * u, 4.5 * u); poly(c, [-3.8 * u, 0, 3.8 * u, 0, 0, -7 * u], cx, cy);
    c.fillStyle = '#ffffff'; c.fillRect(cx - 0.8 * u, cy - 1 * u, 1.6 * u, 5 * u); c.fillRect(cx - 2.5 * u, cy + 0.7 * u, 5 * u, 1.6 * u);
  } else if (id === 'area') {   // técnica amplia: dos anillos
    c.beginPath(); c.arc(cx, cy, 3 * u, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(cx, cy, 6.5 * u, 0, Math.PI * 2); c.stroke();
  } else if (id === 'multi') {   // multiplicación: tres esferas
    circle(c, cx - 4 * u, cy + 2.5 * u, 2.6 * u); circle(c, cx + 4 * u, cy + 2.5 * u, 2.6 * u); circle(c, cx, cy - 3.5 * u, 2.6 * u);
  } else if (id === 'luck') {   // suerte: moneda
    circle(c, cx, cy, 6 * u); c.fillStyle = '#5a3a10'; c.font = `700 ${Math.round(9 * u)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Z', cx, cy + 0.5 * u); c.textBaseline = 'alphabetic';
  } else if (id === 'gravity') {   // entrenamiento en gravedad: pesa
    c.fillRect(cx - 6 * u, cy - 1 * u, 12 * u, 2 * u);
    c.fillRect(cx - 7 * u, cy - 4 * u, 3 * u, 8 * u); c.fillRect(cx + 4 * u, cy - 4 * u, 3 * u, 8 * u);
  } else if (id === 'instinct') {   // instinto: tres líneas de movimiento
    for (const o of [-4, 0, 4]) { c.beginPath(); c.moveTo(cx - 6 * u + Math.abs(o) * 0.5 * u, cy + o * u); c.lineTo(cx + 6 * u, cy + o * u); c.stroke(); }
    circle(c, cx + 5 * u, cy, 1.8 * u);
  } else if (id === 'regen') {   // regeneración: cruz
    c.fillRect(cx - 1.8 * u, cy - 6 * u, 3.6 * u, 12 * u); c.fillRect(cx - 6 * u, cy - 1.8 * u, 12 * u, 3.6 * u);
  } else if (id === 'aura') {   // aura de combate: estrella de púas
    const pts = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = (i % 2 ? 3 : 7) * u; pts.push(Math.cos(a) * r, Math.sin(a) * r); }
    poly(c, pts, cx, cy);
  } else if (id === 'tracker') {   // rastreador: el visor del scouter
    poly(c, [-6 * u, -4 * u, 6 * u, -4 * u, 6 * u, 3 * u, -6 * u, 3 * u], cx, cy);
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(cx - 4 * u, cy - 2 * u, 5 * u, 3 * u);
    c.fillStyle = PASSIVES.tracker.color; c.fillRect(cx + 4 * u, cy + 3 * u, 2 * u, 4 * u);
  } else if (id === 'sustain') {   // técnica sostenida: reloj de arena
    poly(c, [-5 * u, -6 * u, 5 * u, -6 * u, 0, 0], cx, cy); poly(c, [-5 * u, 6 * u, 5 * u, 6 * u, 0, 0], cx, cy);
  } else if (id === 'meditate') {   // meditación: cabeza sobre las piernas cruzadas
    circle(c, cx, cy - 3.5 * u, 2.6 * u); c.beginPath(); c.ellipse(cx, cy + 3.5 * u, 6.5 * u, 2.6 * u, 0, 0, Math.PI * 2); c.fill();
  } else if (id === 'fury') {   // furia: llama
    poly(c, [0, -7 * u, 4.5 * u, -1 * u, 5 * u, 3 * u, 2 * u, 6.5 * u, -2 * u, 6.5 * u, -5 * u, 3 * u, -3.5 * u, -1.5 * u, -1.5 * u, 1 * u], cx, cy);
  } else if (id === 'senzubag') {   // bolsa de semillas: una semilla
    c.beginPath(); c.ellipse(cx, cy, 4 * u, 6 * u, 0.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(cx - 1.5 * u, cy - 3 * u, 1.6 * u, 3 * u);
  } else if (id === 'armor') {   // armadura: escudo
    poly(c, [-5.5 * u, -5.5 * u, 5.5 * u, -5.5 * u, 5.5 * u, 0, 0, 6.5 * u, -5.5 * u, 0], cx, cy);
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(cx - 1 * u, cy - 4 * u, 2 * u, 7 * u);
  }
}
// Una casilla del HUD (técnica o mejora) con su nivel en rayitas
function hudSlot(x, y, s, lvl, max, gold) {
  panel(x, y, s, s);
  if (gold) { ctx.strokeStyle = '#ffd93b'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, s - 2, s - 2); }
  const pw = (s - 8) / max;
  for (let k = 0; k < max; k++) {
    ctx.fillStyle = k < lvl ? (gold ? '#fff2a8' : '#ffd93b') : 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + 4 + k * pw, y + s - 5, Math.max(1, pw - 1), 2);
  }
}
// Nivel en texto chico sobre las rayitas; va después del ícono para que no lo tape
// (las técnicas evolucionadas ya llevan la estrella)
function hudSlotLevel(x, y, s, lvl, max) {
  if (lvl > 0) hudText(t('Nv.{n}', { n: lvl }), x + 3, y + s - 7, 9, lvl >= max ? '#ffd93b' : '#ffffff');
}
// Técnicas (fila 1) y mejoras de la partida (fila 2), al estilo Vampire Survivors.
// Devuelve hasta dónde llegan, para ubicar debajo los paneles de los compañeros.
const hudSlots = [];
// Con la pausa abierta, zonas invisibles sobre las casillas del HUD (que quedan debajo de la
// pantalla de pausa) para ver qué es cada técnica o mejora al pasar el mouse o tocarla
const hudTips = document.createElement('div');
hudTips.className = 'hud-tips';
document.body.appendChild(hudTips);
function buildHudTips() {
  hudTips.innerHTML = '';
  if (!G || !G.me) return;
  for (const sl of hudSlots) {
    const el = document.createElement('div');
    el.className = 'hud-tip';
    Object.assign(el.style, { left: `${sl.x}px`, top: `${sl.y}px`, width: `${sl.w || sl.s}px`, height: `${sl.s}px` });
    el.dataset.tip = sl.kind === 'attack' ? attackTip(G.me, sl.id) : sl.kind === 'effect' ? sl.tip : passiveTip(G.me, sl.id);
    hudTips.appendChild(el);
  }
}
const clearHudTips = () => { hudTips.innerHTML = ''; };
// Efectos activos de los deseos de Shenlong: chips con ícono y valor (en la pausa, al pasar el mouse, su descripción)
function drawWishEffects(P, x, y) {
  const fx = [];
  if (P.swapBody > 0) fx.push(['🔄', `${Math.ceil(P.swapBody)}s`, `${t('Cuerpo cambiado')}\n${t('Estás en el cuerpo de Ginyu: te mueves más lento y tus técnicas hacen 40% menos de daño. Los primeros segundos, los controles van al revés.')}`, '#c86aff']);
  if (P.immortal > 0) fx.push(['✨', `${Math.ceil(P.immortal)}s`, `${t('Inmortalidad')}\n${t('No recibes daño durante {n} s más.', { n: Math.ceil(P.immortal) })}`, '#ffe27a']);
  if (P.halo) fx.push(['🔥', `+${Math.round(ZENKAI * 100)}%`, `${t('Zenkai')}\n${t('Volviste de la Semilla de reserva más fuerte: +{n}% de daño y de vida máxima.', { n: Math.round(ZENKAI * 100) })}`, '#ffe14d']);
  if (P.wishDmg > 0) fx.push(['💪', `+${Math.round(P.wishDmg * 100)}%`, `${t('El más fuerte del universo')}\n${t('+{n}% de daño a todas tus técnicas.', { n: Math.round(P.wishDmg * 100) })}`, '#ff8a6a']);
  if (P.wishZeni > 0) fx.push(['💰', `+${P.wishZeni}`, `${t('Riquezas')}\n${t('+{n} Zeni al terminar la partida.', { n: P.wishZeni })}`, '#ffe27a']);
  if (ballsNeeded() < 7) fx.push(['🐉', `${ballsNeeded()}`, `${t('Atraer las esferas')}\n${t('Shenlong aparece con {n} Esferas del Dragón.', { n: ballsNeeded() })}`, '#7dff8a']);
  for (const [icon, val, tip, color] of fx) {
    ctx.font = `700 11px ${FONT}`;
    const w = Math.ceil(ctx.measureText(val).width) + 24, h = 16, top = y - h / 2;
    ctx.fillStyle = 'rgba(10,15,46,0.7)'; ctx.fillRect(x, top, w, h);
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, top + 0.5, w - 1, h - 1);
    ctx.font = `11px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(icon, x + 3, y + 1);
    ctx.textBaseline = 'alphabetic';
    hudText(val, x + 19, y + 4, 11, color);
    hudSlots.push({ x, y: top, s: h, w, kind: 'effect', tip });
    x += w + 4;
  }
}
function drawLoadout(P, top, compact) {
  const s = compact ? 26 : 30, gap = 3;
  // Mejoras que piden las técnicas que tienes (para marcar las combinaciones de evolución)
  const wanted = {};
  for (const a of P.attacks) {
    const evo = EVOLUTION_OF[a.id];
    if (evo && canLearn(P.charId, evo)) wanted[ATTACKS[evo].needs] = true;
  }
  hudSlots.length = 0;   // posiciones de las casillas, para mostrar su descripción en la pausa
  P.attacks.forEach((a, i) => {
    const x = 8 + i * (s + gap), d = ATTACKS[a.id];
    hudSlots.push({ x, y: top, s, kind: 'attack', id: a.id });
    hudSlot(x, top, s, d.evolved ? MAX_ATTACK_LEVEL : a.lvl, MAX_ATTACK_LEVEL, !!d.evolved);
    drawAttackIcon(a.id, x + 3, top + 1, s - 6);
    if (!d.evolved) hudSlotLevel(x, top, s, a.lvl, MAX_ATTACK_LEVEL);
    if (d.evolved) hudText('★', x + s - 6, top + 10, 10, '#ffd93b', 'center');
    const evo = EVOLUTION_OF[a.id];
    if (evo && canLearn(P.charId, evo)) {   // esquina con el color de la mejora que pide para evolucionar
      ctx.fillStyle = PASSIVES[ATTACKS[evo].needs].color; ctx.fillRect(x + s - 6, top + 2, 4, 4);
    }
  });
  for (let i = P.attacks.length; i < MAX_ATTACKS; i++) emptySlot(8 + i * (s + gap), top, s);   // casillas libres
  const owned = Object.keys(PASSIVES).filter(id => P.passives[id] > 0);
  const y2 = top + s + gap + 1;
  owned.forEach((id, i) => {
    const x = 8 + i * (s + gap);
    hudSlots.push({ x, y: y2, s, kind: 'passive', id });
    hudSlot(x, y2, s, P.passives[id], passiveMax(id), false);
    drawPassiveIcon(id, x + 3, y2 + 1, s - 6);
    hudSlotLevel(x, y2, s, P.passives[id], passiveMax(id));
    if (wanted[id]) hudText('★', x + s - 6, y2 + 10, 10, '#ffd93b', 'center');   // sirve para evolucionar una técnica tuya
  });
  for (let i = owned.length; i < maxPassives(P); i++) emptySlot(8 + i * (s + gap), y2, s);
  return y2 + s;
}
// Casilla libre: marco tenue para ver cuánto lugar queda
function emptySlot(x, y, s) {
  ctx.fillStyle = 'rgba(10,15,46,0.35)'; ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = 'rgba(155,184,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
}
function edgeArrow(dx, dy, color) {
  const a = Math.atan2(dy, dx), r = Math.min(W, H) / 2 - 40;
  ctx.save(); ctx.translate(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r); ctx.rotate(a);
  ctx.fillStyle = '#0a0f2e'; poly(ctx, [15, 0, -10, -11, -10, 11], 0, 0);
  ctx.fillStyle = color; poly(ctx, [11, 0, -7, -8, -7, 8], 0, 0); ctx.restore();
}
// Flecha hacia una Esfera del Dragón: en el borde de la pantalla, con la esfera y los metros que faltan
const METERS = 10;   // píxeles del mundo por metro
function ballArrow(dx, dy) {
  const a = Math.atan2(dy, dx), cs = Math.cos(a), sn = Math.sin(a), m = 54;
  const mv = sn > 0 ? 96 : 64;   // abajo deja lugar para la barra de Ki
  const k = Math.min((W / 2 - m) / Math.max(0.001, Math.abs(cs)), (H / 2 - mv) / Math.max(0.001, Math.abs(sn)));
  const x = W / 2 + cs * k, y = H / 2 + sn * k, pulse = 1 + 0.12 * Math.sin(performance.now() / 140);
  ctx.save(); ctx.translate(x, y);
  ctx.save(); ctx.rotate(a); ctx.scale(pulse, pulse);
  ctx.fillStyle = '#0a0f2e'; poly(ctx, [20, 0, -12, -14, -6, 0, -12, 14], 0, 0);
  ctx.fillStyle = '#ffa53d'; poly(ctx, [15, 0, -8, -10, -3, 0, -8, 10], 0, 0);
  ctx.restore();
  // La esfera y la distancia, del lado de adentro de la flecha
  const ix = -cs * 26, iy = -sn * 26;
  drawDragonBall(ctx, ix, iy, 7, 4, true);
  hudText(`${Math.round(Math.hypot(dx, dy) / METERS)} m`, ix, iy + 22, 13, '#ffd27a', 'center');
  ctx.restore();
}
// Jefes fuera de la pantalla: una flecha roja en el borde que apunta hacia él, con su retrato y la distancia
function drawBossPointers() {
  const V = viewer(), M = 50, TOP = 110, BOTTOM = 125;   // (abajo: la barra de Ki)   // TOP: debajo de los paneles de arriba (personaje, tiempo, barra del jefe)
  for (const e of G.enemies) {
    if (!e.boss || e.dead) continue;
    const sx = (e.x - camX + BW / 2) * PIX / DPR, sy = (e.y - camY + BH / 2) * PIX / DPR;
    if (sx > -10 && sx < W + 10 && sy > -10 && sy < H + 10) continue;   // se ve: no hace falta
    // Rectángulo donde puede ir el indicador, y el punto de su borde en la dirección del jefe
    const x0 = M, x1 = W - M, y0 = Math.min(TOP, H / 2 - 20), y1 = H - BOTTOM;
    const cx = W / 2, cy = (y0 + y1) / 2, dx = sx - cx, dy = sy - cy;
    const k = Math.min((x1 - cx) / Math.abs(dx || 1e-6), (y1 - cy) / Math.abs(dy || 1e-6));
    const x = cx + dx * k;
    let y = cy + dy * k;
    // Con el minimapa a la vista (arriba a la derecha), el indicador va debajo de él
    if (SAVE.showMap) {
      const px = Math.round(Math.min(220, Math.max(120, Math.min(W, H) * 0.24))), mx = W - px - 18, my = hudLayout().mapY;
      if (x > mx - 30 && y < my + px + 50) y = Math.min(y1, my + px + 50);
    }
    const an = Math.atan2(dy, dx), pulse = 0.75 + 0.25 * Math.sin(G.t * 6);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(20,6,12,0.8)'; ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth = 3; ctx.stroke();
    ctx.rotate(an);   // la punta, afuera del círculo
    ctx.fillStyle = `rgba(255,77,94,${pulse})`;
    ctx.beginPath(); ctx.moveTo(38, 0); ctx.lineTo(22, -11); ctx.lineTo(22, 11); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (e.def.look) drawPortraitTo(ctx, e.def.look, false, x - 13, y - 13, 26);
    const dist = Math.round(Math.hypot(e.x - V.x, e.y - V.y) / 10);   // en "metros"
    hudText(`${dist} m`, x, y + 33, 12, '#ffb0b8', 'center');
  }
}
function drawHUD() {
  if (G.snake) snakeDrawHud();   // los kilómetros del Camino de la Serpiente
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!G.snake) drawBossPointers();   // debajo de los paneles del HUD
  // Online: hace un rato que no llega nada del anfitrión
  if (G.net && G.net.role === 'client' && Net.lag > 2000) hudText(t('Conexión lenta con el anfitrión...'), W / 2, Math.min(150, H * 0.3), 15, '#ffb0a0', 'center');
  const P = G.me, compact = W < 640;
  // Barra de experiencia superior
  pbar(2, 2, W - 4, 6, G.xp / G.xpNext, '#3da5ff', '#b8e4ff');

  // Panel del personaje
  const pw = compact ? 170 : 220;
  panel(8, 14, pw, 58);
  const inGogeta = G.fusion && G.fusion.phase === 'fused' && G.fusion.ids.includes(P.id);
  if (inGogeta) drawPortraitTo(ctx, GOGETA.look, false, 14, 18, 48);
  else drawPortraitTo(ctx, P.c.look, P.transformed > 0 && hasTransformLook(P.c), 14, 18, 48);
  hudText(inGogeta ? 'Gogeta' : G.players.length > 1 ? P.name : P.c.name, 66, 34, 15, '#ffe27a');
  hudText(t('Nv {n}', { n: G.level }), pw - 2, 34, 13, '#ffffff', 'right');
  // Con la Semilla de reserva comprada, la barra se acorta y al lado va el poroto: verde si está, apagado y tachado si ya se usó
  const reserve = perk(P, 'senzu') > 0, barW = pw - (reserve ? 98 : 78);
  pbar(66, 44, barW, 9, P.hp / P.maxHp, P.hp / P.maxHp > 0.3 ? '#4dff6a' : '#ff4d4d');
  hudText(P.dead ? t('Caído') : `${Math.ceil(P.hp)}/${P.maxHp}`, 66 + barW / 2, 66, 11, '#ffffff', 'center');
  if (reserve) hudReserveSenzu(66 + barW + 13, 48, P.senzuLeft > 0);
  // Esferas del Dragón (5 casilleros después del deseo Atraer las esferas)
  for (let i = 0; i < ballsNeeded(); i++) {
    const x = 18 + i * 18, y = 84;
    if (i < G.dragonBalls) drawDragonBall(ctx, x, y, 6, i + 1, false);
    else {
      ctx.fillStyle = 'rgba(10,15,46,0.55)'; circle(ctx, x, y, 6);
      ctx.strokeStyle = 'rgba(255,184,28,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // Técnicas y mejoras de la partida
  const loadoutEnd = drawLoadout(P, 96, compact);
  // Efectos de los deseos, a la derecha de las esferas (después de drawLoadout: agrega sus ayudas a hudSlots)
  drawWishEffects(P, 18 + ballsNeeded() * 18 + 2, 84);
  // Compañeros
  let ty = loadoutEnd + 6;
  G.players.forEach((Q, i) => {
    if (Q === P || Q.gone || Q.ally) return;
    const qFused = G.fusion && G.fusion.phase === 'fused' && G.fusion.ids.includes(Q.id);
    panel(8, ty, 160, 30);
    if (qFused) drawPortraitTo(ctx, GOGETA.look, false, 12, ty + 4, 24);
    else drawPortraitTo(ctx, Q.c.look, Q.transformed > 0 && hasTransformLook(Q.c), 12, ty + 4, 24);
    hudText(qFused ? `${Q.name} (Gogeta)` : Q.name, 40, ty + 15, 11, PLAYER_COLORS[i % 4]);
    const qSecs = qFused ? G.fusion.t : Q.transformed;
    if (!Q.dead && qSecs > 0) hudText(`${Math.ceil(qSecs)}s`, 156, ty + 15, 11, qFused ? '#ffe14d' : Q.c.aura, 'right');
    pbar(40, ty + 19, 118, 4, Q.dead ? 0 : Q.hp / Q.maxHp, Q.dead ? '#777' : '#4dff6a');
    ty += 34;
    if (Q.hidden) return;
    const dx = Q.x - P.x, dy = Q.y - P.y;
    if (Math.abs(dx) > BW / 2 || Math.abs(dy) > BH / 2) edgeArrow(dx, dy, PLAYER_COLORS[i % 4]);
  });
  // Tiempo y bajas
  const L = hudLayout();
  if (L.narrow) { // celular en vertical: un solo panel bajo los botones
    panel(L.statsX, L.statsY, 138, 36);
    hudText(fmtTime(G.t), L.statsX + 38, L.statsY + 24, 17, '#ffffff', 'center');
    hudText(`☠ ${G.kills}`, L.statsX + 102, L.statsY + 24, 14, '#ffffff', 'center');
    if (G.speed > 1) hudText(`x${FAST_SPEED}`, L.statsX + 69, L.statsY + 50, 13, '#ffd93b', 'center');
  } else {
    panel(W / 2 - 50, 14, 100, 38);
    hudText(fmtTime(G.t), W / 2, 41, 20, '#ffffff', 'center');
    if (G.lv.infinite) hudText(t('Vuelta {n}', { n: kaioRound() }), W / 2 - 58, 38, 13, '#ffb0bc', 'right');   // a la izquierda del reloj
    if (G.speed > 1) hudText(`x${FAST_SPEED}`, W / 2 + 58, 30, 14, '#ffd93b', 'left');
    // Bajas: a la izquierda de los botones (mapa, música y pausa), o bajo el reloj si no hay espacio
    panel(L.killsX, L.killsY, 100, 38);
    hudText(`☠ ${G.kills}`, L.killsX + 50, L.killsY + 25, 15, '#ffffff', 'center');
  }

  // Barra de Ki: carga, transformación (con segundos restantes) o fusión
  // En pantallas táctiles la barra deja sitio al botón ¡KI! de la derecha
  const touchUi = isTouch() && W < 900;
  const kw = touchUi ? Math.min(360, W - 120) : Math.min(360, W - 40), kx = touchUi ? 12 : (W - kw) / 2;
  const kh = 14, ky = H - 26 - kh;   // 2.14.1: barra más gruesa y con su propio marco (a algunos jugadores les costaba verla)
  const kiVerb = t(isTouch() ? 'Toca ¡KI!' : 'Espacio');
  const F = G.fusion, blink = Math.floor(G.t * 6) % 2;
  let frac, color, label, labelColor = '#ffffff', focusBar = -1;   // -1: no se está concentrando
  if (P.transformed <= 0) P.trMax = 0;
  if (F && F.ids.includes(P.id)) {
    if (F.phase === 'dance') { frac = 1; color = '#ffffff'; label = t('¡Fu... sión... HA!'); labelColor = '#ffe14d'; }
    else {
      frac = F.t / F.dur; color = '#ffe14d'; labelColor = '#ffe14d';
      const ready = F.bbCd <= 0 ? t('listo') : `${Math.ceil(F.bbCd)}s`;
      const role = !G.net ? `${kiVerb}: Big Bang Kamehameha (${ready})`
        : P.id === F.gunnerId ? `${t('Controlas las técnicas')} · ${kiVerb}: Big Bang (${ready})` : t('Tú mueves a Gogeta');
      label = `Gogeta · ${Math.ceil(F.t)}s · ${role}`;
    }
  } else if (P.transformed > 0) {
    P.trMax = Math.max(P.trMax || 0, P.transformed);   // duración total (varía según el personaje y el deseo)
    frac = Math.min(1, P.transformed / P.trMax); color = P.c.aura;
    label = `${P.c.transform} · ${Math.ceil(P.transformed)}s`;
  } else if (P.ki >= 100 && !rule('notrans')) {
    frac = 1; color = blink ? '#ffd93b' : '#fff27a'; labelColor = '#ffe27a';
    const partner = fusionPartner(P), focus = kiFocus(P);
    focusBar = focus;
    if (focus >= 1) { color = blink ? '#7fe6ff' : '#e8fbff'; labelColor = '#9ff0ff'; }   // concentrado: todo celeste
    label = partner ? t('¡FUSIÓN DISPONIBLE! Pulsa Ki junto a {name}', { name: partner.name })
      : focus >= 1 ? `${t('¡KI CONCENTRADO!')} ${kiVerb}: ${P.c.transform} ${t('(+50% de duración, +25% de daño)')}`
      : `${t('¡KI AL MÁXIMO!')} ${kiVerb}: ${P.c.transform} · ${t('Concentrando {n}%', { n: Math.floor(focus * 100) })}`;
  } else { frac = P.ki / 100; color = '#ff9b3d'; label = `KI · ${Math.floor(P.ki)}%`; labelColor = '#ffd27a'; }
  panel(kx - 10, ky - 25, kw + 20, kh + 33);   // marco como el resto del HUD
  // Llena, transformado o fusionado: la barra brilla
  if (frac >= 1 || (P.transformed > 0) || (F && F.ids && F.ids.includes(P.id))) {
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 10 + 6 * Math.sin(G.t * 6);
    ctx.fillStyle = color; ctx.fillRect(kx - 2, ky - 2, kw + 4, kh + 4); ctx.restore();
  }
  pbar(kx, ky, kw, kh, frac, color);
  if (focusBar >= 0 && focusBar < 1) {   // Ki concentrándose: el Ki azul llena la barra amarilla, de alto completo
    const fw = Math.round((kw - 4) * focusBar), g = ctx.createLinearGradient(0, ky + 2, 0, ky + kh - 2);
    g.addColorStop(0, '#c4f4ff'); g.addColorStop(0.5, '#55c8ff'); g.addColorStop(1, '#1f7ce0');
    ctx.fillStyle = g; ctx.fillRect(kx + 2, ky + 2, fw, kh - 4);
    ctx.fillStyle = 'rgba(40,20,0,0.45)';   // marcas cada 25%
    for (let k = 1; k < 4; k++) ctx.fillRect(kx + 2 + Math.round((kw - 4) * k / 4), ky + 2, 1, kh - 4);
    if (fw > 0) {   // el frente que avanza, blanco y brillante
      ctx.save(); ctx.shadowColor = '#bff4ff'; ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(kx + 2 + fw - 2, ky, 2, kh);
      ctx.restore();
    }
  }
  // El texto se achica hasta entrar en el marco (con el Ki lleno es largo: «¡KI AL MÁXIMO! Espacio: … · Concentrando 45%»)
  let ks = touchUi ? 13 : 14;
  for (; ks > 9; ks--) { ctx.font = `700 ${ks}px ${FONT}`; if (ctx.measureText(label).width <= kw + 12) break; }
  hudText(label, kx + kw / 2, ky - 7, ks, labelColor, 'center');

  // Jefe
  // Jefes (uno o varios a la vez)
  const bossList = G.enemies.filter(e => e.boss);
  const bossBar = (boss, by) => {
    const bw = Math.min(420, W - 40), bx = (W - bw) / 2;
    hudText(boss.def.name, W / 2, by, 15, '#ff8a9a', 'center');
    pbar(bx, by + 6, bw, 10, boss.hp / boss.maxHp, '#ff3d5c', '#ffb0bc');
  };
  if (bossList.length >= BOSS_STRIP_MIN) drawBossStrip(bossList, P, L.bossY, bossBar);
  else bossList.forEach((boss, i) => bossBar(boss, L.bossY + i * BOSS_BAR_GAP));
  for (const boss of bossList) {
    const dx = boss.x - P.x, dy = boss.y - P.y;
    if (Math.abs(dx) > BW / 2 || Math.abs(dy) > BH / 2) edgeArrow(dx, dy, '#ff3d5c');
  }
  drawHudMap();
  // Radar del Dragón: flecha en el borde hacia cada esfera tirada fuera de pantalla, con la distancia
  // (va después del mapa para que no la tape)
  for (const p of G.pickups) {
    if (p.kind !== 'ball') continue;
    const dx = p.x - P.x, dy = p.y - P.y;
    if (Math.abs(dx) > BW / 2 || Math.abs(dy) > BH / 2) ballArrow(dx, dy);
  }
  // Anuncio
  if (G.banner) {
    ctx.globalAlpha = Math.min(1, G.banner.t * 2);
    hudText(t(G.banner.text, G.banner.params), W / 2, H * 0.26, compact ? 18 : 26, G.banner.color, 'center');
    ctx.globalAlpha = 1;
  }
  if (P.dead && G.players.length > 1) hudText(t('Has caído: un compañero puede reanimarte si se queda a tu lado'), W / 2, H * 0.36, 15, '#ffb0bc', 'center');
  // Joystick táctil
  if (joy.active) {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 50, 0, Math.PI * 2); ctx.stroke();
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.min(50, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; circle(ctx, joy.ox + Math.cos(a) * d, joy.oy + Math.sin(a) * d, 20);
  }
}

// ─── Menú ────────────────────────────────────────────────────────────────────
// Selector de nivel: una tarjeta por nivel (abierto, ganado o bloqueado), con los colores de su mapa,
// y al final una tarjeta del Nivel 5 que todavía no existe ("Próximamente")
function buildLevels() {
  const list = $('levelList'), sel = myLevel();
  list.innerHTML = '';
  // Desafío semanal arriba de todo (js/weekly.js), si se pudo cargar
  if (WEEKLY && typeof weeklyCard === 'function') list.appendChild(weeklyCard(sel === 'weekly'));
  if (typeof weeklyCharNote === 'function') weeklyCharNote();
  for (const L of LEVELS) {
    const open = isLevelOpen(L.id), won = !!SAVE.levelsWon[L.id], card = document.createElement('button');
    card.className = 'level-card' + (L.id === sel ? ' selected' : '') + (open ? '' : ' locked');
    const fb = L.bosses.find(b => b.final);
    const state = !open ? t('🔒 Gana el Nivel {n} para abrirlo', { n: L.openAfter ? levelDef(L.openAfter).num : L.num - 1 }) : L.infinite ? t('♾ Infinito · gana quien más aguanta')
      : won ? t('✓ Ganado') : t('Jefe final: {name}', { name: bossDef(fb.id).name });
    card.innerHTML = `${levelPic(L.id)}<b>${t('Nivel {n}', { n: L.num })}</b><small>${esc(L.desc)}</small>
      <span class="lv-state">${esc(state)}</span>`;
    card.onclick = () => {
      if (!open) return;
      SFX.unlock();
      SAVE.level = SAVE.lastLevel = L.id; writeSave();
      buildMenu();
      Net.levelChanged();
    };
    list.appendChild(card);
  }
  if (!G && THEME !== THEMES[levelDef(sel).theme]) setTheme(levelDef(sel).theme);   // el fondo del menú usa el mapa del nivel
}
// Foto del nivel para las tarjetas de la ventana de Jugar (assets/levels/<id>.png, recortes de los mapas de los juegos de GBA)
const levelPic = id => `<span class="lv-pic" style="background-image:url('assets/levels/${id}.png')"></span>`;
function buildMenu() {
  $('zeniTotal').textContent = SAVE.zeni;
  updateCharDetail();
  $('nameInput').value = SAVE.name || '';
  buildLevels();
  const list = $('charList'), fixed = weeklyChar();
  list.innerHTML = '';
  for (const id in CHARACTERS) {
    const c = CHARACTERS[id];
    const card = document.createElement('div');
    card.className = 'char-card' + (id === myChar() ? ' selected' : '') + (fixed && id !== fixed ? ' wk-off' : '');
    const cv = document.createElement('canvas');
    cv.width = 96; cv.height = 132;
    card.appendChild(cv);
    const info = document.createElement('div');
    info.innerHTML = `<h3></h3><div class="title"></div><div class="info">${t('Técnica')}: <b></b><br>${t('Transformación')}: <b></b><br><span class="perk"></span></div><div class="best"></div>`;
    info.querySelector('h3').textContent = c.name;
    info.querySelector('.title').textContent = c.title;
    const bs = info.querySelectorAll('.info b');
    bs[0].textContent = ATTACKS[c.start].name;
    bs[1].textContent = c.transform;
    info.querySelector('.perk').textContent = c.perk;
    const best = bestOf(myLevel(), id);   // récord en el nivel elegido
    info.querySelector('.best').textContent = best ? t('Récord: {time}', { time: fmtTime(best) }) : t('Sin récord');
    card.appendChild(info);
    if (fixed && id !== fixed) {   // desafío semanal con guerrero fijo: los demás, grises y sin elegir
      card.title = t('Este desafío se juega solo con {name}.', { name: CHARACTERS[fixed].name });
      list.appendChild(card);
      card._cv = cv; card._c = c; card._id = id;
      continue;
    }
    if (!isUnlocked(id) && id !== fixed && !weeklyOpen()) {   // (en el desafío se prestan todos)
      // Bloqueado: silueta, cómo se consigue y el progreso (o el botón de compra con Zeni)
      card.classList.add('locked');
      const lock = document.createElement('div');
      lock.className = 'lock-info';
      lock.innerHTML = `<b>🔒 ${esc(c.unlock.text)}</b><span>${esc(unlockProgress(id))}</span>`;
      if (c.unlock.kind === 'zeni') {
        const buy = document.createElement('button');
        buy.className = 'btn small shop-btn';
        buy.textContent = t('Desbloquear ({n} Zeni)', { n: c.unlock.cost });
        buy.disabled = SAVE.zeni < c.unlock.cost;
        buy.onclick = ev => { ev.stopPropagation(); buyUnlock(id); };
        lock.appendChild(buy);
      }
      card.appendChild(lock);
      list.appendChild(card);
      card._cv = cv; card._c = c; card._id = id;
      continue;
    }
    card.onclick = () => { SFX.unlock(); selectChar(id); };
    card.ondblclick = () => startSolo();
    list.appendChild(card);
    card._cv = cv; card._c = c; card._id = id;
  }
}
function selectChar(id) {
  if (weeklyChar() && id !== weeklyChar()) return;   // desafío semanal con guerrero fijo
  SAVE.char = id; writeSave();
  for (const card of $('charList').children) card.classList.toggle('selected', card._id === id);
  updateCharDetail();
  Net.changeChar(id);
}
// Resumen del personaje elegido (solo visible en pantallas chicas, donde las tarjetas son compactas)
function updateCharDetail() {
  const c = CHARACTERS[myChar()];
  $('charDetail').textContent = `${c.name}: ${ATTACKS[c.start].name} · ${c.transform} · ${c.perk}`;
}
function renderMenuPortraits(t) {
  for (const card of $('charList').children) {
    const cx = card._cv.getContext('2d'), c = card._c;
    const active = !card.classList.contains('locked') && (card.matches(':hover') || card._id === myChar());
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.clearRect(0, 0, 96, 132);
    cx.imageSmoothingEnabled = false;
    cx.save(); cx.scale(2.5, 2.5); // 38×53 unidades: deja sitio a las llamas del aura
    if (active && !c.buddy) drawAura(cx, c.aura, 19, 38, t, 0.85);   // (Mr. Satán sin aura)
    drawActor(cx, c.look, 19, 37, { anim: active ? 'walk' : 'idle', t, ssj: active && hasTransformLook(c) });
    if (active && !c.buddy) drawAuraFront(cx, c.aura, 19, 38, t, 0.85);
    cx.restore();
  }
}
// Duelo de la portada: un guerrero (de los que tienes) contra un jefe, al azar y distintos a los de la vez anterior.
// Se sortea al abrir el juego y cada vez que se vuelve al menú principal.
let MENU_DUEL = null;
function rollMenuDuel() {
  const heroes = Object.keys(CHARACTERS).filter(id => isUnlocked(id)), bosses = BOSSES.filter(b => b.look).map(b => b.id);
  const prev = MENU_DUEL;
  let hero, boss;
  for (let i = 0; i < 30; i++) {
    hero = pick(heroes); boss = pick(bosses);
    if (hero === 'vegeta' && boss === 'vegetas') continue;   // Vegeta contra Vegeta, no
    if (!prev || (hero !== prev.hero && boss !== prev.boss)) break;
  }
  MENU_DUEL = { hero, boss };
}
// Escena del menú principal: un guerrero (transformado, con su aura) frente a un jefe, sorteados (rollMenuDuel)
function renderMenuHero(t) {
  const cv = $('menuHero');
  if (!cv || !cv.offsetParent) return;   // menú oculto
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, S = 3.1;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, H);
  c.imageSmoothingEnabled = false;
  if (!MENU_DUEL) rollMenuDuel();
  const ch = CHARACTERS[MENU_DUEL.hero] || CHARACTERS.goku, boss = bossDef(MENU_DUEL.boss) || bossDef('raditz');
  // Brillo de fondo y piso
  const g = c.createRadialGradient(W / 2, H * 0.62, 10, W / 2, H * 0.62, H * 0.75);   // se apaga antes de los bordes
  g.addColorStop(0, 'rgba(255, 225, 120, 0.35)'); g.addColorStop(1, 'rgba(255, 225, 120, 0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(10, 15, 46, 0.45)'; c.beginPath(); c.ellipse(W / 2, H - 12, W * 0.42, 5, 0, 0, Math.PI * 2); c.fill();
  const feet = H - 14, bob = Math.sin(t * 3) * 2;
  // Guerrero a la izquierda, transformado y con el aura
  c.save(); c.translate(150, 0); c.scale(S, S);
  const hx = 0, hy = (feet + bob) / S - 12;
  if (!ch.buddy) drawAura(c, ch.aura, hx, hy + 1, t, 0.85);   // Mr. Satán no tiene aura: posa
  drawActor(c, ch.look, hx, hy, { facing: 1, dir: ch.buddy ? 'down' : 'side', anim: ch.buddy ? 'pose' : 'idle', t, ssj: hasTransformLook(ch), noShadow: true });
  if (!ch.buddy) drawAuraFront(c, ch.aura, hx, hy + 1, t, 0.85);
  c.restore();
  // El jefe a la derecha, mirándolo
  const bs = S * 0.75 * boss.scale;
  c.save(); c.translate(W - 150, 0); c.scale(bs / boss.scale, bs / boss.scale);
  drawActor(c, boss.look, 0, (feet - Math.sin(t * 3 + 1) * 2) / (bs / boss.scale) - 12 * boss.scale, { facing: -1, dir: 'side', anim: 'idle', t, scale: boss.scale, noShadow: true });
  c.restore();
  // VS en el medio
  const pulse = 1 + 0.06 * Math.sin(t * 5);
  c.save(); c.translate(W / 2, H * 0.58); c.scale(pulse, pulse);
  c.font = `700 44px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = 10; c.strokeStyle = '#0a0f2e'; c.strokeText('VS', 0, 0);
  c.fillStyle = '#ff5c3d'; c.fillText('VS', 0, 0);
  c.restore();
}
// Fondo del menú: el páramo con un desfile de enemigos
const PARADE = [];
function renderMenuBackground(t) {
  beginWorld(t * 18, Math.sin(t * 0.2) * 40);
  const props = drawGround(bctx, camX, camY, BW, BH);
  prewarmThemes(camX, camY, BW, BH);   // los otros mapas, listos para cuando se elija otro nivel
  if (!PARADE.length) {
    const ids = Object.keys(ENEMIES);
    for (let i = 0; i < 14; i++) {
      PARADE.push({ look: ENEMIES[ids[i % ids.length]].look, off: Math.random() * 600, y: rand(-0.4, 0.4), sp: rand(28, 40), ph: Math.random() * 5 });
    }
  }
  const list = [];
  for (const p of props) list.push({ y: p.y, p });
  if (spritesReady) for (const a of PARADE) {   // el desfile de fondo, solo con los sprites de GBA ya cargados
    const span = BW + 120, x = camX - BW / 2 - 60 + ((a.off + t * a.sp) % span), y = camY + a.y * BH;
    list.push({ y: y + 12, a, x, ay: y });
  }
  list.sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.p) drawProp(bctx, it.p);
    else drawActor(bctx, it.a.look, it.x, it.ay, { anim: 'walk', t: t + it.a.ph, facing: 1 });
  }
  presentWorld();
}

// ─── Tienda de Zeni ──────────────────────────────────────────────────────────
function renderShop() {
  const lv = myPerks();
  $('shopZeni').textContent = SAVE.zeni;
  const list = $('shopList');
  list.innerHTML = '';
  for (const u of SHOP_UPGRADES) {
    const l = lv[u.id], maxed = l >= u.max, cost = maxed ? 0 : shopCost(u, l);
    const item = document.createElement('div');
    item.className = 'shop-item' + (maxed ? ' maxed' : '');
    item.innerHTML = `<div class="shop-icon"></div><div class="shop-body"><div class="shop-name"></div>
      <div class="shop-desc"></div><div class="shop-pips"></div><button class="btn shop-buy"></button></div>`;
    const icon = item.querySelector('.shop-icon');
    icon.textContent = u.icon; icon.style.background = u.color;
    item.querySelector('.shop-name').textContent = u.name;
    const now = u.fmt(l * u.per), next = u.fmt((l + 1) * u.per);
    item.querySelector('.shop-desc').textContent = maxed ? `${now} ${t('(máximo)')}` : l ? `${t('Ahora')}: ${now} → ${next}` : next;
    const pips = item.querySelector('.shop-pips');
    for (let i = 0; i < u.max; i++) { const p = document.createElement('i'); if (i < l) p.className = 'on'; pips.appendChild(p); }
    const btn = item.querySelector('.shop-buy');
    btn.textContent = maxed ? t('Completo') : t('Comprar · {n} Z', { n: cost });
    btn.disabled = maxed || SAVE.zeni < cost;
    btn.onclick = () => buyUpgrade(u.id);
    list.appendChild(item);
  }
  const refund = shopSpent(), reset = $('btnShopReset');
  reset.disabled = refund === 0;
  reset.classList.remove('confirm');
  reset.textContent = refund ? t('Reiniciar mejoras (+{n} Z)', { n: refund }) : t('Reiniciar mejoras');
  renderCursors();
}
// ─── Cursores del mouse (2.30.0) ───
// Se dibujan con los mismos sprites del juego (la esfera y la semilla), con contorno oscuro para que se vean sobre
// cualquier fondo, en un lienzo de 40x40 que pasa a ser el cursor (CSS cursor: url(...)). En el celular no hay cursor.
// Desde 2.30.1 llevan una flechita arriba a la izquierda (la punta es la que hace clic) y el dibujo abajo a la derecha;
// la semilla, inclinada hacia el otro lado para que siga la línea de la flecha
const CURSOR_SIZE = 40;
let cursorUrls = {};
function cursorCanvas(id) {
  const cv = document.createElement('canvas'); cv.width = cv.height = CURSOR_SIZE;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  let src = null, sx = 0, sw = 0, sh = 0, scale = 2, flip = false;
  if (id === 'ball4' && ITEM_IMG.balls) { src = ITEM_IMG.balls; sx = 3 * 15; sw = sh = 15; scale = 2; }
  if (id === 'senzu' && ITEM_IMG.senzu) { src = ITEM_IMG.senzu; sw = src.width; sh = src.height; scale = 3; flip = true; }
  if (!src) return null;
  const w = sw * scale, h = sh * scale, x = CURSOR_SIZE - w - 2, y = CURSOR_SIZE - h - 2;
  // El dibujo (dado vuelta si hace falta), con contorno: la silueta en oscuro corrida hacia los 4 lados, y encima el dibujo
  const art = document.createElement('canvas'); art.width = w; art.height = h;
  const a = art.getContext('2d'); a.imageSmoothingEnabled = false;
  if (flip) { a.translate(w, 0); a.scale(-1, 1); }
  a.drawImage(src, sx, 0, sw, sh, 0, 0, w, h);
  const sil = document.createElement('canvas'); sil.width = w; sil.height = h;
  const s = sil.getContext('2d'); s.drawImage(art, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = '#0a0f2e'; s.fillRect(0, 0, w, h);
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) c.drawImage(sil, x + dx, y + dy);
  c.drawImage(art, x, y);
  // La flechita: blanca con borde oscuro, la punta en (1, 1). Ancha, con las dos puntas de atrás curvadas hacia el
  // dibujo y el borde de atrás curvo, siguiendo la forma redonda del dibujo (2.30.2; 2.30.4: más grande y la curva de
  // atrás más suave, para que siga siendo ancha)
  const arrow = (k, o, color) => {
    c.fillStyle = color; c.beginPath();
    c.moveTo(o, o);
    c.quadraticCurveTo(o + 16 * k, o, o + 20 * k, o + 4 * k);          // borde de arriba, que al final se dobla hacia el dibujo
    c.quadraticCurveTo(o + 9 * k, o + 9 * k, o + 4 * k, o + 20 * k);   // borde de atrás, curvo (hacia la punta, como el dibujo)
    c.quadraticCurveTo(o, o + 16 * k, o, o);                           // borde izquierdo, que al final se dobla hacia el dibujo
    c.closePath(); c.fill();
  };
  arrow(1, 0, '#0a0f2e'); arrow(0.78, 2, '#ffffff');
  return cv;
}
function cursorUrl(id) {
  if (!cursorUrls[id]) { const cv = cursorCanvas(id); if (!cv) return null; cursorUrls[id] = cv.toDataURL('image/png'); }
  return cursorUrls[id];
}
// Pone el cursor elegido (o el normal). Si los sprites todavía no cargaron, vuelve a probar en un rato
function applyCursor(tries = 0) {
  const id = SAVE.cursor && (SAVE.cursors || {})[SAVE.cursor] ? SAVE.cursor : '';
  const url = id ? cursorUrl(id) : null;
  if (id && !url) { if (tries < 40) setTimeout(() => applyCursor(tries + 1), 250); return; }
  document.documentElement.classList.toggle('cur-custom', !!url);
  if (url) document.documentElement.style.setProperty('--cur', `url(${url}) 1 1, auto`);   // (la punta de la flechita, arriba a la izquierda)
}
function buyCursor(id) {
  const k = CURSORS.find(x => x.id === id);
  if (!k || (SAVE.cursors || {})[id] || SAVE.zeni < k.cost) return;
  SAVE.zeni -= k.cost;
  SAVE.cursors = Object.assign({}, SAVE.cursors, { [id]: true });
  SAVE.cursor = id;   // recién comprado: se usa
  writeSave(); applyCursor(); renderShop();
  SFX.play('power');
}
function useCursor(id) {
  if (id && !(SAVE.cursors || {})[id]) return;
  SAVE.cursor = id; writeSave(); applyCursor(); renderShop();
}
function renderCursors() {
  const list = $('cursorList');
  if (!list) return;
  list.innerHTML = '';
  $('cursorHint').textContent = isTouch() ? t('Los cursores se ven cuando juegas en la computadora (en el celular no hay mouse).')
    : t('Cambia la flecha del mouse por algo del mundo de Dragon Ball. Se compra una vez y después eliges cuál usar.');
  for (const k of [{ id: '', name: 'Normal', cost: 0 }, ...CURSORS]) {
    const owned = !k.id || (SAVE.cursors || {})[k.id], using = (SAVE.cursor || '') === k.id || (!k.id && !(SAVE.cursors || {})[SAVE.cursor]);
    const item = document.createElement('div');
    item.className = 'cursor-item' + (using ? ' using' : '');
    const prev = document.createElement('div'); prev.className = 'cursor-prev';
    const cv = k.id ? cursorCanvas(k.id) : null;
    if (cv) prev.appendChild(cv); else prev.innerHTML = '<span class="cursor-arrow">➤</span>';
    item.appendChild(prev);
    const body = document.createElement('div'); body.className = 'cursor-body';
    body.innerHTML = `<b></b><button class="btn small"></button>`;
    body.querySelector('b').textContent = t(k.name);
    const btn = body.querySelector('button');
    if (using) { btn.textContent = t('En uso'); btn.disabled = true; }
    else if (owned) { btn.textContent = t('Usar'); btn.onclick = () => useCursor(k.id); }
    else { btn.textContent = t('Comprar · {n} Z', { n: k.cost }); btn.disabled = SAVE.zeni < k.cost; btn.onclick = () => buyCursor(k.id); }
    item.appendChild(body);
    list.appendChild(item);
  }
}
// Zeni total invertido en las mejoras compradas (lo que se devuelve al reiniciar)
function shopSpent() {
  const lv = myPerks();
  let total = 0;
  for (const u of SHOP_UPGRADES) for (let l = 0; l < lv[u.id]; l++) total += shopCost(u, l);
  return total;
}
function resetUpgrades() {
  const btn = $('btnShopReset'), refund = shopSpent();
  if (!refund) return;
  if (!btn.classList.contains('confirm')) { // primer clic: pedir confirmación
    btn.classList.add('confirm');
    btn.textContent = t('¿Seguro? Recuperas {n} Z', { n: refund });
    return;
  }
  SAVE.zeni += refund;
  SAVE.upgrades = {};
  writeSave();
  SFX.unlock(); SFX.play('ball');
  renderShop();
}
function buyUpgrade(id) {
  const u = SHOP_UPGRADES.find(x => x.id === id), lv = myPerks(), l = lv[id];
  if (!u || l >= u.max) return;
  const cost = shopCost(u, l);
  if (SAVE.zeni < cost) return;
  SAVE.zeni -= cost;
  SAVE.upgrades = Object.assign({}, lv, { [id]: l + 1 });
  for (const a of ACHIEVEMENTS) if (a.goal && a.progress(SAVE) >= achGoal(a)) unlockAch(a.id);   // p. ej. «Entrenamiento completo»
  writeSave();
  SFX.unlock(); SFX.play('levelup');
  renderShop();
}
$('btnShop').onclick = () => { SFX.unlock(); renderShop(); $('menu').classList.add('hidden'); $('shop').classList.remove('hidden'); };
$('btnShopReset').onclick = resetUpgrades;
$('btnMap').onclick = e => { toggleMap(); e.currentTarget.blur(); };
// Pantalla completa (útil en celulares para ocultar las barras del navegador)
if (document.fullscreenEnabled) {
  $('btnFullscreen').classList.remove('hidden');
  $('btnFullscreen').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  };
  document.addEventListener('fullscreenchange', () => {
    $('btnFullscreen').textContent = t(document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa');
  });
}

// ─── Modo prueba: panel de Poderes (F6) ──────────────────────────────────────
// Cualquier técnica (también las de otros guerreros y las evoluciones) y cualquier mejora, con los mismos topes de
// casillas que en la partida. En solitario la partida queda en pausa mientras está abierto.
const testPowersOpen = () => !$('testPowers').classList.contains('hidden');
function toggleTestPowers(force) {
  if (!TEST_MODE || !G || !isAuthority()) return;
  const open = force !== undefined ? force : !testPowersOpen();
  if (open) {
    if (G.mode !== 'play' && !G.net) return;
    if (!G.net) G.mode = 'testpowers';
    $('testPowers').classList.remove('hidden');
    renderTestPowers();
  } else {
    $('testPowers').classList.add('hidden');
    if (G.mode === 'testpowers') G.mode = 'play';
  }
}
function testPowerChange(kind, id, delta) {
  const P = G.me;
  if (kind === 'atk') {
    const def = ATTACKS[id], a = P.attacks.find(x => x.id === id);
    const base = def.evolved && def.from, owned = base && P.attacks.find(x => x.id === base);
    if (delta > 0) {
      if (a) { if (a.lvl < MAX_ATTACK_LEVEL && !def.evolved) a.lvl++; }
      else if (owned) { owned.id = id; owned.lvl = MAX_ATTACK_LEVEL; owned.cd = 0.3; }   // la evolución reemplaza a su técnica
      else if (P.attacks.length < MAX_ATTACKS) P.attacks.push({ id, lvl: def.evolved ? MAX_ATTACK_LEVEL : 1, cd: 0.3 });
    } else if (a) {
      if (!def.evolved && a.lvl > 1) a.lvl--;
      else P.attacks.splice(P.attacks.indexOf(a), 1);
    }
  } else {
    const lv = P.passives[id] || 0;
    const used = Object.keys(PASSIVES).filter(k => P.passives[k] > 0).length;
    if (delta > 0 && lv < passiveMax(id) && (lv > 0 || used < maxPassives(P))) {
      P.passives[id] = lv + 1;
      if (id === 'vital') { P.maxHp += 20; healPlayer(P, 20); }
    } else if (delta < 0 && lv > 0) {
      P.passives[id] = lv - 1;
      if (id === 'vital') { P.maxHp -= 20; P.hp = Math.min(P.hp, P.maxHp); }
    }
  }
  renderTestPowers();
}
function renderTestPowers() {
  const P = G.me, ch = P.c;
  const atkRow = id => {
    const def = ATTACKS[id], a = P.attacks.find(x => x.id === id);
    const full = P.attacks.length >= MAX_ATTACKS && !(def.evolved && P.attacks.some(x => x.id === def.from));
    const lvl = a ? (def.evolved ? 'evo' : t('Nv {n}', { n: a.lvl })) : '';
    const canUp = a ? !def.evolved && a.lvl < MAX_ATTACK_LEVEL : !full;
    return `<div class="tp-row${a ? ' on' : ''}"><span class="tp-dot" style="background:${def.color}"></span>
      <span class="tp-name" title="${esc(def.name + (def.desc ? ': ' + def.desc : ''))}">${esc(def.name)}</span><span class="tp-lvl">${lvl}</span>
      <button data-tp="atk" data-id="${id}" data-d="-1"${a ? '' : ' disabled'}>−</button><button data-tp="atk" data-id="${id}" data-d="1"${canUp ? '' : ' disabled'}>+</button></div>`;
  };
  const usedP = Object.keys(PASSIVES).filter(k => P.passives[k] > 0).length;
  const pasRow = id => {
    const lv = P.passives[id] || 0, canUp = lv < passiveMax(id) && (lv > 0 || usedP < maxPassives(P));
    return `<div class="tp-row${lv ? ' on' : ''}"><span class="tp-dot" style="background:${PASSIVES[id].color}"></span>
      <span class="tp-name" title="${esc(PASSIVES[id].desc)}">${esc(PASSIVES[id].name)}</span><span class="tp-lvl">${lv ? t('Nv {n}', { n: lv }) : ''}</span>
      <button data-tp="pas" data-id="${id}" data-d="-1"${lv ? '' : ' disabled'}>−</button><button data-tp="pas" data-id="${id}" data-d="1"${canUp ? '' : ' disabled'}>+</button></div>`;
  };
  const ids = Object.keys(ATTACKS), base = ids.filter(id => !ATTACKS[id].evolved);
  const group = (title, list, row, note = '') => list.length ? `<div class="tp-group"><h3>${title}${note ? ` <small>${note}</small>` : ''}</h3><div class="tp-list">${list.map(row).join('')}</div></div>` : '';
  $('tpContent').innerHTML =
    group('Técnicas de ' + esc(ch.name), base.filter(id => ATTACKS[id].users && ATTACKS[id].users.includes(P.charId)), atkRow, `${P.attacks.length} / ${MAX_ATTACKS} casillas`)
    + group('Técnicas comunes', base.filter(id => !ATTACKS[id].users), atkRow)
    + group('Evoluciones', ids.filter(id => ATTACKS[id].evolved), atkRow, 'reemplazan a su técnica si la tienes')
    + group('Mejoras', Object.keys(PASSIVES), pasRow, `${usedP} / ${maxPassives(P)} casillas`)
    + group('Técnicas de otros guerreros', base.filter(id => ATTACKS[id].users && !ATTACKS[id].users.includes(P.charId)), atkRow);
  for (const b of $('tpContent').querySelectorAll('button[data-tp]')) b.onclick = () => testPowerChange(b.dataset.tp, b.dataset.id, +b.dataset.d);
}

// ─── Versión, autoría y créditos ─────────────────────────────────────────────
for (const el of document.querySelectorAll('.version')) el.textContent = t('Versión {v}', { v: GAME_VERSION });
function showTestBadge() {   // cartel del modo prueba (en el celular no hay teclas F)
  $('testBadge').classList.remove('hidden');
  // +1000 Zeni para probar la tienda y los desbloqueos (no se guarda: el modo prueba no escribe la partida)
  $('btnTestZeni').onclick = () => {
    SAVE.zeni += 1000;
    $('zeniTotal').textContent = SAVE.zeni;
    if (!$('shop').classList.contains('hidden')) renderShop();
    buildMenu();
    SFX.unlock(); SFX.play('pickup');
  };
  // Interruptores (en la partida): inmortal, tiempo x5, sin enemigos
  for (const b of document.querySelectorAll('[data-test]')) b.onclick = () => { testToggle(b.dataset.test); b.blur(); };
  $('btnTestPowers').onclick = e => { toggleTestPowers(); e.currentTarget.blur(); };   // panel de Poderes (F6)
  $('tpClose').onclick = () => toggleTestPowers(false);
  const keysInfo = document.querySelector('.test-keys');
  if (isTouch() && keysInfo) keysInfo.remove();
}
if (TEST_MODE) showTestBadge();
else if (TEST_REQUESTED) {
  // ?test sin contraseña todavía: se pide antes de activar el modo prueba
  const box = $('testLogin');
  box.classList.remove('hidden');
  $('testPass').focus();
  const tryPass = async () => {
    let ok = false;
    try { ok = (await sha256($('testPass').value)) === TEST_PASS_HASH; } catch (e) { ok = false; }   // sin crypto (http): no se puede activar
    if (!ok) { $('testError').textContent = t('Contraseña incorrecta.'); $('testPass').select(); return; }
    TEST_MODE = true;
    try { sessionStorage.setItem(TEST_SESSION_KEY, TEST_PASS_HASH); } catch (e) { /* sin almacenamiento */ }
    box.classList.add('hidden');
    showTestBadge();
    buildMenu();
  };
  $('btnTestOk').onclick = tryPass;
  $('testPass').addEventListener('keydown', e => { if (e.key === 'Enter') tryPass(); });
  $('btnTestCancel').onclick = () => { box.classList.add('hidden'); history.replaceState(null, '', location.pathname); };
}
// Bandera argentina en SVG (Windows no dibuja los emojis de banderas: mostraría "AR")
const FLAG_AR = `<svg class="flag" viewBox="0 0 30 20" role="img" aria-label="Argentina">
  <rect width="30" height="20" fill="#74acdf"/><rect y="6.67" width="30" height="6.67" fill="#fff"/>
  <circle cx="15" cy="10" r="2.3" fill="#f6b40e" stroke="#85340a" stroke-width="0.4"/></svg>`;
for (const a of document.querySelectorAll('.author-link')) {
  a.href = AUTHOR.url;
  a.textContent = AUTHOR.name;
  if (!a.closest('#credits')) a.insertAdjacentHTML('afterend', ' ' + FLAG_AR);   // la bandera, solo en el menú
}
// Secciones del menú: además del botón de abajo, uno arriba a la izquierda ("Volver (ESC)") y la tecla Escape
const MENU_SECTIONS = { bonusWin: 'btnBonusBack', setup: 'btnSetupBack', help: 'btnHelpBack', techs: 'btnTechsBack', achs: 'btnAchsBack', profile: 'btnProfileBack', rank: 'btnRankBack',
  news: 'btnNewsBack', credits: 'btnCreditsBack', shop: 'btnShopBack', board: 'btnBoardBack' };
for (const [id, back] of Object.entries(MENU_SECTIONS)) {
  const b = document.createElement('button');
  b.className = 'btn ghost small back-top';
  b.textContent = t('← Volver (ESC)');
  b.onclick = () => $(back).click();
  $(id).querySelector('.box').prepend(b);
}
function closeMenuSection() {
  const open = Object.keys(MENU_SECTIONS).find(id => !$(id).classList.contains('hidden'));
  if (open) $(MENU_SECTIONS[open]).click();
}
$('btnCredits').onclick = () => { $('menu').classList.add('hidden'); $('credits').classList.remove('hidden'); };
$('btnCreditsBack').onclick = () => { $('credits').classList.add('hidden'); $('menu').classList.remove('hidden'); };
$('btnShopBack').onclick = () => { $('shop').classList.add('hidden'); buildMenu(); $('menu').classList.remove('hidden'); };

$('nameInput').addEventListener('input', e => { SAVE.name = e.target.value.slice(0, 12); writeSave(); });
// "Jugar" abre la ventana de la partida: nivel, guerrero, apuntado y velocidad (en online se eligen en la sala)
// Desde Niveles bonus (bonusLv): solo se elige el guerrero, y Volver regresa a esa ventana
function openSetup(bonusLv = null) {
  SFX.unlock();
  if (!bonusLv && levelDef(SAVE.level).bonus) { SAVE.level = SAVE.lastLevel || 'saiyan'; writeSave(); buildMenu(); }   // Jugar: los niveles normales
  const L = bonusLv && levelDef(bonusLv);
  $('setup').classList.toggle('from-bonus', !!L);
  $('setupBonusTitle').textContent = L ? t('🐍 El Camino de la Serpiente') : '';
  $('menu').classList.add('hidden'); $('bonusWin').classList.add('hidden'); $('setup').classList.remove('hidden'); $('setup').scrollTop = 0;
}
$('btnSolo').onclick = () => openSetup();
// Niveles bonus (2.26.0): ventana aparte, con su botón dentro de Jugar, debajo de los niveles (js/bonus.js arma las tarjetas)
function openBonus() {
  SFX.unlock();
  $('menu').classList.add('hidden'); $('setup').classList.add('hidden');
  buildBonus();
  $('bonusWin').classList.remove('hidden'); $('bonusWin').scrollTop = 0;
}
function buildBonus() { const list = $('bonusList'); list.innerHTML = ''; list.appendChild(bonusSection(myLevel())); }
$('btnBonus').onclick = openBonus;
$('btnBonusBack').onclick = () => openSetup();   // Volver: a Jugar
$('btnSetupGo').onclick = () => { $('setup').classList.add('hidden'); SFX.unlock(); startSolo(); };
$('btnSetupBack').onclick = () => { if ($('setup').classList.contains('from-bonus')) { openBonus(); return; } $('setup').classList.add('hidden'); $('menu').classList.remove('hidden'); };
// Apuntado de las técnicas (en PC el cursor pasa a ser una mira): es de cada jugador. Tres modos (2.29.0):
// auto (todo solo), semi (los rayos hacia la mira, el resto solo) y manual (rayos y proyectiles hacia la mira).
// SAVE.aim sigue diciendo si hay mira (semi o manual); SAVE.aimMode, cuál de los tres
const AIM_MODES = ['auto', 'semi', 'manual'];
const aimMode = () => AIM_MODES.includes(SAVE.aimMode) ? SAVE.aimMode : SAVE.aim ? 'manual' : 'auto';
function setAim(mode) {
  if (!AIM_MODES.includes(mode)) mode = 'auto';
  SAVE.aimMode = mode; SAVE.aim = mode !== 'auto'; writeSave();
  document.body.classList.toggle('aim-on', SAVE.aim);
  $('aimAuto').classList.toggle('active', mode === 'auto'); $('aimSemi').classList.toggle('active', mode === 'semi'); $('aimManual').classList.toggle('active', mode === 'manual');
  $('lobbyAim').value = mode;
}
setAim(aimMode());
$('aimAuto').onclick = () => setAim('auto');
$('aimSemi').onclick = () => setAim('semi');
$('aimManual').onclick = () => setAim('manual');
$('lobbyAim').onchange = e => setAim(e.target.value);
// Al pasar el mouse (o tocar, en el celular): qué hace cada modo, con su nombre en negrita
const AIM_TIPS = { aimAuto: ['⚙️ Automático', 'Todas tus técnicas apuntan solas al enemigo más cercano. Tú solo te mueves.'],
  aimSemi: ['🎯⚙️ Semiautomático', 'Los rayos (Kamehameha, Galick Ho, Masenko y demás) salen hacia donde apuntas: el mouse en la PC, la palanca derecha en el mando o hacia donde te mueves en el celular. Las ráfagas de ki, los discos y los demás proyectiles siguen apuntando solos al enemigo más cercano.'],
  aimManual: ['🎯 Manual', 'Los rayos y también los proyectiles (ráfagas de ki, discos, esferas) salen hacia donde apuntas: el mouse en la PC, la palanca derecha en el mando o hacia donde te mueves en el celular. Las ondas, la lluvia de ki y el Makosen siguen centrados en el enemigo o en ti.'] };
for (const [id, [title, body]] of Object.entries(AIM_TIPS)) $(id).dataset.tip = t(title) + '\n' + t(body);
// Velocidad rápida (x1.5): se elige antes de jugar (en online la decide el anfitrión en la sala)
$('optSpeed').checked = !!SAVE.speed2;
$('optSpeed').onchange = e => { SAVE.speed2 = e.target.checked; writeSave(); $('lobbySpeed').checked = SAVE.speed2; };
$('lobbyLevel').onchange = e => { SAVE.level = e.target.value; writeSave(); buildLevels(); Net.levelChanged(); };
$('lobbySpeed').onchange = e => { SAVE.speed2 = e.target.checked; writeSave(); $('optSpeed').checked = SAVE.speed2; Net.speedChanged(); };
$('btnResume').onclick = () => togglePause();
// Reiniciar: el primer clic pide confirmación; la partida actual se descarta (no da Zeni ni cuenta para nada)
function resetRestartBtn() {
  const b = $('btnRestart');
  b.classList.toggle('hidden', !!(G && G.net));
  b.classList.remove('confirm');
  b.textContent = t('Reiniciar');
}
$('btnRestart').onclick = () => {
  if (!G || G.net) return;
  const b = $('btnRestart');
  if (!b.classList.contains('confirm')) { b.classList.add('confirm'); b.textContent = t('¿Seguro? Se pierde esta partida'); return; }
  SFX.unlock(); startSolo();
};
$('btnQuit').onclick = () => {
  if (!G) return;
  if (G.net) { Net.leave(); return; }
  G.mode = 'play'; $('pause').classList.add('hidden'); G.quit = true; endRun(false);   // abandonada (no cuenta para Mr. Satán)
};
$('btnRetry').onclick = () => { if (G && G.net) Net.backToLobby(); else startSolo(); };
$('btnMenu').onclick = () => { if (G && G.net) Net.leave(); else toMenu(); };
$('btnTransform').onclick = () => requestTransform();
$('btnPause').onclick = () => togglePause();
$('btnMusic').onclick = e => { toggleMusic(); e.currentTarget.blur(); };
$('btnMusic').classList.toggle('off', !Music.enabled);
$('btnSfx').onclick = e => { toggleSfx(); e.currentTarget.blur(); };
$('btnSfx').classList.toggle('off', !SFX.enabled);

// ─── Bucle ───────────────────────────────────────────────────────────────────
let last = performance.now(), lastRaf = performance.now();
// Tema musical según la situación: menú, batalla o jefe
const LEVEL_MUSIC = { namek: 'namek', cell: 'cell', buu: 'buu', kaio: 'kaio', snake: 'snake' };   // cada escenario, su tema (2.22.0)
function musicFor() {
  if (!G) return TOUR && TOUR.screen === 'fight' ? (TOUR.round === 3 ? 'boss' : 'battle') : 'menu';   // torneo: la final con el tema de los jefes
  if (G.mode === 'over') return 'menu';
  if (G.enemies.some(e => e.boss)) return 'boss';
  return LEVEL_MUSIC[G.lv && G.lv.id] || 'battle';
}
// Los botones fijos de sonido se corren a la izquierda de la barra de desplazamiento de la
// pantalla que esté abierta (menú, tienda, técnicas...), que si no queda tapada
let scrollGap = -1;
function updateScrollGap() {
  const open = [...document.querySelectorAll('.screen')].filter(el => !el.classList.contains('hidden')).pop();
  const gap = open ? Math.max(0, open.offsetWidth - open.clientWidth) : 0;
  if (gap !== scrollGap) { scrollGap = gap; document.documentElement.style.setProperty('--sb', gap + 'px'); }
}
new MutationObserver(updateScrollGap).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
addEventListener('resize', updateScrollGap);
function toggleMusic() {
  SFX.unlock();
  const on = Music.toggle();
  $('btnMusic').classList.toggle('off', !on);
  $('btnMusic').title = t(on ? 'Silenciar música (N)' : 'Activar música (N)');
}
function toggleSfx() {
  SFX.unlock();
  const on = SFX.toggle();
  $('btnSfx').classList.toggle('off', !on);
  $('btnSfx').title = t(on ? 'Silenciar efectos de sonido (B)' : 'Activar efectos de sonido (B)');
}
function step(now, draw) {
  const raw = (now - last) / 1000, dt = Math.min(0.05, raw);
  if (G && draw && G.mode === 'play' && raw > 0 && raw < 1) { G.perfT = (G.perfT || 0) + raw; G.perfN = (G.perfN || 0) + 1; if (raw > 1 / 30) G.perfSlow = (G.perfSlow || 0) + 1; }   // (para el backoffice, 2.28.1)
  last = now;
  pollGamepad();
  Music.want(musicFor());
  if (G) {
    if (G.net && G.net.role === 'client') Net.clientUpdate(dt * G.speed);
    else {
      // Velocidad rápida: el tiempo se reparte en pasos de como mucho 1 fotograma, para que los
      // proyectiles rápidos no atraviesen a los enemigos sin tocarlos (x1.5 = 2 pasos de 0,75)
      const speed = G.speed * (G.testFast ? 5 : 1), steps = Math.ceil(speed);   // modo prueba: tiempo x5
      // Al caer un jefe: un instante congelado y después medio segundo en cámara lenta
      const slow = G.hitStop > 0 ? 0 : G.slowmo > 0 ? 0.35 : 1;
      if (G.hitStop > 0) G.hitStop -= dt; else if (G.slowmo > 0) G.slowmo -= dt;
      if (slow) for (let i = 0; i < steps && G && G.mode === 'play'; i++) update(dt * speed * slow / steps);
    }
    tickSummon(dt);
    if (G && G.net && G.net.role === 'host') Net.hostTick(dt);
    if (G) { syncChoiceUI(); tickPause(dt); achTick(); if (G.flashT > 0) G.flashT -= dt; }
    if (G && draw) render();
  } else if (TOUR) tourStep(dt, draw, now);   // Torneo Mundial (js/tournament.js): su propio bucle
  else if (draw) {
    renderMenuBackground(now / 1000);
    if (spritesReady) {   // hasta que carguen los sprites de GBA, sin personajes (no se ven los dibujos viejos)
      renderMenuPortraits(now / 1000);
      renderMenuHero(now / 1000);
    }
  }
}
function frame(now) {
  requestAnimationFrame(frame); // primero: un error en un fotograma no debe detener el bucle
  lastRaf = performance.now();
  step(lastRaf, canvas.width > 0 && canvas.height > 0); // ventana sin tamaño: simular sin dibujar
}
// Si la pestaña queda en segundo plano el navegador pausa requestAnimationFrame.
// En una partida online eso congelaría a todos, así que un Web Worker (que no se
// pausa) mantiene la simulación y la red funcionando, sin dibujar.
function startBackgroundTicker() {
  const tick = () => {
    const now = performance.now();
    if (G && G.net && now - lastRaf > 250) step(now, false);
  };
  try {
    const src = 'setInterval(() => postMessage(0), 33);';
    const worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    worker.onmessage = tick;
  } catch (e) {
    setInterval(tick, 33); // sin workers: el navegador lo ralentiza en segundo plano, pero algo avanza
  }
}
addEventListener('DOMContentLoaded', () => {
  applyCursor();   // el cursor elegido en la tienda (2.30.0)
  loadExternalSprites();
  CUSTOM_SPRITES.register();
  buildMenu();
  Net.init();
  startBackgroundTicker();
  requestAnimationFrame(frame);
});
