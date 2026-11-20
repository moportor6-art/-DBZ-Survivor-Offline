'use strict';
// ─── Donaciones (2.35.0) ─────────────────────────────────────────────────────
// Cafecito (Argentina) y Ko-fi (tarjeta o PayPal, desde cualquier país): en español se ven los dos, en inglés solo Ko-fi.
// Meta del mes: la carga el autor desde el backoffice (Avisos → Meta de donaciones) y llega con el cartel del menú.
// Al terminar una partida larga se pide ayuda con una sola línea, como mucho una vez por día, nunca a quien recién empieza
// y no durante 30 días después de tocar un enlace de donación.
const Support = (() => {
  const KOFI = 'https://ko-fi.com/nezvi', CAFECITO = 'https://cafecito.app/nezvi';
  const ASK_MIN_SECS = 480, ASK_MIN_RUNS = 3, CLICK_QUIET = 30 * 86400000;
  let goal = null;
  const a = (href, text, id) => `<a href="${href}" target="_blank" rel="noopener" data-don="${id}">${text}</a>`;
  // Los enlaces, en una línea
  const links = () => LANG === 'es'
    ? t('Invítame un {cafecito} (Argentina) o un café en {kofi} (tarjeta o PayPal, desde cualquier país)', { cafecito: a(CAFECITO, t('cafecito'), 'cafecito'), kofi: a(KOFI, 'Ko-fi', 'kofi') })
    : t('Buy me a coffee on {kofi}', { kofi: a(KOFI, 'Ko-fi', 'kofi') });
  const money = n => (goal && goal.currency === 'ARS' ? '$' : 'US$ ') + Math.round(n).toLocaleString(LANG === 'en' ? 'en-US' : 'es-AR');
  function goalHtml() {
    if (!goal || !goal.active || !(goal.goal > 0)) return '';
    const pct = Math.max(0, Math.min(100, goal.raised / goal.goal * 100));
    const month = new Date().toLocaleString(LANG === 'en' ? 'en-US' : 'es-AR', { month: 'long' });
    const done = goal.raised >= goal.goal;
    return `<div class="don-goal${done ? ' done' : ''}"><div class="don-bar"><i style="width:${pct}%"></i></div>
      <small>${done ? t('¡Meta de {month} cumplida! Gracias 💛', { month }) : t('Meta de {month}: {raised} de {goal}', { month, raised: money(goal.raised), goal: money(goal.goal) })}</small></div>`;
  }
  function render() {
    const menu = $('support');
    if (menu) menu.innerHTML = `☕ ${t('¿Te gusta el juego?')} ${links()}<br><small>${t('El juego es gratis y sin publicidad: las donaciones pagan el servidor, el dominio y el ranking.')}</small>${goalHtml()}`;
    const cr = $('creditsSupport');
    if (cr) cr.innerHTML = `${t('Si quieres ayudar:')} ${links()}. ${t('El juego es gratis y sin publicidad: las donaciones pagan el servidor, el dominio y el ranking.')}${goalHtml()}`;
  }
  // Quien tocó un enlace no recibe pedidos por un mes
  document.addEventListener('click', e => {
    const l = e.target.closest && e.target.closest('a[data-don]');
    if (l) { SAVE.donClick = Date.now(); writeSave(); }
  });
  // Al terminar la partida (game.js): una línea debajo del ranking, si corresponde
  function endAsk({ secs, won }) {
    const el = $('goSupport');
    if (!el) return;
    el.innerHTML = ''; el.classList.add('hidden');
    const day = new Date().toISOString().slice(0, 10), now = Date.now();
    if (TEST_MODE || (secs < ASK_MIN_SECS && !won) || (SAVE.runs || 0) < ASK_MIN_RUNS || SAVE.donAskDay === day
      || (SAVE.donClick && now - SAVE.donClick < CLICK_QUIET)) return;
    SAVE.donAskDay = day; writeSave();
    el.innerHTML = `💛 ${t('¿Te está gustando? DBZ Survivor es gratis y sin publicidad. Si quieres, puedes ayudar a mantenerlo:')} ${links()}${goalHtml()}`;
    el.classList.remove('hidden');
  }
  return { setGoal(g) { goal = g; render(); }, render, endAsk };
})();
Support.render();
