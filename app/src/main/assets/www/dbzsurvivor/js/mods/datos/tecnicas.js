'use strict';
// ─── Mod: técnicas nuevas (de DB Survivors y propias) ───
// Se carga después de js/data.js. Solo agrega técnicas a ATTACKS con los tipos que ya tiene el motor,
// y suma guerreros nuevos a la lista de usuarios de técnicas que ya existían. Va ANTES que guerreros.js.

// ─── Técnicas nuevas (de DB Survivors), armadas con los tipos que ya tiene el motor ───
// Solo las que la base no tenía: las repetidas (Kamehameha, Galick Ho, Big Bang, Burning, Taiyoken,
// Genkidama, Megaton, Dynamite Kick, Bomba de regalo, Granada...) siguen siendo las originales.
Object.assign(ATTACKS, {
  espada: {
    name: 'Corte de Espada', color: '#dff3ff', type: 'nova', punch: true, users: ['yajirobe', 'ftrunks'],
    desc: 'Un corte en círculo con la espada a todos los enemigos que tienes cerca.',
    stats: l => ({ cd: 1.3 - l * 0.08, dmg: 13 + l * 6, radius: 58 + l * 7 }),
  },
  kikoho: {
    name: 'Kikoho', color: '#ffe36b', type: 'rain', kind: 'big', users: ['tien', 'kidbuup'],
    desc: 'Una descarga de ki cae sobre los enemigos cercanos y estalla en un área grande.',
    stats: l => ({ cd: 3.2 - l * 0.2, dmg: 30 + l * 13, count: 1 + Math.floor(l / 3), explode: 62 + l * 9, r: 9 }),
  },
  guadana: {
    name: 'Guadaña de Ki', color: '#ff5ec8', type: 'nova', users: ['black', 'zamasu'],
    desc: 'Una guadaña de ki da una vuelta a tu alrededor y corta a todos los que toca.',
    stats: l => ({ cd: 2.4 - l * 0.15, dmg: 16 + l * 8, radius: 85 + l * 10 }),
  },
  fantasmas: {
    name: 'Ataque Kamikaze Fantasma', color: '#e9f1ff', type: 'projectile', kind: 'ball', users: ['gotenks', 'babidip'],
    desc: 'Fantasmas que persiguen al enemigo más cercano y explotan al tocarlo.',
    stats: l => ({ cd: 2.6 - l * 0.15, dmg: 20 + l * 9, count: 1 + Math.floor(l / 2), speed: 3, r: 7, pierce: 0, life: 4,
      spread: 0.6, home: 3.5, explode: 38 + l * 6 }),
  },
  caramelo: {
    name: 'Rayo de Caramelo', color: '#ff8fd0', core: '#fff0fa', type: 'beam', users: ['majinbuu', 'kidbuup'],
    desc: 'Un rayo rosa que atraviesa a los enemigos en línea.',
    stats: l => ({ cd: 2.8 - l * 0.18, dmg: 9 + l * 4, len: 170 + l * 25, width: 14 + l * 3, dur: 0.45 + l * 0.04 }),
  },
  lobo: {
    name: 'Puño del Lobo', color: '#ffb070', type: 'nova', punch: true, users: ['yamcha'],
    desc: 'Una ráfaga de zarpazos al estilo del lobo sobre los enemigos que tienes cerca. Muy rápida.',
    stats: l => ({ cd: 1.0 - l * 0.05, dmg: 11 + l * 5, radius: 52 + l * 6 }),
  },
  hellflash: {
    name: "Hell's Flash", color: '#ff9a3c', core: '#fff3d6', type: 'beam', users: ['a16p'],
    desc: 'Un rayo enorme desde los cañones de los brazos contra el enemigo más cercano.',
    stats: l => ({ cd: 3.8 - l * 0.25, dmg: 11 + l * 5, len: 250 + l * 30, width: 22 + l * 5, dur: 0.6 + l * 0.05 }),
  },
  rocketpunch: {
    name: 'Puño Cohete', color: '#c9c9d6', type: 'projectile', kind: 'big', users: ['a16p'],
    desc: 'Lanzas el puño como un cohete: atraviesa a todos los enemigos en línea.',
    stats: l => ({ cd: 2.2 - l * 0.12, dmg: 22 + l * 9, count: 1 + (l >= 3 ? 1 : 0), speed: 8, r: 8, pierce: 99, life: 0.8,
      spread: 0.3, explode: 0 }),
  },
  mafuba: {
    name: 'Mafuba', color: '#9ff0c0', type: 'nova', users: ['roshi'],
    desc: 'Un torbellino atrapa a los enemigos cercanos: quedan quietos un momento y reciben daño (los jefes, menos).',
    stats: l => ({ cd: 6.5 - l * 0.45, dmg: 8 + l * 4, radius: 100 + l * 12, stun: 1 + l * 0.2 }),
  },
});

