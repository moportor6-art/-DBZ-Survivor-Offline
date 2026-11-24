'use strict';
// ─── Fusión: misiones diarias, semanales y retos ───
// · Diarias: 4 por día (las mismas para todos ese día), Zeni al cobrarlas y un bono por cumplir todas.
// · Semanales: 3 por semana (de lunes a domingo), más largas y con más Zeni, y su propio bono.
// · Retos: objetivos permanentes con escalones (bronce, plata, oro, …); cada escalón se cobra una vez.
//   La cadena «Rival del Universo 6» desbloquea a Hit (js/mods/hit.js).
// El progreso se cuenta al terminar cada partida, comparando las estadísticas de antes y después.
// localStorage: 'fusion.daily' (día), 'fusion.weekly' (semana), 'fusion.retos' (escalones cobrados y misiones cumplidas).
(() => {
  const EN = () => typeof LANG !== 'undefined' && LANG === 'en';
  const L = (es, en) => (EN() ? en : es);
  const nombre = id => (CHARACTERS[id] ? CHARACTERS[id].name : id);
  const nivelNum = id => { const v = (typeof LEVELS !== 'undefined' && LEVELS.find(q => q.id === id)); return v ? v.num : id; };
  const D_BONUS = 400, W_BONUS = 2500;

  // ── Qué se mide en cada partida ──
  // run: se cuenta lo mejor de una sola partida; si no, se va sumando.  p: un parámetro elegido al azar (guerrero, nivel)
  const DIARIAS = [
    { id: 'kills', vals: [300, 500, 800, 1200], text: v => L(`Derrota ${v} enemigos`, `Defeat ${v} enemies`) },
    { id: 'time', vals: [240, 360, 480], run: true, text: v => L(`Aguanta ${v / 60} minutos en una partida`, `Survive ${v / 60} minutes in one run`) },
    { id: 'level', vals: [15, 20, 25], run: true, text: v => L(`Llega al nivel ${v} en una partida`, `Reach level ${v} in one run`) },
    { id: 'zeni', vals: [300, 600, 900], text: v => L(`Gana ${v} Zeni`, `Earn ${v} Zeni`) },
    { id: 'trans', vals: [1, 2, 3], text: v => L(v > 1 ? `Transfórmate ${v} veces` : 'Transfórmate una vez', v > 1 ? `Transform ${v} times` : 'Transform once') },
    { id: 'elites', vals: [3, 6, 10], text: v => L(`Derrota ${v} enemigos de élite`, `Defeat ${v} elite enemies`) },
    { id: 'bosses', vals: [2, 3, 4], text: v => L(`Derrota ${v} jefes`, `Defeat ${v} bosses`) },
    { id: 'wish', vals: [1], text: () => L('Invoca a Shenlong', 'Summon Shenron') },
    { id: 'wins', vals: [1, 2], text: v => L(v > 1 ? `Gana ${v} niveles` : 'Gana un nivel', v > 1 ? `Win ${v} levels` : 'Win a level') },
    { id: 'evos', vals: [1, 2], text: v => L(v > 1 ? `Evoluciona ${v} técnicas` : 'Evoluciona una técnica', v > 1 ? `Evolve ${v} techniques` : 'Evolve a technique') },
    { id: 'fusions', vals: [1], text: () => L('Fusiona dos técnicas en una partida', 'Fuse two techniques in a run') },
    { id: 'runs', vals: [2, 3], text: v => L(`Juega ${v} partidas`, `Play ${v} runs`) },
    { id: 'chars', vals: [2, 3], text: v => L(`Juega con ${v} guerreros distintos`, `Play with ${v} different fighters`) },
    { id: 'limpio', vals: [180, 300], run: true, text: v => L(`Aguanta ${v / 60} minutos recibiendo menos de 300 de daño`, `Survive ${v / 60} minutes taking less than 300 damage`) },
    { id: 'conchar', vals: [300, 600], p: 'char', text: (v, p) => L(`Derrota ${v} enemigos con ${nombre(p)}`, `Defeat ${v} enemies with ${nombre(p)}`) },
    { id: 'winchar', vals: [1], p: 'char', text: (v, p) => L(`Gana un nivel con ${nombre(p)}`, `Win a level with ${nombre(p)}`) },
    { id: 'winlv', vals: [1], p: 'lv', text: (v, p) => L(`Gana el Nivel ${nivelNum(p)}`, `Win Level ${nivelNum(p)}`) },
    { id: 'historia', vals: [1], text: () => L('Gana un capítulo del Modo Historia', 'Win a Story Mode chapter') },
  ];
  const SEMANALES = [
    { id: 'kills', vals: [3000, 5000], text: v => L(`Derrota ${v} enemigos`, `Defeat ${v} enemies`) },
    { id: 'bosses', vals: [10, 15], text: v => L(`Derrota ${v} jefes`, `Defeat ${v} bosses`) },
    { id: 'wins', vals: [5, 8], text: v => L(`Gana ${v} niveles`, `Win ${v} levels`) },
    { id: 'elites', vals: [30, 50], text: v => L(`Derrota ${v} enemigos de élite`, `Defeat ${v} elite enemies`) },
    { id: 'trans', vals: [15, 25], text: v => L(`Transfórmate ${v} veces`, `Transform ${v} times`) },
    { id: 'tiempo', vals: [3600, 5400], text: v => L(`Juega ${v / 60} minutos en total`, `Play ${v / 60} minutes in total`) },
    { id: 'historia', vals: [3, 5], text: v => L(`Gana ${v} capítulos del Modo Historia`, `Win ${v} Story Mode chapters`) },
    { id: 'chars', vals: [5, 8], text: v => L(`Gana con ${v} guerreros distintos`, `Win with ${v} different fighters`) },
    { id: 'evos', vals: [8, 12], text: v => L(`Evoluciona ${v} técnicas`, `Evolve ${v} techniques`) },
    { id: 'wish', vals: [3, 5], text: v => L(`Invoca a Shenlong ${v} veces`, `Summon Shenron ${v} times`) },
    { id: 'poder', vals: [1], text: () => L('Gana el Torneo del Poder', 'Win the Tournament of Power') },
  ];

  // ── Retos permanentes: cada uno con sus escalones [meta, Zeni] ──
  const R = () => leerR();
  const bossN = id => ((SAVE.stats && SAVE.stats.bosses) || {})[id] || 0;
  const sum = o => Object.values(o || {}).reduce((a, b) => a + (+b || 0), 0);
  const estrellas = () => { try { return sum(JSON.parse(localStorage.getItem('fusion.capitulos') || '{}')); } catch (e) { return 0; } };
  const nivelesGanados = () => new Set(Object.keys((SAVE.stats && SAVE.stats.lvWins) || {}).map(k => k.split('|')[0])).size;
  const ganoPoder = () => Object.keys((SAVE.stats && SAVE.stats.lvWins) || {}).some(k => k.startsWith('poder|')) ? 1 : 0;
  const bossesDe = (...ids) => () => ids.reduce((a, id) => a + bossN(id), 0);
  const capsGT = () => { try { const c = JSON.parse(localStorage.getItem('fusion.capitulos') || '{}');
    return (window.GT_CAPS || []).reduce((a, q) => a + (+c[q.id] || 0), 0); } catch (e) { return 0; } };
  const jefe = (id, cat, icon, es, en, ids, t, fes, fen) => ({ id, cat, icon, name: () => L(es, en), v: bossesDe(...ids), t,
    text: m => L(`Derrota ${m} veces a ${fes}`, `Defeat ${fen} ${m} times`) });
  const CATS = { prog: ['Progreso', 'Progress'], fight: ['Combate', 'Combat'], boss: ['Jefes y sagas', 'Bosses and sagas'],
    gt: ['Dragon Ball GT', 'Dragon Ball GT'], col: ['Colección y modos', 'Collection and modes'] };
  const RETOS = [
    { id: 'u6', icon: '⏱', grupo: true, name: () => L('Rival del Universo 6', 'Rival of Universe 6'),
      desc: () => L('Cumple los tres para desbloquear a Hit', 'Complete all three to unlock Hit'),
      partes: [
        { text: () => L('Derrota a Hit en el Torneo del Poder', 'Defeat Hit in the Tournament of Power'), v: () => Math.min(1, bossN('hit')), meta: 1 },
        { text: () => L('Gana el Torneo del Poder (Nivel 8)', 'Win the Tournament of Power (Level 8)'), v: ganoPoder, meta: 1 },
        { text: () => L('Cumple 15 misiones (diarias o semanales)', 'Complete 15 missions (daily or weekly)'), v: () => Math.min(15, R().misiones || 0), meta: 15 },
      ] },
    { id: 'kills', cat: 'fight', icon: '💥', name: () => L('Exterminador', 'Exterminator'), v: () => SAVE.stats.kills || 0, t: [[1000, 300], [5000, 800], [20000, 2000], [50000, 5000]], text: m => L(`Derrota ${m} enemigos`, `Defeat ${m} enemies`) },
    { id: 'time', cat: 'prog', icon: '⏳', name: () => L('Superviviente', 'Survivor'), v: () => Math.floor((SAVE.stats.time || 0) / 60), t: [[60, 300], [300, 1000], [1000, 3000]], text: m => L(`Juega ${m} minutos en total`, `Play ${m} minutes in total`) },
    { id: 'wins', cat: 'prog', icon: '🏆', name: () => L('Campeón', 'Champion'), v: () => SAVE.wins || 0, t: [[5, 300], [25, 1000], [100, 3000]], text: m => L(`Gana ${m} niveles`, `Win ${m} levels`) },
    { id: 'chars', cat: 'col', icon: '🥋', name: () => L('Maestro de guerreros', 'Master of fighters'), v: () => Object.keys(SAVE.stats.winsBy || {}).length, t: [[3, 400], [10, 1200], [25, 3000], [50, 6000]], text: m => L(`Gana con ${m} guerreros distintos`, `Win with ${m} different fighters`) },
    { id: 'niveles', cat: 'prog', icon: '🗺', name: () => L('Conquistador', 'Conqueror'), v: nivelesGanados, t: [[3, 500], [6, 1500], [10, 3000]], text: m => L(`Gana ${m} niveles distintos`, `Win ${m} different levels`) },
    { id: 'bosses', cat: 'boss', icon: '👑', name: () => L('Cazador de jefes', 'Boss hunter'), v: () => sum(SAVE.stats.bosses), t: [[10, 400], [50, 1200], [200, 4000]], text: m => L(`Derrota ${m} jefes`, `Defeat ${m} bosses`) },
    { id: 'elites', cat: 'fight', icon: '⭐', name: () => L('Rompe-élites', 'Elite breaker'), v: () => SAVE.stats.elites || 0, t: [[25, 300], [100, 1000], [500, 3000]], text: m => L(`Derrota ${m} enemigos de élite`, `Defeat ${m} elite enemies`) },
    { id: 'trans', cat: 'fight', icon: '⚡', name: () => L('Más allá del límite', 'Beyond the limit'), v: () => SAVE.stats.transforms || 0, t: [[10, 300], [50, 1000], [200, 3000]], text: m => L(`Transfórmate ${m} veces`, `Transform ${m} times`) },
    { id: 'evos', cat: 'fight', icon: '🌀', name: () => L('Técnicas definitivas', 'Ultimate techniques'), v: () => SAVE.stats.evoCount || 0, t: [[5, 300], [25, 1000], [100, 3000]], text: m => L(`Evoluciona ${m} técnicas`, `Evolve ${m} techniques`) },
    { id: 'fusions', cat: 'fight', icon: '🔗', name: () => L('Fusión de técnicas', 'Technique fusion'), v: () => SAVE.stats.fusions || 0, t: [[1, 300], [10, 1000], [50, 3000]], text: m => L(`Fusiona técnicas ${m} veces`, `Fuse techniques ${m} times`) },
    { id: 'wish', cat: 'col', icon: '🐉', name: () => L('Amigo de Shenlong', "Shenron's friend"), v: () => SAVE.stats.summons || 0, t: [[1, 300], [5, 1000], [20, 3000]], text: m => L(`Invoca a Shenlong ${m} veces`, `Summon Shenron ${m} times`) },
    { id: 'historia', cat: 'prog', icon: '📖', name: () => L('Leyenda viviente', 'Living legend'), v: estrellas, t: [[5, 500], [20, 1500], [40, 3000], [63, 8000], [117, 20000]], text: m => L(`Consigue ${m} estrellas en el Modo Historia`, `Earn ${m} stars in Story Mode`) },
    { id: 'misiones', cat: 'prog', icon: '📋', name: () => L('Constancia', 'Consistency'), v: () => R().misiones || 0, t: [[5, 300], [20, 1000], [60, 3000], [150, 8000]], text: m => L(`Cumple ${m} misiones`, `Complete ${m} missions`) },
    { id: 'hit', cat: 'boss', icon: '🟣', name: () => L('El asesino del Universo 6', 'The Universe 6 assassin'), v: () => bossN('hit'), t: [[1, 500], [5, 1500], [15, 4000]], text: m => L(`Derrota a Hit ${m} veces`, `Defeat Hit ${m} times`) },
    // ── Nuevos (2.35.2) ──
    { id: 'runs', cat: 'prog', icon: '🎮', name: () => L('Incansable', 'Tireless'), v: () => SAVE.runs || 0, t: [[10, 300], [50, 1000], [200, 3000], [500, 8000]], text: m => L(`Juega ${m} partidas`, `Play ${m} runs`) },
    { id: 'zeni', cat: 'prog', icon: '💰', name: () => L('Magnate de Capsule Corp.', 'Capsule Corp. tycoon'), v: () => SAVE.stats.zeniEarned || 0, t: [[10000, 500], [50000, 1500], [200000, 4000], [1000000, 10000]], text: m => L(`Gana ${m} Zeni en total`, `Earn ${m} Zeni in total`) },
    { id: 'logros', cat: 'prog', icon: '🏅', name: () => L('Cazador de logros', 'Achievement hunter'), v: () => Object.keys(SAVE.ach || {}).length, t: [[10, 500], [25, 1500], [40, 4000], [51, 10000]], text: m => L(`Consigue ${m} logros`, `Unlock ${m} achievements`) },
    { id: 'lvchar', cat: 'prog', icon: '🗺', name: () => L('Viajero del multiverso', 'Multiverse traveler'), v: () => Object.keys(SAVE.stats.lvWins || {}).length, t: [[10, 500], [30, 1500], [80, 4000], [200, 10000]], text: m => L(`Gana ${m} combinaciones de nivel y guerrero`, `Win ${m} level and fighter combinations`) },
    { id: 'leal', cat: 'prog', icon: '🤝', name: () => L('Guerrero leal', 'Loyal warrior'), v: () => Math.max(0, ...Object.values(SAVE.stats.charRuns || {}).map(n => +n || 0)), t: [[10, 300], [50, 1200], [150, 4000]], text: m => L(`Juega ${m} partidas con el mismo guerrero`, `Play ${m} runs with the same fighter`) },
    { id: 'dano', cat: 'fight', icon: '💢', name: () => L('Poder destructivo', 'Destructive power'), v: () => Math.floor(sum(SAVE.stats.techDmg)), t: [[100000, 300], [1000000, 1000], [10000000, 3000], [100000000, 8000]], text: m => L(`Causa ${m.toLocaleString()} de daño con técnicas`, `Deal ${m.toLocaleString()} damage with techniques`) },
    { id: 'kills2', cat: 'fight', icon: '☠', name: () => L('Ejército de un solo hombre', 'One-man army'), v: () => SAVE.stats.kills || 0, t: [[100000, 8000], [250000, 15000]], text: m => L(`Derrota ${m.toLocaleString()} enemigos`, `Defeat ${m.toLocaleString()} enemies`) },
    { id: 'bestiario', cat: 'boss', icon: '📕', name: () => L('Bestiario', 'Bestiary'), v: () => BOSSES.filter(b => bossN(b.id) > 0).length, t: [[10, 500], [25, 1500], [40, 4000], [55, 10000]], text: m => L(`Derrota a ${m} jefes distintos`, `Defeat ${m} different bosses`) },
    jefe('saiyan', 'boss', '🌑', 'Invasión Saiyajin', 'Saiyan invasion', ['raditz', 'nappa', 'vegetas'], [[3, 300], [15, 1000], [50, 3000]], 'Raditz, Nappa o Vegeta', 'Raditz, Nappa or Vegeta'),
    jefe('ginyu', 'boss', '💪', 'Adiós, Fuerzas Especiales', 'Farewell, Special Force', ['recoome', 'burter', 'jeice', 'ginyu'], [[5, 300], [20, 1000], [60, 3000]], 'las Fuerzas Especiales Ginyu', 'the Ginyu Force'),
    jefe('freezer', 'boss', '👿', 'Pesadilla de Namek', 'Namek nightmare', ['freezer', 'mechafz', 'goldenfz', 'blackfz', 'coldb', 'coolerb'], [[3, 400], [15, 1200], [50, 4000]], 'Freezer y su familia', 'Frieza and his family'),
    jefe('androides', 'boss', '🤖', 'Chatarra de la Red Ribbon', 'Red Ribbon scrap', ['a16', 'a17', 'a18', 'a19', 'gero'], [[5, 300], [20, 1000], [60, 3000]], 'los androides', 'the androids'),
    jefe('cell', 'boss', '🧬', 'Juegos de Cell', 'Cell Games', ['cellimp', 'cellsemi', 'cell'], [[3, 400], [15, 1200], [50, 4000]], 'Cell en cualquier forma', 'Cell in any form'),
    jefe('buu', 'boss', '🍬', 'Fin de Majin Buu', 'End of Majin Buu', ['fatbuu', 'superbuu', 'buu'], [[3, 400], [15, 1200], [50, 4000]], 'Majin Buu en cualquier forma', 'Majin Buu in any form'),
    jefe('broly', 'boss', '🟢', 'El Saiyajin legendario', 'The Legendary Saiyan', ['brolyb'], [[1, 500], [5, 1500], [15, 4000]], 'Broly', 'Broly'),
    jefe('bills', 'boss', '😼', 'Dios de la Destrucción', 'God of Destruction', ['bills'], [[1, 600], [5, 2000], [15, 5000]], 'Bills', 'Beerus'),
    jefe('janemba', 'boss', '👹', 'Pesadilla del Otro Mundo', 'Other World nightmare', ['janemba'], [[1, 500], [5, 1500], [15, 4000]], 'Janemba', 'Janemba'),
    jefe('baby', 'gt', '🦠', 'Saga de Baby', 'Baby saga', ['babyb', 'babyozaru', 'rildob'], [[1, 600], [5, 2000], [15, 5000]], 'Baby o el General Rildo', 'Baby or General Rildo'),
    jefe('s17', 'gt', '🔩', 'Doble androide', 'Double android', ['super17b'], [[1, 600], [5, 2000], [15, 5000]], 'Super 17', 'Super 17'),
    jefe('dragones', 'gt', '🐲', 'Esferas malditas', 'Cursed Dragon Balls', ['hazeb', 'rageb', 'oceanb', 'naturb', 'eisb', 'novab', 'synb'], [[7, 800], [25, 2500], [70, 6000]], 'los Dragones Oscuros', 'the Shadow Dragons'),
    jefe('omega', 'gt', '🌌', 'El fin de Omega Shenron', 'The end of Omega Shenron', ['omegab'], [[1, 1000], [5, 3000], [15, 8000]], 'Omega Shenron', 'Omega Shenron'),
    { id: 'gtcaps', cat: 'gt', icon: '⭐', name: () => L('Leyenda de GT', 'GT legend'), v: capsGT, t: [[5, 800], [15, 2500], [33, 8000]], text: m => L(`Consigue ${m} estrellas en los capítulos de GT`, `Earn ${m} stars in the GT chapters`) },
    jefe('alternos', 'col', '🌀', 'Viajero entre universos', 'Universe traveler', ['frostb', 'willowb', 'cellmaxb', 'lishenb'], [[4, 800], [20, 2500], [60, 7000]], 'los jefes de los universos alternativos', 'the alternate-universe bosses'),
    { id: 'coleccion', cat: 'col', icon: '🗃', name: () => L('Coleccionista', 'Collector'), v: () => Object.keys(CHARACTERS).filter(id => typeof isUnlocked === 'function' && isUnlocked(id)).length, t: [[15, 500], [30, 1500], [45, 4000], [60, 10000]], text: m => L(`Ten ${m} guerreros desbloqueados`, `Have ${m} fighters unlocked`) },
    { id: 'online', cat: 'col', icon: '🌐', name: () => L('Equipo Z', 'Z Team'), v: () => SAVE.stats.onlineWins || 0, t: [[1, 500], [10, 1500], [50, 5000]], text: m => L(`Gana ${m} niveles en cooperativo online`, `Win ${m} levels in online co-op`) },
    { id: 'semanal', cat: 'col', icon: '📅', name: () => L('Desafío aceptado', 'Challenge accepted'), v: () => SAVE.stats.weeklyWins || 0, t: [[1, 500], [5, 1500], [20, 5000]], text: m => L(`Gana ${m} desafíos semanales`, `Win ${m} weekly challenges`) },
    { id: 'jiren', cat: 'boss', icon: '🔥', name: () => L('Más fuerte que Jiren', 'Stronger than Jiren'), v: () => bossN('jiren'), t: [[1, 800], [5, 2500], [15, 6000]], text: m => L(`Derrota a Jiren ${m} veces`, `Defeat Jiren ${m} times`) },
  ];

  // ── Guardado ──
  const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || def; } catch (e) { return def; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const leerR = () => leer('fusion.retos', { misiones: 0, cobrados: {} });
  const guardarR = r => escribir('fusion.retos', r);
  window.FusionRetos = { leer: leerR, RETOS };

  const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const semana = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return `s${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const finSemana = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7 + 7); return d.getTime(); };
  function rng(seed) {   // números al azar fijos para cada día o semana
    return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const semilla = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  // Parámetros: guerreros desbloqueados y niveles abiertos (los del día se eligen entre los que tienes)
  const opciones = p => p === 'char'
    ? Object.keys(CHARACTERS).filter(id => typeof isUnlocked === 'function' && isUnlocked(id))
    : (typeof LEVELS !== 'undefined' ? LEVELS.filter(v => typeof isLevelOpen !== 'function' || isLevelOpen(v.id)).map(v => v.id) : []);

  function armar(key, fecha, pool, n, zBase, zPaso) {
    let D = leer(key, null);
    if (D && D.date === fecha) return D;
    const Rn = rng(semilla(fecha + key)), lista = [], resto = pool.slice();
    while (lista.length < n && resto.length) {
      const m = resto.splice(Math.floor(Rn() * resto.length), 1)[0];
      const it = { id: m.id, v: m.vals[Math.floor(Rn() * m.vals.length)], prog: 0, claimed: false, z: zBase + Math.floor(Rn() * 4) * zPaso };
      if (m.p) { const ops = opciones(m.p); if (!ops.length) continue; it.p = ops[Math.floor(Rn() * ops.length)]; }
      lista.push(it);
    }
    D = { date: fecha, list: lista, bonus: false };
    escribir(key, D);
    return D;
  }
  const diarias = () => armar('fusion.daily', hoy(), DIARIAS, 4, 150, 50);
  const semanales = () => armar('fusion.weekly', semana(), SEMANALES, 3, 1000, 150);
  const defD = id => DIARIAS.find(m => m.id === id) || { text: () => id };
  const defW = id => SEMANALES.find(m => m.id === id) || { text: () => id };

  // Escalón actual de un reto (el primero sin cobrar)
  const escalon = (r, cob) => { const i = cob[r.id] || 0; return i < r.t.length ? i : -1; };
  function listos() {
    const D = diarias(), W = semanales(), Rr = leerR();
    let n = D.list.filter(m => m.prog >= m.v && !m.claimed).length + (D.list.every(m => m.claimed) && !D.bonus ? 1 : 0)
      + W.list.filter(m => m.prog >= m.v && !m.claimed).length + (W.list.every(m => m.claimed) && !W.bonus ? 1 : 0);
    for (const r of RETOS) { if (r.grupo) continue; const i = escalon(r, Rr.cobrados); if (i >= 0 && r.v() >= r.t[i][0]) n++; }
    return n;
  }

  // ── Foto de las estadísticas al empezar cada partida ──
  let snap = null, snapG = null, jugados = { day: '', chars: [] };
  const bossSum = () => sum((SAVE.stats && SAVE.stats.bosses) || {});
  (function watch() {
    if (typeof G !== 'undefined' && G && G !== snapG && G.mode !== 'over') {
      snapG = G;
      snap = { elites: SAVE.stats.elites || 0, trans: SAVE.stats.transforms || 0, bosses: bossSum(), wish: SAVE.stats.summons || 0,
        zeni: SAVE.stats.zeniEarned || 0, evos: SAVE.stats.evoCount || 0, fusions: SAVE.stats.fusions || 0 };
    }
    requestAnimationFrame(watch);
  })();

  const orig = endRun;
  endRun = function (won) {   // eslint-disable-line no-global-assign
    const g = G, wasOver = !g || g.mode === 'over';
    const res = orig.apply(this, arguments);
    if (wasOver || !g || g !== snapG || !snap || g.practice || !g.me) return res;
    const P = g.me, d = hoy();
    if (jugados.day !== d) jugados = { day: d, chars: [] };
    if (!jugados.chars.includes(P.charId)) jugados.chars.push(P.charId);
    const gW = leer('fusion.wchars', { week: '', chars: [] });
    if (gW.week !== semana()) { gW.week = semana(); gW.chars = []; }
    if (won && !gW.chars.includes(P.charId)) gW.chars.push(P.charId);
    escribir('fusion.wchars', gW);
    const t = Math.floor(g.t), taken = P.stats.taken || 0;
    const got = {
      kills: P.stats.kills, time: t, tiempo: t, level: g.level || 0,
      zeni: (SAVE.stats.zeniEarned || 0) - snap.zeni, trans: (SAVE.stats.transforms || 0) - snap.trans,
      elites: (SAVE.stats.elites || 0) - snap.elites, bosses: bossSum() - snap.bosses, wish: (SAVE.stats.summons || 0) - snap.wish,
      wins: won ? 1 : 0, evos: (SAVE.stats.evoCount || 0) - snap.evos, fusions: (SAVE.stats.fusions || 0) - snap.fusions ? 1 : 0,
      runs: 1, limpio: taken < 300 ? t : 0, historia: won && g.historia ? 1 : 0,
      poder: won && g.lv && g.lv.id === 'poder' && !g.historia ? 1 : 0,
    };
    const conP = (m) => m.id === 'conchar' ? (P.charId === m.p ? P.stats.kills : 0)
      : m.id === 'winchar' ? (won && P.charId === m.p ? 1 : 0)
      : m.id === 'winlv' ? (won && g.lv && g.lv.id === m.p ? 1 : 0) : null;
    let hechas = 0;
    const avanzar = (D, def, chars) => {
      for (const m of D.list) {
        if (m.prog >= m.v) continue;
        let n = conP(m);
        if (n === null) n = m.id === 'chars' ? chars : Math.max(0, got[m.id] || 0);
        const run = def(m.id).run || m.id === 'chars';
        m.prog = Math.min(m.v, run ? Math.max(m.prog, n) : m.prog + n);
        if (m.prog >= m.v) hechas++;
      }
    };
    const D = diarias(), W = semanales();
    avanzar(D, defD, jugados.chars.length);
    avanzar(W, defW, gW.chars.length);
    escribir('fusion.daily', D); escribir('fusion.weekly', W);
    snap = null;
    if (hechas) toast(L('¡Misión cumplida!', 'Mission complete!'), L('Cóbrala en el menú, en Misiones', 'Claim it from the menu, in Missions'));
    badge();
    return res;
  };

  // Aviso con el mismo estilo que los de logros
  function toast(title, text) {
    const box = $('achToasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'ach-toast';
    el.innerHTML = '<span class="trophy">📋</span><div><b>' + title + '</b><small>' + text + '</small></div>';
    el.onclick = () => el.remove();
    box.appendChild(el);
    void el.offsetWidth; el.classList.add('in');
    setTimeout(() => el.remove(), 6000);
  }

  // ── Ventana: pestañas Diarias / Semanales / Retos ──
  const screen = document.createElement('div');
  screen.id = 'daily';
  screen.className = 'screen overlay hidden';
  screen.innerHTML = `<div class="box help-box"><h2 id="fdTitle"></h2>
    <div class="fd-tabs"><button data-tab="d"></button><button data-tab="w"></button><button data-tab="r"></button></div>
    <p class="hint" id="fdHint"></p>
    <button id="fdTodo" class="btn small hidden"></button>
    <div id="dailyContent" class="help-content"></div>
    <button id="btnDailyBack" class="btn ghost"></button></div>`;
  document.body.appendChild(screen);
  let tab = 'd';
  for (const b of screen.querySelectorAll('[data-tab]')) b.onclick = () => { tab = b.dataset.tab; render(); };

  const fila = (txt, pct, act, extra = '') => `<div class="fd-row${extra}"><div class="fd-txt">${txt}<div class="fd-bar"><i style="width:${Math.min(100, pct)}%"></i></div></div><div class="fd-act">${act}</div></div>`;
  // Las de tiempo se muestran en minutos
  const cuenta = m => (['time', 'tiempo', 'limpio'].includes(m.id) ? `${Math.floor(m.prog / 60)} / ${m.v / 60} min` : `${m.prog} / ${m.v}`);
  function filasMision(D, def, key) {
    return D.list.map((m, i) => {
      const ok = m.prog >= m.v;
      const act = m.claimed ? `<b>✓ ${L('Cobrada', 'Claimed')}</b>` : ok ? `<button class="btn small" data-claim="${key}:${i}">${L('Cobrar', 'Claim')} ${m.z} Zeni</button>` : `<span>${cuenta(m)}</span>`;
      return fila(def(m.id).text(m.v, m.p), 100 * m.prog / m.v, act);
    }).join('');
  }
  function render() {
    $('fdTitle').textContent = L('Misiones', 'Missions');
    $('btnDailyBack').textContent = L('Volver', 'Back');
    const [bd, bw, br] = screen.querySelectorAll('[data-tab]');
    bd.textContent = L('Diarias', 'Daily'); bw.textContent = L('Semanales', 'Weekly'); br.textContent = L('Retos', 'Challenges');
    for (const b of [bd, bw, br]) b.classList.toggle('on', b.dataset.tab === tab);
    const box = $('dailyContent');
    if (tab === 'd') {
      const D = diarias(), all = D.list.every(m => m.claimed);
      $('fdHint').textContent = L(`Cambian cada día. Si cumples todas, un bono de ${D_BONUS} Zeni.`, `They change every day. Complete them all for a ${D_BONUS} Zeni bonus.`);
      const bonus = D.bonus ? `<b>✓ ${L('Bono cobrado', 'Bonus claimed')}</b>` : all ? `<button class="btn small" data-claim="d:bonus">${L('Cobrar bono de', 'Claim bonus of')} ${D_BONUS} Zeni</button>` : `<span>${L('Cumple todas', 'Complete all')}</span>`;
      box.innerHTML = filasMision(D, defD, 'd') + `<div class="fd-row fd-bonus"><div class="fd-txt">🐉 ${L('Bono del día', 'Daily bonus')}</div><div class="fd-act">${bonus}</div></div>`;
    } else if (tab === 'w') {
      const W = semanales(), all = W.list.every(m => m.claimed);
      const dias = Math.max(1, Math.ceil((finSemana() - Date.now()) / 86400000));
      $('fdHint').textContent = L(`Cambian cada lunes (quedan ${dias} días). Si cumples las tres, un bono de ${W_BONUS} Zeni.`, `They change every Monday (${dias} days left). Complete all three for a ${W_BONUS} Zeni bonus.`);
      const bonus = W.bonus ? `<b>✓ ${L('Bono cobrado', 'Bonus claimed')}</b>` : all ? `<button class="btn small" data-claim="w:bonus">${L('Cobrar bono de', 'Claim bonus of')} ${W_BONUS} Zeni</button>` : `<span>${L('Cumple las tres', 'Complete all three')}</span>`;
      box.innerHTML = filasMision(W, defW, 'w') + `<div class="fd-row fd-bonus"><div class="fd-txt">🏅 ${L('Bono de la semana', 'Weekly bonus')}</div><div class="fd-act">${bonus}</div></div>`;
    } else {
      $('fdHint').textContent = L('Objetivos para siempre: cada escalón da Zeni una vez.', 'Permanent goals: each tier gives Zeni once.');
      const Rr = leerR();
      let ultima = '';
      const titulo = r => { if (!r.cat || r.cat === ultima) return ''; ultima = r.cat; return `<h3 class="fd-cat">${L(...CATS[r.cat])}</h3>`; };
      const orden = ['prog', 'fight', 'boss', 'gt', 'col'], hechos = RETOS.filter(r => !r.grupo && escalon(r, Rr.cobrados) < 0).length;
      const lista = RETOS.filter(r => r.grupo).concat(orden.flatMap(c => RETOS.filter(r => r.cat === c)));
      $('fdHint').textContent += ' ' + L(`Completos: ${hechos} de ${RETOS.length - 1}.`, `Completed: ${hechos} of ${RETOS.length - 1}.`);
      box.innerHTML = lista.map(r => titulo(r) + (() => {
        if (r.grupo) {
          const hecho = r.partes.every(q => q.v() >= q.meta), libre = typeof isUnlocked === 'function' && CHARACTERS.hitp && isUnlocked('hitp');
          const partes = r.partes.map(q => `<div class="fd-sub">${q.v() >= q.meta ? '✓' : '·'} ${q.text()} <span>${q.v()} / ${q.meta}</span></div>`).join('');
          const act = libre ? `<b>✓ ${L('Hit desbloqueado', 'Hit unlocked')}</b>` : hecho ? `<b>${L('¡Listo!', 'Done!')}</b>` : `<span>🔒 Hit</span>`;
          return `<div class="fd-row fd-grupo"><div class="fd-txt">${r.icon} ${r.name()}<small>${r.desc()}</small>${partes}</div><div class="fd-act">${act}</div></div>`;
        }
        const i = escalon(r, Rr.cobrados), v = r.v();
        if (i < 0) return fila(`${r.icon} ${r.name()} <small>${r.text(r.t[r.t.length - 1][0])}</small>`, 100, `<b>✓ ${L('Completo', 'Complete')}</b>`);
        const [meta, z] = r.t[i], medalla = ['🥉', '🥈', '🥇', '💎', '👑'][i] || '👑';
        const act = v >= meta ? `<button class="btn small" data-claim="r:${r.id}">${L('Cobrar', 'Claim')} ${z} Zeni</button>` : `<span>${Math.min(v, meta)} / ${meta}</span>`;
        return fila(`${r.icon} ${r.name()} ${medalla} <small>${r.text(meta)}</small>`, 100 * v / meta, act);
      })()).join('');
    }
    for (const b of box.querySelectorAll('[data-claim]')) b.onclick = () => cobrar(b.dataset.claim);
    const n = listos(), todo = $('fdTodo');
    todo.textContent = L(`Cobrar todo (${n})`, `Claim all (${n})`);
    todo.classList.toggle('hidden', n < 2);
    todo.onclick = cobrarTodo;
  }
  // Cobrar todo: misiones, bonos (ya con todas cobradas) y todos los escalones de retos listos
  function cobrarTodo() {
    let z = 0, n = 0;
    const sumar = q => { const v = cobrar(q, true); if (v) { z += v; n++; } return v; };
    for (const k of ['d', 'w']) {
      const D = k === 'd' ? diarias() : semanales();
      D.list.forEach((m, i) => sumar(`${k}:${i}`));
      sumar(`${k}:bonus`);
    }
    for (const r of RETOS) if (!r.grupo) while (sumar(`r:${r.id}`));
    if (!n) return;
    if (typeof SFX !== 'undefined') SFX.play('ball');
    toast(L(`¡${n} recompensas cobradas!`, `${n} rewards claimed!`), `+${z} Zeni`);
    render(); badge();
  }
  function cobrar(what, quiet) {
    const [k, w] = what.split(':');
    let z = 0, mision = false;
    if (k === 'r') {
      const r = RETOS.find(q => q.id === w), Rr = leerR(), i = r ? escalon(r, Rr.cobrados) : -1;
      if (i < 0 || r.v() < r.t[i][0]) return 0;
      Rr.cobrados[r.id] = i + 1; z = r.t[i][1]; guardarR(Rr);
    } else {
      const key = k === 'd' ? 'fusion.daily' : 'fusion.weekly', D = k === 'd' ? diarias() : semanales(), B = k === 'd' ? D_BONUS : W_BONUS;
      if (w === 'bonus') { if (D.bonus || !D.list.every(m => m.claimed)) return 0; D.bonus = true; z = B; }
      else { const m = D.list[+w]; if (!m || m.claimed || m.prog < m.v) return 0; m.claimed = true; z = m.z; mision = true; }
      escribir(key, D);
    }
    if (mision) { const Rr = leerR(); Rr.misiones = (Rr.misiones || 0) + 1; guardarR(Rr); }
    SAVE.zeni += z; writeSave();
    $('zeniTotal').textContent = SAVE.zeni;
    window.dispatchEvent(new Event('fusion:retos'));   // (Hit revisa si ya se desbloquea)
    if (!quiet) { if (typeof SFX !== 'undefined') SFX.play('ball'); render(); badge(); }
    return z;
  }

  const btn = document.createElement('button');
  btn.id = 'btnDaily';
  btn.className = 'btn ghost';
  $('btnAchs').after(btn);
  function badge() { const n = listos(); btn.textContent = L('Misiones', 'Missions') + (n ? ` (${n})` : ''); btn.classList.toggle('fd-ready', n > 0); }
  btn.onclick = () => { render(); $('menu').classList.add('hidden'); screen.classList.remove('hidden'); screen.scrollTop = 0; };
  $('btnDailyBack').onclick = () => { screen.classList.add('hidden'); $('menu').classList.remove('hidden'); badge(); };
  window.FusionRetos.badge = badge;
  badge();
  setTimeout(badge, 0);   // (después de que se elija el idioma)

  const css = document.createElement('style');
  css.textContent = `#daily{overflow-y:auto;justify-content:flex-start;padding-top:3vh}
    .fd-tabs{display:flex;gap:6px;justify-content:center;margin:4px 0 6px}
    .fd-tabs button{font:inherit;font-weight:700;padding:6px 14px;border-radius:8px;border:2px solid #ffd93b55;background:rgba(0,0,0,.3);color:#fff}
    .fd-tabs button.on{background:#ffd93b;color:#0a0f2e;border-color:#ffd93b}
    .fd-row{display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,.12)}
    .fd-txt{flex:1;font-weight:600}.fd-txt small{display:block;font-weight:400;opacity:.8;font-size:.85em}
    .fd-sub{font-weight:400;font-size:.9em;margin-top:4px;opacity:.9}.fd-sub span{opacity:.7;margin-left:6px}
    #fdTodo{display:block;margin:0 auto 6px;background:#ffd93b;color:#0a0f2e;font-weight:800}#fdTodo.hidden{display:none}
    .fd-cat{margin:14px 0 2px;color:#ffd93b;font-size:1em;text-align:left}
    .fd-grupo{background:rgba(180,107,255,.12);border-radius:8px}
    .fd-bar{height:8px;margin-top:6px;border-radius:4px;background:rgba(0,0,0,.35);overflow:hidden}
    .fd-bar i{display:block;height:100%;background:#ffcc33}.fd-act{min-width:120px;text-align:right}.fd-bonus .fd-txt{color:#ffd93b}
    #btnDaily.fd-ready{border-color:#ffd93b;color:#ffd93b}`;
  document.head.appendChild(css);
})();
