// Frise « avec / sans traçabilité » (pages Sapeurs-pompiers et VB CMR).
// Ordinateur, écran assez haut : la section s'épingle sous l'en-tête ; le défilement trace d'abord la ligne « avec »,
// puis la ligne « sans » ; une fois la frise complète, la page reprend son défilement normal.
// Ordinateur, écran trop bas pour épingler : les deux lignes se tracent quand même, au rythme du passage de la
// section dans la fenêtre, sans épinglage.
// Téléphone ou mouvement réduit : frise complète et statique (le téléphone a sa propre bascule).
(function () {
  var frises = document.querySelectorAll('[data-frise]');
  if (!frises.length || !window.matchMedia || !window.requestAnimationFrame) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var COLS = 6, SPAN = 1.4; // SPAN : longueur du défilement épinglé, en hauteurs d'écran
  var header = document.querySelector('header.top, header.site-header');
  var scenes = [];

  frises.forEach(function (f) {
    var section = f.closest('section'), stage = section && section.firstElementChild;
    if (!stage) return;
    var lines = Array.prototype.map.call(f.querySelectorAll('.fr-line'), function (line) {
      var end = parseFloat(getComputedStyle(line).getPropertyValue('--end')) || 1;
      return { el: line, q: -1, items: Array.prototype.map.call(line.querySelectorAll('.fr-steps li'), function (li, i) {
        return { el: li, at: li.classList.contains('fr-end') ? 1 : (i / COLS) / end };
      }) };
    });
    scenes.push({ f: f, section: section, stage: stage, lines: lines, mode: 'off', top: 0, dist: 0 });
  });

  function setLine(l, q) {
    if (Math.abs(q - l.q) < 0.0005) return;
    l.q = q;
    l.el.style.setProperty('--q', q.toFixed(4));
    l.items.forEach(function (it) { it.el.classList.toggle('on', q >= it.at - 0.01); });
  }

  function mode(s, m) {
    if (s.mode === m) return;
    s.section.classList.toggle('fr-pin', m === 'pin');
    s.stage.classList.toggle('fr-stage', m === 'pin');
    s.f.classList.toggle('anim', m !== 'off');
    if (m !== 'pin') { s.section.style.removeProperty('--fr-top'); s.section.style.removeProperty('--fr-vis'); s.section.style.removeProperty('--fr-h'); }
    if (m === 'off') s.lines.forEach(function (l) { l.q = -1; l.el.style.removeProperty('--q'); });
    s.mode = m;
  }

  function layout() {
    var desktop = matchMedia('(min-width: 900px)').matches, vh = window.innerHeight;
    var top = header ? header.getBoundingClientRect().height : 0;
    scenes.forEach(function (s) {
      var fits = desktop && s.f.offsetHeight + 160 <= vh - top;
      mode(s, fits ? 'pin' : desktop ? 'flux' : 'off');
      if (s.mode !== 'pin') return;
      s.top = top; s.dist = Math.round(vh * SPAN);
      s.section.style.setProperty('--fr-top', top + 'px');
      s.section.style.setProperty('--fr-vis', (vh - top) + 'px');
      s.section.style.setProperty('--fr-h', (vh - top + s.dist) + 'px');
    });
  }

  function update() {
    ticking = false;
    var vh = window.innerHeight;
    scenes.forEach(function (s) {
      if (s.mode === 'off') return;
      var r = s.section.getBoundingClientRect(), t;
      if (s.mode === 'pin') {
        var p = (s.top - r.top) / s.dist;                                    // 0 → 1 pendant l'épinglage
        t = (p - 0.04) / 0.86;                                               // petite pause au début et à la fin
      } else {
        var trav = (vh - r.top) / (r.height + vh);                           // 0 quand la section entre, 1 quand elle sort
        t = (trav - 0.14) / 0.46;                                            // tracé fini quand la section est à peu près centrée
      }
      t = Math.max(0, Math.min(1, t));
      var n = s.lines.length;
      s.lines.forEach(function (l, i) {                                      // les lignes se tracent l'une après l'autre
        var a = i / n * 0.8, b = a + 1 / n + 0.2 / n;
        setLine(l, Math.max(0, Math.min(1, (t - a) / (b - a))));
      });
    });
  }

  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { layout(); onScroll(); });
  layout(); update();
})();