// Técnicas que ya existían y que los guerreros nuevos también usan en la serie
// (las evoluciones comparten la misma lista, así que también las aprenden)
for (const [atk, ids] of Object.entries({
  kamehameha: ['roshi', 'yamcha', 'vegetto', 'cellp', 'gohanf'],
  masenko: ['gohanf', 'saiyaman', 'pan'],
  galick: ['raditzp'],
  bigbangatk: ['broly', 'gogetap', 'coolerp'],
  kienzan: ['a18p', 'freezerp'],
  dynamite: ['videl'],
})) ATTACKS[atk].users.push(...ids);

// ─── Fase 3: técnicas propias que faltaban ───
Object.assign(ATTACKS, {
  gkame: {
    name: 'Final Kamehameha', color: '#7dd8ff', core: '#ffffff', type: 'beam', users: ['vegetto'],
    desc: 'El Kamehameha y el Final Flash juntos: un rayo enorme, largo y muy dañino.',
    stats: l => ({ cd: 3.6 - l * 0.22, dmg: 12 + l * 5, len: 260 + l * 32, width: 24 + l * 5, dur: 0.6 + l * 0.05 }),
  },
  barrera: {
    name: 'Barrera', color: '#8fe3ff', type: 'orbit', shield: true, users: ['a17p'],
    desc: 'Una barrera de energía gira a tu alrededor: golpea a quien se acerque y destruye los disparos enemigos.',
    stats: l => ({ count: 2 + l, dmg: 6 + l * 3, radius: 46 + l * 4, r: 8, spin: 3 + l * 0.2 }),
  },
});

// ─── Fase 5: técnicas que ya existían, para los jugables nuevos de guerreros.js ───
for (const [atk, ids] of Object.entries({ hellflash: ['gerop'], espada: ['daburap'], kamehameha: ['gohanc'] })) ATTACKS[atk].users.push(...ids);

// ─── Fase 6: técnicas de los jefes que ahora también son jugables ───
Object.assign(ATTACKS, {
  huracan: {
    name: 'Huracán de Paikuhan', color: '#bff5ff', type: 'nova', users: ['pikkonp'],
    desc: 'Giras a toda velocidad y levantas un torbellino que golpea y empuja a todos los que tienes cerca.',
    stats: l => ({ cd: 2.0 - l * 0.12, dmg: 14 + l * 7, radius: 70 + l * 9 }),
  },
  ilusion: {
    name: 'Illusion Smash', color: '#ff6ec7', type: 'rain', kind: 'ball', users: ['janembap'],
    desc: 'Janemba se divide en ilusiones: llueven golpes de energía sobre enemigos al azar.',
    stats: l => ({ cd: 2.8 - l * 0.18, dmg: 15 + l * 7, count: 4 + l, explode: 30 + l * 3, r: 6 }),
  },
  garras: {
    name: 'Garras de Yakon', color: '#f0e070', type: 'nova', punch: true, users: ['yakonp'],
    desc: 'Zarpazos rapidísimos contra todos los enemigos que tienes cerca.',
    stats: l => ({ cd: 1.1 - l * 0.06, dmg: 12 + l * 5, radius: 55 + l * 6 }),
  },
  eraser: {
    name: 'Recoome Eraser Gun', color: '#ffe36b', core: '#fffbe0', type: 'beam', users: ['recoomep'],
    desc: 'Un rayo enorme disparado por la boca contra el enemigo más cercano.',
    stats: l => ({ cd: 3.6 - l * 0.22, dmg: 12 + l * 5, len: 220 + l * 28, width: 22 + l * 5, dur: 0.55 + l * 0.05 }),
  },
  cometa: {
    name: 'Cometa Azul', color: '#7aa8ff', type: 'projectile', kind: 'ball', users: ['burterp'],
    desc: 'Disparos veloces que persiguen a los enemigos: el estilo del más rápido del universo.',
    stats: l => ({ cd: 0.9 - l * 0.06, dmg: 8 + l * 4, count: 1 + Math.floor(l / 2), speed: 9, r: 5, pierce: 0, life: 1.6,
      spread: 0.25, home: 3 }),
  },
  crusher: {
    name: 'Crusher Ball', color: '#ff5a5a', type: 'projectile', kind: 'big', users: ['jeicep'],
    desc: 'Una bola de energía roja que estalla al tocar al enemigo.',
    stats: l => ({ cd: 2.4 - l * 0.14, dmg: 24 + l * 10, count: 1 + (l >= 4 ? 1 : 0), speed: 6, r: 8, pierce: 0, life: 1.6,
      spread: 0.3, explode: 48 + l * 7 }),
  },
});

