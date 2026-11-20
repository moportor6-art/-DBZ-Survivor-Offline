'use strict';
// ─── Fusión: música de DB Survivors (pistas mp3 de Legacy of Goku) ───
// Se carga después de js/game.js. La música original (la que se genera en js/audio.js) sigue intacta:
// en Opciones se elige entre una y otra. El botón ♪, el volumen y la pausa funcionan igual con las dos.
(() => {
  const KEY = 'fusion.mp3music', GAIN = 0.55;
  let on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* sin almacenamiento */ }

  const el = new Audio();
  el.preload = 'auto';
  let track = null, blocked = false;

  // Tema de cada escenario y del jefe de cada saga
  const STAGE = { saiyan: 'earth', namek: 'namek', cell: 'rock', buu: 'earth', kaio: 'endless', snake: 'earth',
    otromundo: 'endless', leyendas: 'rock' };
  const BOSS = { saiyan: 'b_saiyan', namek: 'b_freezer', cell: 'b_android', buu: 'b_buu', kaio: 'b_freezer', snake: 'b_saiyan',
    otromundo: 'b_buu', leyendas: 'b_freezer' };

  function pick(name) {
    if (typeof G !== 'undefined' && G && G.mode === 'over') return G.victoryAt ? 'win' : 'gameover';
    const lv = typeof G !== 'undefined' && G && G.lv ? G.lv.id : null;
    if (name === 'menu' || !name) return name ? 'menu' : null;
    if (name === 'boss') {
      if (lv === 'namek' && G.enemies.some(e => e.boss && ['ginyu', 'recoome', 'burter', 'jeice'].includes(e.def.id))) return 'b_ginyu';
      return BOSS[lv] || 'b_freezer';
    }
    return STAGE[lv] || 'earth';   // torneo y demás: el tema de la Tierra
  }

  function volume() {
    const v = Music.enabled ? Math.min(1, GAIN * AudioVolume.music) : 0;
    if (Math.abs(el.volume - v) > 0.001) el.volume = v;
    return v;
  }

  function play(name) {
    if (name !== track) {
      track = name;
      if (!name) { el.pause(); return; }
      el.src = `music/${name}.mp3`;
      el.loop = name !== 'win' && name !== 'gameover';
      blocked = false;
    }
    if (!name || document.hidden || volume() === 0) { if (!el.paused) el.pause(); return; }
    if (el.paused && !blocked && !(el.ended && !el.loop)) {
      el.play().catch(() => { blocked = true; });   // el navegador espera un toque: se reintenta con el próximo
    }
  }
  addEventListener('pointerdown', () => { blocked = false; }, true);
  addEventListener('keydown', () => { blocked = false; }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) el.pause(); });

  // Música.want se llama en cada cuadro con el tema que toca: con las pistas mp3 la música generada calla
  const want = Music.want.bind(Music);
  Music.want = name => {
    if (!on) { if (track) play(null); return want(name); }
    want(null);
    play(pick(name));
  };

  window.fusionMusicState = () => ({ on, track, paused: el.paused, volume: el.volume });   // para revisar qué suena

  // Opción en la ventana de Opciones, junto al volumen de la música
  const row = document.createElement('label');
  row.className = 'vol-row';
  row.innerHTML = '🎧 Música de Legacy of Goku <input type="checkbox" id="optMp3Music">';
  const vol = document.getElementById('volMusic');
  if (vol && vol.closest('label')) vol.closest('label').after(row);
  const box = document.getElementById('optMp3Music');
  if (box) {
    box.checked = on;
    box.onchange = () => {
      on = box.checked;
      try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* sin almacenamiento */ }
    };
  }
})();
