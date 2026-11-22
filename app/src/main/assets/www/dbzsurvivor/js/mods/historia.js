// ─── Modo historia: escenas con retratos entre los momentos clave de cada nivel ───
// Tres escenas por nivel: al empezar, cuando llega el jefe final y al ganar. El juego se congela mientras
// se lee (este archivo es el último que envuelve update) y se pasa con un toque, Enter o Espacio; "Saltar"
// cierra la escena entera. Cada escena se ve una vez (localStorage 'fusion.historia'); en la pausa, "Repetir
// escenas" las vuelve a activar. No sale en línea, en el desafío semanal, en el bonus ni en las pruebas automáticas.
// Diálogos originales, en el espíritu de cada saga. 'yo' = el guerrero que estás usando.
(() => {
  const KEY = 'fusion.historia';
  const S = {
    saiyan: {
      intro: [['raditz', 'Así que aquí se escondió mi hermano menor… Qué planeta tan débil.'],
        ['yo', '¡No sé quién eres, pero no vas a tocar a nadie aquí!'],
        ['nappa', 'Raditz va adelante. Nosotros llegamos en un rato… ¡que no se acaben antes!']],
      final: [['vegeta', 'Soy el príncipe de los Saiyajin. Un guerrero cualquiera no puede ganarme.'], ['yo', '¡Eso ya lo veremos!']],
      fin: [['vegeta', 'Esto no termina aquí… ¡La próxima vez no tendré piedad!'], ['piccolo', 'Se fue. Pero ganamos tiempo para entrenar.']],
    },
    namek: {
      intro: [['freezer', 'Con las Esferas del Dragón de Namek tendré la vida eterna. Nadie se interpondrá.'],
        ['ginyu', '¡Fuerzas Especiales Ginyu, en posición!'], ['yo', 'Hay que encontrar las esferas antes que ellos.']],
      final: [['freezer', 'Ahora sí vas a conocer el verdadero terror.'], ['yo', '¡No vas a destruir este planeta!']],
      fin: [['yo', 'Se acabó, Freezer.'], ['piccolo', 'Namek está a salvo… por ahora.']],
    },
    cell: {
      intro: [['gero', 'Mis androides son perfectos. ¡Acaben con todos!'], ['a17', 'Tenemos un solo objetivo. Lo demás nos da igual.'],
        ['yo', 'Hay que pararlos antes de que esa cosa los encuentre.']],
      final: [['cell', 'Por fin soy perfecto. Organicemos un torneo… y diviértanme un rato.'], ['yo', 'Vas a lamentar haber esperado.']],
      fin: [['gohan', 'Lo logramos… La Tierra vuelve a estar en paz.']],
    },
    buu: {
      intro: [['babidib', '¡Con la energía de esta pelea, Majin Buu va a despertar!'], ['dabura', 'El Rey de los Demonios obedece a Babidi. Por ahora.'],
        ['yo', 'Hay que detenerlos antes de que liberen a Buu.']],
      final: [['buu', '¡Buu destruye todo!'], ['yo', 'Este es el combate final… ¡con todo lo que tengo!']],
      fin: [['goku', 'Ojalá renazca como alguien bueno… y podamos pelear otra vez.']],
    },
    kaio: {
      intro: [['goku', 'Kaio-sama preparó un desafío sin fin. ¿Cuánto vas a aguantar?'], ['yo', '¡Hasta el final!']],
    },
    otromundo: {
      intro: [['pikkon', 'Bienvenido al Otro Mundo. Aquí pelean los mejores guerreros que ya partieron.'], ['yo', 'Entonces vine al lugar correcto.']],
      final: [['janemba', '¡¡Ja… nem… baaa!!'], ['yo', 'Esa cosa está deformando todo el Otro Mundo.']],
      fin: [['pikkon', 'Todo vuelve a la normalidad. Buen combate.']],
    },
    leyendas: {
      intro: [['freezer', 'Volví del Infierno… y no vine solo.'], ['yo', 'Freezer, Cooler, Broly… ¿todos a la vez?']],
      final: [['bills', 'Tengo hambre y estoy aburrido. Sorpréndeme… o destruyo este planeta.'], ['yo', '¡Entonces prepárate para sorprenderte!']],
      fin: [['bills', 'Nada mal. Quizás no destruya la Tierra… hoy.']],
    },
    poder: {
      intro: [['goku', 'Ocho universos y un solo ring. El que cae afuera queda eliminado.'],
        ['toppo', '¡En nombre de la justicia, el Universo 11 no va a perder!'], ['yo', '¡Que empiece el Torneo del Poder!']],
      final: [['jiren', 'La fuerza lo es todo. Lo demás no importa.'], ['yo', 'Entonces te mostraré la fuerza de los que pelean juntos.']],
      fin: [['jiren', '…Interesante. Tal vez estaba equivocado.']],
    },
  };
  window.HISTORIA = S;

  const vistas = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const marcar = k => { try { const v = vistas(); v[k] = 1; localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* sin guardar */ } };
  const puede = () => G && G.lv && !G.net && !G.weekly && !G.lv.bonus && !G.snake && !G.historia   // (los capítulos traen sus propias escenas)
    && (!navigator.webdriver || window.FORCE_HISTORIA);   // las pruebas automáticas no se detienen a leer

  // ─── La caja de diálogo ───
  const box = document.createElement('div');
  box.id = 'historia';
  box.className = 'hidden';
  box.innerHTML = `<canvas width="96" height="96"></canvas><div class="h-txt"><b></b><p></p></div>
    <div class="h-btns"><button type="button" class="h-next">Siguiente ▸</button><button type="button" class="h-skip">Saltar</button></div>`;
  const st = document.createElement('style');
  st.textContent = `#historia { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 60; width: min(680px, 94vw);
      display: flex; gap: 12px; align-items: center; padding: 10px 12px; background: rgba(10,15,46,0.94); border: 3px solid #ffd93b;
      border-radius: 12px; color: #fff; font-family: inherit; box-shadow: 0 6px 24px rgba(0,0,0,0.6); }
    #historia.hidden { display: none; }
    #historia canvas { width: 84px; height: 84px; flex: none; background: #1d2a6b; border-radius: 8px; image-rendering: pixelated; }
    #historia.der { flex-direction: row-reverse; text-align: right; }
    #historia .h-txt { flex: 1; min-width: 0; } #historia b { color: #ffd93b; font-size: 17px; }
    #historia p { margin: 4px 0 0; font-size: 16px; line-height: 1.35; }
    #historia .h-btns { display: flex; flex-direction: column; gap: 6px; flex: none; }
    #historia button { font: inherit; font-weight: 700; font-size: 14px; padding: 6px 10px; border-radius: 8px; border: 2px solid #0a0f2e; background: #ffd93b; color: #0a0f2e; }
    #historia .h-skip { background: #8a93c8; }`;
  document.head.appendChild(st);
  document.body.appendChild(box);
  const cv = box.querySelector('canvas'), cx = cv.getContext('2d');

  let cur = null;   // { lines, i, done }
  const quien = id => {
    if (id === 'yo') { const P = G && G.me; return { id: P ? P.charId : 'goku', name: P && CHARACTERS[P.charId] ? CHARACTERS[P.charId].name : 'Tú', yo: true }; }
    const b = (typeof BOSSES !== 'undefined' && BOSSES.find(q => q.id === id)) || CHARACTERS[id] || ENEMIES[id];
    return { id, name: b ? b.name : id };
  };
  const retrato = id => {
    cx.clearRect(0, 0, 96, 96);
    try {
      if (typeof tourPortrait === 'function' && tourPortrait(cx, id, 0, 0, 96)) return;
      const L = (CHARACTERS[id] && CHARACTERS[id].look) || ((BOSSES.find(q => q.id === id) || {}).look) || (ENEMIES[id] && ENEMIES[id].look);
      if (L) drawPortraitTo(cx, L, false, 8, 12, 80);
    } catch (e) { /* sin retrato */ }
  };
  const mostrar = () => {
    const [id, text] = cur.lines[cur.i], w = quien(id);
    retrato(w.id);
    box.classList.toggle('der', !!w.yo);
    box.querySelector('b').textContent = w.name;
    box.querySelector('p').textContent = text;
    box.querySelector('.h-next').textContent = cur.i < cur.lines.length - 1 ? 'Siguiente ▸' : 'Continuar ▸';
  };
  const cerrar = () => {
    if (!cur) return;
    const done = cur.done; cur = null; box.classList.add('hidden');
    if (done) done();
  };
  const avanzar = () => { if (!cur) return; if (++cur.i >= cur.lines.length) cerrar(); else { sfx('menu', 0.3); mostrar(); } };
  function abrir(nivel, momento, done) {
    const lines = S[nivel] && S[nivel][momento], k = nivel + '.' + momento;
    if (!lines || !lines.length || vistas()[k]) return false;
    marcar(k);
    cur = { lines, i: 0, done };
    box.classList.remove('hidden');
    mostrar();
    return true;
  }
  window.abrirHistoria = abrir;
  // Diálogo suelto (lo usa el Modo Historia, js/mods/capitulos.js): sin marca de "ya visto"
  window.dialogo = (lines, done) => {
    if (!lines || !lines.length) { if (done) done(); return false; }
    cur = { lines, i: 0, done }; box.classList.remove('hidden'); mostrar(); return true;
  };
  box.querySelector('.h-next').addEventListener('click', e => { e.stopPropagation(); avanzar(); });
  box.querySelector('.h-skip').addEventListener('click', e => { e.stopPropagation(); cerrar(); });
  box.addEventListener('pointerdown', e => e.stopPropagation());
  addEventListener('keydown', e => {   // mientras se lee, las teclas no llegan al juego
    if (!cur) return;
    if (e.key === 'Enter' || e.key === ' ') avanzar();
    else if (e.key === 'Escape') cerrar();
    e.stopImmediatePropagation(); e.preventDefault();
  }, true);

  // ─── Cuándo sale cada escena ───
  const up = update;
  update = function () {   // eslint-disable-line no-global-assign
    if (cur) return;   // leyendo: el mundo se queda quieto
    const r = up.apply(this, arguments);
    if (!puede() || G.mode !== 'play') return r;
    const id = G.lv.id;
    if (!G.histIntro && G.t > 0.4) { G.histIntro = true; abrir(id, 'intro'); }
    else if (!G.histFinal && G.enemies.some(e => e.boss && e.final && !e.dead)) { G.histFinal = true; abrir(id, 'final'); }
    return r;
  };
  const er = endRun;
  endRun = function (won) {   // eslint-disable-line no-global-assign
    if (won && G && G.mode === 'play' && !G.histFin && puede()) {
      G.histFin = true;
      const args = arguments, self = this;
      if (abrir(G.lv.id, 'fin', () => er.apply(self, args))) return;
    }
    if (cur) { cur = null; box.classList.add('hidden'); }   // abandonó la partida con una escena abierta
    return er.apply(this, arguments);
  };

  // Ajustes: botón para volver a ver todas las escenas
  try {
    const host = document.querySelector('.pause-opts');
    if (host) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'link-btn'; b.textContent = 'Repetir escenas de la historia';
      b.addEventListener('click', () => { try { localStorage.removeItem(KEY); } catch (e) { /* nada */ } b.textContent = '¡Listo! Se verán otra vez'; });
      host.appendChild(b);
    }
  } catch (e) { /* sin botón */ }
})();
