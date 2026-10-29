// VB Safety · menu principal : ouverture du sous-menu « Solutions de suivi CMR » au clic et au clavier (ordinateur).
(function () {
  'use strict';
  var groupes = document.querySelectorAll('.nav-groupe');
  if (!groupes.length) return;
  function fermer(sauf) {
    Array.prototype.forEach.call(groupes, function (g) {
      if (g === sauf) return;
      g.classList.remove('ouvert');
      var b = g.querySelector('.nav-sous'); if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  Array.prototype.forEach.call(groupes, function (g) {
    var b = g.querySelector('.nav-sous'); if (!b) return;
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var o = !g.classList.contains('ouvert');
      fermer(g); g.classList.toggle('ouvert', o); b.setAttribute('aria-expanded', o ? 'true' : 'false');
    });
    g.addEventListener('mouseenter', function () { b.setAttribute('aria-expanded', 'true'); });
    g.addEventListener('mouseleave', function () { if (!g.classList.contains('ouvert')) b.setAttribute('aria-expanded', 'false'); });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.nav-groupe')) fermer(null); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var g = document.activeElement && document.activeElement.closest && document.activeElement.closest('.nav-groupe');
    fermer(null);
    if (g) { var b = g.querySelector('.nav-sous'); if (b) b.focus(); }
  });
})();
