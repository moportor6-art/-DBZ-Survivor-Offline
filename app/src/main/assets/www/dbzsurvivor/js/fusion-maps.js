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
