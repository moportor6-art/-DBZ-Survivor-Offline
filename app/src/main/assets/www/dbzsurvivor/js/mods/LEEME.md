# Mods de DBZ Survivor

Todo lo que agregamos al juego original vive en esta carpeta. Los archivos de `js/` (fuera de `mods/`)
son el juego base de DBZ Survivor (v2.35.1) y **no se editan**. Así, si sale una versión nueva del
creador, se reemplaza `js/` y nuestros mods se vuelven a enganchar solos.

## Reglas

1. **Cambiar algo del juego = un mod.** Para cambiar cómo funciona una función de `game.js`, se
   "envuelve" desde un mod (ver `kiai.js` o `tienda.js`):
   ```js
   (() => {
     const original = damageEnemy;
     damageEnemy = function (...args) {
       // lo nuestro antes o después
       return original.apply(this, args);
     };
   })();
   ```
2. **Datos nuevos = `mods/datos/`.** Guerreros, técnicas, enemigos, niveles y artículos de la tienda.
3. **El orden de carga importa** y está en un solo lugar: los `<script>` de `index.html`, con comentarios.
   Un archivo nuevo va en el grupo que le corresponde.
4. **Antes de subir:** `node tests/smoke.cjs --rapida` (1-2 min). GitHub corre la prueba completa
   y, si falla, no publica la APK.

## Qué hay en cada archivo

| Archivo | Qué hace | Se carga después de |
|---|---|---|
| `datos/tecnicas.js` | Técnicas nuevas y usuarios extra de técnicas existentes | `data.js` |
| `datos/enemigos.js` | Enemigos, jefes, gigantes, niveles 6 y 7, saga de Buu | `datos/tecnicas.js` |
| `datos/guerreros.js` | Jugables nuevos, sus hojas de sprites, regeneración por raza | `datos/enemigos.js` (reusa hojas de jefes) |
| `datos/mejoras.js` | Kiai, artículos nuevos de la tienda, `maxPassives`, `beamAngles` | `datos/guerreros.js` |
| `mapas.js` | Escenarios de los niveles nuevos | `maps.js` |
| `formas.js` | Escalera de formas: efectos propios (velocidad, esquiva, regeneración…) y lore de cada forma | `game.js` |
| `trajes.js` | Trajes (solo apariencia) | `formas.js` |
| `tienda.js` | Efectos en partida de los artículos nuevos de la tienda | `game.js` |
| `kiai.js` | Efecto e ícono de la mejora Kiai | `game.js` |
| `musica.js` | Música mp3 | `game.js` |
| `misiones.js` | Misiones diarias | `game.js` |
| `pestanas.js` | Pestañas para filtrar guerreros | `game.js` |
| `graficos.js` | Límite de FPS, 90/120 Hz, resolución, modo batería | `game.js` |
| `actualizaciones.js` | Ventana de Actualizaciones (la hace `Updater.java`) | `game.js` |
| `recetas.js` | Receta de evolución en las cartas de subir de nivel | `game.js` |
| `identidad.js` | Firma de cada guerrero (mecánica única), aliados invocados, enemigos aliados, posesión de Babidi | **al final**, después de `ki.js` |
| `maestria.js` | Las formas se desbloquean derrotando enemigos con cada guerrero (localStorage `fusion.maestria`) | después de `identidad.js` |
| `companero.js` | Compañero de equipo en solitario: crece contigo, vuelve si cae, dúos de la serie +15%, fusión con Vegeta/Goku | después de `maestria.js` |
| `potencial.js` | Poses de Recoome, Spopovich se infla y explota, y un efecto propio al transformarse para los de "Potencial liberado" y las Fuerzas Ginyu | antes de `animaciones.js` |
| `ginyu.js` | Ginyu: Cambio de cuerpo permanente (botón 👤/tecla B, 60 s), segunda fila de 3 técnicas del cuerpo, formas del cuerpo, Adaptación 0-6 (vida, Ki, daño, proyectiles extra, firma del dueño en el 6). Usa `window.MAJIN_TABLA` de identidad.js | después de `potencial.js` |
| `animaciones.js` | Aura de DB Survivors teñida por forma (reemplaza drawAura), carga de Ki, transformación (Goku: la animación de DB Survivors), Kaioken, chispas de impacto. Recursos en assets/sprites/fx (tools/hojas/dbs_fx.py) | después de `companero.js` |
| `jefes.js` | Mecánicas de la serie por jefe (Vegeta Ozaru, cuenta atrás de Freezer, autodestrucción de Cell, absorciones, Hakai…); estado en `e.jf` | después de `companero.js` |
| `luna.js` | Luna llena en la saga Saiyajin (270–300 s): Ozarus enemigos y los Saiyajin con cola se vuelven Ozaru | después de `jefes.js` |
| `poder.js` | Nivel 8 · Torneo del Poder: el ring que se encoge y el vacío (datos en `datos/enemigos.js`, suelo en `mapas.js`) | después de `luna.js` |
| `red.js` | Cooperativo: el anfitrión manda cada 0,3 s el estado de los mods (formas, Ozaru, aliados, marcas, jefes cambiados) en un aviso de texto que el invitado intercepta | antes de `historia.js` |
| `autoaprender.js` | Auto-aprender: elige solo la carta al subir de nivel (evoluciones primero, técnicas propias, la mejora que falta para cada fusión, estilo de cada guerrero); localStorage `fusion.auto` | después de `red.js` |
| `editarhud.js` | Editor del HUD (pausa → ✏️ Editar HUD): mover, tamaño, giro, opacidad y ocultar cada pieza; localStorage `fusion.hud`. Debe ser el último que envuelve `drawHUD` | después de `autoaprender.js` |
| `guardar.js` | Guardar y salir (pausa), autoguardado al cerrar la app y cada 20 s, ▶ Continuar en el menú; localStorage `fusion.partida` (se borra al continuar, al empezar otra o al terminar) | después de `editarhud.js` |
| `bestia.js` | Técnicas de forma: Gohan Bestia (Despertar de la Bestia al entrar y Makankosappo automático) y Black Freezer (onda Poder Black al entrar y triple Rayo Mortal Negro automático) | después de `guardar.js` |
| `capitulos.js` | Modo Historia: 14 capítulos con guerrero, jefes, escenas, estrellas y Zeni; misiones y logros en la misma pantalla; localStorage `fusion.capitulos` | antes de `historia.js` (usa `window.dialogo`) |
| `historia.js` | Escenas con retratos al empezar, al llegar el jefe final y al ganar (localStorage `fusion.historia`) | **la última de todas** (después de `telemetry.js`): es la que congela `update` y necesita `tourPortrait` |
| `ingles.js` | Inglés para lo de los mods: diálogos y títulos (en los datos), avisos del lienzo (t, hudText) y botones/pantallas (observador del DOM) | **al final**, después de `historia.js` |
| `ki.js` | Ki estilo Earth Special Forces: cargar, gasto por segundo, subir/bajar forma, botón tocar/mantener, HUD | **al final** (envuelve a todos) |

