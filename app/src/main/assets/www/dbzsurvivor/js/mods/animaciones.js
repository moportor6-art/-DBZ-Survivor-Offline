// ─── Animaciones al estilo DB Survivors ─────────────────────────────────────
// Recursos de DB Survivors (www/dbsurvivors), sacados con tools/hojas/dbs_fx.py a assets/sprites/fx:
//   · Aura: la llama de 3 cuadros, teñida del color de cada forma (reemplaza drawAura/drawAuraFront de draw.js,
//     así la usan los guerreros, los enemigos que vuelan, el menú y la selección).
//   · Cargar Ki: aura blanca grande que late, columna de luz, polvo que se abre en el suelo y piedritas que suben.
//   · Transformarse: columna de luz, aura que crece, el guerrero tiembla y destella, anillos y temblor de pantalla
//     (Goku al Super Saiyajin: la animación completa de DB Survivors; Goku SSJ3, Vegeta, Gogeta, Vegito, Super Buu,
//     Kid Buu y Broly: las de Buu's Fury; los demás parpadean entre la forma de antes y la nueva, cada vez más rápido).
//   · Kaioken: aura roja que late más fuerte cuanto más alto el multiplicador.
//   · Golpes: chispa de impacto en los enemigos.
// Si las imágenes no cargan, todo se dibuja como antes.
(() => {
  const img = src => { const i = new Image(); i.src = src; return i; };
  const AURA = img('assets/sprites/fx/aura.png'), SSJ = img('assets/sprites/fx/ssj_goku.png'), IMP = img('assets/sprites/fx/impacto.png');
  const ok = i => i.complete && i.naturalWidth > 0;
  const cache = new Map();
  // Aura teñida (como tintOf de DB Survivors): 3 cuadros en un lienzo
  function auraTint(color) {
    if (!ok(AURA)) return null;
    let c = cache.get(color);
    if (c) return c;
    c = document.createElement('canvas'); c.width = AURA.width; c.height = AURA.height;
    const x = c.getContext('2d');
    x.drawImage(AURA, 0, 0);
    if (!/^#?(ff[cde][0-9a-f]{3}|ffd93b|ffe14d|fff07a)$/i.test(color)) {   // los dorados se quedan con el original
      x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.82; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.18; x.drawImage(AURA, 0, 0);   // conserva los brillos
    }
    cache.set(color, c);
    return c;
  }
  const K = 1.8;   // tamaño del aura respecto a s (s = 1 → ~58 px de alto, como la de antes)
  function auraSprite(ctx, color, x, y, t, s, alpha, fps = 12) {
    const A = auraTint(color);
    if (!A) return false;
    const fr = Math.floor(t * fps) % 3, w = 32 * K * s, h = 32 * K * s;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(A, fr * 32, 0, 32, 32, Math.round(x - w / 2), Math.round(y - h + 4 * s), Math.round(w), Math.round(h));
    ctx.restore();
    return true;
  }
  const oldAura = drawAura, oldFront = drawAuraFront;
  drawAura = function (ctx, color, x, y, t, s = 1) {   // eslint-disable-line no-global-assign
    if (!auraSprite(ctx, color, x, y, t, s, 0.78)) return oldAura.apply(this, arguments);
    // chispitas que suben, como antes
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.globalAlpha *= 0.9;
    for (let i = 0; i < 4; i++) {
      const k = (t * 1.6 + i * 0.37) % 1, sx = Math.sin(i * 12.9898 + Math.floor(t * 1.6 + i * 0.37) * 3.1) * 13 * s;
      ctx.fillStyle = i % 2 ? '#ffffff' : color;
      ctx.fillRect(Math.round(sx), Math.round((6 - k * 48) * s), 1, Math.max(2, Math.round(3 * s)));
    }
    ctx.restore();
  };
  drawAuraFront = function (ctx, color, x, y, t, s = 1) {   // eslint-disable-line no-global-assign
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const done = auraSprite(ctx, color, x, y, t + 0.11, s * 0.96, 0.16);
    ctx.restore();
    if (!done) return oldFront.apply(this, arguments);
  };

  // ─── Cargar Ki, transformarse y Kaioken (alrededor del guerrero) ───
  const TR_DUR = 0.95;
  // Transformaciones cuadro a cuadro de Buu's Fury (tools/hojas/transformaciones.py): guerrero:forma → tira
  // w×h por cuadro, n cuadros, s escala (la del sprite del guerrero), pie: px que se bajan para apoyar los pies
  const tira = (f, w, h, n, s, pie) => ({ img: img(`assets/sprites/fx/tr_${f}.png`), w, h, n, s, pie });
  const CUTS = {
    'goku:3': tira('goku_ssj3', 32, 32, 7, 1.25, 2),
    'vegeta:1': tira('vegeta_ssj', 32, 32, 6, 1.25, 2),
    'gogetap:1': tira('gogeta', 32, 32, 7, 1.25, 2),
    'vegetto:1': tira('vegito', 32, 32, 8, 1.25, 2),
    'kidbuup:1': tira('kidbuu', 32, 48, 7, 1.25, 4),
    'majinbuu:2': tira('superbuu', 64, 64, 6, 0.93, 4),
    'broly:2': tira('broly', 64, 64, 6, 0.86, 4),
  };
  function columna(c, x, y, w, alpha, color) {   // columna de luz que sube desde los pies
    const g = c.createLinearGradient(0, y - 190, 0, y);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, color); g.addColorStop(1, 'rgba(255,255,255,0.9)');
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = alpha; c.fillStyle = g;
    c.fillRect(Math.round(x - w / 2), Math.round(y - 190), Math.round(w), 192);
    c.restore();
  }
  function cargando(c, P, t) {
    const k = 0.5 + 0.5 * Math.sin(t * 9);
    columna(c, P.x, P.y + 2, 10 + 6 * k, 0.16 + 0.08 * k, 'rgba(200,235,255,0.7)');
    // polvo que se abre en el suelo
    c.save();
    for (let i = 0; i < 3; i++) {
      const q = (t * 1.4 + i / 3) % 1;
      c.globalAlpha = 0.45 * (1 - q); c.strokeStyle = '#e8dcc0'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(P.x, P.y + 3, 10 + q * 34, (10 + q * 34) * 0.35, 0, 0, Math.PI * 2); c.stroke();
    }
    // piedritas que flotan hacia arriba
    for (let i = 0; i < 6; i++) {
      const q = (t * 0.7 + i * 0.173) % 1, ang = i * 2.399;
      const px = P.x + Math.cos(ang) * (14 + (i % 3) * 7), py = P.y + 4 - q * 42;
      c.globalAlpha = Math.min(1, (1 - q) * 2) * 0.9; c.fillStyle = i % 2 ? '#8a7350' : '#b09a70';
      c.fillRect(Math.round(px), Math.round(py), 2 + (i % 2), 2);
    }
    // rayitos cuando el Ki ya alcanza para transformarse
    if (P.ki >= 50 && Math.sin(t * 23) > 0.6) {
      c.globalAlpha = 0.9; c.strokeStyle = '#bff0ff'; c.lineWidth = 1.5; c.beginPath();
      let lx = P.x + (Math.random() - 0.5) * 30, ly = P.y - 40;
      c.moveTo(lx, ly);
      for (let j = 0; j < 4; j++) { lx += (Math.random() - 0.5) * 12; ly += 9; c.lineTo(lx, ly); }
      c.stroke();
    }
    c.restore();
  }
  function transformando(c, P, t, k, color) {   // k: 0 → 1
    const charge = Math.min(1, k / 0.68), post = k > 0.68;
    columna(c, P.x, P.y + 2, 10 + charge * 22, (post ? Math.max(0, 1 - (k - 0.68) / 0.32) : charge) * 0.7, color);
    auraSprite(c, color, P.x, P.y, t, 0.7 + charge * 0.7, post ? 0.9 : 0.4 + charge * 0.5, 16);
    if (post) {
      c.save(); c.globalAlpha = 1 - (k - 0.68) / 0.32; c.strokeStyle = color; c.lineWidth = 3;
      const r = 20 + (k - 0.68) / 0.32 * 70;
      c.beginPath(); c.ellipse(P.x, P.y - 12, r, r * 0.8, 0, 0, Math.PI * 2); c.stroke(); c.restore();
    }
  }
  function marcaM(c, P) {   // la "M" de Babidi en la frente de Majin Vegeta
    if (!(P.transformed > 0) || !P.c || P.c.transform !== 'Majin Vegeta' || P.ozaru || P.dir === 'up') return;
    const fx = P.dir === 'side' ? (P.facing || 1) * 2 : 0, x = Math.round(P.x + fx - 3), y = Math.round(P.y - 13);
    c.save(); c.fillStyle = '#b0003a';
    for (const [dx, dy] of [[0, 0], [0, 1], [0, 2], [1, 0], [2, 1], [3, 0], [4, 0], [4, 1], [4, 2]]) c.fillRect(x + dx, y + dy, 1, 1);
    c.restore();
  }
  const dp = drawPlayer;
  drawPlayer = function (c, P, overlay) {   // eslint-disable-line no-global-assign
    if (P && overlay && !P.dead && G) {
      const cu = P._anCut, kk = cu ? (performance.now() - cu.t0) / 1000 / TR_DUR : 1;
      if (cu && cu.cuadro && kk < (cu.cuadro === 'dbs' ? 0.68 : 0.8) && !P.ozaru) return;   // durante la animación cuadro a cuadro no se dibuja el sprite encima
      const r = dp.apply(this, arguments); try { marcaM(c, P); } catch (e) { /* nada */ } return r;
    }
    if (!P || overlay || P.dead || P.gone || P.hidden || !G) return dp.apply(this, arguments);
    const t = G.t;
    // ¿se acaba de transformar o subió de forma? (se ve igual en los invitados: sale del estado que se dibuja)
    const tr = P.transformed > 0, form = P.formN || 1;
    if ((tr && !P._anTr) || (tr && form > (P._anForm || 1))) {
      const key = `${P.charId}:${form}`, cc = (P.charId === 'goku' && !P._anTr && form === 1) ? 'dbs' : (CUTS[key] && ok(CUTS[key].img) ? key : null);
      P._anCut = { t0: performance.now(), goku: !!cc, cuadro: cc, prevC: P._anC || P.c, prevTr: !!P._anTr };
      G.shake = Math.max(G.shake || 0, 0.35);
    }
    P._anTr = tr; P._anForm = form; P._anC = P.c;
    const cut = P._anCut, k = cut ? (performance.now() - cut.t0) / 1000 / TR_DUR : 1;
    if (cut && k >= 1) P._anCut = null;
    try {
      if (P.charging && !tr) cargando(c, P, t);
      if (cut && k < 1) {
        transformando(c, P, t, k, P.c.aura || '#ffd93b');
        if (cut.cuadro === 'dbs' && k < 0.68 && ok(SSJ) && !P.ozaru) {   // Goku al SSJ: la transformación cuadro a cuadro de DB Survivors
          const fr = Math.min(11, Math.floor(k / 0.68 * 12)), s = 1.45;
          c.save(); c.imageSmoothingEnabled = false;
          c.drawImage(SSJ, fr * 32, 0, 32, 34, Math.round(P.x - 16 * s + Math.sin(t * 70) * 1.5), Math.round(P.y - 34 * s + 6), Math.round(32 * s), Math.round(34 * s));
          c.restore();
          return;
        }
        const T = cut.cuadro && CUTS[cut.cuadro];
        if (T && k < 0.8 && !P.ozaru) {   // las de Buu's Fury: SSJ3, Vegeta, Gogeta, Vegito, Super Buu, Kid Buu, Broly
          const n = T.n, fr = Math.min(n - 1, Math.floor(k / 0.8 * n)), s = T.s, w = T.w * s, h = T.h * s;
          c.save(); c.imageSmoothingEnabled = false;
          c.drawImage(T.img, fr * T.w, 0, T.w, T.h, Math.round(P.x - w / 2 + Math.sin(t * 70) * (fr < n - 2 ? 1.2 : 0)), Math.round(P.y - h + T.pie * s), Math.round(w), Math.round(h));
          c.restore();
          return;
        }
      }
      if (P.kaioken > 0) {   // Kaioken: un segundo aura roja que late
        const lvl = P.kaiokenLvl || (P.attacks.some(a => a.id === 'kaioken20') ? 3 : 1);
        auraSprite(c, '#ff2a2a', P.x, P.y, t + 0.5, 1.15 + 0.12 * Math.sin(t * (10 + lvl * 4)), 0.45, 16);
      }
    } catch (e) { /* sin efectos */ }
    const r = dp.apply(this, arguments);
    marcaM(c, P);
    if (cut && k < 0.68) {   // destello: el guerrero brilla y tiembla mientras junta poder
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.25 + 0.25 * Math.sin(t * 40);
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(P.x, P.y - 14, 13, 20, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    return r;
  };

  // Todos los demás: mientras junta poder, el guerrero parpadea entre su forma de antes y la nueva, cada vez más
  // rápido (como en la serie, cuando el pelo cambia de color a golpes)
  const fl = fighterLook;
  fighterLook = function (P) {   // eslint-disable-line no-global-assign
    const r = fl.apply(this, arguments), cut = P && P._anCut;
    if (!cut || cut.goku) return r;
    const el = (performance.now() - cut.t0) / 1000, k = el / TR_DUR;
    if (k >= 0.62) return r;
    const fase = Math.floor(el * (5 + 26 * k)) % 2;
    return fase ? { ch: cut.prevC, tr: cut.prevTr } : r;
  };

  // ─── Chispas de impacto en los golpes de los guerreros ───
  let impCd = 0;
  const de = damageEnemy;
  damageEnemy = function (e, amount, src, kb, owner) {   // eslint-disable-line no-global-assign
    const r = de.apply(this, arguments);
    if (e && owner && owner.charId && G && G.fx && amount > 0 && performance.now() > impCd) {
      impCd = performance.now() + 45;   // a lo sumo ~22 por segundo
      G.fx.push({ type: 'anim', name: 'dbs:imp', x: e.x + rand(-6, 6), y: e.y - 10 * (e.scale || 1) + rand(-6, 6), s: amount > 60 ? 1.6 : 1.1, t: 0.16, dur: 0.16 });
    }
    return r;
  };
  const da = drawAnimFx;
  drawAnimFx = function (c, f) {   // eslint-disable-line no-global-assign
    if (f.name !== 'dbs:imp') return da.apply(this, arguments);
    if (!ok(IMP)) return;
    const fr = Math.min(1, Math.floor((1 - f.t / f.dur) * 2)), w = 14 * f.s, h = 15 * f.s;
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = Math.min(1, f.t / f.dur * 2);
    c.drawImage(IMP, fr * 14, 0, 14, 15, Math.round(f.x - w / 2), Math.round(f.y - h / 2), Math.round(w), Math.round(h));
    c.restore();
  };
})();
