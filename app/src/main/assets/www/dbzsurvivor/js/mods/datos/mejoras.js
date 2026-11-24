'use strict';
// ─── Mod: mejora pasiva Kiai, artículos nuevos de la Tienda de Zeni y ajustes de mejoras ───
// Se carga después de guerreros.js. Aquí solo están los datos y las funciones que game.js consulta
// (maxPassives, beamAngles); los efectos en partida están en js/mods/tienda.js y js/mods/kiai.js.

// ─── Fase 4: mejora pasiva de DB Survivors que la base no tenía ───
// (La Aureola/vida extra no se agrega: la base ya tiene la Semilla de reserva con su aureola.)
PASSIVES.kiai = { name: 'Kiai', color: '#ffe0a0', desc: 'Tus golpes empujan más lejos a los enemigos (a los jefes casi no los mueven).' };

// ─── Tienda de Zeni: artículos nuevos (efectos en js/mods/tienda.js) ───
const FUSION_PSLOT_MAX = 5, SHENLONG_STAT = 0.05, SHENLONG_ENEMIES = 0.08;
SHOP_UPGRADES.push(
  { id: 'pslot', name: 'Casilla de mejora extra', icon: '⊞', color: '#ffb0f0', max: FUSION_PSLOT_MAX, base: 3000, grow: 2.5, per: 1,
    fmt: v => `+${v} casilla${v === 1 ? '' : 's'} de mejora pasiva (${MAX_PASSIVES + v} en total)` },
  { id: 'shenwish', name: 'Deseo de Shenlong', icon: '🐉', color: '#7dff9a', max: 6, base: 2500, grow: 1.6, per: SHENLONG_STAT,
    fmt: v => `+${Math.round(v * 100)}% a todo (salud, daño, velocidad, recarga de técnicas y del Ki, defensa, experiencia y recogida) y +${(v / SHENLONG_STAT * 0.1).toFixed(1)} de salud por segundo, pero salen un ${Math.round(v / SHENLONG_STAT * SHENLONG_ENEMIES * 100)}% más de enemigos` },
  // Con el Ki estilo ESF (js/mods/ki.js) ya no hay duración fija: baja el gasto de Ki de las formas superiores
  { id: 'transtime', name: 'Dominio de la transformación', icon: '⚡', color: '#ffe14d', max: 8, base: 400, grow: 1.45, per: 0.06,
    fmt: v => `Las formas superiores (de la 2.ª en adelante) gastan un ${Math.round(v * 100)}% menos de Ki` },
  // Recarga de Ki (js/mods/ki.js): cada nivel, +10% de velocidad al cargar y −4% de gasto en todas las formas.
  // Al máximo, la 1.ª forma gasta tan poco que, peleando, queda casi permanente (como en la serie).
  { id: 'kirec', name: 'Recarga de Ki', icon: '✦', color: '#ffd27a', max: 20, base: 250, grow: 1.22, per: 1,
    fmt: v => `Cargas el Ki un ${v * 10}% más rápido y las transformaciones gastan un ${Math.min(80, v * 4)}% menos` },
);
// Más niveles: Meditación (salud por segundo) de 5 a 10 y Control del Ki (recarga de técnicas) de 8 a 10
// Rapidez de recarga de ataques: multiplica la recarga de TODAS las técnicas (ráfagas, ataques normales, Kamehameha,
// Genkidama, especiales de las formas...) y cuenta aparte, después del tope de −60% de la recarga normal (game.js cdMult)
SHOP_UPGRADES.push({ id: 'rapidez', name: 'Rapidez de recarga de ataques', icon: '⏩', color: '#ffe066', max: 5, base: 600, grow: 1.55, per: 0.06,
  fmt: v => `Todos los ataques se recargan un ${Math.round(v * 100)}% más rápido (ráfagas, golpes, Kamehameha, Genkidama, especiales), también por encima del tope de recarga` });
