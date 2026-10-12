// Frise « avec / sans traçabilité » : quand la section arrive à l'écran, la ligne se trace seule, une fois,
// et chaque étape apparaît au moment où la ligne l'atteint. Le défilement n'est jamais piloté ni ralenti.
// Rien ne bouge au téléphone ni si l'utilisateur a demandé moins d'animations : la frise reste complète.
(function () {
  var frises = document.querySelectorAll('[data-frise]');
  if (!frises.length || !window.matchMedia || !('IntersectionObserver' in window)) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(min-width: 900px)').matches) return;

  var FULL = 1.8; // durée (s) pour tracer toute la largeur
  frises.forEach(function (f) {
    var start = 0;
    f.querySelectorAll('.fr-line').forEach(function (line) {
      var end = parseFloat(getComputedStyle(line).getPropertyValue('--end')) || 1;
      var dur = FULL * end, cols = 6;
      line.style.setProperty('--start', start.toFixed(2) + 's');
      line.style.setProperty('--dur', dur.toFixed(2) + 's');
      line.querySelectorAll('.fr-steps li').forEach(function (li, i) {
        var pos = li.classList.contains('fr-end') ? end : i / cols;
        li.style.setProperty('--d', (start + dur * (pos / end) - 0.1).toFixed(2) + 's');
      });
      start += 0.5; // la ligne « sans » part juste après la ligne « avec »
    });
    f.classList.add('anim');
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('go'); io.unobserve(e.target); }
    });
  }, { threshold: 0.35 });
  frises.forEach(function (f) { io.observe(f); });
})();
