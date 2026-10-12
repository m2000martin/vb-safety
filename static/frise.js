// Frise « avec / sans traçabilité » : la ligne avance avec le défilement, chaque étape apparaît quand la ligne l'atteint.
// Rien ne bouge au téléphone ni si l'utilisateur a demandé moins d'animations : la frise reste complète.
(function () {
  var frises = document.querySelectorAll('[data-frise]');
  if (!frises.length || !window.matchMedia) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(min-width: 900px)').matches) return;

  var rows = [];
  frises.forEach(function (f) {
    f.classList.add('anim');
    f.querySelectorAll('.fr-line').forEach(function (line) {
      var end = parseFloat(getComputedStyle(line).getPropertyValue('--end')) || 1;
      var items = Array.prototype.slice.call(line.querySelectorAll('.fr-steps li'));
      rows.push({ frise: f, line: line, end: end, items: items });
    });
  });

  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    frises.forEach(function (f) {
      var r = f.getBoundingClientRect();
      // 0 quand le haut de la frise atteint 85 % de l'écran, 1 quand il atteint 35 %
      var p = (vh * 0.85 - r.top) / (vh * 0.5);
      p = Math.max(0, Math.min(1, p));
      f.style.setProperty('--p', p.toFixed(3));
    });
    rows.forEach(function (row) {
      var p = parseFloat(row.frise.style.getPropertyValue('--p')) || 0, reach = p * row.end, n = row.items.length;
      row.items.forEach(function (li, i) {
        var pos = li.classList.contains('fr-end') ? row.end : i / 5;
        li.classList.toggle('on', reach >= pos - 0.005);
      });
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
