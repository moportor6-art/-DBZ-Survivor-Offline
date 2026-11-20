'use strict';
// ─── Fusión: ventana de Actualizaciones (el trabajo lo hace la app: Updater.java) ───
// Solo existe dentro de la APK (puente FusionNative). Muestra la versión, busca a mano, enseña el historial de
// versiones con sus novedades y permite volver a lo que trae la app. Al cargar, avisa a la app que el juego arrancó
// bien: si una actualización rompiera el arranque, la app vuelve sola a la versión anterior.
(() => {
  const N = window.FusionNative;
  if (!N || !N.updInfo) return;   // en el navegador no hay actualizador
  addEventListener('DOMContentLoaded', () => { try { N.updBooted(); } catch (e) { /* sin puente */ } });

  const info = () => { try { return JSON.parse(N.updInfo()); } catch (e) { return {}; } };

  const scr = document.createElement('div');
  scr.id = 'upd';
  scr.className = 'screen overlay hidden';
  scr.innerHTML = `<div class="box help-box"><h2>Actualizaciones</h2>
    <div id="updContent" class="help-content"></div>
    <button id="btnUpdBack" class="btn ghost">Volver</button></div>`;
  document.body.appendChild(scr);

  let hist = null;
  window.fusionUpdHistory = list => { hist = list || 'error'; render(); };

  const fmtDate = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const escH = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  function render() {
    const i = info(), now = Math.max(i.base || 0, i.active || 0);
    const status = `<p><b>Versión instalada:</b> build ${now || '?'}${i.active ? ` <small>(app build ${i.app}, juego actualizado a build ${i.active})</small>` : ''}</p>`;
    const help = `<p class="hint">Al abrir el juego se busca solo si hay una versión nueva. Si solo cambia el juego se bajan los archivos que cambiaron;
      si cambia la app, se baja completa y Android te pide confirmar. Tus partidas no se tocan.</p>`;
    const btns = `<div class="upd-btns"><button id="btnUpdCheck" class="btn">🔄 Buscar actualizaciones</button>${
      i.active ? '<button id="btnUpdReset" class="btn ghost">↩ Volver a la versión de la app</button>' : ''}</div>`;
    let list = '<p class="hint">Cargando historial…</p>';
    if (hist === 'error') list = '<p class="hint">No se pudo cargar el historial (¿sin internet?).</p>';
    else if (Array.isArray(hist)) list = hist.map(r => `<details${r.build > now ? ' open' : ''}><summary>build ${r.build}${
      r.build > now ? ' · <small>nueva</small>' : r.build === now ? ' · <small>la tuya</small>' : ''} <small>${fmtDate(r.date)}</small></summary>
      <pre class="upd-notes">${escH(r.notes || 'Sin notas.')}</pre></details>`).join('');
    $('updContent').innerHTML = status + help + btns + '<h3>Historial</h3>' + list;
    $('btnUpdCheck').onclick = () => N.updCheck();
    if ($('btnUpdReset')) $('btnUpdReset').onclick = () => {
      if (confirm('¿Volver a la versión que trae la app? Se borran las actualizaciones de archivos (tus partidas no).')) N.updReset();
    };
  }
  function open() {
    hist = null; render(); N.updHistory();
    $('menu').classList.add('hidden'); scr.classList.remove('hidden'); scr.scrollTop = 0;
  }
  $('btnUpdBack').onclick = () => { scr.classList.add('hidden'); $('menu').classList.remove('hidden'); };

  const b = document.createElement('button');
  b.id = 'btnUpd'; b.className = 'btn ghost';
  { const i = info(), v = Math.max(i.base || 0, i.active || 0); b.textContent = v ? `Actualizaciones · build ${v}` : 'Actualizaciones'; }
  ($('btnGfx') || $('btnDaily') || $('btnAchs')).after(b);
  b.onclick = open;

  const css = document.createElement('style');
  css.textContent = `#upd{overflow-y:auto;justify-content:flex-start;padding-top:3vh}
    .upd-btns{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 10px}
    .upd-notes{white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.45;margin:6px 0 2px;color:#dfe8ff}`;
  document.head.appendChild(css);
})();
