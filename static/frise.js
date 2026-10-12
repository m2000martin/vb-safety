// Frise « avec / sans traçabilité » : chaque ligne avance (et recule) avec le défilement.
// La position suit le scroll avec un léger lissage, pour un tracé fluide sans à-coups ; le défilement lui-même n'est jamais bloqué.
// Rien ne bouge au téléphone ni si l'utilisateur a demandé moins d'animations : la frise reste complète.
(function () {
  var frises = document.querySelectorAll('[data-frise]');
  if (!frises.length || !window.matchMedia || !window.requestAnimationFrame) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(min-width: 900px)').matches) return;

  var COLS = 6, rows = [];
  frises.forEach(function (f) {
    f.querySelectorAll('.fr-line').forEach(function (line) {
      var end = parseFloat(getComputedStyle(line).getPropertyValue('--end')) || 1;
      var items = Array.prototype.map.call(line.querySelectorAll('.fr-steps li'), function (li, i) {
        return { el: li, at: li.classList.contains('fr-end') ? 1 : (i / COLS) / end };
      });
      rows.push({ line: line, items: items, q: 0, target: 0 });
    });
    f.classList.add('anim');
  });

  // 0 quand le haut de la ligne passe à 85 % de la hauteur d'écran, 1 quand il atteint 40 %
  function measure() {
    var vh = window.innerHeight;
    rows.forEach(function (r) {
      var top = r.line.getBoundingClientRect().top;
      r.target = Math.max(0, Math.min(1, (vh * 0.85 - top) / (vh * 0.45)));
    });
  }

  var running = false;
  function frame() {
    var moving = false;
    rows.forEach(function (r) {
      var d = r.target - r.q;
      r.q = Math.abs(d) < 0.001 ? r.target : r.q + d * 0.14;
      if (r.q !== r.target) moving = true;
      r.line.style.setProperty('--q', r.q.toFixed(4));
      r.items.forEach(function (it) { it.el.classList.toggle('on', r.q >= it.at - 0.01); });
    });
    if (moving) requestAnimationFrame(frame); else running = false;
  }
  function kick() { measure(); if (!running) { running = true; requestAnimationFrame(frame); } }

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  kick();
})();
