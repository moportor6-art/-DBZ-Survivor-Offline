'use strict';
// ─── Mod: compañero de equipo (en solitario) ───
// En el menú eliges un segundo guerrero (de los que tienes desbloqueados) que pelea a tu lado toda la partida con sus
// técnicas de verdad (es un aliado de js/mods/identidad.js). Crece contigo: cada vez que subes de nivel sube una de sus
// técnicas y, cada 3 niveles, aprende una técnica propia nueva. Si cae, vuelve a los 20 s.
// Dúos de la serie (Goku y Krilin, Gohan y Piccolo, Goten y Trunks...): los dos pegan +15%.
// Goku con Vegeta (o al revés): cuando pides la fusión con el Ki, tu compañero responde y nace Gogeta.
// No se usa en línea, en el desafío semanal ni en el Camino de la Serpiente. Se carga después de js/mods/maestria.js.
(() => {
  const KEY = 'fusion.companero';
  const RESPAWN = 20;
  let chosen = '';
  try { chosen = localStorage.getItem(KEY) || ''; } catch (e) { chosen = ''; }
  const saveChoice = () => { try { localStorage.setItem(KEY, chosen); } catch (e) { /* sin almacenamiento */ } };

  // Dúos de la serie (en los dos sentidos)
  const PAIRS = [['goku', 'krilin'], ['goku', 'vegeta'], ['goku', 'gohanc'], ['gohan', 'piccolo'], ['gohanc', 'piccolo'], ['goten', 'trunks'],
    ['vegeta', 'nappap'], ['raditzp', 'nappap'], ['a17p', 'a18p'], ['a16p', 'a17p'], ['a19p', 'gerop'], ['freezerp', 'coolerp'],
    ['ginyup', 'recoomep'], ['burterp', 'jeicep'], ['ginyup', 'jeicep'], ['black', 'zamasu'], ['babidip', 'daburap'], ['majinbuu', 'hercule'],
    ['gohanf', 'ftrunks'], ['krilin', 'a18p'], ['videl', 'saiyaman'], ['videl', 'hercule'], ['tien', 'yamcha'], ['roshi', 'krilin'],
    ['spopovichp', 'yamup'], ['dendep', 'popop'], ['pikkonp', 'olibu'], ['bulmap', 'vegeta'], ['pan', 'gohan']];
  const isPair = (a, b) => PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  window.COMPANERO_PAIRS = PAIRS;

  const usable = () => !G.net && !G.weekly && !(G.lv && G.lv.bonus) && chosen && chosen !== G.me.charId
    && CHARACTERS[chosen] && isUnlocked(chosen) && typeof window.summonAlly === 'function';
  let mate = null, back = 0, lastLvl = 0, fusedMate = false, memo = null;

  function call(first) {
    const P = G.me;
    mate = window.summonAlly(P, chosen, 1e9, { tag: 'companero', hp: 1 });
    if (!mate) return;
    mate.summon.keep = true;
    mate.ki = 100;
    announce(first ? `¡${mate.name} pelea a tu lado!` : `¡${mate.name} vuelve a la pelea!`, mate.c.aura || '#ffd93b');
    if (first && isPair(P.charId, chosen)) setTimeout(() => G && G.me === P && announce('¡Dúo de la serie! Los dos pegan +15%', '#ffe14d'), 1800);
  }

  const ng = newGame;
  newGame = function () {   // eslint-disable-line no-global-assign
    const r = ng.apply(this, arguments);
    mate = null; back = 0; fusedMate = false; memo = null; lastLvl = G ? G.level : 0;
    if (G && G.me && usable()) call(true);
    return r;
  };

  // Crece contigo, vuelve si cae y responde a la fusión
  const up = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    const r = up.apply(this, arguments);
    if (!G || !G.me || !chosen || G.mode !== 'play') return r;
    const P = G.me;
    if (mate && (mate.gone || !G.players.includes(mate))) {   // cayó, o se fue con la fusión
      memo = mate.attacks.map(a => ({ ...a }));
      mate = null;
      back = fusedMate || G.fusion ? 1 : RESPAWN;   // después de la fusión vuelve enseguida
      if (!fusedMate && !G.fusion) announce('Tu compañero cayó: vuelve en 20 s', '#ff9b9b');
      fusedMate = false;
    }
    if (!mate && back > 0 && !P.dead && !G.fusion) {
      back -= dt;
      if (back <= 0 && usable()) { call(false); if (mate && memo) mate.attacks = memo; }
    }
    if (mate) {
      mate.passives = { ...P.passives };
      if (!(mate.transformed > 0)) mate.ki = 100;   // siempre listo para la fusión
      if (G.level > lastLvl) {
        for (let l = lastLvl; l < G.level; l++) {
          const own = Object.keys(ATTACKS).filter(id => !ATTACKS[id].evolved && ATTACKS[id].users && ATTACKS[id].users.includes(mate.charId)
            && !mate.attacks.some(a => a.id === id));
          if ((l + 1) % 3 === 0 && own.length && mate.attacks.length < 4) mate.attacks.push({ id: own[Math.floor(Math.random() * own.length)], lvl: 1, cd: 0.5 });
          else {
            const can = mate.attacks.filter(a => a.lvl < MAX_ATTACK_LEVEL);
            if (can.length) can[Math.floor(Math.random() * can.length)].lvl++;
          }
        }
      }
      // Goku + Vegeta: si pides la fusión, el compañero responde
      if (P.fuseReq && !G.fusion && FUSION_PAIR[P.charId] === mate.charId && G.t - P.fuseReq < 3 && Math.hypot(mate.x - P.x, mate.y - P.y) < 200) {
        mate.x = P.x + 30; mate.y = P.y; P.fuseReq = 0;
        fusedMate = true;
        startFusion(P, mate, undefined, P.id);
      }
    }
    lastLvl = G.level;
    return r;
  };
  // Para pedir la fusión hay que estar cerca: el compañero se acerca cuando tu Ki está lleno
  const dm = dmgMult;
  dmgMult = function (P) {   // eslint-disable-line no-global-assign
    const m = dm.apply(this, arguments);
    if (!P || !mate || !G) return m;
    const pair = isPair(G.me.charId, mate.charId);
    return pair && (P === G.me || P === mate) ? m * 1.15 : m;
  };
  // fusionPartner pide que esté a menos de 80: si es tu compañero, alcanza con que esté en pantalla
  const fp = fusionPartner;
  fusionPartner = function (P) {   // eslint-disable-line no-global-assign
    const r = fp.apply(this, arguments);
    if (r || !mate || !G || P !== G.me || FUSION_PAIR[P.charId] !== mate.charId || !canFuse(P)) return r;
    return Math.hypot(mate.x - P.x, mate.y - P.y) < 260 ? mate : null;
  };

  // Menú: elegir compañero (una fila arriba de la lista de guerreros)
  const row = document.createElement('div');
  row.id = 'mateRow';
  const anchor = $('charList');
  if (anchor) anchor.before(row);
  function render() {
    const me = myChar();
    const opts = Object.keys(CHARACTERS).filter(id => id !== me && isUnlocked(id));
    if (chosen && !opts.includes(chosen)) chosen = '';
    row.innerHTML = '<b>Compañero:</b> <select id="mateSel"><option value="">Ninguno (solo)</option>'
      + opts.map(id => `<option value="${id}"${id === chosen ? ' selected' : ''}>${CHARACTERS[id].name}${isPair(me, id) ? ' ★ dúo' : ''}</option>`).join('')
      + '</select>' + (chosen && isPair(me, chosen) ? ' <small>★ Dúo de la serie: los dos pegan +15%</small>' : '')
      + (chosen && FUSION_PAIR[me] === chosen ? ' <small>· Pide la fusión con el Ki: ¡Gogeta!</small>' : '');
    row.querySelector('#mateSel').onchange = e => { chosen = e.target.value; saveChoice(); render(); };
  }
  const ucd = updateCharDetail;
  updateCharDetail = function () {   // eslint-disable-line no-global-assign
    const r = ucd.apply(this, arguments);
    render();
    return r;
  };
  const css = document.createElement('style');
  css.textContent = `#mateRow{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;margin:6px 0;font-size:14px}
    #mateRow select{font:inherit;font-size:14px;padding:3px 6px;border-radius:6px;border:2px solid rgba(255,255,255,.3);background:#0a0f2e;color:#fff;max-width:60vw}
    #mateRow small{color:#ffe9a8}`;
  document.head.appendChild(css);
})();
