// Prueba automática de DBZ Survivor (la corre GitHub Actions antes de compilar la APK).
// Abre el juego en un navegador sin pantalla, juega solo con muchos guerreros y en todos los
// niveles (vida infinita, tiempo x5, elige siempre una carta) y falla si aparece cualquier error
// de JavaScript o falta algún archivo (sprite, música, script...).
//
// Uso:  node tests/smoke.cjs            (completa, ~3 min)
//       node tests/smoke.cjs --rapida   (menos guerreros y menos tiempo por nivel)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'www');
const QUICK = process.argv.includes('--rapida');
const SECS_PER_CHAR = QUICK ? 1.5 : 2;    // segundos reales por guerrero (x5 en el juego)
const SECS_PER_LEVEL = QUICK ? 8 : 32;    // segundos reales por nivel (32 s = ~160 s de juego: llega al primer jefe)

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };

function serve() {
  const srv = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

(async () => {
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  const errors = [];
  const local = u => u.startsWith(base);
  page.on('pageerror', e => errors.push('Error JS: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource|peer|PeerJS|WebSocket/i.test(m.text())) errors.push('Consola: ' + m.text()); });
  page.on('response', r => { if (local(r.url()) && r.status() >= 400 && !r.url().includes('/api/'))   // /api/ = servidores online (ranking, telemetría): sin ellos es normal
    errors.push(`Falta archivo (${r.status()}): ${r.url().slice(base.length)}`); });
  // Sin internet a propósito: igual que el teléfono sin datos
  await page.route(u => !local(u.toString()), r => r.abort());

  await page.goto(base + '/dbzsurvivor/index.html');
  await page.waitForFunction(() => typeof newGame === 'function' && typeof CHARACTERS === 'object', null, { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Piloto automático dentro de la página: se mueve al azar, no muere y elige cartas
  await page.evaluate(() => {
    let dir = 0;
    const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    setInterval(() => {
      if (!G) return;
      if (Math.random() < 0.1) { keys[arrows[dir]] = false; dir = Math.floor(Math.random() * 4); keys[arrows[dir]] = true; }
      G.testFast = true;
      for (const P of G.players) { if (!P.dead) P.hp = P.maxHp; if (P.ki < 100 && Math.random() < 0.02) P.ki = 100; }
      if (G.mode === 'choice') { const b = document.querySelector('#choices button'); if (b) b.click(); }
      if (G.mode === 'pause' && typeof togglePause === 'function') togglePause();
    }, 50);
  });

  const info = await page.evaluate(() => ({
    chars: Object.keys(CHARACTERS),
    levels: LEVELS.map(l => l.id).concat(typeof BONUS_LEVELS !== 'undefined' ? BONUS_LEVELS.map(l => l.id) : []),
  }));
  const chars = QUICK ? info.chars.filter((_, i) => i % 4 === 0) : info.chars;
  console.log(`Guerreros: ${info.chars.length} (probando ${chars.length}) · Niveles: ${info.levels.join(', ')}`);

  const start = (charId, level) => page.evaluate(([c, l]) => {
    newGame([{ id: 0, name: 'Prueba', charId: c, perks: myPerks() }], null, 0, 1, l);
  }, [charId, level]);
  const snapshot = () => page.evaluate(() => G && ({ t: Math.round(G.t), lvl: G.level, kills: G.kills, enemies: G.enemies.length, mode: G.mode }));

  let mark = 0;
  const report = label => {
    const nuevos = errors.slice(mark); mark = errors.length;
    if (nuevos.length) console.log(`  ✗ ${label}\n    ` + [...new Set(nuevos)].slice(0, 5).join('\n    '));
    return nuevos.length;
  };

  console.log('— Cada guerrero —');
  for (const c of chars) {
    await start(c, 'saiyan');
    await page.waitForTimeout(SECS_PER_CHAR * 1000);
    report('guerrero ' + c);
  }
  console.log('— Cada nivel —');
  for (const [i, l] of info.levels.entries()) {
    await start(info.chars[i % info.chars.length], l);
    await page.waitForTimeout(SECS_PER_LEVEL * 1000);
    const s = await snapshot();
    console.log(`  nivel ${l}: ${JSON.stringify(s)}`);
    report('nivel ' + l);
  }

  await browser.close();
  srv.close();
  const uniq = [...new Set(errors)];
  if (uniq.length) {
    console.log(`\n✗ FALLÓ: ${uniq.length} error(es) distintos`);
    for (const e of uniq.slice(0, 30)) console.log('  - ' + e);
    process.exit(1);
  }
  console.log('\n✓ Todo bien: sin errores');
})().catch(e => { console.error(e); process.exit(1); });