// ─── Fase 7: técnicas de los guerreros de las hojas GBA ───
Object.assign(ATTACKS, {
  embestida: {
    name: 'Embestida brutal', color: '#ffcf9a', type: 'nova', punch: true, users: ['spopovichp'],
    desc: 'Golpes salvajes a todo lo que tienes cerca. Lento pero muy dañino.',
    stats: l => ({ cd: 1.6 - l * 0.08, dmg: 20 + l * 9, radius: 60 + l * 7 }),
  },
  extractor: {
    name: 'Extractor de energía', color: '#e0e8ff', core: '#ffffff', type: 'beam', users: ['yamup'],
    desc: 'El aparato de Babidi absorbe la energía del enemigo más cercano con un rayo.',
    stats: l => ({ cd: 2.6 - l * 0.16, dmg: 9 + l * 4, len: 170 + l * 22, width: 12 + l * 3, dur: 0.5 + l * 0.04 }),
  },
  deadlybomber: {
    name: 'S.S. Deadly Bomber', color: '#ff4d4d', type: 'projectile', kind: 'big', users: ['a13p'],
    desc: 'Una enorme esfera roja que estalla con fuerza al tocar al enemigo.',
    stats: l => ({ cd: 3.0 - l * 0.18, dmg: 34 + l * 14, count: 1 + (l >= 4 ? 1 : 0), speed: 5, r: 10, pierce: 0, life: 1.8,
      spread: 0.3, explode: 70 + l * 10 }),
  },
  pistolaray: {
    name: 'Pistola de rayos', color: '#7dffea', type: 'projectile', kind: 'ball', users: ['bulmap'],
    desc: 'Un invento de Capsule Corp: dispara rayos rápidos al enemigo más cercano.',
    stats: l => ({ cd: 0.8 - l * 0.05, dmg: 7 + l * 4, count: 1 + Math.floor(l / 2), speed: 10, r: 4, pierce: l >= 4 ? 1 : 0,
      life: 1.4, spread: 0.15 }),
  },
  ondanamek: {
    name: 'Onda namekiana', color: '#9dff8a', type: 'nova', users: ['dendep'],
    desc: 'Una onda de energía sagrada que golpea y empuja a todos los enemigos cercanos.',
    stats: l => ({ cd: 2.6 - l * 0.16, dmg: 13 + l * 7, radius: 80 + l * 12 }),
  },
  alfombra: {
    name: 'Alfombra mágica', color: '#ff5a5a', type: 'orbit', users: ['popop'],
    desc: 'La alfombra mágica de Mr. Popo gira a tu alrededor y golpea a quien se acerque.',
    stats: l => ({ count: 1 + l, dmg: 8 + l * 3, radius: 50 + l * 5, r: 9, spin: 3 + l * 0.2 }),
  },
});
