// ─── Inglés para lo que agregaron los mods ──────────────────────────────────
// Con el juego en inglés (LANG === 'en'):
//   · Los diálogos, títulos y sagas del Modo Historia y de las escenas se cambian en los datos al cargar.
//   · Los avisos y textos del lienzo (announce, addText, hudText) pasan por t(): se suman a EN_TEXT, y los que
//     llevan nombres o números se reconocen con patrones (PAT).
//   · Los botones y pantallas que arman los mods (historia, editor del HUD, guardar, auto-aprender…) se traducen
//     en el DOM: un observador cambia los textos que estén en el diccionario o coincidan con un patrón.
// Va después de todos los mods (al final de index.html). Falta: las firmas de identidad, el lore de las formas y
// los nombres de las técnicas nuevas siguen en español.
(() => {
  if (typeof LANG === 'undefined' || LANG !== 'en') return;
  const D = {
    // ─── Modo Historia: diálogos ───
    'Kakarotto, eres un Saiyajin como yo. Ven conmigo a conquistar planetas… o tu hijo pagará las consecuencias.': 'Kakarot, you are a Saiyan like me. Come with me and conquer planets… or your son pays the price.',
    '¡Devuélveme a Gohan! Nunca seré como tú.': 'Give Gohan back! I will never be like you.',
    'Por esta vez pelearé a tu lado, Goku. No te acostumbres.': "Just this once I'll fight by your side, Goku. Don't get used to it.",
    '¿Ustedes dos contra mí? Qué ternura.': 'You two against me? How cute.',
    'Goku, sujétalo un momento. Mi Makankosappo ya casi está listo.': 'Goku, hold him for a moment. My Special Beam Cannon is almost ready.',
    '¡Hazlo, Piccolo!': 'Do it, Piccolo!',
    'Lo derrotamos… pero dijo que vienen dos Saiyajin más fuertes.': 'We beat him… but he said two stronger Saiyans are coming.',
    'Entonces habrá que entrenar como nunca.': "Then we'll have to train like never before.",
    '¡Planten los Saibaiman! A ver cuánto aguantan los terrícolas.': "Plant the Saibamen! Let's see how long the Earthlings last.",
    'Gohan, quédate detrás de mí. Aguantaremos hasta que llegue Goku.': "Gohan, stay behind me. We'll hold on until Goku arrives.",
    '¡Basta de juegos! Yo mismo los aplastaré.': "Enough games! I'll crush you myself.",
    'Aguantamos… Ahora es el turno de Goku.': "We held on… Now it's Goku's turn.",
    'Llegué tarde… pero ya estoy aquí.': "I'm late… but I'm here now.",
    'Un guerrero de clase baja que se cree mucho. Te mostraré la diferencia.': "A low-class warrior who thinks he's something. I'll show you the difference.",
    'Si no puedo vencerte así, ¡destruiré este planeta entero!': "If I can't beat you like this, I'll destroy this whole planet!",
    '¡Kaioken!': 'Kaioken!',
    'Crearé una luna artificial… ¡y verás el verdadero poder de un Saiyajin!': "I'll make an artificial moon… and you'll see a Saiyan's true power!",
    '¡Cuidado, se está transformando en Ozaru!': "Careful, he's turning into a Great Ape!",
    'Esto no ha terminado, Kakarotto… ¡Volveré!': "This isn't over, Kakarot… I'll be back!",
    'Las Esferas de Namek pueden revivir a todos. ¡Vamos!': "Namek's Dragon Balls can bring everyone back. Let's go!",
    'Las Esferas del Dragón de Namek serán mías. La inmortalidad es para el príncipe de los Saiyajin.': "Namek's Dragon Balls will be mine. Immortality belongs to the Prince of Saiyans.",
    '¡Vegeta! Freezer me ordenó acabar contigo.': 'Vegeta! Frieza ordered me to finish you.',
    'Qué pena estropear una cara tan bonita como la mía… pero tendré que hacerlo.': "A shame to ruin a face as pretty as mine… but I'll have to.",
    'Odio mostrar esta forma… ¡Pero tú me obligaste!': 'I hate showing this form… But you forced me!',
    '¿Ese es tu secreto? Qué asco.': "That's your secret? Disgusting.",
    'Ahora sé dónde están las esferas. Freezer, ya voy por ti.': "Now I know where the balls are. Frieza, I'm coming for you.",
    'Krilin, hay soldados de Freezer por todas partes buscando las esferas.': "Krillin, Frieza's soldiers are everywhere looking for the balls.",
    'Tranquilo, Gohan. Nos ocultamos el ki y los vamos sacando de a uno.': "Easy, Gohan. We hide our ki and take them out one by one.",
    '¡Ahí están los terrícolas! ¡Freezer me recompensará por sus cabezas!': 'There are the Earthlings! Frieza will reward me for your heads!',
    'Uf… Ese era de los débiles. No quiero ni pensar en los fuertes.': "Phew… That was one of the weak ones. I don't even want to think about the strong ones.",
    '¡Recoome! ¡Burter! ¡Jeice! ¡Las Fuerzas Especiales Ginyu están aquí!': 'Recoome! Burter! Jeice! The Ginyu Force is here!',
    'Payasos con poses. Ninguno me llega a los talones.': 'Posing clowns. None of you comes close to me.',
    'Ese cuerpo tuyo… me vendría muy bien.': 'That body of yours… would suit me nicely.',
    '¡Cambio de cuerpo!': 'Body Change!',
    'No tocarás este cuerpo, payaso.': "You won't touch this body, clown.",
    'Ahora solo queda Freezer.': 'Now only Frieza is left.',
    '¿Un namekiano quiere jugar al héroe? Qué divertido.': 'A Namekian wants to play hero? How amusing.',
    'Le prometí al Gran Patriarca que protegería las esferas. No pasarás.': "I promised the Grand Elder I'd protect the balls. You shall not pass.",
    'Te dejaré atacar primero. Así verás la diferencia.': "I'll let you strike first. That way you'll see the difference.",
    'Gané tiempo… Piccolo, mi poder es tuyo. Fusiónate conmigo.': 'I bought time… Piccolo, my power is yours. Fuse with me.',
    'Nadie en el universo me ha hecho sangrar. Tú no serás el primero.': 'No one in the universe has made me bleed. You will not be the first.',
    'Lastimaste a mis amigos. Eso no te lo voy a perdonar.': "You hurt my friends. I won't forgive that.",
    'Si no puedo ganarte, ¡destruiré Namek contigo!': "If I can't beat you, I'll destroy Namek with you!",
    'Entonces terminaré esto antes de que explote.': "Then I'll finish this before it explodes.",
    'Le di al núcleo del planeta. En unos minutos Namek dejará de existir.': "I hit the planet's core. In a few minutes Namek will cease to exist.",
    'Entonces tengo que terminar esto ya.': 'Then I have to end this now.',
    'Vete, Freezer. Y no vuelvas a hacerle daño a nadie.': 'Go, Frieza. And never hurt anyone again.',
    'Hijo mío, este planeta pagará por lo que te hizo ese Saiyajin.': 'My son, this planet will pay for what that Saiyan did to you.',
    'Primero voy a destruir a sus amigos, uno por uno.': "First I'll destroy his friends, one by one.",
    'No hará falta que Goku venga. Yo me encargo.': "No need for Goku to come. I'll handle this.",
    '¿Un joven con una espada contra el rey del universo? Qué insolencia.': 'A boy with a sword against the king of the universe? How insolent.',
    'Espera… podemos hacer un trato. Únete a nosotros.': 'Wait… we can make a deal. Join us.',
    'No hago tratos con tiranos.': "I don't make deals with tyrants.",
    'Goku llega en unas horas. Tengo que advertirle sobre los androides.': 'Goku arrives in a few hours. I have to warn him about the androids.',
    'En mi futuro, estos androides destruyeron todo. Esta vez será diferente.': 'In my future, these androids destroyed everything. This time will be different.',
    '¡Despierten, 17 y 18! Acaben con ellos.': 'Wake up, 17 and 18! Finish them.',
    'Qué aburrido. ¿Este es el famoso guerrero del futuro?': 'How boring. This is the famous warrior from the future?',
    'Pero algo más se está escondiendo… Una criatura que absorbe gente.': "But something else is hiding… A creature that absorbs people.",
    'Bienvenidos a mi torneo. Muéstrenme el poder que se esconde en ese niño.': 'Welcome to my tournament. Show me the power hidden in that boy.',
    'Gohan, tú puedes. Ahora te toca a ti.': "Gohan, you can do it. It's your turn now.",
    'Ya no voy a contenerme.': "I won't hold back anymore.",
    '¡Si no puedo ganar, me llevaré la Tierra conmigo!': "If I can't win, I'll take the Earth with me!",
    '¡No! ¡Esta vez no!': 'No! Not this time!',
    'Si yo pierdo, ¡todos pierden! Voy a inflarme y explotar.': "If I lose, everyone loses! I'll swell up and explode.",
    '¡Gohan, termínalo antes de que explote!': 'Gohan, finish him before he explodes!',
    'Lo hiciste, hijo. Estoy orgulloso de ti.': "You did it, son. I'm proud of you.",
    '¡Con la energía de esta pelea, Majin Buu despertará!': "With this fight's energy, Majin Buu will awaken!",
    'Un brujo enano no me va a dar órdenes.': "A dwarf wizard won't give me orders.",
    'El Rey de los Demonios te enseñará lo que es el miedo.': 'The Demon King will teach you what fear is.',
    'Babidi… ¿qué es ese capullo que se abre?': "Babidi… what's that cocoon opening?",
    'Goten y Trunks lograron la fusión. ¡Ahora sí tenemos una oportunidad!': 'Goten and Trunks pulled off the fusion. Now we have a chance!',
    '¡Soy Gotenks, el guerrero más genial del universo!': "I'm Gotenks, the coolest warrior in the universe!",
    'Huelo poder… Te voy a absorber.': "I smell power… I'm going to absorb you.",
    '¡Ja! ¡Nadie le gana a Gotenks!': 'Ha! Nobody beats Gotenks!',
    'Kakarotto… yo lo distraigo. Junta la energía de todos.': "Kakarot… I'll distract him. Gather everyone's energy.",
    'Gracias, Vegeta. ¡Terrícolas, préstenme su energía!': 'Thanks, Vegeta. People of Earth, lend me your energy!',
    '¡Buu destruye! ¡Buu destruye todo!': 'Buu destroy! Buu destroy everything!',
    '¡Kakarotto, apúrate con esa Genkidama! No aguantaré mucho más.': "Kakarot, hurry up with that Spirit Bomb! I can't hold much longer.",
    '¡Ya casi, Vegeta!': 'Almost there, Vegeta!',
    'Ojalá renazcas como alguien bueno… y peleemos otra vez.': "I hope you're reborn as someone good… and we fight again.",
    'Las puertas del Infierno se abrieron. Gozu y Mezu dejaron escapar a todos.': 'The gates of Hell are open. Goz and Mez let everyone escape.',
    '¡Entonces los devolvemos adentro!': 'Then we send them back in!',
    '¡Nadie pasa por la puerta del Infierno sin permiso de Enma!': "No one passes Hell's gate without King Yemma's permission!",
    'Las puertas están cerradas otra vez. Pero algo más grande se está moviendo.': 'The gates are closed again. But something bigger is stirring.',
    'Algo salió de la máquina de las almas. Los muertos están volviendo a la Tierra.': 'Something came out of the soul machine. The dead are returning to Earth.',
    'Entonces habrá que cerrarle el paso.': "Then we'll have to block its way.",
    '¡¡Ja… nem… baaa!!': 'Ja… nem… baaa!!',
    'Todo vuelve a la normalidad. Nada mal, Goku.': 'Everything is back to normal. Not bad, Goku.',
    'Mi hermano fue un débil. Yo vengo a terminar lo que empezó.': 'My brother was weak. I came to finish what he started.',
    'Otro de la familia de Freezer… Qué cansado.': "Another one of Frieza's family… How tiring.",
    'Kakarotto… ¿Dónde estás, Kakarotto?': 'Kakarot… Where are you, Kakarot?',
    'Ese poder… no puede ser.': "That power… it can't be.",
    '¡Soy un demonio!': 'I am a devil!',
    'Cuanto más lo golpeo, más fuerte se vuelve…': 'The more I hit him, the stronger he gets…',
    'El príncipe de los Saiyajin no se arrodilla ante nadie.': 'The Prince of Saiyans kneels before no one.',
    'Un mes de entrenamiento y mira lo que logré. ¡Golden Freezer!': 'One month of training and look what I achieved. Golden Frieza!',
    'Tú también entrenaste, ¿eh? Esto va a ser divertido.': 'You trained too, huh? This is going to be fun.',
    'Tengo hambre y estoy aburrido. Sorpréndeme o destruyo la Tierra.': "I'm hungry and bored. Surprise me or I destroy the Earth.",
    '¡Le daré todo lo que tengo!': "I'll give it everything I've got!",
    'Nada mal. Quizás no destruya la Tierra… hoy.': "Not bad. Maybe I won't destroy the Earth… today.",
    'Diez años de entrenamiento en la Habitación del Tiempo. Ya no soy el mismo.': "Ten years of training in the Time Chamber. I'm not the same anymore.",
    'Te derroté una vez. Puedo hacerlo otra.': 'I beat you once. I can do it again.',
    'Black Freezer. Ni Goku ni Vegeta pudieron conmigo.': 'Black Frieza. Neither Goku nor Vegeta could handle me.',
    'Entonces conocerás a la Bestia.': "Then you'll meet the Beast.",
    'Ya no voy a esconderme detrás de nadie.': "I won't hide behind anyone anymore.",
    'Ocho universos y un solo ring. El que cae afuera queda eliminado.': "Eight universes and one ring. Whoever falls off is eliminated.",
    '¡En nombre de la justicia, el Universo 11 no va a perder!': 'In the name of justice, Universe 11 will not lose!',
    'La fuerza lo es todo. Lo demás no importa.': 'Strength is everything. Nothing else matters.',
    'Entonces te mostraré la fuerza de los que pelean juntos.': "Then I'll show you the strength of those who fight together.",
    'Nunca había tenido que llegar tan lejos.': 'I have never had to go this far.',
    '¡Entonces sigue! ¡Esto apenas empieza!': 'Then keep going! This is just getting started!',
    '…Interesante. Tal vez estaba equivocado.': '…Interesting. Perhaps I was wrong.',
    '¡Ganamos! El Universo 7 sigue en pie.': 'We won! Universe 7 still stands.',
    'Todos los enemigos que derrotamos volvieron al mismo tiempo.': 'Every enemy we ever defeated came back at once.',
    'Kakarotto… detesto decirlo, pero esta vez hay que fusionarse.': 'Kakarot… I hate to say it, but this time we have to fuse.',
    '¡Soy Gogeta! Y esto se termina hoy.': 'I am Gogeta! And this ends today.',
    'Uno contra uno. Muéstrame si su unión es fuerza de verdad.': 'One on one. Show me whether your union is true strength.',
    'Esta fuerza… no la había sentido nunca.': 'This strength… I have never felt it before.',
    '¡Es la fuerza de todos los que pelearon antes que nosotros!': "It's the strength of everyone who fought before us!",
    'Lo logramos, Vegeta.': 'We did it, Vegeta.',
    'No te acostumbres, Kakarotto.': "Don't get used to it, Kakarot.",
    'La Tierra está a salvo. Esta vez, de verdad.': 'The Earth is safe. For real this time.',
    // escenas de los niveles normales (js/mods/historia.js)
    'Así que aquí se escondió mi hermano menor… Qué planeta tan débil.': 'So this is where my little brother hid… What a weak planet.',
    '¡No sé quién eres, pero no vas a tocar a nadie aquí!': "I don't know who you are, but you won't touch anyone here!",
    'Raditz va adelante. Nosotros llegamos en un rato… ¡que no se acaben antes!': "Raditz is ahead. We'll arrive soon… don't die before we get there!",
    'Soy el príncipe de los Saiyajin. Un guerrero cualquiera no puede ganarme.': 'I am the Prince of Saiyans. No ordinary warrior can beat me.',
    '¡Eso ya lo veremos!': "We'll see about that!",
    'Esto no termina aquí… ¡La próxima vez no tendré piedad!': "This doesn't end here… Next time I'll show no mercy!",
    'Se fue. Pero ganamos tiempo para entrenar.': "He's gone. But we gained time to train.",
    'Con las Esferas del Dragón de Namek tendré la vida eterna. Nadie se interpondrá.': "With Namek's Dragon Balls I'll have eternal life. No one will stand in my way.",
    '¡Fuerzas Especiales Ginyu, en posición!': 'Ginyu Force, in position!',
    'Hay que encontrar las esferas antes que ellos.': 'We have to find the balls before they do.',
    'Ahora sí vas a conocer el verdadero terror.': "Now you'll know true terror.",
    '¡No vas a destruir este planeta!': "You won't destroy this planet!",
    'Se acabó, Freezer.': "It's over, Frieza.",
    'Namek está a salvo… por ahora.': 'Namek is safe… for now.',
    'Mis androides son perfectos. ¡Acaben con todos!': 'My androids are perfect. Finish them all!',
    'Tenemos un solo objetivo. Lo demás nos da igual.': "We have one goal. We don't care about the rest.",
    'Hay que pararlos antes de que esa cosa los encuentre.': 'We have to stop them before that thing finds them.',
    'Por fin soy perfecto. Organicemos un torneo… y diviértanme un rato.': "I'm finally perfect. Let's hold a tournament… and entertain me.",
    'Vas a lamentar haber esperado.': "You'll regret waiting.",
    'Lo logramos… La Tierra vuelve a estar en paz.': 'We did it… The Earth is at peace again.',
    '¡Con la energía de esta pelea, Majin Buu va a despertar!': "With this fight's energy, Majin Buu will awaken!",
    'El Rey de los Demonios obedece a Babidi. Por ahora.': 'The Demon King obeys Babidi. For now.',
    'Hay que detenerlos antes de que liberen a Buu.': 'We have to stop them before they free Buu.',
    '¡Buu destruye todo!': 'Buu destroy everything!',
    'Este es el combate final… ¡con todo lo que tengo!': "This is the final fight… with everything I've got!",
    'Ojalá renazca como alguien bueno… y podamos pelear otra vez.': 'I hope he is reborn as someone good… and we can fight again.',
    'Kaio-sama preparó un desafío sin fin. ¿Cuánto vas a aguantar?': 'King Kai prepared an endless challenge. How long will you last?',
    '¡Hasta el final!': 'To the very end!',
    'Bienvenido al Otro Mundo. Aquí pelean los mejores guerreros que ya partieron.': 'Welcome to Other World. The best departed warriors fight here.',
    'Entonces vine al lugar correcto.': 'Then I came to the right place.',
    'Esa cosa está deformando todo el Otro Mundo.': "That thing is warping all of Other World.",
    'Todo vuelve a la normalidad. Buen combate.': 'Everything is back to normal. Good fight.',
    'Volví del Infierno… y no vine solo.': "I came back from Hell… and I didn't come alone.",
    'Freezer, Cooler, Broly… ¿todos a la vez?': 'Frieza, Cooler, Broly… all at once?',
    'Tengo hambre y estoy aburrido. Sorpréndeme… o destruyo este planeta.': "I'm hungry and bored. Surprise me… or I destroy this planet.",
    '¡Entonces prepárate para sorprenderte!': 'Then get ready to be surprised!',
    '¡Que empiece el Torneo del Poder!': 'Let the Tournament of Power begin!',
    // títulos y sagas
    'El hermano de Goku': "Goku's Brother", 'Los Saibaiman': 'The Saibamen', 'El príncipe de los Saiyajin': 'The Prince of Saiyans', 'Rumbo a Namek': 'Bound for Namek',
    'Escondidos en Namek': 'Hiding on Namek', 'Las Fuerzas Especiales Ginyu': 'The Ginyu Force', 'El guerrero de Namek': 'The Warrior of Namek', 'El Super Saiyajin legendario': 'The Legendary Super Saiyan',
    'El guerrero del futuro': 'The Warrior from the Future', 'Los androides': 'The Androids', 'El Cell Game': 'The Cell Games', 'La nave de Babidi': "Babidi's Ship", 'La fusión': 'The Fusion',
    'La Genkidama final': 'The Final Spirit Bomb', 'Los guardianes del Infierno': 'The Guardians of Hell', 'El Otro Mundo se deforma': 'Other World Warps', 'El Saiyajin legendario': 'The Legendary Saiyan',
    'El Dios de la Destrucción': 'The God of Destruction', 'El regreso de Freezer': "Frieza's Return", 'El Torneo del Poder': 'The Tournament of Power', 'La batalla final': 'The Final Battle',
    'Saga Saiyajin': 'Saiyan Saga', 'Saga de Freezer': 'Frieza Saga', 'Saga de Cell': 'Cell Saga', 'Saga de Majin Buu': 'Majin Buu Saga', 'Películas': 'Movies',
    // ─── Pantallas y botones ───
    '📖 Historia': '📖 Story', '📖 Modo Historia': '📖 Story Mode', 'Misiones diarias': 'Daily missions', 'Logros': 'Achievements', 'Volver': 'Back',
    'Se abre al ganar todos los capítulos': 'Unlocks after winning every chapter', 'Modo Historia: los capítulos no entran al ranking.': 'Story Mode: chapters are not ranked.',
    'Siguiente ▸': 'Next ▸', 'Continuar ▸': 'Continue ▸', 'Saltar': 'Skip', 'Tú': 'You',
    '💾 Guardar y salir': '💾 Save & quit', 'No se puede guardar aquí': "Can't save here", '¡Partida recuperada! Toca continuar cuando estés listo': 'Run restored! Resume when you are ready',
    '✏️ Editar HUD': '✏️ Edit HUD', 'Restablecer todo': 'Reset all', 'Listo': 'Done', '¿Seguro? Toca otra vez': 'Sure? Tap again', 'Tamaño': 'Size', 'Girar': 'Rotate', 'Opacidad': 'Opacity',
    'Ocultar': 'Hide', 'Mostrar': 'Show', 'Reiniciar': 'Reset', '✏️ Toca una pieza y arrástrala · con dos dedos: tamaño y giro': '✏️ Tap a piece and drag it · two fingers: size and rotation',
    'Barra de experiencia': 'XP bar', 'Tu guerrero': 'Your fighter', 'Esferas y deseos': 'Dragon Balls & wishes', 'Técnicas y mejoras': 'Techniques & upgrades', 'Compañeros': 'Teammates',
    'Reloj': 'Timer', 'Bajas': 'Kills', 'Barra de Ki': 'Ki bar', 'Barra de jefes': 'Boss bar', 'Minimapa': 'Minimap', 'Anuncios': 'Announcements', 'Botón ¡KI!': 'KI! button', 'Pausa': 'Pause',
    'Botón del mapa': 'Map button', 'Música': 'Music', 'Sonido': 'Sound',
    '🤖 Auto-aprender: NO': '🤖 Auto-learn: OFF', '🤖 Auto-aprender: SÍ (toca para elegir tú)': '🤖 Auto-learn: ON (tap to pick yourself)', 'Repetir escenas de la historia': 'Replay story scenes', '¡Listo! Se verán otra vez': 'Done! They will play again',
    // ─── Avisos del juego ───
    '¡Vegeta mira la luna artificial y se vuelve Ozaru!': 'Vegeta looks at the artificial moon and becomes a Great Ape!',
    '¡Freezer lanzó su ataque al núcleo de Namek! Tienes 90 s': "Frieza struck Namek's core! You have 90 s",
    '¡El planeta tiembla! Freezer se recupera… otros 90 s': 'The planet shakes! Frieza recovers… another 90 s',
    '¡Cell se va a autodestruir! Termínalo en 6 s': 'Cell is going to self-destruct! Finish him in 6 s',
    '¡Cell regresó de la explosión más fuerte que nunca!': 'Cell came back from the explosion stronger than ever!',
    '¡Kid Buu se regenera! No dejes de golpearlo': "Kid Buu regenerates! Don't stop hitting him",
    '¡Janemba muestra su verdadera forma: Super Janemba!': 'Janemba shows his true form: Super Janemba!',
    '¡La furia de Broly no deja de crecer!': "Broly's rage keeps growing!",
    '¡Golden Freezer se quedó sin energía! Es tu momento': 'Golden Frieza ran out of stamina! Now is your chance',
    '¡Toppo despierta su poder de Dios de la Destrucción!': 'Toppo awakens his God of Destruction power!',
    '¡Jiren rompe su límite!': 'Jiren breaks his limit!', '¡Zarbon se transforma en monstruo!': 'Zarbon turns into a monster!',
    '¡Black Freezer se lanza con todo su poder!': 'Black Frieza attacks with all his power!',
    '¡Salió la luna llena!': 'The full moon is out!', '¡Miras la luna… y te conviertes en Ozaru!': 'You look at the moon… and become a Great Ape!',
    'La luna se ocultó: vuelves a tu forma': 'The moon is gone: you return to normal',
    '¡Empieza el Torneo del Poder! No salgas del ring': "The Tournament of Power begins! Don't leave the ring", '¡El ring ya no se achica más!': 'The ring stops shrinking!',
    '¡VUELVE AL RING!': 'BACK TO THE RING!', '¡Fuera del ring!': 'Out of the ring!',
    '¡Me inflo…!': "I'm swelling up…!", '¡BOOM!': 'BOOM!', '¡Recoome!': 'Recoome!', '¡Pose de combate!': 'Fighting pose!', '¡Mírenme!': 'Look at me!',
    '¡El Gran Patriarca liberó mi poder!': 'The Grand Elder unlocked my power!', '¡Garra del Lobo!': 'Wolf Fang Fist!', '¡Kikoho!': 'Tri-Beam!',
    '¡Una semilla y a pelear!': 'One bean and back to the fight!', '¡Patada voladora!': 'Flying kick!', '¡No subestimes a una Saiyajin!': "Don't underestimate a Saiyan girl!",
    '¡Mi poder supera al de mi hermano!': "My power surpasses my brother's!", '¡Double Sunday!': 'Double Sunday!', '¡Explosión gigante!': 'Giant explosion!', '¡Dodonpa!': 'Dodon Ray!',
    '¡Fuerzas Especiales Ginyu!': 'Ginyu Force!', '¡Recoome Ultra Fighting Pose!': 'Recoome Ultra Fighting Pose!', '¡El más rápido del universo!': 'The fastest in the universe!', '¡Crusher Ball!': 'Crusher Ball!',
  };
  // Textos con nombres o números: [patrón, reemplazo]
  const PAT = [
    [/^¡(.+) se une contra Raditz!$/, '$1 joins the fight against Raditz!'],
    [/^¡Cell absorbió a (.+)!$/, 'Cell absorbed $1!'], [/^¡Super Buu absorbió a (.+)!$/, 'Super Buu absorbed $1!'],
    [/^Namek explota en (\d+) s$/, 'Namek explodes in $1 s'], [/^¡Autodestrucción en (\d+)!$/, 'Self-destruct in $1!'],
    [/^¡(.+) mira la luna y se vuelve Ozaru!$/, '$1 looks at the moon and becomes a Great Ape!'],
    [/^Capítulo (\d+): (.+)$/, (m, n, x) => `Chapter ${n}: ${D[x] || x}`], [/^¡Capítulo (\d+) superado!$/, 'Chapter $1 cleared!'],
    [/^Juegas con (.+) · contra (.+)$/, 'Playing as $1 · vs $2'],
    [/^★★★ Derrota al jefe final en menos de (\d+) s desde que llega · (\d+) Zeni por estrella$/, '★★★ Beat the final boss within $1 s of its arrival · $2 Zeni per star'],
    [/^★★★ No bajes nunca del (\d+)% de vida · (\d+) Zeni por estrella$/, '★★★ Never drop below $1% HP · $2 Zeni per star'],
    [/^★★★ Derrota (\d+) enemigos · (\d+) Zeni por estrella$/, '★★★ Defeat $1 enemies · $2 Zeni per star'],
    [/^★ ganar · ★ mitad de la vida o más · ★ Derrota al jefe final en menos de (\d+) s desde que llega$/, '★ win · ★ half HP or more · ★ beat the final boss within $1 s'],
    [/^★ ganar · ★ mitad de la vida o más · ★ No bajes nunca del (\d+)% de vida$/, '★ win · ★ half HP or more · ★ never drop below $1% HP'],
    [/^★ ganar · ★ mitad de la vida o más · ★ Derrota (\d+) enemigos$/, '★ win · ★ half HP or more · ★ defeat $1 enemies'],
    [/^Estrellas: (\d+) \/ (\d+)$/, 'Stars: $1 / $2'],
    [/^Terminar la historia: (.+) · Todas las estrellas: (.+)$/, (m, a, b) => `Finish the story: ${a.replace('cobrado', 'claimed')} · All stars: ${b.replace('cobrado', 'claimed')}`],
    [/^▶ Continuar$/, '▶ Continue'], [/^(.+) · Nivel (\d+) · (\d+:\d+) · Nv (\d+)$/, '$1 · Level $2 · $3 · Lv $4'],
    [/^(.+) \(oculto\)$/, (m, x) => `${D[x] || x} (hidden)`],
    [/^🏆 ¡Terminaste la historia! \+(\d+) Zeni$/, '🏆 You finished the story! +$1 Zeni'], [/^🌟 ¡Todas las estrellas! \+(\d+) Zeni$/, '🌟 All stars! +$1 Zeni'],
  ];
  const tr = s => {
    if (typeof s !== 'string') return s;
    const k = s.trim();
    if (D[k] !== undefined) return s.replace(k, D[k]);
    for (const [re, rep] of PAT) if (re.test(k)) return s.replace(k, k.replace(re, rep));
    return s;
  };
  window.trMods = tr;

  // 1) Datos: diálogos, títulos y sagas
  const linea = L => { if (Array.isArray(L) && typeof L[1] === 'string') L[1] = tr(L[1]); };
  for (const C of window.CAPITULOS || []) {
    C.titulo = tr(C.titulo); C.saga = tr(C.saga);
    for (const k of ['intro', 'final', 'fin']) (C[k] || []).forEach(linea);
    for (const m of C.medio || []) m.lines.forEach(linea);
  }
  for (const lv of Object.values(window.HISTORIA || {})) for (const k in lv) lv[k].forEach(linea);

  // 2) Lienzo: avisos, textos flotantes y textos del HUD
  for (const k in D) if (EN_TEXT[k] === undefined) EN_TEXT[k] = D[k];
  const t0 = t;
  t = function (s, params) { const r = t0.apply(this, arguments); return r === s ? tr(r) : r; };   // eslint-disable-line no-global-assign
  const ht = hudText;
  hudText = function (text) { arguments[0] = tr(text); return ht.apply(this, arguments); };   // eslint-disable-line no-global-assign

  // 3) DOM que arman los mods
  const ZONAS = '#capScr, #historia, #hudEd, #btnContinue, #btnSaveQuit, #btnHistoria, #btnHudEd, #autoBtn, .auto-row, .cap-res, #goTitle, #goRank, #btnDaily';
  const walk = root => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  };
  const fix = () => { for (const el of document.querySelectorAll(ZONAS)) walk(el); };
  let pend = false;
  new MutationObserver(() => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; fix(); }); } })
    .observe(document.body, { childList: true, subtree: true, characterData: true });
  fix();
})();
