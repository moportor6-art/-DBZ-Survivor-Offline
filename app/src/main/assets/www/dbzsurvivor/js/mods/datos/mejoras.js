'use strict';
// ─── Mod: mejora pasiva Kiai, artículos nuevos de la Tienda de Zeni y ajustes de mejoras ───
// Se carga después de guerreros.js. Aquí solo están los datos y las funciones que game.js consulta
// (maxPassives, beamAngles); los efectos en partida están en js/mods/tienda.js y js/mods/kiai.js.

// ─── Fase 4: mejora pasiva de DB Survivors que la base no tenía ───
// (La Aureola/vida extra no se agrega: la base ya tiene la Semilla de reserva con su aureola.)
PASSIVES.kiai = { name: 'Kiai', color: '#ffe0a0', desc: 'Tus golpes empujan más lejos a los enemigos (a los jefes casi no los mueven).' };

// ─── Tienda de Zeni: artículos nuevos (efectos en js/mods/tienda.js) ───
const FUSION_PSLOT_MAX = 3, SHENLONG_STAT = 0.05, SHENLONG_ENEMIES = 0.08;
SHOP_UPGRADES.push(
  { id: 'pslot', name: 'Casilla de mejora extra', icon: '⊞', color: '#ffb0f0', max: FUSION_PSLOT_MAX, base: 3000, grow: 2.5, per: 1,
    fmt: v => `+${v} casilla${v === 1 ? '' : 's'} de mejora pasiva (${MAX_PASSIVES + v} en total)` },
  { id: 'shenwish', name: 'Deseo de Shenlong', icon: '🐉', color: '#7dff9a', max: 6, base: 2500, grow: 1.6, per: SHENLONG_STAT,
    fmt: v => `+${Math.round(v * 100)}% a todo (salud, daño, velocidad, recarga de técnicas y del Ki, defensa, experiencia y recogida) y +${(v / SHENLONG_STAT * 0.1).toFixed(1)} de salud por segundo, pero salen un ${Math.round(v / SHENLONG_STAT * SHENLONG_ENEMIES * 100)}% más de enemigos` },
  { id: 'transtime', name: 'Dominio de la transformación', icon: '⚡', color: '#ffe14d', max: 8, base: 400, grow: 1.45, per: 0.08,
    fmt: v => `+${Math.round(v * 100)}% de duración de las transformaciones` },
);
// Casillas de mejoras pasivas de un guerrero: las de siempre más las compradas en la Tienda
function maxPassives(P) {
  const n = P && P.perks ? Math.min(FUSION_PSLOT_MAX, Math.floor(P.perks.pslot || 0)) : 0;
  return MAX_PASSIVES + n;
}

// ─── Multiplicación arreglada: también los rayos (un segundo rayo en abanico) ───
// La base solo sumaba un proyectil a técnicas que ya disparaban 2 o más (game.js, attackStats): ahora es desde 1.
PASSIVES.multi.desc = '+1 proyectil a tus técnicas que disparan, y un segundo rayo en abanico a tus rayos. Un solo nivel.';
function beamAngles(P, def, ang) {
  const base = def.both ? [ang, ang + Math.PI] : [ang];
  if (!(P && P.passives && P.passives.multi > 0)) return base;
  return base.flatMap(a => [a, a + 0.3]);
}

// Recarga global (js/mods/tienda.js): la recarga también acelera el Ki para transformarte
PASSIVES.focus.desc = '-8% de tiempo de recarga de técnicas y del Ki para transformarte.';
SHOP_UPGRADES.find(u => u.id === 'cd').fmt = v => `-${Math.round(v * 100)}% de recarga (técnicas y Ki para transformarte)`;
