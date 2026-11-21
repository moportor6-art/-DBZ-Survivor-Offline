// ─── Editor del HUD: mover, cambiar tamaño, girar, transparentar u ocultar cada pieza ───
// Se abre desde la pausa (✏️ Editar HUD). Cada pieza se arrastra con el dedo o el mouse; con dos dedos se
// agranda/achica y se gira; abajo hay botones para tamaño, giro, transparencia, ocultar y reiniciar.
// Guardado en localStorage 'fusion.hud': { pieza: { x, y, s, r, a, h } } (desplazamiento en px, escala, grados,
// opacidad, oculta).
// Cómo funciona con el lienzo: el HUD del juego se dibuja todo junto en drawHUD, así que este archivo (el último
// que envuelve drawHUD) separa el HUD de cada pieza cambiada (rectángulos que salen de las mismas cuentas del
// juego) y lo vuelve a pegar con su posición, escala, giro y opacidad. Si no cambiaste nada, no hace nada. Los botones (¡KI!, pausa, mapa, música, sonido) son HTML: se mueven con CSS.
(() => {
  const KEY = 'fusion.hud';
  let cfg = {};
  try { cfg = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { cfg = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* nada */ } };
  const D = { x: 0, y: 0, s: 1, r: 0, a: 1, h: false };
  const get = id => ({ ...D, ...(cfg[id] || {}) });
  const custom = id => { const c = cfg[id]; return !!c && (c.x || c.y || c.s !== 1 && c.s !== undefined || c.r || (c.a !== undefined && c.a !== 1) || c.h); };
  let editing = false;

  // ─── Piezas del lienzo: rectángulo en px de pantalla, con las mismas cuentas que drawHUD ───
  let loadEnd = 96;
  const dl = drawLoadout;
  drawLoadout = function () { const r = dl.apply(this, arguments); loadEnd = r; return r; };   // eslint-disable-line no-global-assign
  const slotsBox = kinds => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const s of hudSlots) if (kinds.includes(s.kind)) { x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x + (s.w || s.s)); y1 = Math.max(y1, s.y + s.s); }
    return x0 < 1e9 ? [x0, y0, x1, y1] : null;
  };
  const kiRect = () => {
    const touchUi = isTouch() && W < 900, kw = touchUi ? Math.min(360, W - 120) : Math.min(360, W - 40), kx = touchUi ? 12 : (W - kw) / 2, kh = 14, ky = H - 26 - kh;
    return [kx - 12, ky - 48, kw + 24, kh + 58];
  };
  const PIEZAS = [
    { id: 'xp', name: 'Barra de experiencia', r: () => [0, 0, W, 10] },
    { id: 'guerrero', name: 'Tu guerrero', r: () => [4, 12, (W < 640 ? 170 : 220) + 8, 62] },
    { id: 'esferas', name: 'Esferas y deseos', r: () => { const b = slotsBox(['effect']); return [6, 74, Math.max(18 + ballsNeeded() * 18, b ? b[2] : 0) + 4, 22]; } },
    { id: 'tecnicas', name: 'Técnicas y mejoras', r: () => {   // todas las casillas, también las vacías (como drawLoadout)
      const s = W < 640 ? 26 : 30, n = Math.max(MAX_ATTACKS, maxPassives(G.me));
      return [5, 93, 6 + n * (s + 3), Math.max(s + 6, loadEnd - 91)];
    } },
    { id: 'equipo', name: 'Compañeros', r: () => [6, loadEnd + 4, 164, Math.max(1, G.players.filter(q => q !== G.me && !q.gone && !q.ally).length) * 34] },
    { id: 'reloj', name: 'Reloj', r: () => { const L = hudLayout(); return L.narrow ? [L.statsX - 3, L.statsY - 3, 144, G.speed > 1 ? 58 : 42] : [W / 2 - 62, 12, 124, 42]; } },
    { id: 'bajas', name: 'Bajas', r: () => { const L = hudLayout(); return L.narrow ? null : [L.killsX - 3, L.killsY - 3, 106, 44]; } },
    { id: 'ki', name: 'Barra de Ki', r: kiRect },
    { id: 'jefe', name: 'Barra de jefes', r: () => {   // una barra por jefe, o la tira de retratos desde BOSS_STRIP_MIN (drawBossStrip)
      const L = hudLayout(), n = Math.max(1, G.enemies.filter(e => e.boss).length), bw = Math.min(420, W - 40);
      const strip = n >= BOSS_STRIP_MIN, S = bossStripSize(n), w = Math.max(bw, strip ? n * S + (n - 1) * 6 : 0) + 16;
      return [(W - w) / 2, L.bossY - 20, w, strip ? S + 52 : (n - 1) * BOSS_BAR_GAP + 40];
    } },
    { id: 'mapa', name: 'Minimapa', r: () => { const px = Math.round(Math.min(220, Math.max(120, Math.min(W, H) * 0.24))), x = W - px - 18, y = hudLayout().mapY; return [x - 8, y - 8, px + 16, px + 16 + (isTouch() ? 0 : 22)]; } },
    { id: 'avisos', name: 'Anuncios', r: () => {   // del ancho del anuncio de ahora (así no se pisa con lo de los costados)
      let w = W * 0.5;
      if (G.banner) { ctx.save(); ctx.font = `700 ${W < 640 ? 18 : 26}px ${FONT}`; w = ctx.measureText(t(G.banner.text, G.banner.params)).width + 24; ctx.restore(); }
      return [(W - w) / 2, H * 0.26 - (W < 640 ? 22 : 30), w, W < 640 ? 30 : 40];
    } },
  ];
  const SOLIDAS = ['xp', 'guerrero', 'tecnicas', 'reloj', 'bajas', 'ki', 'jefe', 'mapa'];
  const BOTONES = [
    { id: 'btnTransform', name: 'Botón ¡KI!' }, { id: 'btnPause', name: 'Pausa', noHide: true }, { id: 'btnMap', name: 'Botón del mapa' },
    { id: 'btnMusic', name: 'Música' }, { id: 'btnSfx', name: 'Sonido' },
  ];
  const rectOf = p => { try { return p.r(); } catch (e) { return null; } };

  // ─── Pegar el HUD por piezas ───
  const mk = () => { const c = document.createElement('canvas'); return { c, x: c.getContext('2d') }; };
  const mundo = mk(), hud = mk();
  const hd = drawHUD;
  // Solo se copian los rectángulos de las piezas cambiadas (no la pantalla entera): antes del HUD se guarda el mundo
  // de esos rectángulos y se dejan vacíos; el HUD se dibuja normal; lo que quedó en ellos es solo HUD (se copia
  // aparte); se devuelve el mundo a su lugar y el HUD de cada pieza se pega movido, escalado y girado.
  drawHUD = function () {   // eslint-disable-line no-global-assign
    const act = G && G.me ? PIEZAS.filter(p => custom(p.id)) : [];
    if (!act.length) return hd.apply(this, arguments);
    const cw = canvas.width, ch = canvas.height;
    for (const o of [mundo, hud]) if (o.c.width !== cw || o.c.height !== ch) { o.c.width = cw; o.c.height = ch; }
    const dev = r => { const x = Math.max(0, Math.floor(r[0] * DPR)), y = Math.max(0, Math.floor(r[1] * DPR)); return [x, y, Math.min(cw, Math.ceil((r[0] + r[2]) * DPR)) - x, Math.min(ch, Math.ceil((r[1] + r[3]) * DPR)) - y]; };
    const rects = act.map(p => [p, rectOf(p)]).filter(([, r]) => r).map(([p, r]) => [p, r, dev(r)]).filter(([, , d]) => d[2] > 0 && d[3] > 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const [, , [x, y, w, h]] of rects) { mundo.x.clearRect(x, y, w, h); mundo.x.drawImage(canvas, x, y, w, h, x, y, w, h); }
    for (const [, , [x, y, w, h]] of rects) ctx.clearRect(x, y, w, h);
    ctx.restore();
    let res;
    try { res = hd.apply(this, arguments); } finally {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      for (const [, , [x, y, w, h]] of rects) { hud.x.clearRect(x, y, w, h); hud.x.drawImage(canvas, x, y, w, h, x, y, w, h); }
      for (const [, , [x, y, w, h]] of rects) { ctx.clearRect(x, y, w, h); ctx.drawImage(mundo.c, x, y, w, h, x, y, w, h); }
      // los paneles sin cambios que se tocan con una pieza movida: su parte en el cruce vuelve a su lugar
      for (const p of PIEZAS) {
        if (custom(p.id) || !SOLIDAS.includes(p.id)) continue;
        const r0 = rectOf(p);
        if (!r0) continue;
        const r = dev(r0);
        for (const [, , q] of rects) {
          const x = Math.max(r[0], q[0]), y = Math.max(r[1], q[1]), w = Math.min(r[0] + r[2], q[0] + q[2]) - x, h = Math.min(r[1] + r[3], q[1] + q[3]) - y;
          if (w > 0 && h > 0) { ctx.drawImage(hud.c, x, y, w, h, x, y, w, h); hud.x.clearRect(x, y, w, h); }   // (y no viaja con la pieza movida)
        }
      }
      for (const [p, r, [x, y, w, h]] of rects) {
        const c = get(p.id);
        if (c.h) continue;
        ctx.save();
        ctx.globalAlpha = c.a;
        ctx.translate(x + w / 2 + c.x * DPR, y + h / 2 + c.y * DPR); ctx.rotate(c.r * Math.PI / 180); ctx.scale(c.s, c.s);
        ctx.drawImage(hud.c, x, y, w, h, -w / 2, -h / 2, w, h);
        ctx.restore();
        if (p.id === 'tecnicas' || p.id === 'esferas') {   // las casillas (para ver qué hace cada una) siguen a la pieza
          const kinds = p.id === 'tecnicas' ? ['attack', 'passive'] : ['effect'], cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
          for (const s of hudSlots) if (kinds.includes(s.kind)) {
            s.x = cx + c.x + (s.x - cx) * c.s; s.y = cy + c.y + (s.y - cy) * c.s; s.s *= c.s; if (s.w) s.w *= c.s;
          }
        }
      }
      ctx.restore();
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    return res;
  };

  // ─── Botones HTML ───
  function applyDom() {
    for (const b of BOTONES) {
      const el = document.getElementById(b.id);
      if (!el) continue;
      const c = get(b.id), hide = c.h && !b.noHide;
      el.style.translate = c.x || c.y ? `${c.x}px ${c.y}px` : '';
      el.style.rotate = c.r ? `${c.r}deg` : '';
      el.style.scale = c.s !== 1 ? String(c.s) : '';
      el.style.opacity = hide ? (editing ? '0.3' : '0') : c.a !== 1 ? String(c.a) : '';
      el.style.pointerEvents = hide && !editing ? 'none' : '';
    }
  }
  applyDom();

  // ─── El editor ───
  const st = document.createElement('style');
  st.textContent = `#hudEd { position: fixed; inset: 0; z-index: 70; touch-action: none; user-select: none; }
    #hudEd.hidden { display: none; }
    #hudEd .he-box { position: absolute; border: 2px dashed #ffd93b; background: rgba(255,217,59,0.08); border-radius: 6px; }
    #hudEd .he-box.sel { border: 3px solid #7dff6a; background: rgba(125,255,106,0.14); }
    #hudEd .he-box.off { border-color: #ff6a6a; background: rgba(255,80,80,0.12); }
    #hudEd .he-box span { position: absolute; left: 2px; top: -16px; font: 700 11px sans-serif; color: #fff; text-shadow: 0 0 3px #000, 0 0 3px #000; white-space: nowrap; pointer-events: none; }
    #hudEd .he-top, #hudEd .he-bar { position: absolute; left: 50%; transform: translateX(-50%); display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;
      align-items: center; padding: 8px; background: rgba(10,15,46,0.92); border: 2px solid #ffd93b; border-radius: 10px; color: #fff; font: 700 13px sans-serif; max-width: 96vw; }
    #hudEd .he-top { top: 50%; transform: translate(-50%, -50%); }
    #hudEd .he-top.min { top: 8px; transform: translateX(-50%); }
    #hudEd .he-bar { bottom: 8px; }
    #hudEd button { font: 700 13px sans-serif; padding: 6px 9px; border-radius: 7px; border: 2px solid #0a0f2e; background: #ffd93b; color: #0a0f2e; min-width: 34px; }
    #hudEd button.gr { background: #8a93c8; } #hudEd button.ok { background: #7dff6a; }`;
  document.head.appendChild(st);
  const ed = document.createElement('div');
  ed.id = 'hudEd'; ed.className = 'hidden';
  document.body.appendChild(ed);
  let sel = null, boxes = {}, raf = 0;
  const all = () => [...PIEZAS.map(p => ({ ...p, kind: 'cv' })), ...BOTONES.map(b => ({ ...b, kind: 'dom' }))];
  const byId = id => all().find(p => p.id === id);

  function baseRect(p) {
    if (p.kind === 'cv') return rectOf(p);
    const el = document.getElementById(p.id);
    if (!el || !el.offsetWidth) return null;
    const b = el.getBoundingClientRect(), c = get(p.id);   // sin el desplazamiento propio
    const w = el.offsetWidth, h = el.offsetHeight, cx = b.left + b.width / 2 - c.x, cy = b.top + b.height / 2 - c.y;
    return [cx - w / 2, cy - h / 2, w, h];
  }
  function frame() {
    if (!editing) return;
    for (const p of all()) {
      const r = baseRect(p), el = boxes[p.id];
      if (!el) continue;
      if (!r) { el.style.display = 'none'; continue; }
      const c = get(p.id), w = r[2] * c.s, h = r[3] * c.s, cx = r[0] + r[2] / 2 + c.x, cy = r[1] + r[3] / 2 + c.y;
      Object.assign(el.style, { display: '', left: `${cx - w / 2}px`, top: `${cy - h / 2}px`, width: `${w}px`, height: `${h}px`, transform: `rotate(${c.r}deg)` });
      el.classList.toggle('sel', sel === p.id); el.classList.toggle('off', !!c.h);
      el.querySelector('span').textContent = p.name + (c.h ? ' (oculto)' : '');
    }
    raf = requestAnimationFrame(frame);
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function change(id, fn) {
    const c = get(id); fn(c);
    c.s = clamp(Math.round(c.s * 100) / 100, 0.4, 3); c.a = clamp(Math.round(c.a * 100) / 100, 0.15, 1); c.r = ((Math.round(c.r) % 360) + 360) % 360;
    if (c.r > 180) c.r -= 360;
    cfg[id] = c; save(); applyDom(); bar();
  }
  function bar() {
    const top = ed.querySelector('.he-top'), b = ed.querySelector('.he-bar');
    top.classList.toggle('min', !!sel);
    if (!sel) { b.style.display = 'none'; return; }
    const p = byId(sel), c = get(sel);
    b.style.display = '';
    b.innerHTML = `<b style="width:100%;text-align:center">${p.name} · ${Math.round(c.s * 100)}% · ${c.r}° · ${Math.round(c.a * 100)}%</b>
      <span>Tamaño</span><button data-k="s-">−</button><button data-k="s+">+</button>
      <span>Girar</span><button data-k="r-">⟲</button><button data-k="r+">⟳</button>
      <span>Opacidad</span><button data-k="a-">−</button><button data-k="a+">+</button>
      ${p.noHide ? '' : `<button data-k="h" class="gr">${c.h ? 'Mostrar' : 'Ocultar'}</button>`}<button data-k="z" class="gr">Reiniciar</button><button data-k="x" class="ok">✓</button>`;
  }
  ed.addEventListener('click', e => {
    const k = e.target.dataset && e.target.dataset.k;
    if (!k) return;
    if (k === 'listo') return cerrar();
    if (k === 'todo') { if (confirmar()) { cfg = {}; save(); applyDom(); sel = null; bar(); } return; }
    if (k === 'x') { sel = null; bar(); return; }
    if (!sel) return;
    if (k === 'z') { delete cfg[sel]; save(); applyDom(); bar(); return; }
    change(sel, c => {
      if (k === 's-') c.s -= 0.1; if (k === 's+') c.s += 0.1;
      if (k === 'r-') c.r -= 15; if (k === 'r+') c.r += 15;
      if (k === 'a-') c.a -= 0.1; if (k === 'a+') c.a += 0.1;
      if (k === 'h') c.h = !c.h;
    });
  });
  let pide = 0;
  const confirmar = () => { const now = Date.now(); if (now - pide < 2500) return true; pide = now; const b = ed.querySelector('[data-k=todo]'); b.textContent = '¿Seguro? Toca otra vez'; setTimeout(() => { b.textContent = 'Restablecer todo'; }, 2500); return false; };

  // Arrastrar con un dedo; con dos, tamaño y giro
  const ptr = new Map();
  let drag = null;
  ed.addEventListener('pointerdown', e => {
    const box = e.target.closest && e.target.closest('.he-box');
    if (box) { sel = box.dataset.id; bar(); }
    if (!box && ptr.size === 0) return;   // en un botón o en el vacío
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { ed.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
    if (!sel) return;
    const c = get(sel), ps = [...ptr.values()];
    if (ps.length === 1) drag = { mode: 1, sx: e.clientX, sy: e.clientY, x: c.x, y: c.y };
    else { const [a, b] = ps; drag = { mode: 2, d: Math.hypot(b.x - a.x, b.y - a.y) || 1, ang: Math.atan2(b.y - a.y, b.x - a.x), s: c.s, r: c.r }; }
    e.preventDefault();
  });
  ed.addEventListener('pointermove', e => {
    if (!ptr.has(e.pointerId) || !drag || !sel) return;
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const ps = [...ptr.values()];
    if (drag.mode === 1 && ps.length === 1) change(sel, c => { c.x = Math.round(drag.x + e.clientX - drag.sx); c.y = Math.round(drag.y + e.clientY - drag.sy); });
    else if (drag.mode === 2 && ps.length >= 2) {
      const [a, b] = ps, d = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      change(sel, c => { c.s = drag.s * d / drag.d; c.r = drag.r + (ang - drag.ang) * 180 / Math.PI; });
    }
  });
  const up = e => { ptr.delete(e.pointerId); if (ptr.size === 1 && sel) { const [q] = ptr.values(), c = get(sel); drag = { mode: 1, sx: q.x, sy: q.y, x: c.x, y: c.y }; } else if (!ptr.size) drag = null; };
  ed.addEventListener('pointerup', up); ed.addEventListener('pointercancel', up);
  addEventListener('keydown', e => { if (editing) { if (e.key === 'Escape') cerrar(); e.stopImmediatePropagation(); } }, true);

  function abrir() {
    if (!G || !G.me) return;
    editing = true; sel = null;
    $('pause').classList.add('hidden');
    ed.innerHTML = `<div class="he-top"><span>✏️ Toca una pieza y arrástrala · con dos dedos: tamaño y giro</span>
      <button data-k="todo" class="gr">Restablecer todo</button><button data-k="listo" class="ok">Listo</button></div><div class="he-bar" style="display:none"></div>`;
    boxes = {};
    for (const p of all()) {
      const b = document.createElement('div');
      b.className = 'he-box'; b.dataset.id = p.id; b.innerHTML = '<span></span>';
      ed.insertBefore(b, ed.firstChild);
      boxes[p.id] = b;
    }
    ed.classList.remove('hidden');
    applyDom(); bar();
    cancelAnimationFrame(raf); frame();
  }
  function cerrar() {
    editing = false; ed.classList.add('hidden'); cancelAnimationFrame(raf);
    applyDom();
    if (G && G.mode === 'pause') $('pause').classList.remove('hidden');
  }
  window.EditorHUD = { abrir, cerrar, get cfg() { return cfg; }, rects: () => PIEZAS.map(p => [p.id, rectOf(p)]) };

  try {
    const host = document.querySelector('.pause-opts');
    if (host) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn small'; b.id = 'btnHudEd'; b.textContent = '✏️ Editar HUD';
      b.addEventListener('click', abrir);
      host.appendChild(b);
    }
  } catch (e) { /* sin botón */ }
})();
