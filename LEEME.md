# DB Survivors Collection (APK offline)

Una sola app Android con los dos juegos, cada uno completo y sin internet:

- **DB Survivors** (dbsurvivors.xyz)
- **DBZ Survivor** (dbz-survivor.com, v2.35.1)

Al abrir la app aparece un menú para elegir. El botón **Atrás** dentro de un juego pregunta antes de volver al menú; en el menú cierra la app.
Cada juego guarda sus partidas por separado (no se mezclan).

## Qué no funciona offline

Cuentas, guardado en la nube, ranking, gacha online y co-op de DB Survivors, y el ranking/torneo online de DBZ Survivor: dependen de los servidores de cada creador.
El co-op de DBZ Survivor (PeerJS) puede funcionar si el teléfono tiene internet.

## Opción A: compilar con GitHub (sin instalar nada, incluso desde el celular)

1. Crea un repositorio nuevo en github.com (puede ser privado).
2. Sube todo el contenido de esta carpeta (incluida la carpeta oculta `.github`).
   - Desde PC: `git init`, `git add .`, `git commit -m "inicio"`, `git remote add origin <url>`, `git push -u origin main`
   - Desde la web: "Add file → Upload files" y arrastra las carpetas.
3. Ve a la pestaña **Actions**: se ejecuta "Compilar APK" sola (tarda ~3-5 min).
4. Entra a la ejecución terminada → sección **Artifacts** → descarga `DBSurvivors-APK` (un .zip con la .apk).
5. Pasa la .apk al teléfono e instálala (permite "instalar apps de fuentes desconocidas").

## Opción B: compilar en la PC (Windows)

1. Instala Android Studio.
2. File → Open → esta carpeta. Espera a que termine "Gradle sync".
3. Build → Build App Bundle(s) / APK(s) → Build APK(s).
   O en la terminal: `gradlew.bat assembleRelease`
4. La APK queda en `app/build/outputs/apk/release/`.

## Estructura

- `app/src/main/assets/www/launcher/` → menú de selección
- `app/src/main/assets/www/dbsurvivors/` → juego 1 (cambio mínimo: `window.DBS_OFFLINE` activa su modo sin servidor, el mismo que usa al abrirse como archivo)
- `app/src/main/assets/www/dbzsurvivor/` → juego 2 (PeerJS y la fuente Fredoka incluidas localmente en vez de CDN)
  - `js/` → el juego base (no se edita) · `js/mods/` → todo lo nuestro (reglas y mapa en `js/mods/LEEME.md`)
- `tests/smoke.cjs` → prueba automática: juega sola con todos los guerreros y niveles; GitHub no publica la APK si falla
- `app/src/main/java/.../MainActivity.java` → WebView a pantalla completa que sirve los juegos desde la app

## Actualizar un juego

Reemplaza los archivos de su carpeta en `assets/www/` con la versión nueva del creador, vuelve a aplicar el cambio indicado arriba, sube `versionCode` en `app/build.gradle` y recompila.

## Créditos de sprites y mapas

- Buu's Fury (The Spriters Resource): soldados Majin ripeados por SpYn; mapas de West City, Planeta del Gran Kaio y
  Roshi's Island por -Bwar-; HFIL por Flint829; Templo de Kami por SpYn y Ghost.
- Dragon Ball Sagas (estilo Legendary Super Warriors): Jiren de Exigeek y Keegixe; Toppo de thekrillmaster
  (hojas armadas con `tools/hojas/u11.py`).
- Gohan Bestia (estilo SWL+): hoja de BlackSanyT, con AlexKX29 y orumaitoobeso (armada con `tools/swl/gohan_bestia.py`).
- Formas recoloreadas (Goku Dios, Vegeta Ego, Gohan Bestia, Orange Piccolo): hechas a partir de las hojas del juego (tools/recolor).
