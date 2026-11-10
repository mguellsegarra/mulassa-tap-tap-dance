/* A mini-game's boot watchdog (the main game has its own in index.html). vite.config.js inlines it into each game page
   (<script id="boot-watchdog" src="/packages/plassa/src/boot-watchdog.js">), before the module: a classic script, so it runs even when
   the module fails to load. main.js marks <html class="ready"> once the home is whole. A module that fails to load, an error
   before then, or 30 s on screen without it turns the boot screen (#boot, its art #boot-art) into the error card, in
   __gameBootWords once the game's catalogue is in (Catalan before). __gameFail shows the same card later (a GPU gone for good). */
(function () {
  var root = document.documentElement, shown = false, seen = 0, last = Date.now();
  window.__gameFail = function (title, text, reason) {
    var boot = document.getElementById('boot'), W = window.__gameBootWords || {};
    if (shown || !boot) return;
    shown = true;
    window.__mulassaBootFailure = { phase: 'init', reason: reason || 'startup', visibleMs: seen }; /* plassa/errors.js reports it */
    if (window.__mulassaReportBoot) window.__mulassaReportBoot();
    root.classList.remove('ready');
    boot.className = 'cover fail';
    boot.hidden = false;
    boot.innerHTML = '<div class="art">' + document.getElementById('boot-art').innerHTML.replace('class="mula-load"', 'class="mula-load sad"') + '</div>'
      + '<div class="sheet" role="alert"><h2></h2><p class="result-sub"></p><div class="sheet-actions"><button type="button" class="btn btn-primary"></button></div></div>';
    boot.querySelector('h2').textContent = title || W.title || 'Ups! No s’ha pogut carregar'; // i18n-ok: the page's Catalan until the game's words load
    boot.querySelector('p').textContent = text || W.text || 'Refresca la pàgina per tornar-ho a provar.'; // i18n-ok: as above
    boot.querySelector('button').textContent = W.retry || 'Torna-ho a provar';
    boot.querySelector('button').onclick = function () { location.reload(); };
  };
  var early = function (reason) { if (!root.classList.contains('ready')) window.__gameFail(null, null, reason); };
  /* __gameBootError: what stopped it, for a look in the console (never sent: errors.js reports the reason only) */
  /* a file from another site that fails to load is not ours to fail on: the host adds its analytics script to the page, and
     an ad blocker stopping it showed this card on beta over a game that had loaded */
  var theirs = function (t) { var url = t && (t.src || t.href) || ''; return url && url.indexOf(location.origin + '/') !== 0; };
  addEventListener('error', function (e) { if (theirs(e.target)) return; if (!root.classList.contains('ready')) window.__gameBootError = e.message; early(e.target && e.target.tagName === 'SCRIPT' ? 'module-load' : 'startup'); }, true);
  addEventListener('unhandledrejection', function (e) { if (!root.classList.contains('ready')) window.__gameBootError = String(e.reason && e.reason.stack || e.reason); early('startup'); });
  (function tick() { /* only time on screen counts: a tab opened in the background is not stuck */
    var now = Date.now();
    if (!document.hidden) seen += now - last;
    last = now;
    if (seen > 30000) return early('deadline');
    if (!shown && !root.classList.contains('ready')) setTimeout(tick, 1000);
  })();
})();
