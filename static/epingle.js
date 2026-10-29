// VB Safety · pages métier (ordinateur) : la section « Les enjeux » reste à l'écran pendant le défilement ; les trois cartes apparaissent l'une après l'autre.
(function () {
  'use strict';
  var grille = document.querySelector('.sec .grille-3'); if (!grille) return;
  var sec = grille.closest('.sec'), blocs = grille.querySelectorAll('.enjeu'); if (!blocs.length) return;
  sec.classList.add('sec-enjeux');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mq = window.matchMedia('(min-width: 1100px) and (min-height: 700px)'), actif = false, raf = 0;
  function maj() {
    raf = 0; if (!actif) return;
    var r = sec.getBoundingClientRect(), course = sec.offsetHeight - window.innerHeight;
    var p = course > 0 ? Math.min(1, Math.max(0, -r.top / course)) : 1;
    Array.prototype.forEach.call(blocs, function (b, i) { b.classList.toggle('vu', p >= 0.06 + i * 0.26); });
  }
  function regler() {
    actif = mq.matches && !reduce; sec.classList.toggle('epingle', actif);
    if (!actif) Array.prototype.forEach.call(blocs, function (b) { b.classList.remove('vu'); });
    maj();
  }
  window.addEventListener('scroll', function () { if (actif && !raf) raf = requestAnimationFrame(maj); }, { passive: true });
  window.addEventListener('resize', function () { if (!raf) raf = requestAnimationFrame(maj); });
  if (mq.addEventListener) mq.addEventListener('change', regler);
  regler();
})();
