'use strict';
// ─── Fusión: misiones diarias (de DB Survivors) ───
// Cada día salen 3 misiones (las mismas para todos ese día) que dan Zeni al cobrarlas, y un bono por cumplir
// las tres. El progreso se cuenta al terminar cada partida, comparando las estadísticas de antes y después.
// No toca la lógica del juego: envuelve endRun y agrega su propia ventana al menú.
(() => {
  const KEY = 'fusion.daily', BONUS = 300;
  // run: true = se cuenta lo mejor de una sola partida; si no, se va sumando durante el día
  const POOL = [
    { id: 'kills', vals: [300, 500, 800], text: v => `Derrota ${v} enemigos` },
    { id: 'time', vals: [240, 360, 480], run: true, text: v => `Aguanta ${v / 60} minutos en una partida` },
    { id: 'level', vals: [15, 20], run: true, text: v => `Llega al nivel ${v} en una partida` },
    { id: 'zeni', vals: [300, 600], text: v => `Gana ${v} Zeni` },
    { id: 'trans', vals: [1, 2], text: v => v > 1 ? `Transfórmate ${v} veces` : 'Transfórmate una vez' },
    { id: 'elites', vals: [3, 6], text: v => `Derrota ${v} enemigos de élite` },
    { id: 'bosses', vals: [2, 4], text: v => `Derrota ${v} jefes` },
    { id: 'wish', vals: [1], text: () => 'Invoca a Shenlong' },
    { id: 'wins', vals: [1], text: () => 'Gana un nivel' },
  ];

  const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  function rng(seed) {   // números al azar fijos para cada día
    return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  let D = null;
  function load() {
    try { D = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { D = null; }
    const d = today();
    if (D && D.date === d) return D;
    const R = rng([...d].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)), pool = POOL.slice(), list = [];
    while (list.length < 3) {
      const m = pool.splice(Math.floor(R() * pool.length), 1)[0];
      list.push({ id: m.id, v: m.vals[Math.floor(R() * m.vals.length)], prog: 0, claimed: false, z: 150 + Math.floor(R() * 4) * 50 });
    }
    D = { date: d, list, bonus: false };
    save();
    return D;
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* sin almacenamiento */ } };
  const def = id => POOL.find(m => m.id === id);
  const ready = () => { load(); return D.list.filter(m => m.prog >= m.v && !m.claimed).length + (D.list.every(m => m.claimed) && !D.bonus ? 1 : 0); };

  // Foto de las estadísticas al empezar cada partida
  let snap = null, snapG = null;
  const bossSum = () => Object.values((SAVE.stats && SAVE.stats.bosses) || {}).reduce((a, b) => a + b, 0);
  const wishSum = () => SAVE.stats.summons || 0;
  (function watch() {
    if (typeof G !== 'undefined' && G && G !== snapG && G.mode !== 'over') {
      snapG = G;
      snap = { elites: SAVE.stats.elites || 0, trans: SAVE.stats.transforms || 0, bosses: bossSum(), wish: wishSum(), zeni: SAVE.stats.zeniEarned || 0 };
    }
    requestAnimationFrame(watch);
  })();

  const orig = endRun;
  endRun = function (won) {   // eslint-disable-line no-global-assign
    const g = G, wasOver = !g || g.mode === 'over';
    const res = orig.apply(this, arguments);
    if (wasOver || !g || g !== snapG || !snap || g.practice) return res;
    const P = g.me, got = {
      kills: P.stats.kills, time: Math.floor(g.t), level: g.level || 0,
      zeni: (SAVE.stats.zeniEarned || 0) - snap.zeni, trans: (SAVE.stats.transforms || 0) - snap.trans,
      elites: (SAVE.stats.elites || 0) - snap.elites, bosses: bossSum() - snap.bosses, wish: wishSum() - snap.wish, wins: won ? 1 : 0,
    };
    load();
    let done = 0;
    for (const m of D.list) {
      if (m.prog >= m.v) continue;
      const n = Math.max(0, got[m.id] || 0);
      m.prog = Math.min(m.v, def(m.id).run ? Math.max(m.prog, n) : m.prog + n);
      if (m.prog >= m.v) done++;
    }
    save();
    snap = null;
    if (done) toast('¡Misión diaria cumplida!', 'Cóbrala en el menú, en Misiones');
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

  // ── Ventana de misiones ──
  const screen = document.createElement('div');
  screen.id = 'daily';
  screen.className = 'screen overlay hidden';
  screen.innerHTML = `<div class="box help-box"><h2>Misiones diarias</h2>
    <p class="hint">Cambian cada día. Cobra el Zeni de cada una y, si cumples las tres, un bono de ${BONUS} Zeni.</p>
    <div id="dailyContent" class="help-content"></div>
    <button id="btnDailyBack" class="btn ghost">Volver</button></div>`;
  document.body.appendChild(screen);

  function render() {
    load();
    const rows = D.list.map((m, i) => {
      const pct = Math.round(100 * m.prog / m.v), ok = m.prog >= m.v;
      const btn = m.claimed ? '<b>✓ Cobrada</b>' : ok ? `<button class="btn small" data-claim="${i}">Cobrar ${m.z} Zeni</button>` : `<span>${m.prog} / ${m.v}</span>`;
      return `<div class="fd-row"><div class="fd-txt">${def(m.id).text(m.v)}<div class="fd-bar"><i style="width:${pct}%"></i></div></div><div class="fd-act">${btn}</div></div>`;
    }).join('');
    const all = D.list.every(m => m.claimed);
    const bonus = D.bonus ? '<b>✓ Bono cobrado</b>' : all ? `<button class="btn small" data-claim="bonus">Cobrar bono de ${BONUS} Zeni</button>` : '<span>Cumple las tres</span>';
    $('dailyContent').innerHTML = rows + `<div class="fd-row fd-bonus"><div class="fd-txt">🐉 Bono del día</div><div class="fd-act">${bonus}</div></div>`;
    for (const b of $('dailyContent').querySelectorAll('[data-claim]')) b.onclick = () => claim(b.dataset.claim);
  }
  function claim(which) {
    load();
    let z = 0;
    if (which === 'bonus') { if (D.bonus || !D.list.every(m => m.claimed)) return; D.bonus = true; z = BONUS; }
    else { const m = D.list[+which]; if (!m || m.claimed || m.prog < m.v) return; m.claimed = true; z = m.z; }
    SAVE.zeni += z; writeSave(); save();
    if (typeof SFX !== 'undefined') SFX.play('ball');
    $('zeniTotal').textContent = SAVE.zeni;
    render(); badge();
  }

  const btn = document.createElement('button');
  btn.id = 'btnDaily';
  btn.className = 'btn ghost';
  btn.textContent = 'Misiones';
  $('btnAchs').after(btn);
  function badge() { const n = ready(); btn.textContent = n ? `Misiones (${n})` : 'Misiones'; btn.classList.toggle('fd-ready', n > 0); }
  btn.onclick = () => { render(); $('menu').classList.add('hidden'); screen.classList.remove('hidden'); screen.scrollTop = 0; };
  $('btnDailyBack').onclick = () => { screen.classList.add('hidden'); $('menu').classList.remove('hidden'); badge(); };
  badge();

  const css = document.createElement('style');
  css.textContent = `.fd-row{display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,.12)}
    .fd-txt{flex:1;font-weight:600}.fd-bar{height:8px;margin-top:6px;border-radius:4px;background:rgba(0,0,0,.35);overflow:hidden}
    .fd-bar i{display:block;height:100%;background:#ffcc33}.fd-act{min-width:120px;text-align:right}.fd-bonus .fd-txt{color:#ffd93b}
    #btnDaily.fd-ready{border-color:#ffd93b;color:#ffd93b}`;
  document.head.appendChild(css);
})();