// Críticos (2.35.5): probabilidad (game.js critChance) y multiplicador del daño crítico (×2 de base)
SHOP_UPGRADES.push(
  { id: 'critp', name: 'Ojo del guerrero', icon: '🎯', color: '#ff9b3d', max: 10, base: 500, grow: 1.4, per: 0.02,
    fmt: v => `+${Math.round(v * 100)}% de probabilidad de golpe crítico` },
  { id: 'critdmg', name: 'Golpe devastador', icon: '💥', color: '#ff5a3c', max: 10, base: 700, grow: 1.42, per: 0.1,
    fmt: v => `Los críticos hacen ×${(2 + v).toFixed(1)} de daño (en vez de ×2)` },
);
SHOP_UPGRADES.find(u => u.id === 'regen').max = 10;
SHOP_UPGRADES.find(u => u.id === 'cd').max = 10;
// Casillas de mejoras pasivas de un guerrero: las de siempre más las compradas en la Tienda
function maxPassives(P) {
  const n = P && P.perks ? Math.min(FUSION_PSLOT_MAX, Math.floor(P.perks.pslot || 0)) : 0;
  return MAX_PASSIVES + n;
}

// ─── Multiplicación arreglada: también los rayos (un segundo rayo en abanico) ───
// La base solo sumaba un proyectil a técnicas que ya disparaban 2 o más (game.js, attackStats): ahora es desde 1.
PASSIVES.multi.desc = '+1 proyectil por nivel a tus técnicas que disparan, y un rayo más en abanico a tus rayos por nivel. Hasta 4 niveles.';
PASSIVES.multi.max = 4;   // (2.36.2: antes un solo nivel)
function beamAngles(P, def, ang) {
  const base = def.both ? [ang, ang + Math.PI] : [ang];
  if (!(P && P.passives && P.passives.multi > 0)) return base;
  const n = P.passives.multi, offs = [];   // nivel 1: +0,3 · 2: −0,3 · 3: +0,6 · 4: −0,6
  for (let k = 1; k <= n; k++) offs.push((k % 2 ? 1 : -1) * 0.3 * Math.ceil(k / 2));
  return base.flatMap(a => [a, ...offs.map(o => a + o)]);
}

// Recarga global (js/mods/tienda.js): la recarga también acelera el Ki para transformarte
PASSIVES.focus.desc = '-8% de tiempo de recarga de técnicas y del Ki para transformarte.';
// Dominio del Ki (carta): con el Ki estilo ESF también baja el gasto de las transformaciones (js/mods/ki.js)
PASSIVES.kictl.desc = 'El Ki se carga un 15% más rápido y tus transformaciones gastan un 5% menos.';
SHOP_UPGRADES.find(u => u.id === 'cd').fmt = v => `-${Math.round(v * 100)}% de recarga (técnicas y Ki para transformarte)`;

// ─── Pasivas nuevas (su efecto está en js/mods/poderes.js) ───
// users: solo esos guerreros pueden aprenderla (poderes.js filtra las cartas)
PASSIVES.buuregen = { name: 'Regeneración de Majin Buu', color: '#ff8fd0',
  desc: 'Tu cuerpo se rehace como el de Buu: recuperas un 0,4% de tu vida máxima por segundo por nivel (2% al máximo). Compensa lo que quema el Kaio-ken.' };
PASSIVES.marcamajin = { name: 'Marca Majin', color: '#7a1040',
  users: ['krilin', 'yamcha', 'tien', 'roshi', 'yajirobe', 'videl', 'taop', 'bulmap', 'dendep', 'popop', 'cuip', 'yamup', 'spopovichp', 'puipuip', 'burterp', 'jeicep'],
  desc: 'Babidi libera tu maldad a cambio de poder: +10% de daño y +3% de velocidad por nivel. Te sale la M en la frente y tu Ki y tus técnicas se oscurecen. Solo los guerreros más débiles.' };
PASSIVES.reactor = { name: 'Reactor de energía infinita', color: '#5ce0ff',
  users: ['a13p', 'a16p', 'a17p', 'a18p', 'a19p', 'gerop'],
  desc: 'El reactor del Dr. Gero: tus transformaciones gastan un 15% menos de Ki por nivel y el Ki se recarga solo. Perfeccionado (nivel 5), no gastas Ki nunca. Solo los androides.' };
