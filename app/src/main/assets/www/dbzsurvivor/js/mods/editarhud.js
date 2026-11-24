// ─── Editor del HUD: mover, cambiar tamaño, girar, transparentar u ocultar cada pieza ───
// Se abre desde la pausa (✏️ Editar HUD). Cada pieza se arrastra con el dedo o el mouse; con dos dedos se
// agranda/achica y se gira; abajo hay botones para tamaño, giro, transparencia, ocultar y reiniciar.
// Guardado en localStorage 'fusion.hud': { pieza: { x, y, s, r, a, h } } (desplazamiento en px, escala, grados,
// opacidad, oculta).
// Cómo funciona con el lienzo: drawHUD (game.js) marca cada parte con hudPieza(id)/hudPiezaFin(id) y aquí cada
// pieza cambiada se dibuja con su posición, escala, giro y opacidad. Los rectángulos (mismas cuentas que el juego)
// solo sirven para el centro de giro y para tocarlas en el editor. Los botones (¡KI!, pausa, mapa, música, sonido,
// auto-aprender) son HTML: se mueven con CSS.
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
      const s = W < 640 ? 26 : 30, n = Math.max(MAX_ATTACKS, maxPassives(G.me) + Object.keys(PASSIVES).filter(k => G.me.passives[k] > 0 && passiveFree(k)).length);
      return [5, 93, 6 + n * (s + 3), Math.max(s + 6, loadEnd - 91)];
    } },
    { id: 'equipo', name: 'Compañeros', r: () => [6, loadEnd + 4, 164, Math.max(1, G.players.filter(q => q !== G.me && !q.gone && !q.ally).length) * 34] },
    { id: 'reloj', name: 'Reloj', r: () => { const L = hudLayout(); return L.narrow ? [L.statsX - 3, L.statsY - 3, 144, G.speed > 1 ? 58 : 42] : [W / 2 - 62, 12, 124, 42]; } },
    { id: 'bajas', name: 'Bajas', r: () => { const L = hudLayout(); return L.narrow ? null : [L.killsX - 3, L.killsY - 3, 106, 44]; } },
    { id: 'ki', name: 'Barra de Ki', r: kiRect },
    { id: 'cinturon', name: 'Cinturón de objetos', r: () => (window.cinturonRect ? cinturonRect() : null) },
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
  const BOTONES = [
    { id: 'btnTransform', name: 'Botón ¡KI!' }, { id: 'btnPause', name: 'Pausa', noHide: true }, { id: 'btnMap', name: 'Botón del mapa' },
    { id: 'btnMusic', name: 'Música' }, { id: 'btnSfx', name: 'Sonido' }, { id: 'btnAuto', name: 'Auto-aprender' },
  ];
  const rectOf = p => { try { return p.r(); } catch (e) { return null; } };
  const byIdP = id => PIEZAS.find(p => p.id === id);

  // ─── Dibujar cada pieza en su lugar ───
  // drawHUD (game.js) marca cada parte con hudPieza(id) … hudPiezaFin(id). Aquí cada pieza cambiada se dibuja
  // con su propio desplazamiento, tamaño, giro y opacidad alrededor del centro de su rectángulo: cada una por
  // separado, así nunca arrastra pedazos de otra aunque sus rectángulos se encimen.
  const pila = [];
  // Opacidad de la pieza: el HUD del juego a veces pone ctx.globalAlpha = 1 (retrato, minimapa…). Mientras se
  // dibuja una pieza con opacidad propia, todo lo que se asigne a globalAlpha se multiplica por la de la pieza
  // (y una pieza oculta queda en 0), así nada se "escapa" de la transparencia.
  let mul = 1;
  const GA = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'globalAlpha');
  if (GA && GA.set) {
    Object.defineProperty(ctx, 'globalAlpha', {
      configurable: true,
      get() { const v = GA.get.call(this); return mul ? Math.min(1, v / mul) : 0; },
      set(v) { GA.set.call(this, v * mul); },
    });
  }
  hudPieza = function (id) {   // eslint-disable-line no-global-assign
    const on = G && G.me && custom(id);
    ctx.save();
    pila.push({ id, on, slots: on ? new Set(hudSlots) : null });
    if (!on) return;
    const c = get(id), r = rectOf(byIdP(id));
    const top = pila[pila.length - 1];
    top.mul = mul;
    if (c.h) { mul = 0; GA.set.call(ctx, 0); }   // oculta: se dibuja invisible (las casillas siguen calculándose)
    else { const a = GA.get.call(ctx); mul *= c.a; GA.set.call(ctx, a * c.a); }
    if (!r) { ctx.translate(c.x, c.y); return; }
    const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
    ctx.translate(cx + c.x, cy + c.y); ctx.rotate(c.r * Math.PI / 180); ctx.scale(c.s, c.s); ctx.translate(-cx, -cy);
    pila[pila.length - 1].centro = [cx, cy];
  };
  hudPiezaFin = function (id) {   // eslint-disable-line no-global-assign
    const top = pila.pop();
    ctx.restore();
    if (top && top.mul != null) mul = top.mul;
    if (!top || !top.on || !top.centro) return;
    // Las casillas (para ver qué hace cada técnica) siguen a la pieza
    const c = get(id), [cx, cy] = top.centro;
    for (const sl of hudSlots) if (!top.slots.has(sl)) {
      sl.x = cx + c.x + (sl.x - cx) * c.s; sl.y = cy + c.y + (sl.y - cy) * c.s; sl.s *= c.s; if (sl.w) sl.w *= c.s;
    }
  };
  const hd = drawHUD;
  drawHUD = function () {   // eslint-disable-line no-global-assign
    pila.length = 0;
    try { return hd.apply(this, arguments); } finally {
      while (pila.length) { pila.pop(); ctx.restore(); }   // por si una parte se cortó a la mitad
      mul = 1;
    }
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
  // Un solo cartel (instrucciones + controles de la pieza elegida) que se arrastra desde su barra ⠿, se puede
  // achicar y se coloca solo en el lado contrario a la pieza elegida para no taparla.
  const st = document.createElement('style');
  st.textContent = `#hudEd { position: fixed; inset: 0; z-index: 70; touch-action: none; user-select: none; -webkit-user-select: none; }
    #hudEd.hidden { display: none; }
    #hudEd .he-box { position: absolute; border: 2px dashed #ffd93b; background: rgba(255,217,59,0.08); border-radius: 6px; }
    #hudEd .he-box.ghost { border: 2px dotted rgba(255,255,255,0.55); background: rgba(255,255,255,0.04); }
    #hudEd .he-box.sel { border: 3px solid #7dff6a; background: rgba(125,255,106,0.14); }
    #hudEd .he-box.off { border-color: #ff6a6a; background: rgba(255,80,80,0.12); }
    #hudEd .he-box span { display: none; position: absolute; left: 0; top: -20px; padding: 1px 5px; border-radius: 4px; background: rgba(10,15,46,0.85);
      font: 700 11px sans-serif; color: #fff; white-space: nowrap; pointer-events: none; }
    #hudEd .he-box.sel span { display: block; }
    #hudEd .he-box.below span { top: auto; bottom: -20px; }
    #hudEd .he-pan { position: absolute; width: min(340px, 94vw); background: rgba(10,15,46,0.94); border: 2px solid #ffd93b; border-radius: 10px;
      color: #fff; font: 700 13px sans-serif; box-shadow: 0 4px 14px rgba(0,0,0,0.5); z-index: 10000; }
    #hudEd .he-grip { display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: #ffd93b; color: #0a0f2e; border-radius: 7px 7px 0 0; cursor: move; touch-action: none; }
    #hudEd .he-grip b { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
    #hudEd .he-grip button { padding: 2px 9px; min-width: 30px; }
    #hudEd .he-body { display: flex; flex-wrap: wrap; gap: 5px 10px; justify-content: center; align-items: center; padding: 6px 8px 8px; }
    #hudEd .he-pan.min .he-body { display: none; }
    #hudEd .he-pan.min .he-grip { border-radius: 7px; }
    #hudEd .he-row { display: flex; gap: 4px; align-items: center; }
    #hudEd .he-row span { font-size: 12px; margin-right: 2px; }
    #hudEd .he-tip { width: 100%; text-align: center; font-size: 12px; line-height: 1.35; color: #dfe3ff; }
    #hudEd button { font: 700 13px sans-serif; padding: 6px 9px; border-radius: 7px; border: 2px solid #0a0f2e; background: #ffd93b; color: #0a0f2e; min-width: 34px; }
    #hudEd button.gr { background: #8a93c8; } #hudEd button.ok { background: #7dff6a; }`;
  document.head.appendChild(st);
  const ed = document.createElement('div');
  ed.id = 'hudEd'; ed.className = 'hidden';
  document.body.appendChild(ed);
  let sel = null, boxes = {}, raf = 0;
  const all = () => [...PIEZAS.map(p => ({ ...p, kind: 'cv' })), ...BOTONES.map(b => ({ ...b, kind: 'dom' }))];
  const byId = id => all().find(p => p.id === id);

  // ¿La pieza se ve ahora mismo? (sin jefe no hay barra de jefes, sin compañeros no hay lista, sin anuncio no hay anuncio)
  const presente = id => {
    try {
      if (id === 'jefe') return G.enemies.some(e => e.boss);
      if (id === 'equipo') return G.players.some(q => q !== G.me && !q.gone && !q.ally);
      if (id === 'avisos') return !!G.banner;
    } catch (e) { /* nada */ }
    return true;
  };

  function baseRect(p) {
    if (p.kind === 'cv') return rectOf(p);
    const el = document.getElementById(p.id);
    if (!el || !el.offsetWidth) return null;
    const b = el.getBoundingClientRect(), c = get(p.id);   // sin el desplazamiento propio
    const w = el.offsetWidth, h = el.offsetHeight, cx = b.left + b.width / 2 - c.x, cy = b.top + b.height / 2 - c.y;
    return [cx - w / 2, cy - h / 2, w, h];
  }
  // Rectángulo en pantalla tal como se ve (con desplazamiento y tamaño)
  function shownRect(id) {
    const p = byId(id), r = p && baseRect(p);
    if (!r) return null;
    const c = get(id), w = r[2] * c.s, h = r[3] * c.s, cx = r[0] + r[2] / 2 + c.x, cy = r[1] + r[3] / 2 + c.y;
    return [cx - w / 2, cy - h / 2, w, h];
  }
  function frame() {
    if (!editing) return;
    for (const p of all()) {
      const el = boxes[p.id];
      if (!el) continue;
      const r = shownRect(p.id);
      if (!r) { el.style.display = 'none'; continue; }
      const c = get(p.id);
      Object.assign(el.style, { display: '', left: `${r[0]}px`, top: `${r[1]}px`, width: `${r[2]}px`, height: `${r[3]}px`, transform: `rotate(${c.r}deg)`,
        zIndex: String(sel === p.id ? 9999 : Math.max(1, 5000 - Math.round(Math.sqrt(r[2] * r[3])))) });   // las chicas encima de las grandes
      el.classList.toggle('sel', sel === p.id); el.classList.toggle('off', !!c.h);
      el.classList.toggle('ghost', !presente(p.id) && sel !== p.id);
      el.classList.toggle('below', r[1] < 24);
      el.querySelector('span').textContent = p.name + (c.h ? ' (oculto)' : '') + (presente(p.id) ? '' : ' (aparece en partida)');
    }
    raf = requestAnimationFrame(frame);
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Que ninguna pieza se pierda fuera de la pantalla: siempre quedan al menos 40 px a la vista
  function keepOnScreen(id, c) {
    const p = byId(id), r = p && baseRect(p);
    if (!r) return;
    const w = r[2] * c.s, h = r[3] * c.s, cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2, m = 40;
    c.x = Math.round(clamp(c.x, m - w / 2 - cx, innerWidth - m + w / 2 - cx));
    c.y = Math.round(clamp(c.y, m - h / 2 - cy, innerHeight - m + h / 2 - cy));
  }
  function change(id, fn) {
    const c = get(id); fn(c);
    c.s = clamp(Math.round(c.s * 100) / 100, 0.4, 3); c.a = clamp(Math.round(c.a * 100) / 100, 0.15, 1); c.r = ((Math.round(c.r) % 360) + 360) % 360;
    if (c.r > 180) c.r -= 360;
    keepOnScreen(id, c);
    cfg[id] = c; save(); applyDom(); pintar();
  }

  // ─── El cartel ───
  let pan = null, panPos = null, panMin = false;   // panPos: lo dejó el jugador a mano (no se recoloca solo)
  const PANKEY = 'fusion.hud.cartel';
  try { const v = JSON.parse(localStorage.getItem(PANKEY)); if (v) { panPos = v.pos || null; panMin = !!v.min; } } catch (e) { /* nada */ }
  const savePan = () => { try { localStorage.setItem(PANKEY, JSON.stringify({ pos: panPos, min: panMin })); } catch (e) { /* nada */ } };

  function pintar() {
    if (!pan) return;
    const head = pan.querySelector('.he-grip b'), body = pan.querySelector('.he-body');
    pan.classList.toggle('min', panMin);
    pan.querySelector('[data-k=min]').textContent = panMin ? '▢' : '–';
    if (!sel) {
      head.textContent = '⠿ Editar HUD';
      body.innerHTML = `<div class="he-tip">Toca una pieza y arrástrala. Con dos dedos: tamaño y giro.<br>Este cartel se mueve arrastrando la barra amarilla.</div>
        <button data-k="todo" class="gr">Restablecer todo</button><button data-k="listo" class="ok">Listo</button>`;
    } else {
      const p = byId(sel), c = get(sel);
      head.textContent = `⠿ ${p.name}`;
      body.innerHTML = `<div class="he-tip">${Math.round(c.s * 100)}% · ${c.r}° · opacidad ${Math.round(c.a * 100)}%${presente(sel) ? '' : '<br>(ahora no se ve: aparece durante la partida)'}</div>
        <div class="he-row"><span>Tamaño</span><button data-k="s-">−</button><button data-k="s+">+</button></div>
        <div class="he-row"><span>Girar</span><button data-k="r-">⟲</button><button data-k="r+">⟳</button></div>
        <div class="he-row"><span>Opacidad</span><button data-k="a-">−</button><button data-k="a+">+</button></div>
        <div class="he-row">${p.noHide ? '' : `<button data-k="h" class="gr">${c.h ? 'Mostrar' : 'Ocultar'}</button>`}<button data-k="z" class="gr">Reiniciar</button><button data-k="x" class="ok">✓</button></div>`;
    }
    colocar();
  }
  // Sin posición elegida a mano: arriba o abajo, en el lado contrario a la pieza elegida
  function colocar() {
    if (!pan) return;
    const pw = pan.offsetWidth, ph = pan.offsetHeight;
    let x, y;
    if (panPos) { x = panPos.x; y = panPos.y; }
    else {
      x = (innerWidth - pw) / 2;
      const r = sel && shownRect(sel);
      const arriba = r ? r[1] + r[3] / 2 > innerHeight / 2 : false;
      y = arriba ? 8 : innerHeight - ph - 8;
      if (!r) y = Math.round(innerHeight * 0.42 - ph / 2);   // nada elegido: en medio de la pantalla (donde no hay HUD)
    }
    x = clamp(x, 4 - pw + 80, innerWidth - 80); y = clamp(y, 4, innerHeight - 36);
    pan.style.left = `${x}px`; pan.style.top = `${y}px`;
  }

  ed.addEventListener('click', e => {
    const k = e.target.dataset && e.target.dataset.k;
    if (!k) return;
    if (k === 'min') { panMin = !panMin; savePan(); pintar(); return; }
    if (k === 'listo') return cerrar();
    if (k === 'todo') { if (confirmar()) { cfg = {}; save(); applyDom(); sel = null; pintar(); } return; }
    if (k === 'x') { sel = null; pintar(); return; }
    if (!sel) return;
    if (k === 'z') { delete cfg[sel]; save(); applyDom(); pintar(); return; }
    change(sel, c => {
      if (k === 's-') c.s -= 0.1; if (k === 's+') c.s += 0.1;
      if (k === 'r-') c.r -= 15; if (k === 'r+') c.r += 15;
      if (k === 'a-') c.a -= 0.1; if (k === 'a+') c.a += 0.1;
      if (k === 'h') c.h = !c.h;
    });
  });
  let pide = 0;
  const confirmar = () => { const now = Date.now(); if (now - pide < 2500) return true; pide = now; const b = ed.querySelector('[data-k=todo]'); if (b) { b.textContent = '¿Seguro? Toca otra vez'; setTimeout(() => { b.textContent = 'Restablecer todo'; }, 2500); } return false; };

  // Qué pieza se toca: de las que hay bajo el dedo, la elegida (para seguir arrastrándola) o la más chica
  // (así una pieza grande o una que ahora no se ve no tapa a las de debajo)
  function piezaEn(x, y) {
    const hits = [];
    for (const p of all()) {
      const r = shownRect(p.id);
      if (!r || boxes[p.id].style.display === 'none') continue;
      const pad = 6;
      if (x >= r[0] - pad && x <= r[0] + r[2] + pad && y >= r[1] - pad && y <= r[1] + r[3] + pad) hits.push([p.id, r[2] * r[3] * (presente(p.id) ? 1 : 50)]);
    }
    if (!hits.length) return null;
    if (sel && hits.some(h => h[0] === sel)) return sel;
    hits.sort((a, b) => a[1] - b[1]);
    return hits[0][0];
  }

  // Arrastrar con un dedo; con dos, tamaño y giro. El cartel se arrastra desde su barra.
  const ptr = new Map();
  let drag = null, panDrag = null;
  ed.addEventListener('pointerdown', e => {
    if (e.target.closest && e.target.closest('.he-grip') && !(e.target.dataset && e.target.dataset.k)) {
      const r = pan.getBoundingClientRect();
      panDrag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top };
      try { ed.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
      e.preventDefault(); return;
    }
    if (e.target.closest && e.target.closest('.he-pan')) return;   // botones del cartel
    if (ptr.size === 0) {
      const id = piezaEn(e.clientX, e.clientY);
      if (!id) return;   // en el vacío
      if (id !== sel) { sel = id; pintar(); }
    }
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { ed.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
    if (!sel) return;
    const c = get(sel), ps = [...ptr.values()];
    if (ps.length === 1) drag = { mode: 1, sx: e.clientX, sy: e.clientY, x: c.x, y: c.y };
    else { const [a, b] = ps; drag = { mode: 2, d: Math.hypot(b.x - a.x, b.y - a.y) || 1, ang: Math.atan2(b.y - a.y, b.x - a.x), s: c.s, r: c.r }; }
    e.preventDefault();
  });
  ed.addEventListener('pointermove', e => {
    if (panDrag && e.pointerId === panDrag.id) {
      panPos = { x: Math.round(e.clientX - panDrag.dx), y: Math.round(e.clientY - panDrag.dy) };
      colocar(); return;
    }
    if (!ptr.has(e.pointerId) || !drag || !sel) return;
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const ps = [...ptr.values()];
    if (drag.mode === 1 && ps.length === 1) change(sel, c => { c.x = Math.round(drag.x + e.clientX - drag.sx); c.y = Math.round(drag.y + e.clientY - drag.sy); });
    else if (drag.mode === 2 && ps.length >= 2) {
      const [a, b] = ps, d = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      change(sel, c => { c.s = drag.s * d / drag.d; c.r = drag.r + (ang - drag.ang) * 180 / Math.PI; });
    }
  });
  const up = e => {
    if (panDrag && e.pointerId === panDrag.id) { panDrag = null; savePan(); return; }
    ptr.delete(e.pointerId);
    if (ptr.size === 1 && sel) { const [q] = ptr.values(), c = get(sel); drag = { mode: 1, sx: q.x, sy: q.y, x: c.x, y: c.y }; } else if (!ptr.size) { drag = null; colocar(); }
  };
  ed.addEventListener('pointerup', up); ed.addEventListener('pointercancel', up);
  addEventListener('keydown', e => { if (editing) { if (e.key === 'Escape') cerrar(); e.stopImmediatePropagation(); } }, true);
  addEventListener('resize', () => { if (editing) colocar(); });

  function abrir() {
    if (!G || !G.me) return;
    editing = true; sel = null;
    $('pause').classList.add('hidden');
    ed.innerHTML = `<div class="he-pan"><div class="he-grip"><b></b><button data-k="min" class="gr">–</button></div><div class="he-body"></div></div>`;
    pan = ed.querySelector('.he-pan');
    boxes = {};
    for (const p of all()) {
      const b = document.createElement('div');
      b.className = 'he-box'; b.dataset.id = p.id; b.innerHTML = '<span></span>';
      ed.insertBefore(b, pan);
      boxes[p.id] = b;
    }
    ed.classList.remove('hidden');
    applyDom(); pintar();
    cancelAnimationFrame(raf); frame();
  }
  function cerrar() {
    editing = false; ed.classList.add('hidden'); cancelAnimationFrame(raf);
    applyDom();
    if (G && G.mode === 'pause') $('pause').classList.remove('hidden');
  }
  window.EditorHUD = { abrir, cerrar, get cfg() { return cfg; }, get sel() { return sel; }, rects: () => PIEZAS.map(p => [p.id, rectOf(p)]) };

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
