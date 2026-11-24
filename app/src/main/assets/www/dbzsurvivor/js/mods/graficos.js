'use strict';
// ─── Fusión: ajustes gráficos (límite de FPS, 90/120 Hz, resolución, efectos y modo batería) ───
// Se carga después de js/game.js. No cambia cómo se dibuja el juego: el bucle de la base ya usa el tiempo real
// entre cuadros, así que a 30, 60, 90 o 120 fps todo va a la misma velocidad. Acá solo se decide:
//   · cuántos cuadros se dibujan (se saltan los que sobran del límite)
//   · a qué frecuencia trabaja la pantalla del teléfono (puente FusionNative de la APK; en el navegador no hay)
//   · la resolución del lienzo (devicePixelRatio que lee resize()), cuántas partículas, temblor y números de daño
(() => {
  const KEY = 'fusion.gfx';
  // En la computadora (sin puente de la APK y con mouse) no hay batería que cuidar: por defecto, los Hz del monitor
  const PC = typeof window.FusionNative === 'undefined' && !(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const DEF = { cap: PC ? 0 : 60, res: 'alta', fx: 'todos', shake: true, dmgNums: true, fpsShow: false, battery: 'auto' };
  let S = { ...DEF };
  try { S = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* sin almacenamiento */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } };
  const NATIVE = typeof window.FusionNative !== 'undefined' ? window.FusionNative : null;

  // ── Batería: el modo automático se enciende con 20 % o menos y sin cargador ──
  const BAT = { level: null, charging: null };
  async function readBattery() {
    try {
      if (NATIVE && NATIVE.battery) {
        const [l, c] = String(NATIVE.battery()).split(',');
        if (l !== '') { BAT.level = +l; BAT.charging = c === '1'; }
      } else if (navigator.getBattery) {
        const b = await navigator.getBattery();
        BAT.level = Math.round(b.level * 100); BAT.charging = b.charging;
      }
    } catch (e) { /* sin datos de batería */ }
  }
  const saving = () => S.battery === 'on' || (S.battery === 'auto' && BAT.level !== null && BAT.level <= 20 && !BAT.charging);

  // Lo que se aplica de verdad (el modo batería manda sobre lo elegido, sin borrarlo)
  function eff() {
    if (!saving()) return { ...S };
    return { ...S, cap: S.cap && S.cap < 30 ? S.cap : 30, res: 'baja', fx: S.fx === 'minimos' ? 'minimos' : 'reducidos' };
  }
  let E = eff();

  // ── Frecuencia de la pantalla (solo en la APK) ──
  let rates = [];
  try { rates = NATIVE && NATIVE.refreshRates ? String(NATIVE.refreshRates()).split(',').filter(Boolean).map(Number) : []; } catch (e) { rates = []; }
  const maxRate = () => (rates.length ? Math.max(...rates) : 0);
  let lastHz = -1;
  function applyHz() {
    if (!NATIVE || !NATIVE.setRefreshRate) return;
    const hz = saving() ? 60 : E.cap === 0 ? 0 : E.cap <= 60 ? 60 : E.cap;   // 0 = la más alta de la pantalla
    if (hz === lastHz) return;
    lastHz = hz;
    try { NATIVE.setRefreshRate(hz); } catch (e) { /* sin puente */ }
  }

  // ── Resolución: resize() de la base lee devicePixelRatio (con tope 2) ──
  const dprDesc = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio') || Object.getOwnPropertyDescriptor(Window.prototype, 'devicePixelRatio');
  const realDpr = () => (dprDesc && dprDesc.get ? dprDesc.get.call(window) : 1) || 1;
  try {
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      get: () => { const r = realDpr(); return E.res === 'baja' ? Math.min(r, 1) : E.res === 'media' ? Math.min(r, 1.5) : r; },
    });
  } catch (e) { /* el navegador no deja: queda la nativa */ }

  function applyAll() {
    const before = E.res;
    E = eff();
    applyHz();
    if (E.res !== before) resize();
    fpsBox.style.display = E.fpsShow ? 'block' : 'none';
  }

  // ── Límite de cuadros: el bucle de la base, con salto de los cuadros que sobran ──
  // Ritmo: se acumula el tiempo y se dibuja cuando toca, con media vuelta de pantalla de margen. Antes se medía
  // desde el último cuadro dibujado y en monitores de 75/100/144 Hz el tope de 60 daba 37/50 FPS desparejos
  let lastT = 0, acc = 0, rafDt = 16.7, frames = 0, fpsT = 0;
  frame = function (now) {   // eslint-disable-line no-global-assign
    requestAnimationFrame(frame);   // primero, como en la base: un error no detiene el bucle
    const d = lastT ? now - lastT : 0;
    lastT = now;
    if (d > 0 && d < 100) rafDt += (d - rafDt) * 0.1;
    if (E.cap) {
      const iv = 1000 / E.cap;
      acc += d;
      if (d && acc < iv - rafDt / 2) return;
      acc = Math.min(acc - iv, iv);
      if (acc < -iv) acc = 0;
    }
    frames++;
    if (now - fpsT >= 500) { fpsBox.textContent = `${Math.round(frames * 1000 / (now - fpsT))} FPS`; frames = 0; fpsT = now; }
    lastRaf = performance.now();
    step(lastRaf, canvas.width > 0 && canvas.height > 0);
  };

  // ── Efectos: partículas, temblor de cámara y números de daño ──
  const fxMul = () => (E.fx === 'minimos' ? 0.25 : E.fx === 'reducidos' ? 0.5 : 1);
  const origBurst = burst;
  burst = function (x, y, color, n = 8, speed = 3, size = 3) {   // eslint-disable-line no-global-assign
    return origBurst.call(this, x, y, color, Math.max(1, Math.round(n * fxMul())), speed, size);
  };
  const origText = addText;
  addText = function (x, y, text) {   // eslint-disable-line no-global-assign
    if (!E.dmgNums && /^\d+!?$/.test(String(text))) return;   // solo los números de daño; los avisos siguen
    return origText.apply(this, arguments);
  };
  let shakeG = null;
  setInterval(() => {   // cada partida nueva: el temblor pasa por el ajuste
    if (typeof G === 'undefined' || !G || G === shakeG) return;
    shakeG = G;
    let v = G.shake || 0;
    try { Object.defineProperty(G, 'shake', { configurable: true, get: () => (E.shake ? v : 0), set: x => { v = x; } }); } catch (e) { /* sigue normal */ }
  }, 250);

  // ── Contador de FPS ──
  const fpsBox = document.createElement('div');
  fpsBox.id = 'fpsBox';
  fpsBox.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:9999;pointer-events:none;font:600 12px/1 sans-serif;color:#9dff5c;background:rgba(0,0,0,.55);padding:3px 6px;border-radius:4px;display:none';
  document.body.appendChild(fpsBox);

  // ── Ventana de Gráficos ──
  const OPTS = {
    cap: [[30, '30'], [60, '60'], [90, '90'], [120, '120'], [0, 'Sin límite']],
    res: [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']],
    fx: [['todos', 'Todos'], ['reducidos', 'Reducidos'], ['minimos', 'Mínimos']],
    battery: [['off', 'Apagado'], ['on', 'Encendido'], ['auto', 'Automático']],
    shake: [[true, 'Sí'], [false, 'No']], dmgNums: [[true, 'Sí'], [false, 'No']], fpsShow: [[true, 'Sí'], [false, 'No']],
  };
  const ROWS = [
    ['cap', '🎞️ Límite de FPS', 'Más FPS se ve más fluido pero gasta más batería. A 90/120 el teléfono pone la pantalla a esa frecuencia si la admite.'],
    ['res', '🖼️ Resolución', 'Baja dibuja menos píxeles: el arte se ve igual de pixelado, solo los textos quedan menos nítidos.'],
    ['fx', '✨ Partículas', 'Chispas y explosiones de las técnicas.'],
    ['shake', '📳 Temblor de cámara', 'Al recibir golpes, transformarte o al caer un jefe.'],
    ['dmgNums', '🔢 Números de daño', 'Los avisos (esquivado, logros…) se siguen viendo.'],
    ['fpsShow', '📈 Mostrar FPS', 'Un contador abajo a la izquierda.'],
    ['battery', '🔋 Modo batería', 'Encendido: 30 FPS, pantalla a 60 Hz, resolución baja y partículas reducidas. Automático: se enciende solo con 20 % de batería o menos y sin cargador.'],
  ];
  const scr = document.createElement('div');
  scr.id = 'gfx';
  scr.className = 'screen overlay hidden';
  scr.innerHTML = '<div class="box help-box gfx-box"><h2>Gráficos</h2><div id="gfxContent" class="help-content"></div><button id="btnGfxBack" class="btn ghost">Volver</button></div>';
  document.body.appendChild(scr);

  function render() {
    const hz = NATIVE && NATIVE.currentRefreshRate ? Math.round(NATIVE.currentRefreshRate()) : null;
    const scrInfo = rates.length ? `Pantalla: ${[...new Set(rates)].sort((a, b) => a - b).join(' / ')} Hz · ahora a ${hz} Hz`
      : 'En el navegador la frecuencia la decide la pantalla; en la APK se ajusta sola.';
    const bat = BAT.level !== null ? ` · Batería: ${BAT.level} %${BAT.charging ? ' (cargando)' : ''}` : '';
    const on = saving() ? '<p class="gfx-on">🔋 Modo batería activo: 30 FPS, resolución baja y partículas reducidas.</p>' : '';
    $('gfxContent').innerHTML = `<p class="hint">${scrInfo}${bat}</p>${on}` + ROWS.map(([k, label, help]) =>
      `<div class="gfx-row"><div class="gfx-lbl"><b>${label}</b><small>${help}</small></div><div class="gfx-seg">${
        OPTS[k].map(([v, t]) => `<button type="button" class="gfx-opt${S[k] === v ? ' on' : ''}" data-k="${k}" data-v='${JSON.stringify(v)}'>${t}</button>`).join('')
      }</div></div>`).join('');
    for (const b of $('gfxContent').querySelectorAll('.gfx-opt')) b.onclick = () => {
      S[b.dataset.k] = JSON.parse(b.dataset.v);
      save(); applyAll(); render();
      if (typeof SFX !== 'undefined' && SFX.unlock) SFX.unlock();
    };
  }
  let from = null;
  function open(src) {
    from = src;
    readBattery().then(() => { applyAll(); render(); });
    render();
    if (from === 'menu') $('menu').classList.add('hidden');
    scr.classList.remove('hidden'); scr.scrollTop = 0;
  }
  $('btnGfxBack').onclick = () => { scr.classList.add('hidden'); if (from === 'menu') $('menu').classList.remove('hidden'); };

  // Botón en el menú principal (junto a Misiones o Logros) y en la pausa (debajo del zoom)
  const mb = document.createElement('button');
  mb.id = 'btnGfx'; mb.className = 'btn ghost'; mb.textContent = 'Gráficos';
  ($('btnDaily') || $('btnAchs')).after(mb);
  mb.onclick = () => open('menu');
  const pb = document.createElement('button');
  pb.id = 'btnGfxPause'; pb.className = 'btn small ghost'; pb.textContent = '⚙️ Gráficos';
  const zoomRow = $('optZoom') && $('optZoom').closest('label');
  if (zoomRow) zoomRow.after(pb);
  pb.onclick = () => open('pause');

  const css = document.createElement('style');
  css.textContent = `#gfx{z-index:60;overflow-y:auto;justify-content:flex-start;padding-top:3vh}.gfx-box{max-width:760px}
    .gfx-row{display:flex;align-items:center;gap:12px;padding:9px 2px;border-bottom:1px solid rgba(255,255,255,.12)}
    .gfx-lbl{flex:1;text-align:left}.gfx-lbl b{display:block}.gfx-lbl small{opacity:.7;font-size:12px}
    .gfx-seg{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;max-width:58%}
    .gfx-opt{font:inherit;font-size:13px;padding:6px 10px;border-radius:8px;border:2px solid rgba(255,255,255,.25);background:rgba(10,15,46,.6);color:#fff;cursor:pointer}
    .gfx-opt.on{border-color:var(--gold,#ffd93b);color:var(--gold,#ffd93b)}
    .gfx-on{color:#9dff5c;font-weight:600}#btnGfxPause{margin-top:6px}`;
  document.head.appendChild(css);

  // Arranque: batería cada minuto (el automático se prende y se apaga solo)
  readBattery().then(applyAll);
  setInterval(() => readBattery().then(applyAll), 60000);
  applyAll();
  window.fusionGfxState = () => ({ S: { ...S }, E: { ...E }, rates, battery: { ...BAT }, saving: saving(), dpr: window.devicePixelRatio });
})();
