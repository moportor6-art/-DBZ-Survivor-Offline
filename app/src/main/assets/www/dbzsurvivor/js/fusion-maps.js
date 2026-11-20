'use strict';
// ─── Fusión: escenarios de los niveles nuevos (se carga después de js/maps.js) ───
// Usan el mismo sistema de la base que el Nivel 3: colores del suelo y rocas/arbustos generados.

// Nivel 6 · El Infierno del Otro Mundo: tierra roja, ríos de lava y rocas moradas
THEMES.infierno = {
  sand: ['#9a3e36', '#8a352f', '#ab4a40'], dirt: ['#5e2436', '#521f30', '#6c2a3e'], edge: '#3e1222',
  grass: ['#d8702a', '#c45f20', '#ea8638'], gedge: '#8a3a14',
  det: { tuftDark: '#7a2a1a', tuftLite: '#ffb060', sandA: '#7a2e2a', sandB: '#c26050', dirtA: '#3e1222', dirtB: '#8a4058',
    crack: '#5a1a1a', crater: ['#c25a4a', '#6a2626', '#7a2e2a', '#5a2020', '#682828'] },
  rock: { a: '#b48ac8', b: '#8e64a6', c: '#6c4884', d: '#4e3064', e: '#38204c', f: '#dcc0ec' },
  bush: { a: '#a83a3a', b: '#862c2c', c: '#622020', d: '#d86060', e: '#3a1a1a' },
  map: ['#9a3e36', '#5e2436', '#d8702a'], spires: 0.7, trees: 0, bg: '#1a0508',
};

// Nivel 7 · Páramo de las películas: tierra gris azulada, polvo y pasto seco
THEMES.yermo = {
  sand: ['#b9b4a8', '#aaa598', '#c8c3b6'], dirt: ['#8e8a9e', '#7e7a8e', '#9e9aae'], edge: '#5e5a6e',
  grass: ['#9aa070', '#868c5e', '#adb382'], gedge: '#6a704a',
  det: { tuftDark: '#6c7248', tuftLite: '#c6cc9a', sandA: '#8a8578', sandB: '#d8d3c6', dirtA: '#5e5a6e', dirtB: '#b8b4c8',
    crack: '#78737e', crater: ['#d6d1c4', '#888376', '#948f82', '#7a7568', '#86817a'] },
  rock: { a: '#d0cce0', b: '#aaa6bc', c: '#888498', d: '#686478', e: '#4e4a5e', f: '#ece8f6' },
  bush: { a: '#8a9a5e', b: '#6c7c48', c: '#526036', d: '#b4c286', e: '#4a3a2a' },
  map: ['#b9b4a8', '#8e8a9e', '#9aa070'], spires: 0.6, trees: 0, bg: '#14141e',
};

// ─── Fase 4: mapas con las piezas de DB Survivors (assets/maps/dbs-*), armados con sheetTheme como los de la base ───
// Una fila de choques a lo largo de la base de un edificio (x, y: pie del centro; w: ancho)
const fusionWall = (x, y, w, r = 24) => {
  const out = [], n = Math.max(1, Math.round(w / (r * 1.6)));
  for (let i = 0; i < n; i++) out.push([Math.round(x - w / 2 + r + (i * (w - 2 * r)) / Math.max(1, n - 1)), y - 8, r]);
  return out;
};

