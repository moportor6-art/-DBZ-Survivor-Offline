'use strict';
// ─── Mod: maestría por guerrero (las formas se desbloquean jugando, como en la serie) ───
// Cada guerrero cuenta los enemigos que derrotaste con él (se guarda aparte: localStorage 'fusion.maestria').
// La forma n de su escalera (js/mods/formas.js) pide MASTERY[n] enemigos derrotados; la 1.ª siempre está.
// Hasta desbloquearla, el botón de Ki no sube más allá (KiForms.count devuelve solo las desbloqueadas).
// En el modo prueba (?test) está todo abierto. Se carga después de js/mods/identidad.js.
(() => {
  const KEY = 'fusion.maestria';
  const MASTERY = [0, 0, 150, 600, 1500, 3000, 5000, 8000];   // por número de forma (1 = la de siempre)
  let data = {};
  try { data = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { data = {}; }
  let dirty = false;
  const save = () => { if (!dirty) return; dirty = false; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* sin almacenamiento */ } };
  setInterval(save, 5000);
  addEventListener('pagehide', save);
  const kills = id => (data[id] && data[id].k) || 0;
  const need = n => MASTERY[Math.min(n, MASTERY.length - 1)];
  const unlocked = id => {
    if (typeof TEST_MODE !== 'undefined' && TEST_MODE) return 99;
    let n = 1;
    while (n < 8 && kills(id) >= need(n + 1)) n++;
    return n;
  };
  window.MAESTRIA = { kills, need, unlocked, add(id, k) { data[id] = data[id] || { k: 0 }; data[id].k += k; dirty = true; } };

  // La escalera llega hasta la última forma desbloqueada
  const count = window.KiForms.count;
  window.KiForms.count = id => Math.min(count(id), unlocked(id));

  // Contar los enemigos que derrotas (solo tu guerrero, no los aliados ni los invocados)
  const ke = killEnemy;
  killEnemy = function (e, owner) {   // eslint-disable-line no-global-assign
    const r = ke.apply(this, arguments);
    if (owner && G && owner === G.me && !owner.summon) {
      const id = owner.charId, before = unlocked(id);
      window.MAESTRIA.add(id, 1);
      const after = unlocked(id);
      if (after > before) {   // forma nueva en plena partida
        const f = window.KiForms.list(id)[after - 1];
        if (f) { announce(`¡Nueva forma desbloqueada: ${f.name}!`, f.aura || '#ffd93b'); sfx('power'); }
      }
    }
    return r;
  };

  // Al intentar subir a una forma todavía bloqueada, decir cuánto falta
  const hk = handleKi;
  handleKi = function (P, ang) {   // eslint-disable-line no-global-assign
    if (P && ang === 1003 && P.transformed > 0 && (P.formN || 1) >= window.KiForms.count(P.charId)) {
      const all = count(P.charId), n = (P.formN || 1) + 1;
      if (n <= all) {
        const f = window.KiForms.list(P.charId)[n - 1];
        addText(P.x, P.y - 30, `🔒 ${f.name}: ${kills(P.charId)}/${need(n)} enemigos`, '#ffb0a0');
        return;
      }
    }
    return hk.apply(this, arguments);
  };

  // Ficha del guerrero: candado y progreso en cada forma
  const ucd = updateCharDetail;
  updateCharDetail = function () {   // eslint-disable-line no-global-assign
    const r = ucd.apply(this, arguments);
    const box = document.getElementById('formLore'), id = myChar();
    if (box && id) {
      const items = box.querySelectorAll('li'), u = unlocked(id);
      items.forEach((li, i) => {
        const n = i + 1;
        if (n > u) {
          li.classList.add('fl-locked');
          const tag = document.createElement('div');
          tag.className = 'fl-lock';
          tag.textContent = `🔒 Derrota ${need(n).toLocaleString('es')} enemigos con ${CHARACTERS[id].name} (llevas ${kills(id).toLocaleString('es')})`;
          li.appendChild(tag);
        }
      });
    }
    return r;
  };
  const css = document.createElement('style');
  css.textContent = '#formLore li.fl-locked{opacity:.6}#formLore .fl-lock{color:#ffb0a0;font-size:12px;font-weight:700}';
  document.head.appendChild(css);
})();
