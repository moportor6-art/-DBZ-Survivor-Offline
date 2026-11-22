// ─── Modo Historia: la serie por capítulos ──────────────────────────────────
// Botón "📖 Historia" en el menú. Cada capítulo es una pelea de la serie con el guerrero de ese momento, su mapa,
// sus jefes (en el orden de la saga) y escenas con retratos al empezar, cuando llega el jefe y al ganar.
// El capítulo termina al derrotar al jefe final. Estrellas:
//   ★ ganar · ★★ terminar con la mitad de la vida o más · ★★★ el reto del capítulo (rápido, sin bajar de 30%…)
// Cada estrella nueva da Zeni. Un capítulo se abre al ganar el anterior. En la misma pantalla están las
// Misiones diarias y los Logros. Ganar un capítulo no cuenta como ganar el nivel ni para los récords.
// Progreso en localStorage 'fusion.capitulos' ({ id: estrellas }).
(() => {
  const KEY = 'fusion.capitulos';
  // b: jefes [id, segundo, final] · reto: { t: 'rapido', s } derrotar al jefe final en menos de s segundos desde que
  // llega · { t: 'vida', min } no bajar nunca de esa fracción · { t: 'bajas', n } derrotar n enemigos
  const CAPS = [
    { id: 'raditz', saga: 'Saga Saiyajin', titulo: 'El hermano de Goku', char: 'goku', nivel: 'saiyan', b: [['raditz', 150, 1]], reto: { t: 'rapido', s: 90 },
      intro: [['raditz', 'Kakarotto, eres un Saiyajin como yo. Ven conmigo a conquistar planetas… o tu hijo pagará las consecuencias.'], ['yo', '¡Devuélveme a Gohan! Nunca seré como tú.'], ['piccolo', 'Por esta vez pelearé a tu lado, Goku. No te acostumbres.']],
      final: [['raditz', '¿Ustedes dos contra mí? Qué ternura.']],
      fin: [['piccolo', 'Lo derrotamos… pero dijo que vienen dos Saiyajin más fuertes.'], ['yo', 'Entonces habrá que entrenar como nunca.']] },
    { id: 'nappa', saga: 'Saga Saiyajin', titulo: 'Los Saibaiman', char: 'piccolo', nivel: 'saiyan', b: [['nappa', 180, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['nappa', '¡Planten los Saibaiman! A ver cuánto aguantan los terrícolas.'], ['yo', 'Gohan, quédate detrás de mí. Aguantaremos hasta que llegue Goku.']],
      final: [['nappa', '¡Basta de juegos! Yo mismo los aplastaré.']],
      fin: [['yo', 'Aguantamos… Ahora es el turno de Goku.']] },
    { id: 'vegeta', saga: 'Saga Saiyajin', titulo: 'El príncipe de los Saiyajin', char: 'goku', nivel: 'saiyan', b: [['vegetas', 200, 1]], reto: { t: 'rapido', s: 150 },
      intro: [['yo', 'Llegué tarde… pero ya estoy aquí.'], ['vegeta', 'Un guerrero de clase baja que se cree mucho. Te mostraré la diferencia.']],
      final: [['vegeta', 'Si no puedo vencerte así, ¡destruiré este planeta entero!'], ['yo', '¡Kaioken!']],
      fin: [['vegeta', 'Esto no ha terminado, Kakarotto… ¡Volveré!'], ['krilin', 'Las Esferas de Namek pueden revivir a todos. ¡Vamos!']] },
    { id: 'ginyu', saga: 'Saga de Freezer', titulo: 'Las Fuerzas Especiales Ginyu', char: 'vegeta', nivel: 'namek', b: [['recoome', 60], ['burter', 120], ['jeice', 160], ['ginyu', 240, 1]], reto: { t: 'bajas', n: 350 },
      intro: [['ginyu', '¡Recoome! ¡Burter! ¡Jeice! ¡Las Fuerzas Especiales Ginyu están aquí!'], ['yo', 'Payasos con poses. Ninguno me llega a los talones.']],
      final: [['ginyu', 'Ese cuerpo tuyo… me vendría muy bien.']],
      fin: [['yo', 'Ahora solo queda Freezer.']] },
    { id: 'freezer', saga: 'Saga de Freezer', titulo: 'El Super Saiyajin legendario', char: 'goku', nivel: 'namek', b: [['freezer', 180, 1]], reto: { t: 'rapido', s: 120 },
      intro: [['freezer', 'Nadie en el universo me ha hecho sangrar. Tú no serás el primero.'], ['yo', 'Lastimaste a mis amigos. Eso no te lo voy a perdonar.']],
      final: [['freezer', 'Si no puedo ganarte, ¡destruiré Namek contigo!'], ['yo', 'Entonces terminaré esto antes de que explote.']],
      fin: [['yo', 'Vete, Freezer. Y no vuelvas a hacerle daño a nadie.']] },
    { id: 'androides', saga: 'Saga de Cell', titulo: 'Los androides', char: 'ftrunks', nivel: 'cell', b: [['a19', 60], ['gero', 120], ['a17', 180], ['a18', 230, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['yo', 'En mi futuro, estos androides destruyeron todo. Esta vez será diferente.'], ['gero', '¡Despierten, 17 y 18! Acaben con ellos.']],
      final: [['a18', 'Qué aburrido. ¿Este es el famoso guerrero del futuro?']],
      fin: [['yo', 'Pero algo más se está escondiendo… Una criatura que absorbe gente.']] },
    { id: 'cell', saga: 'Saga de Cell', titulo: 'El Cell Game', char: 'gohan', nivel: 'cell', b: [['cellsemi', 90], ['cell', 240, 1]], reto: { t: 'rapido', s: 100 },
      intro: [['cell', 'Bienvenidos a mi torneo. Muéstrenme el poder que se esconde en ese niño.'], ['goku', 'Gohan, tú puedes. Ahora te toca a ti.'], ['yo', 'Ya no voy a contenerme.']],
      final: [['cell', '¡Si no puedo ganar, me llevaré la Tierra conmigo!'], ['yo', '¡No! ¡Esta vez no!']],
      fin: [['goku', 'Lo hiciste, hijo. Estoy orgulloso de ti.']] },
    { id: 'babidi', saga: 'Saga de Majin Buu', titulo: 'La nave de Babidi', char: 'vegeta', nivel: 'buu', b: [['puipui', 60], ['babidib', 140], ['dabura', 230, 1]], reto: { t: 'bajas', n: 400 },
      intro: [['babidib', '¡Con la energía de esta pelea, Majin Buu despertará!'], ['yo', 'Un brujo enano no me va a dar órdenes.']],
      final: [['dabura', 'El Rey de los Demonios te enseñará lo que es el miedo.']],
      fin: [['yo', 'Babidi… ¿qué es ese capullo que se abre?']] },
    { id: 'buu', saga: 'Saga de Majin Buu', titulo: 'La fusión', char: 'gotenks', nivel: 'buu', b: [['fatbuu', 90], ['superbuu', 240, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['piccolo', 'Goten y Trunks lograron la fusión. ¡Ahora sí tenemos una oportunidad!'], ['yo', '¡Soy Gotenks, el guerrero más genial del universo!']],
      final: [['superbuu', 'Huelo poder… Te voy a absorber.']],
      fin: [['yo', '¡Ja! ¡Nadie le gana a Gotenks!']] },
    { id: 'kidbuu', saga: 'Saga de Majin Buu', titulo: 'La Genkidama final', char: 'goku', nivel: 'buu', b: [['buu', 200, 1]], reto: { t: 'rapido', s: 150 },
      intro: [['vegeta', 'Kakarotto… yo lo distraigo. Junta la energía de todos.'], ['yo', 'Gracias, Vegeta. ¡Terrícolas, préstenme su energía!']],
      final: [['buu', '¡Buu destruye! ¡Buu destruye todo!']],
      fin: [['yo', 'Ojalá renazcas como alguien bueno… y peleemos otra vez.']] },
    { id: 'otromundo', saga: 'Películas', titulo: 'El Otro Mundo se deforma', char: 'goku', nivel: 'otromundo', b: [['yakon', 90], ['janemba', 230, 1]], reto: { t: 'bajas', n: 350 },
      intro: [['pikkon', 'Algo salió de la máquina de las almas. Los muertos están volviendo a la Tierra.'], ['yo', 'Entonces habrá que cerrarle el paso.']],
      final: [['janemba', '¡¡Ja… nem… baaa!!']],
      fin: [['pikkon', 'Todo vuelve a la normalidad. Nada mal, Goku.']] },
    { id: 'broly', saga: 'Películas', titulo: 'El Saiyajin legendario', char: 'vegeta', nivel: 'leyendas', b: [['coolerb', 90], ['brolyb', 230, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['coolerb', 'Mi hermano fue un débil. Yo vengo a terminar lo que empezó.'], ['yo', 'Otro de la familia de Freezer… Qué cansado.']],
      final: [['brolyb', 'Kakarotto… ¿Dónde estás, Kakarotto?'], ['yo', 'Ese poder… no puede ser.']],
      fin: [['yo', 'El príncipe de los Saiyajin no se arrodilla ante nadie.']] },
    { id: 'bills', saga: 'Dragon Ball Super', titulo: 'El Dios de la Destrucción', char: 'goku', nivel: 'leyendas', b: [['goldenfz', 110], ['bills', 260, 1]], reto: { t: 'rapido', s: 120 },
      intro: [['freezer', 'Un mes de entrenamiento y mira lo que logré. ¡Golden Freezer!'], ['yo', 'Tú también entrenaste, ¿eh? Esto va a ser divertido.']],
      final: [['bills', 'Tengo hambre y estoy aburrido. Sorpréndeme o destruyo la Tierra.'], ['yo', '¡Le daré todo lo que tengo!']],
      fin: [['bills', 'Nada mal. Quizás no destruya la Tierra… hoy.']] },
    { id: 'poder', saga: 'Dragon Ball Super', titulo: 'El Torneo del Poder', char: 'goku', nivel: 'poder', b: [['toppo', 150], ['jiren', 300, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['goku', 'Ocho universos y un solo ring. El que cae afuera queda eliminado.'], ['toppo', '¡En nombre de la justicia, el Universo 11 no va a perder!']],
      final: [['jiren', 'La fuerza lo es todo. Lo demás no importa.'], ['yo', 'Entonces te mostraré la fuerza de los que pelean juntos.']],
      fin: [['jiren', '…Interesante. Tal vez estaba equivocado.'], ['yo', '¡Ganamos! El Universo 7 sigue en pie.']] },
  ];
  window.CAPITULOS = CAPS;

  const prog = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const setProg = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* nada */ } };
  const abierto = i => i === 0 || (typeof TEST_MODE !== 'undefined' && TEST_MODE) || (prog()[CAPS[i - 1].id] || 0) >= 1;
  const premio = i => Math.round(250 * (1 + i * 0.15) / 10) * 10;   // Zeni por estrella nueva
  const retoTxt = r => r.t === 'rapido' ? `Derrota al jefe final en menos de ${r.s} s desde que llega` : r.t === 'vida' ? `No bajes nunca del ${Math.round(r.min * 100)}% de vida` : `Derrota ${r.n} enemigos`;
  const capDe = id => CAPS.find(c => c.id === id);
  const nombre = id => (CHARACTERS[id] && CHARACTERS[id].name) || ((BOSSES.find(b => b.id === id) || {}).name) || id;

  // ─── Jugar un capítulo ───
  function jugar(i) {
    const C = CAPS[i];
    if (!C || !CHARACTERS[C.char] || !levelDef(C.nivel)) return;
    $('capScr').classList.add('hidden');
    newGame([{ id: 0, name: myName(), charId: C.char, perks: myPerks() }], null, 0, 1, C.nivel);
    G.historia = C.id;
    const L = levelDef(C.nivel);
    G.bosses = C.b.map(([id, at, fin]) => { const lb = L.bosses.find(q => q.id === id); return { id, at, hp: lb ? lb.hp : (BOSSES.find(q => q.id === id) || {}).hp, final: !!fin }; });
    G.hMin = 1; G.hFinT = 0;
    announce(`Capítulo ${i + 1}: ${C.titulo}`, '#ffd93b');
  }

  const up = update;
  update = function () {   // eslint-disable-line no-global-assign
    const r = up.apply(this, arguments);
    if (!G || !G.historia || G.mode !== 'play') return r;
    const C = capDe(G.historia), P = G.me;
    if (P && !P.dead) G.hMin = Math.min(G.hMin, P.hp / P.maxHp);
    if (!G.hIntro && G.t > 0.4) { G.hIntro = true; window.dialogo && window.dialogo(C.intro); }
    else if (!G.hFinal && G.enemies.some(e => e.boss && e.final && !e.dead)) { G.hFinal = true; G.hFinT = G.t; window.dialogo && window.dialogo(C.final); }
    return r;
  };

  // Reintentar: el mismo capítulo (no el nivel normal); el detalle de estrellas solo en los capítulos
  let ultimo = -1;
  const retry = $('btnRetry').onclick;
  $('btnRetry').onclick = function () { if (ultimo >= 0 && !(G && G.net)) jugar(ultimo); else retry.apply(this, arguments); };
  // Los capítulos no entran al ranking
  const rs = rankSubmit;
  rankSubmit = function () {   // eslint-disable-line no-global-assign
    if (G && G.historia) { $('goRank').innerHTML = '<span class="rk-note">Modo Historia: los capítulos no entran al ranking.</span>'; return; }
    return rs.apply(this, arguments);
  };
  const er = endRun;
  endRun = function (won) {   // eslint-disable-line no-global-assign
    for (const el of document.querySelectorAll('.cap-res')) el.remove();
    if (!G || !G.historia || G.mode === 'over') { if (G && !G.historia) ultimo = -1; return er.apply(this, arguments); }
    const C = capDe(G.historia), i = CAPS.indexOf(C), args = arguments, self = this;
    if (won && !G.hOutro && window.dialogo) { G.hOutro = true; window.dialogo(C.fin, () => endRun.apply(self, args)); return; }
    const P = G.me, R = C.reto;
    ultimo = i;
    const est = !won ? 0 : 1 + (P.hp / P.maxHp >= 0.5 ? 1 : 0)
      + (R.t === 'rapido' ? (G.t - G.hFinT <= R.s ? 1 : 0) : R.t === 'vida' ? (G.hMin >= R.min ? 1 : 0) : (G.kills >= R.n ? 1 : 0));
    // no cuenta como ganar el nivel ni para los récords
    const lv = G.lv.id, wonBefore = SAVE.levelsWon[lv], best = JSON.stringify(SAVE.best || {}), bestRun = JSON.stringify(SAVE.bestRun || {});
    const res = er.apply(this, arguments);
    if (!wonBefore) delete SAVE.levelsWon[lv];
    SAVE.best = JSON.parse(best); SAVE.bestRun = JSON.parse(bestRun);
    const p = prog(), antes = p[C.id] || 0;
    let z = 0;
    if (est > antes) { z = (est - antes) * premio(i); p[C.id] = est; setProg(p); SAVE.zeni += z; }
    writeSave();
    try {
      $('goTitle').textContent = won ? `¡Capítulo ${i + 1} superado!` : `Capítulo ${i + 1}: ${C.titulo}`;
      const box = document.createElement('p');
      box.className = 'cap-res';
      box.innerHTML = `<span class="cap-stars">${'★'.repeat(est)}${'☆'.repeat(3 - est)}</span>${z ? ` · +${z} Zeni` : ''}<br><small>★ ganar · ★ mitad de la vida o más · ★ ${retoTxt(R)}</small>`;
      $('goTitle').after(box);
    } catch (e) { /* sin detalle */ }
    return res;
  };

  // ─── Pantalla del Modo Historia ───
  const st = document.createElement('style');
  st.textContent = `#capScr .cap-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    #capScr h3 { margin: 12px 0 2px; color: #ffd93b; font-size: 16px; }
    #capScr .cap { display: flex; gap: 10px; align-items: center; background: rgba(10,15,46,0.7); border: 2px solid #3a4a9a; border-radius: 10px; padding: 8px; text-align: left; }
    #capScr .cap.lock { opacity: 0.5; } #capScr .cap canvas { width: 56px; height: 56px; flex: none; background: #1d2a6b; border-radius: 8px; image-rendering: pixelated; }
    #capScr .cap div { flex: 1; min-width: 0; } #capScr .cap b { display: block; font-size: 15px; } #capScr .cap small { display: block; opacity: 0.85; font-size: 12px; }
    #capScr .cap-stars, .cap-res .cap-stars { color: #ffd93b; font-size: 18px; letter-spacing: 2px; }
    #capScr .cap-tabs { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; } .cap-res { margin: 4px 0 8px; } .cap-res small { opacity: 0.8; }`;
  document.head.appendChild(st);
  const scr = document.createElement('div');
  scr.id = 'capScr'; scr.className = 'screen hidden';
  scr.innerHTML = `<div class="box"><h2>📖 Modo Historia</h2>
    <div class="cap-tabs"><button class="btn small" id="capMis">Misiones diarias</button><button class="btn small" id="capLog">Logros</button></div>
    <p id="capTot" style="margin:8px 0 0"></p><div class="cap-list" id="capList"></div>
    <button class="btn ghost" id="capBack" style="margin-top:12px">Volver</button></div>`;
  document.body.appendChild(scr);
  const retrato = (cv, id) => {
    const c = cv.getContext('2d'); c.clearRect(0, 0, 64, 64);
    try {
      if (typeof tourPortrait === 'function' && tourPortrait(c, id, 0, 0, 64)) return;
      const L = (CHARACTERS[id] && CHARACTERS[id].look) || ((BOSSES.find(q => q.id === id) || {}).look);
      if (L) drawPortraitTo(c, L, false, 4, 6, 56);
    } catch (e) { /* sin retrato */ }
  };
  function pintar() {
    const p = prog(), list = $('capList');
    list.innerHTML = '';
    let saga = '', tot = 0;
    CAPS.forEach((C, i) => {
      if (C.saga !== saga) { saga = C.saga; const h = document.createElement('h3'); h.textContent = saga; list.appendChild(h); }
      const s = p[C.id] || 0, open = abierto(i), jefe = C.b[C.b.length - 1][0];
      tot += s;
      const el = document.createElement('button');
      el.className = 'cap' + (open ? '' : ' lock');
      el.innerHTML = `<canvas width="64" height="64"></canvas><div><b>${i + 1}. ${C.titulo}</b>
        <small>Juegas con ${nombre(C.char)} · contra ${C.b.map(q => nombre(q[0])).join(', ')}</small>
        <small>★★★ ${retoTxt(C.reto)}</small></div><span class="cap-stars">${open ? '★'.repeat(s) + '☆'.repeat(3 - s) : '🔒'}</span>`;
      retrato(el.querySelector('canvas'), jefe);
      el.onclick = () => { if (open) jugar(i); };
      list.appendChild(el);
    });
    $('capTot').textContent = `Estrellas: ${tot} / ${CAPS.length * 3}`;
  }
  const abrirScr = () => { pintar(); $('menu').classList.add('hidden'); scr.classList.remove('hidden'); scr.scrollTop = 0; };
  $('capBack').onclick = () => { scr.classList.add('hidden'); $('menu').classList.remove('hidden'); };
  $('capMis').onclick = () => { scr.classList.add('hidden'); $('menu').classList.remove('hidden'); const b = $('btnDaily'); if (b) b.click(); };
  $('capLog').onclick = () => { scr.classList.add('hidden'); $('menu').classList.remove('hidden'); $('btnAchs').click(); };
  const b = document.createElement('button');
  b.id = 'btnHistoria'; b.className = 'btn btn-play';
  b.textContent = '📖 Historia';
  b.onclick = () => { try { SFX.unlock(); } catch (e) { /* nada */ } abrirScr(); };
  $('btnSolo').after(b);
  window.ModoHistoria = { jugar, abrir: abrirScr, prog };
})();
