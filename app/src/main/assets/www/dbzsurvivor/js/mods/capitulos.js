// ─── Modo Historia: la serie por capítulos ──────────────────────────────────
// Botón "📖 Historia" en el menú. Cada capítulo es una pelea de la serie con el guerrero de ese momento, su mapa,
// sus jefes (en el orden de la saga) y escenas con retratos al empezar, cuando llega el jefe y al ganar.
// El capítulo termina al derrotar al jefe final. Estrellas:
//   ★ ganar · ★★ terminar con la mitad de la vida o más · ★★★ el reto del capítulo (rápido, sin bajar de 30%…)
// Cada estrella nueva da Zeni. Un capítulo se abre al ganar el anterior; el final (La batalla final), al ganarlos
// todos, y da un premio grande. Juntar las 3 estrellas en todos da otro. En la misma pantalla están las
// Misiones diarias y los Logros. Ganar un capítulo no cuenta como ganar el nivel, ni para los récords, ni da los
// logros del final de partida. 'medio': escenas cuando un jefe baja de cierta vida.
// Progreso en localStorage 'fusion.capitulos' ({ id: estrellas }).
(() => {
  const KEY = 'fusion.capitulos';
  // Jefes nuevos con los sprites de los guerreros jugables (Cui, Dodoria, Zarbon, Black Freezer)
  const lookDe = (id, alt) => ({ ...((CHARACTERS[id] || {}).look || FB('#cccccc')), id: alt || id });
  BOSSES.push(
    { id: 'cuib', name: 'Cui', hp: 2600, speed: 1.6, r: 16, dmg: 14, scale: 1.15, every: 2.2, patterns: ['aimed', 'dash', 'aimed'], look: lookDe('cuip') },
    { id: 'dodoriab', name: 'Dodoria', hp: 4200, speed: 1.2, r: 20, dmg: 18, scale: 1.3, every: 2.4, patterns: ['aimed', 'slam', 'dash'], look: lookDe('dodoriap') },
    { id: 'zarbonb', name: 'Zarbon', hp: 6500, speed: 1.5, r: 18, dmg: 20, scale: 1.25, every: 2, patterns: ['aimed', 'dash', 'ring', 'aimed'], look: lookDe('zarbonp') },
    { id: 'appuleb', name: 'Appule', hp: 3200, speed: 1.5, r: 16, dmg: 15, scale: 1.3, every: 2, patterns: ['aimed', 'dash', 'ring'], look: (ENEMIES.appulee || {}).look || FB('#c070ff') },
    { id: 'gozub', name: 'Gozu', hp: 5000, speed: 1.3, r: 18, dmg: 18, scale: 1.45, every: 2.2, patterns: ['slam', 'dash', 'aimed'], look: (ENEMIES.gozue || {}).look || FB('#4fd8c8') },
    { id: 'mezub', name: 'Mezu', hp: 5000, speed: 1.4, r: 18, dmg: 18, scale: 1.45, every: 2.2, patterns: ['aimed', 'ring', 'dash'], look: (ENEMIES.mezue || {}).look || FB('#ff8a5c') },
    { id: 'blackfz', name: 'Black Freezer', hp: 30000, speed: 1.9, r: 18, dmg: 34, scale: 1.3, every: 1.4, patterns: ['aimed', 'dash', 'ring', 'slam', 'aimed'], look: lookDe('freezerp', 'freezerp~6:ssj') },
  );
  // b: jefes [id, segundo, final] · reto: { t: 'rapido', s } derrotar al jefe final en menos de s segundos desde que
  // llega · { t: 'vida', min } no bajar nunca de esa fracción · { t: 'bajas', n } derrotar n enemigos
  const CAPS = [
    { id: 'raditz', saga: 'Saga Saiyajin', titulo: 'El hermano de Goku', char: 'goku', nivel: 'saiyan', b: [['raditz', 150, 1]], reto: { t: 'rapido', s: 90 },
      intro: [['raditz', 'Kakarotto, eres un Saiyajin como yo. Ven conmigo a conquistar planetas… o tu hijo pagará las consecuencias.'], ['yo', '¡Devuélveme a Gohan! Nunca seré como tú.'], ['piccolo', 'Por esta vez pelearé a tu lado, Goku. No te acostumbres.']],
      final: [['raditz', '¿Ustedes dos contra mí? Qué ternura.']],
      medio: [{ jefe: 'raditz', hp: 0.5, lines: [['piccolo', 'Goku, sujétalo un momento. Mi Makankosappo ya casi está listo.'], ['yo', '¡Hazlo, Piccolo!']] }],
      fin: [['piccolo', 'Lo derrotamos… pero dijo que vienen dos Saiyajin más fuertes.'], ['yo', 'Entonces habrá que entrenar como nunca.']] },
    { id: 'nappa', saga: 'Saga Saiyajin', titulo: 'Los Saibaiman', char: 'piccolo', nivel: 'saiyan', b: [['nappa', 180, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['nappa', '¡Planten los Saibaiman! A ver cuánto aguantan los terrícolas.'], ['yo', 'Gohan, quédate detrás de mí. Aguantaremos hasta que llegue Goku.']],
      final: [['nappa', '¡Basta de juegos! Yo mismo los aplastaré.']],
      fin: [['yo', 'Aguantamos… Ahora es el turno de Goku.']] },
    { id: 'vegeta', saga: 'Saga Saiyajin', titulo: 'El príncipe de los Saiyajin', char: 'goku', nivel: 'saiyan', b: [['vegetas', 200, 1]], reto: { t: 'rapido', s: 150 },
      intro: [['yo', 'Llegué tarde… pero ya estoy aquí.'], ['vegeta', 'Un guerrero de clase baja que se cree mucho. Te mostraré la diferencia.']],
      final: [['vegeta', 'Si no puedo vencerte así, ¡destruiré este planeta entero!'], ['yo', '¡Kaioken!']],
      medio: [{ jefe: 'vegetas', hp: 0.5, lines: [['vegeta', 'Crearé una luna artificial… ¡y verás el verdadero poder de un Saiyajin!'], ['yo', '¡Cuidado, se está transformando en Ozaru!']] }],
      fin: [['vegeta', 'Esto no ha terminado, Kakarotto… ¡Volveré!'], ['krilin', 'Las Esferas de Namek pueden revivir a todos. ¡Vamos!']] },
    { id: 'namek', saga: 'Saga de Freezer', titulo: 'Rumbo a Namek', char: 'vegeta', nivel: 'namek', b: [['cuib', 60], ['dodoriab', 130], ['zarbonb', 240, 1]], reto: { t: 'bajas', n: 300 },
      intro: [['yo', 'Las Esferas del Dragón de Namek serán mías. La inmortalidad es para el príncipe de los Saiyajin.'], ['cuip', '¡Vegeta! Freezer me ordenó acabar contigo.']],
      final: [['zarbonb', 'Qué pena estropear una cara tan bonita como la mía… pero tendré que hacerlo.']],
      medio: [{ jefe: 'zarbonb', hp: 0.5, lines: [['zarbonb', 'Odio mostrar esta forma… ¡Pero tú me obligaste!'], ['yo', '¿Ese es tu secreto? Qué asco.']] }],
      fin: [['yo', 'Ahora sé dónde están las esferas. Freezer, ya voy por ti.']] },
    { id: 'appule', saga: 'Saga de Freezer', titulo: 'Escondidos en Namek', char: 'krilin', nivel: 'namek', b: [['appuleb', 160, 1]], reto: { t: 'bajas', n: 250 },
      intro: [['gohan', 'Krilin, hay soldados de Freezer por todas partes buscando las esferas.'], ['yo', 'Tranquilo, Gohan. Nos ocultamos el ki y los vamos sacando de a uno.']],
      final: [['appuleb', '¡Ahí están los terrícolas! ¡Freezer me recompensará por sus cabezas!']],
      fin: [['yo', 'Uf… Ese era de los débiles. No quiero ni pensar en los fuertes.']] },
    { id: 'ginyu', saga: 'Saga de Freezer', titulo: 'Las Fuerzas Especiales Ginyu', char: 'vegeta', nivel: 'namek', b: [['recoome', 60], ['burter', 120], ['jeice', 160], ['ginyu', 240, 1]], reto: { t: 'bajas', n: 350 },
      intro: [['ginyu', '¡Recoome! ¡Burter! ¡Jeice! ¡Las Fuerzas Especiales Ginyu están aquí!'], ['yo', 'Payasos con poses. Ninguno me llega a los talones.']],
      final: [['ginyu', 'Ese cuerpo tuyo… me vendría muy bien.']],
      medio: [{ jefe: 'ginyu', hp: 0.5, lines: [['ginyu', '¡Cambio de cuerpo!'], ['yo', 'No tocarás este cuerpo, payaso.']] }],
      fin: [['yo', 'Ahora solo queda Freezer.']] },
    { id: 'nail', saga: 'Saga de Freezer', titulo: 'El guerrero de Namek', char: 'nailp', nivel: 'namek', b: [['freezer', 200, 1, 0.55]], reto: { t: 'vida', min: 0.3 },
      intro: [['freezer', '¿Un namekiano quiere jugar al héroe? Qué divertido.'], ['yo', 'Le prometí al Gran Patriarca que protegería las esferas. No pasarás.']],
      final: [['freezer', 'Te dejaré atacar primero. Así verás la diferencia.']],
      fin: [['yo', 'Gané tiempo… Piccolo, mi poder es tuyo. Fusiónate conmigo.']] },
    { id: 'freezer', saga: 'Saga de Freezer', titulo: 'El Super Saiyajin legendario', char: 'goku', nivel: 'namek', b: [['freezer', 180, 1]], reto: { t: 'rapido', s: 120 },
      intro: [['freezer', 'Nadie en el universo me ha hecho sangrar. Tú no serás el primero.'], ['yo', 'Lastimaste a mis amigos. Eso no te lo voy a perdonar.']],
      final: [['freezer', 'Si no puedo ganarte, ¡destruiré Namek contigo!'], ['yo', 'Entonces terminaré esto antes de que explote.']],
      medio: [{ jefe: 'freezer', hp: 0.5, lines: [['freezer', 'Le di al núcleo del planeta. En unos minutos Namek dejará de existir.'], ['yo', 'Entonces tengo que terminar esto ya.']] }],
      fin: [['yo', 'Vete, Freezer. Y no vuelvas a hacerle daño a nadie.']] },
    { id: 'trunks', saga: 'Saga de Cell', titulo: 'El guerrero del futuro', char: 'ftrunks', nivel: 'leyendas', b: [['mechafz', 120], ['coldb', 220, 1]], reto: { t: 'rapido', s: 90 },
      intro: [['coldb', 'Hijo mío, este planeta pagará por lo que te hizo ese Saiyajin.'], ['freezer', 'Primero voy a destruir a sus amigos, uno por uno.'], ['yo', 'No hará falta que Goku venga. Yo me encargo.']],
      final: [['coldb', '¿Un joven con una espada contra el rey del universo? Qué insolencia.']],
      medio: [{ jefe: 'coldb', hp: 0.5, lines: [['coldb', 'Espera… podemos hacer un trato. Únete a nosotros.'], ['yo', 'No hago tratos con tiranos.']] }],
      fin: [['yo', 'Goku llega en unas horas. Tengo que advertirle sobre los androides.']] },
    { id: 'androides', saga: 'Saga de Cell', titulo: 'Los androides', char: 'ftrunks', nivel: 'cell', b: [['a19', 60], ['gero', 120], ['a17', 180], ['a18', 230, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['yo', 'En mi futuro, estos androides destruyeron todo. Esta vez será diferente.'], ['gero', '¡Despierten, 17 y 18! Acaben con ellos.']],
      final: [['a18', 'Qué aburrido. ¿Este es el famoso guerrero del futuro?']],
      fin: [['yo', 'Pero algo más se está escondiendo… Una criatura que absorbe gente.']] },
    { id: 'cell', saga: 'Saga de Cell', titulo: 'El Cell Game', char: 'gohan', nivel: 'cell', b: [['cellsemi', 90], ['cell', 240, 1]], reto: { t: 'rapido', s: 100 },
      intro: [['cell', 'Bienvenidos a mi torneo. Muéstrenme el poder que se esconde en ese niño.'], ['goku', 'Gohan, tú puedes. Ahora te toca a ti.'], ['yo', 'Ya no voy a contenerme.']],
      final: [['cell', '¡Si no puedo ganar, me llevaré la Tierra conmigo!'], ['yo', '¡No! ¡Esta vez no!']],
      medio: [{ jefe: 'cell', hp: 0.25, lines: [['cell', 'Si yo pierdo, ¡todos pierden! Voy a inflarme y explotar.'], ['goku', '¡Gohan, termínalo antes de que explote!']] }],
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
      medio: [{ jefe: 'buu', hp: 0.5, lines: [['vegeta', '¡Kakarotto, apúrate con esa Genkidama! No aguantaré mucho más.'], ['yo', '¡Ya casi, Vegeta!']] }],
      fin: [['yo', 'Ojalá renazcas como alguien bueno… y peleemos otra vez.']] },
    { id: 'serpiente', saga: 'Películas', titulo: 'Los guardianes del Infierno', char: 'goku', nivel: 'otromundo', b: [['gozub', 150], ['mezub', 170, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['pikkon', 'Las puertas del Infierno se abrieron. Gozu y Mezu dejaron escapar a todos.'], ['yo', '¡Entonces los devolvemos adentro!']],
      final: [['mezub', '¡Nadie pasa por la puerta del Infierno sin permiso de Enma!']],
      fin: [['pikkon', 'Las puertas están cerradas otra vez. Pero algo más grande se está moviendo.']] },
    { id: 'otromundo', saga: 'Películas', titulo: 'El Otro Mundo se deforma', char: 'goku', nivel: 'otromundo', b: [['yakon', 90], ['janemba', 230, 1]], reto: { t: 'bajas', n: 350 },
      intro: [['pikkon', 'Algo salió de la máquina de las almas. Los muertos están volviendo a la Tierra.'], ['yo', 'Entonces habrá que cerrarle el paso.']],
      final: [['janemba', '¡¡Ja… nem… baaa!!']],
      fin: [['pikkon', 'Todo vuelve a la normalidad. Nada mal, Goku.']] },
    { id: 'broly', saga: 'Películas', titulo: 'El Saiyajin legendario', char: 'vegeta', nivel: 'leyendas', b: [['coolerb', 90], ['brolyb', 230, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['coolerb', 'Mi hermano fue un débil. Yo vengo a terminar lo que empezó.'], ['yo', 'Otro de la familia de Freezer… Qué cansado.']],
      final: [['brolyb', 'Kakarotto… ¿Dónde estás, Kakarotto?'], ['yo', 'Ese poder… no puede ser.']],
      medio: [{ jefe: 'brolyb', hp: 0.5, lines: [['brolyb', '¡Soy un demonio!'], ['yo', 'Cuanto más lo golpeo, más fuerte se vuelve…']] }],
      fin: [['yo', 'El príncipe de los Saiyajin no se arrodilla ante nadie.']] },
    { id: 'bills', saga: 'Dragon Ball Super', titulo: 'El Dios de la Destrucción', char: 'goku', nivel: 'leyendas', b: [['goldenfz', 110], ['bills', 260, 1]], reto: { t: 'rapido', s: 120 },
      intro: [['freezer', 'Un mes de entrenamiento y mira lo que logré. ¡Golden Freezer!'], ['yo', 'Tú también entrenaste, ¿eh? Esto va a ser divertido.']],
      final: [['bills', 'Tengo hambre y estoy aburrido. Sorpréndeme o destruyo la Tierra.'], ['yo', '¡Le daré todo lo que tengo!']],
      fin: [['bills', 'Nada mal. Quizás no destruya la Tierra… hoy.']] },
    { id: 'black', saga: 'Dragon Ball Super', titulo: 'El regreso de Freezer', char: 'gohan', nivel: 'leyendas', b: [['goldenfz', 90], ['blackfz', 240, 1]], reto: { t: 'rapido', s: 120 },
      intro: [['freezer', 'Diez años de entrenamiento en la Habitación del Tiempo. Ya no soy el mismo.'], ['yo', 'Te derroté una vez. Puedo hacerlo otra.']],
      final: [['blackfz', 'Black Freezer. Ni Goku ni Vegeta pudieron conmigo.'], ['yo', 'Entonces conocerás a la Bestia.']],
      fin: [['yo', 'Ya no voy a esconderme detrás de nadie.']] },
    { id: 'poder', saga: 'Dragon Ball Super', titulo: 'El Torneo del Poder', char: 'goku', nivel: 'poder', b: [['toppo', 150], ['jiren', 300, 1]], reto: { t: 'vida', min: 0.3 },
      intro: [['goku', 'Ocho universos y un solo ring. El que cae afuera queda eliminado.'], ['toppo', '¡En nombre de la justicia, el Universo 11 no va a perder!']],
      final: [['jiren', 'La fuerza lo es todo. Lo demás no importa.'], ['yo', 'Entonces te mostraré la fuerza de los que pelean juntos.']],
      medio: [{ jefe: 'jiren', hp: 0.35, lines: [['jiren', 'Nunca había tenido que llegar tan lejos.'], ['yo', '¡Entonces sigue! ¡Esto apenas empieza!']] }],
      fin: [['jiren', '…Interesante. Tal vez estaba equivocado.'], ['yo', '¡Ganamos! El Universo 7 sigue en pie.']] },
    { id: 'final', saga: 'Final', titulo: 'La batalla final', especial: true, char: 'gogetap', nivel: 'leyendas', b: [['freezer', 60], ['cell', 150], ['buu', 240], ['brolyb', 330], ['jiren', 420, 1]], reto: { t: 'vida', min: 0.25 },
      intro: [['goku', 'Todos los enemigos que derrotamos volvieron al mismo tiempo.'], ['vegeta', 'Kakarotto… detesto decirlo, pero esta vez hay que fusionarse.'], ['yo', '¡Soy Gogeta! Y esto se termina hoy.']],
      final: [['jiren', 'Uno contra uno. Muéstrame si su unión es fuerza de verdad.']],
      medio: [{ jefe: 'jiren', hp: 0.4, lines: [['jiren', 'Esta fuerza… no la había sentido nunca.'], ['yo', '¡Es la fuerza de todos los que pelearon antes que nosotros!']] }],
      fin: [['goku', 'Lo logramos, Vegeta.'], ['vegeta', 'No te acostumbres, Kakarotto.'], ['piccolo', 'La Tierra está a salvo. Esta vez, de verdad.']] },
  ];
  // Dragon Ball GT (js/mods/gt.js): sus capítulos van antes de «La batalla final», que no los pide para abrirse
  if (window.GT_CAPS) CAPS.splice(CAPS.findIndex(c => c.id === 'final'), 0, ...window.GT_CAPS);
  if (window.ALT_CAPS) CAPS.splice(CAPS.findIndex(c => c.id === 'final'), 0, ...window.ALT_CAPS);   // (alternos.js)
  window.CAPITULOS = CAPS;
  const PREMIO_FINAL = 10000, PREMIO_ESTRELLAS = 15000;

  const prog = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const setProg = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* nada */ } };
  const abierto = i => i === 0 || (typeof TEST_MODE !== 'undefined' && TEST_MODE)
    || (CAPS[i].especial ? CAPS.every((c, j) => j === i || c.gt || (prog()[c.id] || 0) >= 1) : (prog()[CAPS[i - 1].id] || 0) >= 1);
  const premio = i => Math.round(400 * (1 + i * 0.15) / 10) * 10;   // Zeni por estrella nueva
  // Dificultad: cada capítulo dura más y aprieta más que el anterior (del 1, ~6 min, al 20, ~10 min; el final, 13 min).
  // Los jefes llegan más tarde (cuando ya estás más fuerte), así que también tienen bastante más vida.
  // 2.35.x: el capítulo 1 iba con todo (Raditz como un jefe final): ahora empieza un 30% más suave y sube poco a poco
  // 2.36.7: la vida de cada jefe ya crece con su saga (la de su nivel o la de BOSSES); antes además se multiplicaba
  // ×1,4 → ×4,4 por el número de capítulo y en GT y los universos alternativos se disparaba. Ahora solo +2% por capítulo.
  const DIF = (i, C) => ({ dur: C.especial ? 780 : 360 + i * 13, hp: 0.9 + i * 0.045, dmg: 0.85 + i * 0.04, jefe: 1 + i * 0.02 });
  for (const C of CAPS) {   // retos de estrellas acordes: más bajas (dura más) y más margen para el jefe final (tiene más vida)
    if (C.reto.t === 'bajas') C.reto.n = Math.round(C.reto.n * 2.4 / 50) * 50;
    if (C.reto.t === 'rapido') C.reto.s = Math.round(C.reto.s * 1.5 / 10) * 10;
  }
  const retoTxt = r => r.t === 'rapido' ? `Derrota al jefe final en menos de ${r.s} s desde que llega` : r.t === 'vida' ? `No bajes nunca del ${Math.round(r.min * 100)}% de vida` : `Derrota ${r.n} enemigos`;
  const capDe = id => CAPS.find(c => c.id === id);
  const nombre = id => (CHARACTERS[id] && CHARACTERS[id].name) || ((BOSSES.find(b => b.id === id) || {}).name) || id;

  // ─── Jugar un capítulo ───
  function jugar(i) {
    const C = CAPS[i];
    if (!C || !CHARACTERS[C.char] || !levelDef(C.nivel)) return;
    $('capScr').classList.add('hidden');
    newGame([{ id: 0, name: myName(), charId: C.char, perks: myPerks() }], null, 0, 1, C.nivel);
    preparar(C);
  }
  // Lo que convierte una partida del nivel en el capítulo (también en el cooperativo)
  function preparar(C) {
    G.historia = C.id;
    const L = levelDef(C.nivel), D = DIF(CAPS.indexOf(C), C);
    const k = D.dur / Math.max(...C.b.map(b => b[1]));   // estira los tiempos de llegada de los jefes
    G.lv = { ...G.lv, hp: G.lv.hp * D.hp, dmg: G.lv.dmg * D.dmg };
    G.bosses = C.b.map(([id, at, fin, mult = 1]) => { const lb = L.bosses.find(q => q.id === id); return { id, at: Math.round(at * k), hp: Math.round((lb ? lb.hp : (BOSSES.find(q => q.id === id) || {}).hp) * mult * D.jefe), final: !!fin }; });
    G.hMin = 1; G.hFinT = 0;
    announce(`Capítulo ${CAPS.indexOf(C) + 1}: ${C.titulo}`, '#ffd93b');
  }

  // ─── Jefes a la medida de tu poder ───
  // Con las mejoras de la tienda y las técnicas evolucionadas, un jefe con vida fija caía en 1-2 segundos.
  // Se mide el daño que hacen los jugadores en los últimos 20 s y, al llegar, el jefe tiene al menos la vida
  // para aguantar unos segundos de ese daño (el final, 20 s en el capítulo 1 hasta ~60 s; los demás, 8 a ~24 s;
  // como ese daño se reparte entre muchos enemigos, contra él solo dura bastante más). También pega más fuerte.
  const VENT = 20;
  let dps = null;
  const de = damageEnemy;
  damageEnemy = function (e) {   // eslint-disable-line no-global-assign
    if (!G || !G.historia || !e || e.dead) return de.apply(this, arguments);
    const antes = e.hp, r = de.apply(this, arguments);
    const d = antes - Math.max(0, e.hp);
    if (d > 0 && isFinite(d)) {
      if (!dps || dps.g !== G) dps = { g: G, seg: new Array(VENT).fill(0), t: new Array(VENT).fill(-1) };
      const s0 = Math.floor(G.t), k = s0 % VENT;
      if (dps.t[k] !== s0) { dps.seg[k] = 0; dps.t[k] = s0; }
      dps.seg[k] += d;
    }
    return r;
  };
  const sb = spawnBoss;
  spawnBoss = function (b) {   // eslint-disable-line no-global-assign
    const r = sb.apply(this, arguments);
    const C = G && G.historia && capDe(G.historia), e = G && G.enemies[G.enemies.length - 1];
    if (!C || !e || !e.boss || e._aMedida) return r;
    e._aMedida = true;
    // capítulo 1: 6 s de tu daño el final, 3 s los demás; crece despacio y con tope (antes el final llegaba a 100 s)
    const i = CAPS.indexOf(C), seg = Math.min(e.final ? 6 + i * 0.6 : 3 + i * 0.3, e.final ? 25 : 10);
    const ahora = Math.floor(G.t);
    const poder = dps && dps.g === G ? dps.seg.reduce((a, v, k) => a + (dps.t[k] > ahora - VENT ? v : 0), 0) / Math.min(VENT, Math.max(1, G.t)) : 0;
    const hp = Math.round(Math.max(e.hp, poder * seg));
    e.hp = e.maxHp = hp;
    const vida = Math.max(...G.players.filter(P => !P.ally).map(P => P.maxHp || 100));
    // capítulo 1: 3,5% de tu vida por golpe; sube despacio y nunca pasa del 10% (antes llegaba al 22% en los últimos)
    e.dmg = Math.round(Math.max(e.dmg * (0.9 + i * 0.02), vida * Math.min(0.10, 0.035 + i * 0.003)));
    return r;
  };

  // ─── Cooperativo: el anfitrión elige un capítulo en la sala y cada uno juega con su guerrero ───
  // Cada capítulo es un «nivel» más ('cap:<id>') al final de BONUS_LEVELS (levelDef lo encuentra; el menú no lo muestra),
  // así viaja por la sala y el inicio de net.js sin tocarlo. newGame lo convierte en el nivel real + el capítulo.
  // Las escenas salen en todos; las estrellas, el Zeni y el progreso se los lleva cada jugador.
  for (const C of CAPS) {
    const L = LEVELS.find(q => q.id === C.nivel);
    if (L && !BONUS_LEVELS.some(q => q.id === 'cap:' + C.id)) BONUS_LEVELS.push({ ...L, id: 'cap:' + C.id, capitulo: C.id, bonus: false });
  }
  const esCap = v => typeof v === 'string' && v.startsWith('cap:');
  const nivelReal = () => { if (esCap(SAVE.level)) { SAVE.level = SAVE.lastLevel || 'saiyan'; writeSave(); } };
  nivelReal();   // (si quedó elegido un capítulo de la sala, el menú vuelve a su nivel)
  const ng = newGame;
  newGame = function (roster, net, myId, speed, level) {   // eslint-disable-line no-global-assign
    const C = esCap(level) ? capDe(level.slice(4)) : null;
    if (!C) return ng.apply(this, arguments);
    nivelReal();
    const r = ng.call(this, roster, net, myId, speed, C.nivel);
    if (net) preparar(C);
    return r;
  };
  // En la sala: los capítulos que tienes abiertos, debajo de los niveles
  const sel = $('lobbyLevel');
  if (sel) new MutationObserver(() => {
    if (sel.classList.contains('hidden') || sel.querySelector('optgroup[data-cap]')) return;
    const g = document.createElement('optgroup');
    const en = typeof LANG !== 'undefined' && LANG === 'en';
    g.dataset.cap = '1'; g.label = en ? '📖 Story Mode' : '📖 Modo Historia';
    CAPS.forEach((C, i) => {
      if (!abierto(i) || !isLevelOpen('cap:' + C.id)) return;
      const o = document.createElement('option');
      o.value = 'cap:' + C.id; o.textContent = `${en ? 'Chapter' : 'Capítulo'} ${i + 1}: ${t(C.titulo)}`;
      g.appendChild(o);
    });
    if (!g.children.length) return;
    sel.appendChild(g);
    if (esCap(SAVE.level)) sel.value = SAVE.level;
  }).observe(sel, { childList: true });

  const up = update;
  update = function () {   // eslint-disable-line no-global-assign
    const r = up.apply(this, arguments);
    if (!G || !G.historia || G.mode !== 'play') return r;
    const C = capDe(G.historia), P = G.me;
    if (P && !P.dead) G.hMin = Math.min(G.hMin, P.hp / P.maxHp);
    if (!G.hIntro && G.t > 0.4) { G.hIntro = true; window.dialogo && window.dialogo(C.intro); }
    else if (!G.hFinal && G.enemies.some(e => e.boss && e.final && !e.dead)) { G.hFinal = true; G.hFinT = G.t; window.dialogo && window.dialogo(C.final); }
    else if (C.medio) {   // escenas a mitad de la pelea: cuando el jefe baja de cierta vida
      C.medio.forEach((m, k) => {
        if ((G.hMedio || (G.hMedio = []))[k]) return;
        const e = G.enemies.find(q => q.boss && q.id === m.jefe && !q.dead);
        if (e && e.hp <= e.maxHp * m.hp && !(window.dialogo && document.querySelector('#historia:not(.hidden)'))) { G.hMedio[k] = true; window.dialogo && window.dialogo(m.lines); }
      });
    }
    return r;
  };

  // Reintentar: el mismo capítulo (no el nivel normal); el detalle de estrellas solo en los capítulos
  let ultimo = -1;
  const retry = $('btnRetry').onclick;
  $('btnRetry').onclick = function () { if (ultimo >= 0 && !(G && G.net)) jugar(ultimo); else retry.apply(this, arguments); };
  // Los capítulos no dan los logros del final de la partida (ganar un nivel, sin transformarse…)
  const ach = achEndRun;
  achEndRun = function () { if (G && G.historia) return; return ach.apply(this, arguments); };   // eslint-disable-line no-global-assign
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
    let extra = '';
    if (C.especial && est > 0 && !p._final) { p._final = 1; setProg(p); SAVE.zeni += PREMIO_FINAL; z += PREMIO_FINAL; extra += '<br>🏆 ¡Terminaste la historia! +' + PREMIO_FINAL + ' Zeni'; }
    if (!p._todas && CAPS.every(c => (p[c.id] || 0) >= 3)) { p._todas = 1; setProg(p); SAVE.zeni += PREMIO_ESTRELLAS; z += PREMIO_ESTRELLAS; extra += '<br>🌟 ¡Todas las estrellas! +' + PREMIO_ESTRELLAS + ' Zeni'; }
    writeSave();
    try {
      $('goTitle').textContent = won ? `¡Capítulo ${i + 1} superado!` : `Capítulo ${i + 1}: ${C.titulo}`;
      const box = document.createElement('p');
      box.className = 'cap-res';
      box.innerHTML = `<span class="cap-stars">${'★'.repeat(est)}${'☆'.repeat(3 - est)}</span>${z ? ` · +${z} Zeni` : ''}<br><small>★ ganar · ★ mitad de la vida o más · ★ ${retoTxt(R)}</small>${extra}`;
      $('goTitle').after(box);
    } catch (e) { /* sin detalle */ }
    return res;
  };

  // ─── Pantalla del Modo Historia ───
  const st = document.createElement('style');
  st.textContent = `#capScr { overflow-y: auto; justify-content: flex-start; padding-top: 3vh; -webkit-overflow-scrolling: touch; }
    #capScr .box { width: min(760px, 100%); }
    #capScr .cap-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    #capScr h3 { margin: 12px 0 2px; color: #ffd93b; font-size: 16px; }
    #capScr .cap { display: flex; gap: 10px; align-items: center; background: rgba(10,15,46,0.7); border: 2px solid #3a4a9a; border-radius: 10px; padding: 8px; text-align: left; }
    #capScr .cap.lock { opacity: 0.5; } #capScr .cap canvas { width: 56px; height: 56px; flex: none; background: #1d2a6b; border-radius: 8px; image-rendering: pixelated; }
    #capScr .cap div { flex: 1; min-width: 0; } #capScr .cap b { display: block; font-size: 15px; } #capScr .cap small { display: block; opacity: 0.85; font-size: 12px; }
    #capScr .cap-stars, .cap-res .cap-stars { color: #ffd93b; font-size: 18px; letter-spacing: 2px; }
    #capScr .cap-tabs { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; } .cap-res { margin: 4px 0 8px; } .cap-res small { opacity: 0.8; }`;
  document.head.appendChild(st);
  const scr = document.createElement('div');
  scr.id = 'capScr'; scr.className = 'screen overlay hidden';
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
        <small>⏱ ~${Math.round(DIF(i, C).dur / 60)} min · ★★★ ${retoTxt(C.reto)} · ${premio(i)} Zeni por estrella</small>${C.especial && !open ? '<small>Se abre al ganar todos los capítulos</small>' : ''}</div><span class="cap-stars">${open ? '★'.repeat(s) + '☆'.repeat(3 - s) : '🔒'}</span>`;
      retrato(el.querySelector('canvas'), jefe);
      el.onclick = () => { if (open) jugar(i); };
      list.appendChild(el);
    });
    $('capTot').innerHTML = `Estrellas: ${tot} / ${CAPS.length * 3}`
      + `<br><small>Terminar la historia: ${p._final ? '✓ cobrado' : '+' + PREMIO_FINAL + ' Zeni'} · Todas las estrellas: ${p._todas ? '✓ cobrado' : '+' + PREMIO_ESTRELLAS + ' Zeni'}</small>`;
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
