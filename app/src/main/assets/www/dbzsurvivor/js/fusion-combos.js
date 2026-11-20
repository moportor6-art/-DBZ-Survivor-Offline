'use strict';
// ─── Fusión: receta de evolución en las cartas de subir de nivel ───
// Cada carta de técnica o de mejora que sirve para una evolución muestra su receta con íconos:
//   [técnica] + [mejora] → [evolución], marcando lo que ya tienes (✓), lo que falta y el nivel de la técnica,
// y una frase corta con lo que te falta. Así se entiende de un vistazo con qué se combina cada carta.
// Se carga después de js/game.js: envuelve optionCard (agrega los datos) y showChoices (agrega la receta a la carta).
(() => {
  const MAX = () => MAX_ATTACK_LEVEL;
  const lvlOf = (P, id) => { const a = P.attacks.find(x => x.id === id); return a ? a.lvl : 0; };

  // Recetas en las que entra esta carta (ya contando que la eliges)
  function recipesFor(P, o) {
    const out = [];
    if (o.kind === 'up' || o.kind === 'new') {
      const evo = EVOLUTION_OF[o.id];
      if (evo && canLearn(P.charId, evo)) out.push({ atk: o.id, pas: ATTACKS[evo].needs, evo, me: 'atk', lvl: lvlOf(P, o.id) + 1 });
    } else if (o.kind === 'passive') {
      for (const id in EVOLUTION_OF) {
        const evo = EVOLUTION_OF[id];
        if (ATTACKS[evo].needs !== o.id || !canLearn(P.charId, evo)) continue;
        out.push({ atk: id, pas: o.id, evo, me: 'pas', lvl: lvlOf(P, id) });
      }
      out.sort((a, b) => (b.lvl > 0) - (a.lvl > 0) || b.lvl - a.lvl);   // primero las técnicas que ya tienes
    }
    for (const r of out) r.hasPas = r.me === 'pas' || P.passives[r.pas] > 0;
    return out;
  }

  // Qué te falta, en una frase
  function missing(r) {
    const a = ATTACKS[r.atk].name, p = PASSIVES[r.pas].name, parts = [];
    if (r.lvl <= 0) parts.push(`aprender ${a}`);
    else if (r.lvl < MAX()) parts.push(`subir ${a} a Nv ${MAX()}`);
    if (!r.hasPas) parts.push(`conseguir ${p}`);
    if (!parts.length) return `¡Listo! Te saldrá la carta para evolucionar a ${ATTACKS[r.evo].name}.`;
    return `Te falta ${parts.join(' y ')}.`;
  }

  const card = optionCard;
  optionCard = function (P, o) {   // eslint-disable-line no-global-assign
    const c = card.apply(this, arguments);
    try { if (c && o && o.kind !== 'evolve') { const r = recipesFor(P, o); if (r.length) c.recipes = r; } } catch (e) { /* sin receta */ }
    return c;
  };

  function icon(kind, id, mark, me) {
    const w = document.createElement('span');
    w.className = 'rc-it' + (me ? ' rc-me' : '') + (mark === 'ok' ? ' rc-ok' : mark === 'no' ? ' rc-no' : '');
    const cv = document.createElement('canvas');
    cv.width = cv.height = 28;
    const x = cv.getContext('2d');
    try { if (kind === 'pas') drawPassiveIcon(id, 2, 2, 24, x); else drawAttackIcon(id, 2, 2, 24, x); } catch (e) { /* sin ícono */ }
    w.appendChild(cv);
    return w;
  }
  function recipeEl(r) {
    const row = document.createElement('div');
    row.className = 'rc-row';
    const line = document.createElement('div');
    line.className = 'rc-line';
    const atkMark = r.lvl >= MAX() ? 'ok' : r.lvl > 0 ? 'mid' : 'no';
    line.append(icon('atk', r.atk, atkMark, r.me === 'atk'), Object.assign(document.createElement('b'), { textContent: '+' }),
      icon('pas', r.pas, r.hasPas ? 'ok' : 'no', r.me === 'pas'), Object.assign(document.createElement('b'), { textContent: '→' }),
      icon('atk', r.evo, null, false));
    const names = document.createElement('div');
    names.className = 'rc-names';
    const st = (ok, txt) => `<i class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${txt}</i>`;
    names.innerHTML = `${st(r.lvl > 0, `${esc(ATTACKS[r.atk].name)} ${r.lvl > 0 ? `Nv ${r.lvl}/${MAX()}` : ''}`)} + ${st(r.hasPas, esc(PASSIVES[r.pas].name))}`
      + ` → <span class="rc-evo">★ ${esc(ATTACKS[r.evo].name)}</span>`;
    const tip = document.createElement('div');
    tip.className = 'rc-tip';
    tip.textContent = missing(r);
    row.append(line, names, tip);
    return row;
  }

  const show = showChoices;
  showChoices = function (title, cards, onPick) {   // eslint-disable-line no-global-assign
    const res = show.apply(this, arguments);
    try {
      const els = $('choices').children;
      cards.forEach((c, i) => {
        if (!c || !c.recipes || !els[i]) return;
        const box = document.createElement('div');
        box.className = 'rc-box';
        const head = document.createElement('div');
        head.className = 'rc-head';
        head.textContent = c.kind === 'pas'
          ? (c.recipes.length > 1 ? `🔗 Evoluciona ${c.recipes.length} técnicas` : '🔗 Sirve para evolucionar')
          : '🔗 Evolución de esta técnica';
        box.appendChild(head);
        c.recipes.slice(0, 2).forEach(r => box.appendChild(recipeEl(r)));
        if (c.recipes.length > 2) {
          const more = document.createElement('div');
          more.className = 'rc-more';
          more.textContent = `y ${c.recipes.length - 2} más: ${c.recipes.slice(2).map(r => ATTACKS[r.atk].name).join(', ')}`;
          box.appendChild(more);
        }
        const old = els[i].querySelector('.evo-hint');   // la pista de texto de la base dice lo mismo que la receta
        if (old) old.style.display = 'none';
        const tools = els[i].querySelector('.card-tools');
        els[i].insertBefore(box, tools || null);
      });
    } catch (e) { /* las cartas siguen igual */ }
    return res;
  };

  const css = document.createElement('style');
  css.textContent = `.rc-box{margin-top:8px;padding:6px 6px 4px;border-radius:8px;background:rgba(0,0,0,.28);border:1px solid rgba(255,217,59,.35);text-align:left}
    .rc-head{font-size:12px;font-weight:700;color:#ffd93b;margin-bottom:2px}
    .rc-row+.rc-row{margin-top:6px;padding-top:6px;border-top:1px dashed rgba(255,255,255,.18)}
    .rc-line{display:flex;align-items:center;gap:4px}.rc-line b{color:#ffd93b;font-size:15px}
    .rc-it{display:inline-flex;border-radius:6px;padding:1px;border:2px solid rgba(255,255,255,.2);background:rgba(10,15,46,.7)}
    .rc-it canvas{width:24px;height:24px;image-rendering:pixelated}
    .rc-it.rc-ok{border-color:#6cff7a}.rc-it.rc-no{opacity:.55;border-style:dashed}
    .rc-it.rc-me{border-color:#ffd93b;box-shadow:0 0 0 2px rgba(255,217,59,.35);opacity:1}
    .rc-names{font-size:11.5px;line-height:1.35;margin-top:3px}.rc-names i{font-style:normal}
    .rc-names i.ok{color:#8dff9a}.rc-names i.no{color:#ffb0b0}.rc-evo{color:#ffd93b;font-weight:700}
    .rc-tip{font-size:11.5px;color:#cfe3ff;margin-top:2px}.rc-more{font-size:11px;opacity:.75;margin-top:4px}`;
  document.head.appendChild(css);
})();
