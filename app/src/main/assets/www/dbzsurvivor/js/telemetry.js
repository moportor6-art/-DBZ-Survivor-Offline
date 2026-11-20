'use strict';
// ─── Telemetría anónima, cartel del menú y reportes (api/telemetry.js) ──────────────
// · Cada 5 minutos, con la pestaña a la vista, avisa que hay alguien jugando (en el menú, en partida u online).
// · Al terminar una partida suma sus datos a las estadísticas del backoffice (y los minutos jugados desde la anterior).
// · Para contar cuánta gente distinta juega: un número al azar de este navegador y el nombre elegido en el juego
//   (el servidor guarda solo una huella de la IP, nunca la IP; solo los reportes guardan la IP, para el backoffice).
// · Muestra el cartel del menú que se escribe en el backoffice.
// · "Reportar un problema": un texto corto que llega al backoffice.
// En el modo prueba no se manda nada.
const Telemetry = (() => {
  const API = '/api/telemetry', EVERY = 5 * 60 * 1000;   // (2.34.2: era cada 2 minutos; Upstash gratis da 500 mil comandos por mes)
  let sid = '';
  try { sid = sessionStorage.getItem('dbz-sid') || ''; } catch (e) { /* sin almacenamiento */ }
  if (!/^[a-z0-9]{8,24}$/.test(sid)) {
    sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    try { sessionStorage.setItem('dbz-sid', sid); } catch (e) { /* sin almacenamiento */ }
  }
  // Identificador anónimo de este navegador (16/10/2026): un número al azar que se guarda una vez, para que el backoffice
  // sepa cuánta gente distinta juega. No dice quién es nadie (no lo borra el reinicio general del progreso).
  let pid = '';
  try { pid = localStorage.getItem('dbz-pid') || ''; } catch (e) { /* sin almacenamiento */ }
  if (!/^[a-z0-9]{12,32}$/.test(pid)) {
    pid = (Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, 24);
    try { localStorage.setItem('dbz-pid', pid); } catch (e) { /* sin almacenamiento */ }
  }
  // Dispositivo (celular o compu) e idioma, para el backoffice (2.28.1)
  const device = () => matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop';
  const post = body => fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true });
  const state = () => !G ? 'menu' : G.net ? 'online' : 'play';

  // Minutos con el juego a la vista (2.34.2): se mandan con cada partida terminada en vez de en un aviso aparte cada 10 minutos
  let visMs = 0, visFrom = document.visibilityState === 'visible' ? performance.now() : 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') visFrom = performance.now();
    else if (visFrom) { visMs += performance.now() - visFrom; visFrom = 0; }
  });
  function takeMinutes() {
    if (visFrom) { const now = performance.now(); visMs += now - visFrom; visFrom = now; }
    const m = Math.floor(visMs / 60000);
    visMs -= m * 60000;
    return m;
  }

  let pingN = 0;
  function ping() {
    if (TEST_MODE || document.visibilityState !== 'visible') return;
    // Una vez por día: el aviso de jugador distinto (con el nombre)
    const day = artDay();   // el día de Argentina, como los contadores del servidor (2.23.5)
    let daily = false;
    try { daily = localStorage.getItem('dbz-pid-day') !== day; if (daily) localStorage.setItem('dbz-pid-day', day); } catch (e) { daily = !pingN; }
    pingN++;
    // (el mando: si se usó en esta sesión o en alguna anterior)
    let pad = typeof PAD_SEEN !== 'undefined' && PAD_SEEN;
    try { if (pad) localStorage.setItem('dbz-pad', '1'); else pad = localStorage.getItem('dbz-pad') === '1'; } catch (e) { /* sin almacenamiento */ }
    post({ type: 'ping', sid, state: state(), pid, ...(daily ? { daily: 1, name: SAVE.name || '', dev: device(), lang: LANG, pad: pad ? 1 : 0 } : {}) }).catch(() => {});
  }
  setInterval(ping, EVERY);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') ping(); });
  setTimeout(ping, 3000);

  // Partida terminada: cada jugador manda la suya
  function run(d) {
    if (TEST_MODE) return;
    post({ type: 'run', ...d, pid, min: takeMinutes() }).catch(() => {});
  }

  // Torneo terminado (2.28.1): hasta qué ronda llegó (0 octavos … 4 campeón), con quién y si lo abandonó
  function tour(d) {
    if (TEST_MODE) return;
    post({ type: 'tour', ...d, pid }).catch(() => {});
  }

  // Cartel del menú
  async function loadMotd() {
    try {
      const r = await fetch(`${API}?type=motd`);
      if (!r.ok) return;
      const { motd, maint, reset, goal } = await r.json();
      if (typeof Support !== 'undefined') Support.setGoal(goal || null);   // meta de donaciones del mes (2.35.0)
      applyReset(reset);
      const text = motd && motd.active ? (LANG === 'en' && motd.en ? motd.en : motd.es) : '';
      $('motd').textContent = text || '';
      $('motd').classList.toggle('hidden', !text);
      showMaintenance(maint && maint.on ? maint : null);
    } catch (e) { /* sin conexión: sin cartel */ }
  }
  // Reinicio general del progreso (backoffice): si la marca del servidor no es la de esta partida guardada, se
  // borra (Zeni, mejoras, logros, desbloqueos, récords y estadísticas) y se avisa. Se conservan el nombre y el idioma.
  // Quien está jugando lo recibe al volver al menú; los jugadores nuevos no ven el aviso (no tenían nada).
  function applyReset(epoch) {
    if (!epoch || TEST_MODE || G || SAVE.resetEpoch === epoch) return;
    const hadProgress = SAVE.runs > 0 || SAVE.zeni > 0 || Object.keys(SAVE.ach || {}).length > 0;
    const name = SAVE.name;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* sin almacenamiento */ }
    const fresh = loadSave();
    for (const k of Object.keys(SAVE)) delete SAVE[k];
    Object.assign(SAVE, fresh, { name, resetEpoch: epoch });
    writeSave();
    buildMenu();
    if (hadProgress) $('resetNotice').classList.remove('hidden');
  }
  $('btnResetOk').onclick = () => $('resetNotice').classList.add('hidden');

  // Mantenimiento: pantalla completa que no deja jugar. Quien está en una partida la termina (se muestra
  // al volver al menú). En el modo prueba se puede jugar igual, con un aviso.
  let maintOn = null;
  function showMaintenance(m) {
    maintOn = m;
    const block = !!m && !TEST_MODE;
    if (m) $('maintText').textContent = (LANG === 'en' && m.en ? m.en : m.es) || t('Estamos haciendo mejoras. Vuelve en un rato.');
    $('maint').classList.toggle('hidden', !block || !!G);
    $('maintTest').classList.toggle('hidden', !(m && TEST_MODE));
  }
  loadMotd();
  setInterval(() => { if (!G) loadMotd(); }, 5 * 60 * 1000);   // revisa cada 5 minutos (en el menú)
  // Al volver al menú después de una partida, si entró en mantenimiento, aparece el cartel
  setInterval(() => { if (!G && maintOn && !TEST_MODE && $('maint').classList.contains('hidden')) $('maint').classList.remove('hidden'); }, 1000);

  // Reportar un problema
  let reportFrom = 'menu';
  function openReport(from) {
    reportFrom = from;
    $('reportText').value = '';
    $('reportMsg').textContent = '';
    $('btnReportSend').disabled = false;
    $('report').classList.remove('hidden');
    setTimeout(() => $('reportText').focus(), 50);
  }
  const closeReport = () => $('report').classList.add('hidden');
  async function sendReport() {
    const text = $('reportText').value.trim();
    if (text.length < 3) { $('reportMsg').textContent = t('Cuéntanos un poco más.'); return; }
    if (TEST_MODE) { $('reportMsg').textContent = t('Modo prueba: el reporte no se envía.'); return; }
    $('btnReportSend').disabled = true;
    $('reportMsg').textContent = t('Enviando...');
    try {
      const r = await post({ type: 'report', text, ver: GAME_VERSION, lang: LANG, where: G ? (G.net ? 'online' : 'partida') : reportFrom, ua: navigator.userAgent,
        pid, name: SAVE.name || '', scr: `${screen.width}x${screen.height}`, ...(G ? { level: G.lv.id, char: G.me.charId, min: Math.floor(G.t / 60) } : {}) });
      if (!r.ok) throw Object.assign(new Error(), { status: r.status });
      $('reportMsg').textContent = t('¡Gracias! Lo vamos a revisar.');
      setTimeout(closeReport, 1400);
    } catch (e) {
      $('btnReportSend').disabled = false;
      $('reportMsg').textContent = t(e.status === 429 ? 'Mandaste varios reportes seguidos; espera unos minutos.' : 'No se pudo enviar. Prueba de nuevo en un rato.');
    }
  }
  $('btnReport').onclick = () => openReport('menu');
  $('btnReportPause').onclick = () => openReport('pausa');
  $('btnReportCancel').onclick = closeReport;
  $('btnReportSend').onclick = sendReport;
  $('reportText').addEventListener('keydown', e => e.stopPropagation());   // que escribir no dispare atajos del juego

  // Partida online terminada o cortada (2.23.2): cómo era la conexión, para entender los cortes
  function net(d) {
    if (TEST_MODE) return;
    post({ type: 'net', ...d, ver: GAME_VERSION, pid }).catch(() => {});
  }
  // Errores del juego (2.28.1): llegan solos al backoffice. Hasta 5 por sesión y cada uno una sola vez
  const sentErr = new Set();
  function reportError(msg, src, stack) {
    if (TEST_MODE || sentErr.size >= 5) return;
    const key = msg + '|' + src;
    if (sentErr.has(key)) return;
    sentErr.add(key);
    const where = typeof G !== 'undefined' && G ? (G.lv ? G.lv.id : '?') + (G.net ? '/online' : '') : (typeof TOUR !== 'undefined' && TOUR ? 'tournament' : 'menu');
    post({ type: 'err', msg: String(msg).slice(0, 200), src: String(src).slice(0, 120), stack: String(stack || '').split('\n').slice(0, 4).join('\n').slice(0, 500),
      ver: GAME_VERSION, where, dev: device() }).catch(() => {});
  }
  addEventListener('error', e => {
    if (!e.message) return;   // (una imagen o un audio que no cargó: no es un error del juego)
    if (e.message === 'Script error.' && !e.filename) return;   // (de otro sitio o de una extensión del navegador: no trae datos y no es del juego)
    const file = String(e.filename || '').split('/').pop().split('?')[0];
    reportError(e.message, `${file}:${e.lineno}:${e.colno}`, e.error && e.error.stack);
  });
  addEventListener('unhandledrejection', e => {
    const r = e.reason;
    if (r && (r.name === 'AbortError' || /fetch|network/i.test(String(r.message || r)))) return;   // (sin conexión: no es un error del juego)
    reportError(r && r.message ? r.message : String(r), 'promesa', r && r.stack);
  });

  return { run, ping, net, tour, device };
})();