// Nivel 6 · Otro Mundo: el pasto del Otro Mundo con zonas del Infierno; se arranca frente al palacio
THEMES['otromundo-dbs'] = { ...THEMES.infierno, bg: '#0e1a0a' };
sheetTheme('otromundo-dbs', {
  base: 'dbs-otro-grass', alt: 'dbs-hell-ground', altZone: 0.6, edge: '#5a3a10', map: ['#3fb83a', '#c8902a', '#2a6a1a'],
  outline: true,
  spawn: [{ name: 'dbs-palace', x: 0, y: -150, r: 0, colliders: fusionWall(0, -150, 470) }],
  props: [
    { names: ['dbs-otrotree1', 'dbs-otrotree2', 'dbs-otrotree3', 'dbs-otrotree4', 'dbs-otrotree5'], r: 12, max: 2, cluster: true, onBase: true },
    { names: ['dbs-helltree1', 'dbs-helltree2', 'dbs-helltree3', 'dbs-helltree4', 'dbs-helltree5', 'dbs-helltree6'], r: 8, max: 3, onAlt: true },
    { names: ['dbs-otrocol1', 'dbs-otrocol2'], r: 7, max: 1, chance: 0.35, onBase: true },
  ],
});

// Nivel 7 · La Tierra: se arranca en Kame House; al este, Ciudad Satán; al norte, la plaza del Templo de Kami
THEMES['tierra-dbs'] = { ...THEMES.yermo, bg: '#1a140a' };
sheetTheme('tierra-dbs', {
  base: 'dbs-kame-sand', alt: 'dbs-waste-ground', altZone: 0.62, edge: '#8a5a30', map: ['#f0c890', '#b07850', '#3fa040'],
  outline: true,
  decal: { cell: 1100, chance: 0.3, names: ['dbs-crater'] },
  spawn: [
    { name: 'dbs-kamehouse', x: 0, y: -110, r: 0, colliders: fusionWall(0, -110, 150) },
    { name: 'dbs-chair', x: 95, y: -95, r: 0 }, { name: 'dbs-ball', x: -90, y: -80, r: 0 },
    // Ciudad Satán
    { name: 'dbs-cafe', x: 1250, y: -60, r: 0, colliders: fusionWall(1250, -60, 200) },
    { name: 'dbs-bank', x: 1500, y: -60, r: 0, colliders: fusionWall(1500, -60, 150) },
    { name: 'dbs-building', x: 1800, y: -60, r: 0, colliders: fusionWall(1800, -60, 260) },
    { name: 'dbs-zmart', x: 1300, y: 260, r: 0, colliders: fusionWall(1300, 260, 175) },
    { name: 'dbs-shop', x: 1560, y: 260, r: 0, colliders: fusionWall(1560, 260, 155) },
    { name: 'dbs-citytree', x: 1080, y: 120, r: 10 }, { name: 'dbs-citytree', x: 1950, y: 120, r: 10 },
    // Templo de Kami
    { name: 'dbs-kami-plaza-ground', x: 0, y: -1520, decal: true },
    { name: 'dbs-kamitemple', x: 0, y: -1560, r: 0, colliders: fusionWall(0, -1560, 380, 30) },
    { name: 'dbs-kamipalms', x: -215, y: -1360, r: 10 }, { name: 'dbs-kamipalms', x: 215, y: -1360, r: 10 },
    { name: 'dbs-kamilamp', x: -120, y: -1400, r: 6 }, { name: 'dbs-kamilamp', x: 120, y: -1400, r: 6 },
  ],
  props: [
    { names: ['dbs-palm1', 'dbs-palm2', 'dbs-palm3'], r: 6, max: 2, cluster: true, onBase: true },
    { names: ['dbs-rock1', 'dbs-rock2', 'dbs-rock3', 'dbs-rock4', 'dbs-rock5'], r: 12, max: 2, onAlt: true },
  ],
});

// Los niveles de la fusión usan estos mapas (los de colores de arriba quedan de respaldo)
for (const [lv, theme] of [['otromundo', 'otromundo-dbs'], ['leyendas', 'tierra-dbs']]) {
  const L = LEVELS.find(l => l.id === lv);
  if (L) L.theme = theme;
}
{
  const L7 = LEVELS.find(l => l.id === 'leyendas');
  if (L7) L7.desc = 'Los villanos de las películas invaden la Tierra: Kame House, Ciudad Satán y el Templo de Kami.';
}
