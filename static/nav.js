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

// Menus métier : « Capteur de contamination » existe dans chaque métier (même page) ; on n'allume que celui du métier d'où l'on vient.
(function () {
  'use strict';
  var KEY = 'vb-metier', CLES = ['sapeurs-pompiers', 'industrie', 'btp'];
  var groupes = document.querySelectorAll('.nav-metier');
  if (!groupes.length) return;
  // On retient le métier du lien cliqué
  Array.prototype.forEach.call(groupes, function (g, i) {
    Array.prototype.forEach.call(g.querySelectorAll('.nav-metiers a'), function (a) {
      a.addEventListener('click', function () { try { sessionStorage.setItem(KEY, CLES[i]); } catch (e) {} });
    });
    if (g.classList.contains('actif')) { try { sessionStorage.setItem(KEY, CLES[i]); } catch (e) {} }
  });
  if (!/\/innovation\/$/.test(location.pathname)) return;
  var cle = (location.hash || '').slice(1);
  if (CLES.indexOf(cle) < 0) { try { cle = sessionStorage.getItem(KEY); } catch (e) { cle = null; } }
  var i = CLES.indexOf(cle); if (i < 0) return;
  var a = groupes[i].querySelector('a[href*="innovation/#"]'); if (!a) return;
  a.setAttribute('aria-current', 'page'); groupes[i].classList.add('actif');
})();