## Puntos de enganche dentro del código base

Son las únicas líneas del juego base que cambiamos, porque eran expresiones sueltas que no se
podían envolver desde afuera. **Si se actualiza el juego base, hay que volver a ponerlas:**

| Archivo base | Antes | Ahora | Función (en) |
|---|---|---|---|
| `game.js` y `combos.js` | `MAX_PASSIVES` (10 lugares) | `maxPassives(P)` | `datos/mejoras.js` |
| `game.js` (`fireAttacks`) | `def.both ? [ang, ang + Math.PI] : [ang]` | `beamAngles(P, def, ang)` | `datos/mejoras.js` |
| `game.js` (`attackStats`) | `s.count >= 2` | `s.count >= 1` | (Multiplicación desde 1 proyectil) |
| `game.js` (2 lugares) | `(P.c.regen \|\| 0)` | `charRegen(P)` | `datos/guerreros.js` |
| `game.js` (`isLevelOpen`) | — | lee `openAfter` | niveles de `datos/enemigos.js` |

Para encontrarlas: `grep -n "maxPassives\|beamAngles\|charRegen\|openAfter" js/game.js js/combos.js`

## Ki estilo ESF (`ki.js`)

- Mantener Ki sin transformarse = cargar (te mueves al 35%). Tocar con el Ki lleno = transformarse.
- Transformado: gasta Ki por segundo (`DRAIN`, por escalón); tocar = subir de forma (50% de Ki mínimo); mantener = bajar
  (en la 1.ª, vuelve a base y conserva el Ki).
- Lo bajan: Recarga de Ki (tienda, 20 niveles), Dominio de la transformación (tienda, formas 2+), Dominio del Ki (carta)
  y `transformTime` del guerrero.
- Cooperativo: el invitado manda sus órdenes con el mensaje `tr` de la base y un ángulo de 1001 a 1004 como código.
  Limitación: el invitado no ve el nombre/sprite de la forma alta de los demás (la base no sincroniza la forma).
- Para darle formas a un guerrero: agrégalo en `FORMS` (y su lore en `FIRST`) de `formas.js`, con su hoja en `SHEETS`.

## Identidad de cada guerrero (`identidad.js`)

- `ID.<guerrero>` = su firma, con ganchos: `setup`, `tick`, `dmg`, `vs`, `hit`, `hurt`, `kill`, `transform`, `revive`
  y valores `def`, `spd`, `crit`, `exec` (ver el comentario al inicio del archivo).
- Aliados guerreros (`summonAlly`): jugadores con `ally` y `summon`; pelean con sus técnicas reales (Dabura, Majin Vegeta,
  Burter, Androide 16...). Enemigos aliados (`spawnFriend`, `possess`): soldados, Saibaimans, Cell Jr., robots y
  poseídos con la M de Babidi; durante el paso de la base salen de `G.enemies` para que nadie los ataque.
- Técnicas nuevas: `datos/tecnicas.js` (Fase 8). Formas nuevas: `formas.js` (`sprite: A('clave')` reusa una hoja).
- Limitación en cooperativo: el invitado no ve a los aliados invocados (la base solo sincroniza a los jugadores de la sala).
