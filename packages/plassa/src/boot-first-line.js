/* The boot screen's first funny line, before the first paint, as mulassa.cat's (index.html #loader-first-joke): the page's
   language by locale.js's rules (?lang= over the saved choice over Catalan), a line not seen yet on this device (boot-lines.js's
   memory, the same key). vite.config.js inlines it after #boot-line with every language's lines (T, below). */
(function () {
  var T = __BOOT_LINES__, el = document.getElementById('boot-line'), tags = [], code = 'ca', i, c;
  try { tags.push(new URLSearchParams(location.search).get('lang')); } catch (e) { /* no URL API: the saved choice */ }
  try { tags.push(localStorage.getItem('ui-language-v1')); } catch (e) { /* storage blocked */ }
  for (i = 0; i < tags.length; i++) { c = tags[i] && T.aliases[String(tags[i]).trim().toLowerCase().replace(/_/g, '-')]; if (c && T.lines[c]) { code = c; break; } }
  var L = T.lines[code] || T.lines.ca, k = 'loader-jokes-seen', s = [];
  try { s = JSON.parse(localStorage.getItem(k) || '[]').filter(function (l) { return L.indexOf(l) >= 0; }); } catch (e) { /* a broken memory starts over */ }
  if (s.length >= L.length) s = s.slice(-1); /* all seen: start over, not with the last one */
  var u = L.filter(function (l) { return s.indexOf(l) < 0; }), l = u[Math.floor(Math.random() * u.length)];
  if (el && l) el.textContent = l;
  s = s.filter(function (x) { return x !== l; }); s.push(l); if (s.length >= L.length) s = [l];
  try { localStorage.setItem(k, JSON.stringify(s)); } catch (e) { /* private mode */ }
})();
