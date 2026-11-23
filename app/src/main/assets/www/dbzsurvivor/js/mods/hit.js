'use strict';
// ─── Hit, el asesino del Universo 6 (sprites de OrdoMandalore; hoja: tools/hojas/hit.py) ───
// Como jefe del Torneo del Poder (minuto 7, entre Toppo y Jiren; también en el capítulo «El Torneo del Poder»):
//   · Salto en el tiempo: se queda quieto juntando el aura, el tiempo se detiene para ti (no te mueves ni atacas),
//     desaparece y te golpea por la espalda. Con menos vida lo hace más seguido y con más golpes (2 y luego 3).
//   · Esquiva: a veces el golpe no le llega (más seguido con poca vida); mientras salta, nada lo toca.
// Como guerrero jugable (se desbloquea con los retos «Rival del Universo 6»):
//   · Firma: cada 12 s (8 s transformado) detiene el tiempo a los enemigos cercanos 1,6 s; a los detenidos les pega +50%.
// Datos: técnica en datos/tecnicas.js (golpeinvisible), guerrero en datos/guerreros.js (hitp), jefe en datos/enemigos.js (hit).
(() => {
  const EN = () => typeof LANG !== 'undefined' && LANG === 'en';
  const L = (es, en) => (EN() ? en : es);
  const img = src => { const i = new Image(); i.src = src; return i; };
  const FX = img('assets/sprites/fx/hit_salto.png');          // 0-3 aura (de frente), 4-5 destello (de perfil)
  const CARA = img('assets/sprites/fusion/hitp-retrato.png');
  const listo = i => i.complete && i.naturalWidth > 0;
  const vivos = () => G.players.filter(P => !P.dead && !P.gone && !P.hidden && !P.ally);

  // ── El jefe ──
  const golpesDe = e => (e.hp < e.maxHp * 0.3 ? 3 : e.hp < e.maxHp * 0.6 ? 2 : 1);
  function jefe(e, dt) {
    const s = e.hs || (e.hs = { fase: 0, cd: 4 });
    if (s.fase === 0) {
      if ((s.cd -= dt) > 0) return;
      s.fase = 1; s.t = 0.9; s.px = e.x; s.py = e.y;
      addText(e.x, e.y - 40, L('¡Salto en el tiempo!', 'Time Skip!'), '#c27aff', true);
      if (!G.hitAviso) { G.hitAviso = true; announce(L('¡Hit va a detener el tiempo! Prepárate para el golpe', 'Hit is about to stop time! Brace for the hit'), '#c27aff'); }
      sfx('power', 0.4);
    } else if (s.fase === 1) {   // juntando el aura: quieto
      e.x = s.px; e.y = s.py;
      if ((s.t -= dt) > 0) return;
      const P = nearestPlayer(e.x, e.y);
      if (!P) { s.fase = 0; s.cd = 3; return; }
      s.fase = 2; s.t = 0.45; s.golpes = golpesDe(e); s.blanco = P.id;
      const quieto = 0.55 + 0.3 * s.golpes;
      for (const Q of vivos()) if (Math.hypot(Q.x - e.x, Q.y - e.y) < 800) Q.tiempoT = Math.max(Q.tiempoT || 0, quieto);
      ring(e.x, e.y, 120, 0.5, '#c27aff'); burst(e.x, e.y, '#c27aff', 26, 5, 3);
      G.hitTinte = quieto;
    } else if (s.fase === 2) {   // el tiempo está detenido: no se lo ve
      if ((s.t -= dt) > 0) return;
      const P = G.players.find(Q => Q.id === s.blanco && !Q.dead) || nearestPlayer(e.x, e.y);
      if (P) {
        const a = Math.atan2(P.y - s.py, P.x - s.px);   // aparece del otro lado: por la espalda
        e.x = P.x + Math.cos(a) * 30; e.y = P.y + Math.sin(a) * 30; e.facing = Math.cos(a) > 0 ? -1 : 1;
        P.inv = 0;
        hurtPlayer(P, e.dmg * 1.25, 'hit');
        P.inv = Math.min(P.inv, 0.2);
        G.fx.push({ type: 'anim', name: 'hit:destello', x: e.x, y: e.y - 18, s: 1.6, t: 0.25, dur: 0.25, flip: e.facing < 0 });
        burst(P.x, P.y - 10, '#ffffff', 14, 5, 3); G.shake = Math.max(G.shake, 0.5); sfx('hit', 0.5);
      }
      if (--s.golpes > 0) { s.t = 0.3; return; }
      s.fase = 0; s.cd = e.hp < e.maxHp * 0.5 ? 5.5 : 7.5;
    }
  }

  const up = update;
  update = function (dt) {   // eslint-disable-line no-global-assign
    const r = up.apply(this, arguments);
    if (!G || G.mode !== 'play') return r;
    if (G.hitTinte > 0) G.hitTinte -= dt;
    for (const P of G.players) if (P.tiempoT > 0) P.tiempoT -= dt;
    if (!(G.net && G.net.role === 'client')) for (const e of G.enemies) if (e.id === 'hit' && e.boss && !e.dead) { try { jefe(e, dt); } catch (err) { /* que no frene la partida */ } }
    return r;
  };

  // Con el tiempo detenido no te mueves ni atacas
  const ps = playerSpeed;
  playerSpeed = function (P) { return P && P.tiempoT > 0 ? 0 : ps.apply(this, arguments); };   // eslint-disable-line no-global-assign
  const fa = fireAttacks;
  fireAttacks = function (P) { if (P && P.tiempoT > 0) return; return fa.apply(this, arguments); };   // eslint-disable-line no-global-assign

  // Esquiva, y es intocable mientras salta
  const de = damageEnemy;
  damageEnemy = function (e, amount, src, kb, owner) {   // eslint-disable-line no-global-assign
    if (e && e.id === 'hit' && e.boss && !e.dead && e.hs) {
      if (e.hs.fase === 2) return;
      if (owner && e.hs.fase === 0 && Math.random() < (e.hp < e.maxHp * 0.5 ? 0.16 : 0.09)) {
        if (Math.random() < 0.4) addText(e.x, e.y - 30, L('¡Esquivó!', 'Dodged!'), '#c27aff');
        const a = Math.random() * Math.PI * 2; e.x += Math.cos(a) * 26; e.y += Math.sin(a) * 26;
        return;
      }
    }
    return de.apply(this, arguments);
  };

  // Dibujo: invisible mientras el tiempo está detenido; con el aura mientras la junta
  const dE = drawEnemy;
  drawEnemy = function (c, e, t) {   // eslint-disable-line no-global-assign
    const s = e && e.id === 'hit' && e.hs;
    if (s && s.fase === 2) return;
    const r = dE.apply(this, arguments);
    if (s && s.fase === 1 && listo(FX)) {
      const k = 1.25 * (e.scale || 1), w = 32 * k, fr = Math.floor(G.t * 12) % 4;
      c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = 0.9;
      c.drawImage(FX, fr * 32, 0, 32, 32, Math.round(e.x - w / 2), Math.round(e.y + 12 * k - w), Math.round(w), Math.round(w));
      c.restore();
    }
    return r;
  };
  const da = drawAnimFx;
  drawAnimFx = function (c, f) {   // eslint-disable-line no-global-assign
    if (f.name !== 'hit:destello') return da.apply(this, arguments);
    if (!listo(FX)) return;
    const fr = 4 + Math.min(1, Math.floor((1 - f.t / f.dur) * 2)), w = 32 * f.s;
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = Math.min(1, f.t / f.dur * 2);
    if (f.flip) { c.translate(f.x, 0); c.scale(-1, 1); c.translate(-f.x, 0); }
    c.drawImage(FX, fr * 32, 0, 32, 32, Math.round(f.x - w / 2), Math.round(f.y - w / 2), Math.round(w), Math.round(w));
    c.restore();
  };

  // Pantalla con el tiempo detenido: tono violeta y gris
  const hud = drawHUD;
  drawHUD = function () {   // eslint-disable-line no-global-assign
    const r = hud.apply(this, arguments);
    const P = G && G.me;
    if (P && P.tiempoT > 0 && G.mode === 'play') {
      ctx.save(); ctx.fillStyle = `rgba(90,50,140,${Math.min(0.35, P.tiempoT * 0.5)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
      hudText(L('⏱ EL TIEMPO SE DETUVO', '⏱ TIME HAS STOPPED'), W / 2, H / 2 + 70, 20, '#e6c8ff', 'center');
    }
    return r;
  };

  // Retrato de las escenas (la cara de la hoja de OrdoMandalore)
  if (typeof tourPortrait === 'function') {
    const tp = tourPortrait;
    tourPortrait = function (c, id, x, y, size, flip) {   // eslint-disable-line no-global-assign
      if ((id === 'hit' || id === 'hitp') && listo(CARA)) {
        c.save(); c.imageSmoothingEnabled = false;
        if (flip) { c.translate(x + size, y); c.scale(-1, 1); x = 0; y = 0; }
        c.drawImage(CARA, x, y, size, size); c.restore();
        return true;
      }
      return tp.apply(this, arguments);
    };
  }

  // ── Hit jugable: firma ──
  if (window.IDENTIDAD) window.IDENTIDAD.hitp = {
    firma: 'Salto en el tiempo: cada 12 s (8 s transformado) detiene el tiempo a los enemigos cercanos 1,6 s (a los jefes, 0,6 s). A los detenidos les pega +50%.',
    tick(P, dt) {
      if ((P.saltoCd = (P.saltoCd ?? 5) - dt) > 0) return;
      P.saltoCd = P.transformed > 0 ? 8 : 12;
      let n = 0;
      for (const e of G.enemies) {
        if (e.dead || Math.hypot(e.x - P.x, e.y - P.y) > 300) continue;
        e.stun = Math.max(e.stun || 0, e.boss ? 0.6 : 1.6); n++;
      }
      if (!n) { P.saltoCd = 1; return; }
      ring(P.x, P.y, 300, 0.45, '#c27aff'); burst(P.x, P.y, '#c27aff', 24, 5, 3);
      G.fx.push({ type: 'anim', name: 'hit:destello', x: P.x, y: P.y - 18, s: 1.4, t: 0.25, dur: 0.25, flip: P.facing < 0 });
      addText(P.x, P.y - 34, L('¡Salto en el tiempo!', 'Time Skip!'), '#c27aff', true);
    },
    vs: (P, e) => (e.stun > 0 ? 1.5 : 1),
  };
  // Ginyu puede robarle el cuerpo (su fila de técnicas)
  if (window.MAJIN_TABLA) window.MAJIN_TABLA.hit = { atk: ['golpeinvisible', 'kiburst'] };

  // ── Capítulo del Torneo del Poder: Hit entre Toppo y Jiren ──
  const C = (window.CAPITULOS || []).find(q => q.id === 'poder');
  if (C && !C.b.some(b => b[0] === 'hit')) {
    C.b.splice(1, 0, ['hit', 225]);
    (C.medio = C.medio || []).unshift({ jefe: 'hit', hp: 0.5, lines: [
      ['hit', 'Mi trabajo es simple: cuando te das cuenta, ya te golpeé.'],
      ['yo', '¡Entonces voy a ser más rápido que tu tiempo!']] });
  }

  // ── Desbloqueo: retos «Rival del Universo 6» (pestaña Retos de las misiones) ──
  const reto = () => (window.FusionRetos && window.FusionRetos.RETOS.find(r => r.id === 'u6')) || null;
  const cumplido = () => { const r = reto(); return !!r && r.partes.every(q => q.v() >= q.meta); };
  const revisar = () => { if (CHARACTERS.hitp && !isUnlocked('hitp') && cumplido()) unlockChar('hitp'); };
  const prog = unlockProgress;
  unlockProgress = function (id) {   // eslint-disable-line no-global-assign
    const u = CHARACTERS[id] && CHARACTERS[id].unlock;
    if (!u || u.kind !== 'retos') return prog.apply(this, arguments);
    const r = reto();
    return r ? r.partes.map(q => `${Math.min(q.v(), q.meta)}/${q.meta}`).join(' · ') : '';
  };
  const er = endRun;
  endRun = function () {   // eslint-disable-line no-global-assign
    const res = er.apply(this, arguments);
    try { revisar(); } catch (e) { /* nada */ }
    return res;
  };
  window.addEventListener('fusion:retos', () => { try { revisar(); } catch (e) { /* nada */ } });
  setTimeout(() => { try { revisar(); } catch (e) { /* nada */ } }, 0);
})();
